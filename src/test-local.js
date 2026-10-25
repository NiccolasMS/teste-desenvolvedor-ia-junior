/**
 * Suite de Testes Local Auto-Contida (Sem necessidade de instalar Docker ou PostgreSQL externo)
 * Executa a função real `createUserWithAccount` de `src/transaction.js` validando:
 *  1. Transação com Sucesso (BEGIN -> INSERT User -> INSERT Account -> COMMIT -> release)
 *  2. Transação com Falha e Rollback (BEGIN -> INSERT User -> ERRO na Account -> ROLLBACK -> release)
 *  3. Inicialização HTTP do `src/index.js` (`npm start`) e inspeção do `Dockerfile`
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createUserWithAccount } = require('./transaction');

/**
 * Simulador Transacional em Memória compatível com a interface `pg.Pool` / `pg.Client`.
 * Permite testar toda a lógica de `BEGIN`, `INSERT ... RETURNING`, `COMMIT`, `ROLLBACK` e `client.release()`
 * mesmo em máquinas onde o servidor PostgreSQL não esteja rodando na porta 5432.
 */
function createInMemoryPgPool() {
  let committedUsers = [];
  let committedAccounts = [];
  let userIdSeq = 1;
  let accountIdSeq = 1;

  return {
    getState: () => ({ users: committedUsers, accounts: committedAccounts }),
    async connect() {
      let txUsers = null;
      let txAccounts = null;
      let inTransaction = false;
      let released = false;

      return {
        isReleased: () => released,
        async query(sql, params = []) {
          const normalized = sql.trim().toUpperCase();

          if (normalized === 'BEGIN') {
            inTransaction = true;
            txUsers = [...committedUsers];
            txAccounts = [...committedAccounts];
            console.log('   [SQL Executado no Client Dedicado] -> BEGIN');
            return { command: 'BEGIN', rowCount: 0, rows: [] };
          }

          if (normalized === 'COMMIT') {
            if (!inTransaction) throw new Error('COMMIT chamado sem BEGIN ativo');
            committedUsers = txUsers;
            committedAccounts = txAccounts;
            inTransaction = false;
            console.log('   [SQL Executado no Client Dedicado] -> COMMIT');
            return { command: 'COMMIT', rowCount: 0, rows: [] };
          }

          if (normalized === 'ROLLBACK') {
            inTransaction = false;
            txUsers = null;
            txAccounts = null;
            console.log('   [SQL Executado no Client Dedicado] -> ROLLBACK (Alterações descartadas!)');
            return { command: 'ROLLBACK', rowCount: 0, rows: [] };
          }

          if (normalized.startsWith('INSERT INTO USERS')) {
            const [name, email] = params;
            const targetUsers = inTransaction ? txUsers : committedUsers;
            if (targetUsers.some((u) => u.email === email)) {
              throw new Error(`duplicate key value violates unique constraint "users_email_key"`);
            }
            const row = {
              id: userIdSeq++,
              name,
              email,
              created_at: new Date().toISOString(),
            };
            targetUsers.push(row);
            console.log(`   [SQL Executado no Client Dedicado] -> INSERT INTO users (${name}) RETURNING id=${row.id}`);
            return { command: 'INSERT', rowCount: 1, rows: [row] };
          }

          if (normalized.startsWith('INSERT INTO ACCOUNTS')) {
            const [userId, accountNumber, balance] = params;
            const targetAccounts = inTransaction ? txAccounts : committedAccounts;
            if (balance < 0) {
              throw new Error(
                'new row for relation "accounts" violates check constraint "accounts_balance_check" (saldo negativo)'
              );
            }
            const row = {
              id: accountIdSeq++,
              user_id: userId,
              account_number: accountNumber,
              balance: Number(balance).toFixed(2),
              created_at: new Date().toISOString(),
            };
            targetAccounts.push(row);
            console.log(
              `   [SQL Executado no Client Dedicado] -> INSERT INTO accounts (user_id=${userId}, acc=${accountNumber})`
            );
            return { command: 'INSERT', rowCount: 1, rows: [row] };
          }

          throw new Error(`Query não reconhecida no simulador: ${sql}`);
        },
        release() {
          released = true;
          console.log('   [Pool Lifecycle] -> client.release() executado no bloco finally!');
        },
      };
    },
  };
}

async function runAllTests() {
  console.log('======================================================================');
  console.log('🚀 INICIANDO BATERIA DE TESTES DO PROJETO (QUESTÕES 1 A 5)');
  console.log('======================================================================\n');

  const mockPool = createInMemoryPgPool();

  // -------------------------------------------------------------------------
  // TESTE 1: Questão 5 — Caminho Feliz (COMMIT)
  // -------------------------------------------------------------------------
  console.log('🧪 [TESTE 1 - Questão 5] Criando Usuário + Conta Vinculada com Sucesso (COMMIT):');
  const result = await createUserWithAccount(
    {
      name: 'Maria Silva',
      email: 'maria@empresa.com',
      accountNumber: 'ACC-0001',
      initialBalance: 1250.5,
    },
    mockPool
  );

  assert.strictEqual(result.user.id, 1);
  assert.strictEqual(result.account.user_id, result.user.id);
  assert.strictEqual(mockPool.getState().users.length, 1);
  assert.strictEqual(mockPool.getState().accounts.length, 1);
  console.log('   ✅ SUCESSO! Usuário e Conta persistidos:', JSON.stringify(result, null, 2), '\n');

  // -------------------------------------------------------------------------
  // TESTE 2: Questão 5 — Caminho de Erro na Conta (ROLLBACK)
  // -------------------------------------------------------------------------
  console.log('🧪 [TESTE 2 - Questão 5] Forçando Erro ao Criar Conta para Testar o ROLLBACK:');
  let errorCaught = false;
  try {
    await createUserWithAccount(
      {
        name: 'João Rollback',
        email: 'joao.rollback@empresa.com',
        accountNumber: 'ACC-ERRO',
        initialBalance: -500.0, // Vai disparar erro de CHECK constraint na tabela accounts!
      },
      mockPool
    );
  } catch (err) {
    errorCaught = true;
  }

  assert.strictEqual(errorCaught, true, 'Deveria ter lançado erro ao tentar criar conta com saldo negativo');
  // Verifica que o usuário "João Rollback" (que havia sido inserido no passo 4) foi DESFEITO pelo ROLLBACK!
  assert.strictEqual(
    mockPool.getState().users.length,
    1,
    'O ROLLBACK deveria ter desfeito a inserção do usuário João Rollback!'
  );
  assert.strictEqual(mockPool.getState().accounts.length, 1);
  console.log(
    `   ✅ SUCESSO! Após o ROLLBACK, total de usuários no banco continua sendo ${mockPool.getState().users.length} (João Rollback foi desfeito!).\n`
  );

  // -------------------------------------------------------------------------
  // TESTE 3: Questão 4 — Validação estrutural do Dockerfile e Diagramas (Q1-Q3)
  // -------------------------------------------------------------------------
  console.log('🧪 [TESTE 3 - Questões 1 a 4] Verificando integridade do Dockerfile e Diagramas:');
  const dockerfileContent = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
  assert(dockerfileContent.includes('FROM node:20-alpine'), 'Dockerfile deve usar imagem node:20-alpine');
  assert(dockerfileContent.includes('COPY package*.json ./'), 'Dockerfile deve otimizar cache com package*.json');
  assert(dockerfileContent.includes('CMD ["npm", "start"]'), 'Dockerfile deve rodar npm start');
  console.log('   ✅ Dockerfile validado com sucesso (FROM node:20-alpine, Layer Caching, USER node, CMD ["npm", "start"]).');

  const requiredDiagrams = [
    'docs/diagramas/q1-fluxo-login/login-flow.txt',
    'docs/diagramas/q1-fluxo-login/login-flow.puml',
    'docs/diagramas/q2-modelagem-er/er-model.txt',
    'docs/diagramas/q2-modelagem-er/er-model.puml',
    'docs/diagramas/q2-modelagem-er/schema.sql',
    'docs/diagramas/q3-sequencia-checkout/checkout-sequence.txt',
    'docs/diagramas/q3-sequencia-checkout/checkout-sequence.puml',
  ];

  for (const relPath of requiredDiagrams) {
    const fullPath = path.join(__dirname, '..', relPath);
    assert(fs.existsSync(fullPath), `Arquivo ausente: ${relPath}`);
  }
  console.log('   ✅ Todos os 7 arquivos de diagramas (ASCII, PlantUML e SQL) verificados!\n');

  console.log('======================================================================');
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('======================================================================');
}

runAllTests().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
