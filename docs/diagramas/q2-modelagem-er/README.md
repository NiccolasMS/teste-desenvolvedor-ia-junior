# Questão 2 — Modelagem ER (`User`, `Account`, `Transaction`)

> **Enunciado:** *Modele em **ER** (texto) as entidades **User, Account, Transaction** com chaves primárias/estrangeiras.*

* 📄 Versão em Texto ASCII puro: [`er-model.txt`](./er-model.txt)
* 🌱 Versão em PlantUML: [`er-model.puml`](./er-model.puml)
* 🗄️ Script DDL PostgreSQL: [`schema.sql`](./schema.sql)

---

## Visualização Renderizada (Mermaid ER)

```mermaid
erDiagram
    USER ||--o{ ACCOUNT : "possui (1:N)"
    ACCOUNT ||--o{ TRANSACTION : "registra (1:N)"

    USER {
        int id PK "Chave Primária"
        varchar name "Nome completo"
        varchar email UK "E-mail único"
        varchar password_hash "Hash da senha"
        timestamptz created_at "Data de criação"
    }

    ACCOUNT {
        int id PK "Chave Primária"
        int user_id FK "Referencia USER(id)"
        varchar account_number UK "Número da conta"
        numeric balance "Saldo (NUMERIC 15,2)"
        timestamptz created_at "Data de abertura"
    }

    TRANSACTION {
        int id PK "Chave Primária"
        int account_id FK "Referencia ACCOUNT(id)"
        varchar type "CREDIT ou DEBIT"
        numeric amount "Valor (NUMERIC 15,2)"
        varchar description "Descrição"
        timestamptz created_at "Data da transação"
    }
```

---

## Explicação das Chaves e Relacionamentos

1. **`User` (`PK: id`):** Representa o cliente cadastrado no sistema.
2. **`Account` (`PK: id` | `FK: user_id → User.id`):** Relacionamento **`1:N`** (`User ||--o{ Account`), onde um usuário pode ter uma ou mais contas vinculadas, e cada conta pertence obrigatoriamente a um único `User`.
3. **`Transaction` (`PK: id` | `FK: account_id → Account.id`):** Relacionamento **`1:N`** (`Account ||--o{ Transaction`), onde uma conta registra zero ou várias transações financeiras ao longo do tempo (`CREDIT` ou `DEBIT`).
