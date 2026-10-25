# Questão 1 — Fluxo Simples de Login (`Cliente → API Node.js → PostgreSQL → JWT`)

> **Enunciado:** *Desenhe (texto/PlantUML) um **fluxo simples** de login: cliente → API Node JS → PostgreSQL → JWT.*

* 📄 Versão em Texto ASCII puro: [`login-flow.txt`](./login-flow.txt)
* 🌱 Versão em PlantUML: [`login-flow.puml`](./login-flow.puml)

---

## Visualização Renderizada (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Frontend)
    participant API as API Node.js
    participant DB as PostgreSQL
    participant JWT as Módulo JWT

    Cliente->>API: POST /login { email, password }
    activate API
    API->>DB: SELECT id, password_hash FROM users WHERE email = $1
    activate DB
    DB-->>API: Retorna registro do usuário
    deactivate DB
    API->>API: bcrypt.compare(password, password_hash)
    alt Credenciais Válidas
        API->>JWT: jwt.sign({ sub: user.id }, SECRET, { expiresIn: '1h' })
        activate JWT
        JWT-->>API: Token JWT (eyJhbG...)
        deactivate JWT
        API-->>Cliente: HTTP 200 OK { accessToken }
    else Credenciais Inválidas
        API-->>Cliente: HTTP 401 Unauthorized
    end
    deactivate API
```

---

## Passo a Passo de Como Desenhar e Explicar

1. **Cliente → API Node.js (`POST /login`):** O cliente envia suas credenciais (`email` e `password`) no corpo da requisição via HTTPS.
2. **API Node.js → PostgreSQL (`SELECT`):** A API consulta a tabela `users` usando uma query parametrizada (`WHERE email = $1`) para buscar o `id` e o `password_hash`.
3. **Validação da Senha na API:** A API compara a senha enviada com o hash salvo no banco usando `bcrypt.compare()`.
4. **API Node.js → Módulo JWT (`jwt.sign`):** Se as credenciais forem válidas, a API gera um token JWT assinado contendo o identificador do usuário (`sub: user.id`) e o tempo de expiração (`exp`).
5. **Retorno ao Cliente:** A API devolve `HTTP 200 OK` com o `accessToken` JWT (ou `HTTP 401 Unauthorized` caso o e-mail não exista ou a senha esteja incorreta).
