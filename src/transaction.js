/**
 * ============================================================================
 * QUESTÃO 5: Implemente, usando `node-postgres`, uma transação que cria um
 * usuário e, em seguida, cria uma conta vinculada; faça rollback em caso de erro.
 * ============================================================================
 */

const { Pool } = require('pg');

// 1. CONFIGURAÇÃO DO POOL DE CONEXÕES:
// Justificativa: O Pool mantém um conjunto de conexões abertas e reutilizáveis com o PostgreSQL,
// evitando o alto custo de abrir e fechar uma nova conexão TCP/TLS a cada requisição da API.
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fintech_db',
  max: 10, // Número máximo de conexões simultâneas no pool
  idleTimeoutMillis: 30000, // Tempo máximo que um cliente pode ficar ocioso antes de ser fechado
  connectionTimeoutMillis: 5000, // Tempo limite para obter uma conexão antes de lançar erro
});

/**
 * Cria um usuário e, em seguida, cria uma conta bancária vinculada dentro de uma
 * única transação ACID no PostgreSQL. Faz ROLLBACK automático em caso de erro.
 *
 * @param {Object} params
 * @param {string} params.name - Nome completo do usuário
 * @param {string} params.email - E-mail único do usuário
 * @param {string} params.accountNumber - Número único da conta vinculada
 * @param {number} [params.initialBalance=0] - Saldo inicial da conta
 * @returns {Promise<{ user: Object, account: Object }>}
 */
async function createUserWithAccount(
  { name, email, accountNumber, initialBalance = 0.0 },
  dbPool = pool
) {
  // 2. CHECKOUT DE CLIENTE EXCLUSIVO DO POOL:
  // Justificativa CRÍTICA: No node-postgres, NUNCA devemos usar `pool.query('BEGIN')` para transações!
  // O `pool.query()` sorteia uma conexão diferente do pool a cada chamada, o que enviaria o `BEGIN`
  // para a Conexão #1 e o `INSERT` para a Conexão #2.
  // Usando `await pool.connect()`, alocamos uma ÚNICA conexão dedicada (`client`) para toda a transação.
  const client = await dbPool.connect();

  try {
    // 3. INÍCIO DA TRANSAÇÃO:
    // Abre o bloco transacional na sessão atual do PostgreSQL.
    // A partir daqui, nenhuma alteração será definitiva até que o comando COMMIT seja executado.
    await client.query('BEGIN');

    // 4. CRIAÇÃO DO USUÁRIO (ENTIDADE PAI):
    // Justificativa de Segurança e Performance:
    // - Usamos queries parametrizadas ($1, $2) para que o PostgreSQL trate os dados separadamente
    //   do comando SQL, eliminando 100% o risco de ataques de SQL Injection.
    // - Usamos a cláusula `RETURNING id, ...` nativa do PostgreSQL para recuperar o ID (PK) gerado
    //   pelo banco imediatamente na mesma operação, sem precisar fazer um SELECT adicional.
    const insertUserQuery = `
      INSERT INTO users (name, email)
      VALUES ($1, $2)
      RETURNING id, name, email, created_at;
    `;
    const userResult = await client.query(insertUserQuery, [name, email]);
    const newUser = userResult.rows[0];

    // 5. CRIAÇÃO DA CONTA VINCULADA (ENTIDADE FILHA):
    // Passamos `newUser.id` como a chave estrangeira (`user_id`) para vincular a conta ao usuário.
    // Se ocorrer qualquer erro aqui (ex.: `accountNumber` duplicado ou violação de constraint),
    // o fluxo pulará imediatamente para o bloco `catch`, desfazendo também o usuário criado no passo 4!
    const insertAccountQuery = `
      INSERT INTO accounts (user_id, account_number, balance)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, account_number, balance, created_at;
    `;
    const accountResult = await client.query(insertAccountQuery, [
      newUser.id,
      accountNumber,
      initialBalance,
    ]);
    const newAccount = accountResult.rows[0];

    // 6. CONFIRMAÇÃO DA TRANSAÇÃO (COMMIT):
    // Como ambas as inserções ocorreram sem erros, efetivamos permanentemente os dados no disco.
    await client.query('COMMIT');

    return {
      user: newUser,
      account: newAccount,
    };
  } catch (error) {
    // 7. REVERSÃO EM CASO DE ERRO (ROLLBACK):
    // Justificativa: Garante a Atomicidade (Tudo ou Nada). Se a criação da conta falhar,
    // o `ROLLBACK` apaga o usuário recém-inserido para que nunca existam usuários "órfãos" sem conta.
    await client.query('ROLLBACK');
    console.error('[Transaction Error] Transação revertida via ROLLBACK:', error.message);

    // Relança o erro para que a camada superior (Controller/Service) possa retornar o status HTTP adequado
    throw error;
  } finally {
    // 8. LIBERAÇÃO OBRIGATÓRIA DA CONEXÃO:
    // Justificativa: O bloco `finally` SEMPRE executa (tanto no sucesso quanto na falha).
    // Chamar `client.release()` devolve a conexão ao Pool para ser reutilizada.
    // Esquecer esta linha causaria um "Connection Leak", travando toda a aplicação após esgotar o limite do pool.
    client.release();
  }
}

// ============================================================================
// EXEMPLO DE EXECUÇÃO E TESTE PRÁTICO (AUTO-CONTIDO)
// ============================================================================
async function runDemo() {
  try {
    // Cria as tabelas em tempo de execução caso ainda não existam para permitir teste imediato
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(160) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        account_number VARCHAR(20) NOT NULL UNIQUE,
        balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('--- Teste 1: Criação com Sucesso (COMMIT) ---');
    const resultado = await createUserWithAccount({
      name: 'Maria Silva',
      email: `maria.${Date.now()}@empresa.com`,
      accountNumber: `ACC-${Date.now()}`,
      initialBalance: 500.0,
    });
    console.log('Sucesso:', resultado);

    console.log('\n--- Teste 2: Forçando Erro na Conta para Validar o ROLLBACK ---');
    // Passamos um saldo negativo (-100) que viola a constraint CHECK (balance >= 0.00) da tabela accounts.
    // O usuário "João Rollback" será inserido no passo 4, mas desfeito pelo ROLLBACK no passo 7!
    await createUserWithAccount({
      name: 'João Rollback',
      email: `joao.${Date.now()}@empresa.com`,
      accountNumber: `ACC-ERR-${Date.now()}`,
      initialBalance: -100.0,
    });
  } catch (err) {
    console.log('Erro capturado com segurança pela aplicação:', err.message);
  } finally {
    await pool.end();
  }
}

// Executa a demonstração se o arquivo for chamado diretamente (`node src/transaction.js`)
if (require.main === module) {
  runDemo();
}

module.exports = { pool, createUserWithAccount };
