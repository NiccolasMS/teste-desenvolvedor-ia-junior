-- ============================================================================
-- DDL SQL (PostgreSQL) — Entidades: User, Account, Transaction
-- ============================================================================

-- 1. Tabela de Usuários (Entidade User)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,                          -- [PK] Chave Primária do Usuário
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,             -- [UK] E-mail único para autenticação
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Contas (Entidade Account)
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,                          -- [PK] Chave Primária da Conta
    user_id INTEGER NOT NULL                        -- [FK] Chave Estrangeira apontando para users(id)
        REFERENCES users(id) ON DELETE RESTRICT,
    account_number VARCHAR(20) NOT NULL UNIQUE,     -- [UK] Número único da conta bancária
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00    -- NUMERIC(15,2) evita erros de ponto flutuante (FLOAT)
        CHECK (balance >= 0.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Transações Financeiras (Entidade Transaction)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,                          -- [PK] Chave Primária da Transação
    account_id INTEGER NOT NULL                     -- [FK] Chave Estrangeira apontando para accounts(id)
        REFERENCES accounts(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL                       -- Tipo da movimentação ('CREDIT' ou 'DEBIT')
        CHECK (type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(15, 2) NOT NULL                  -- Valor estritamente positivo da transação
        CHECK (amount > 0.00),
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
