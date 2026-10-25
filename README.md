# Teste Desenvolvedor – Júnior

Repositório com a resolução das 5 questões práticas do teste técnico (3 de diagramação e 2 de codificação).

---

## 📋 Índice das Questões

### Parte 1 — Diagramáveis
1. **Fluxo simples de login (`Cliente → API Node.js → PostgreSQL → JWT`):**
   - Texto ASCII: [`docs/diagramas/q1-fluxo-login/login-flow.txt`](./docs/diagramas/q1-fluxo-login/login-flow.txt)
   - PlantUML: [`docs/diagramas/q1-fluxo-login/login-flow.puml`](./docs/diagramas/q1-fluxo-login/login-flow.puml)
   - Passo a passo: [`docs/diagramas/q1-fluxo-login/README.md`](./docs/diagramas/q1-fluxo-login/README.md)

2. **Modelagem ER (`User`, `Account`, `Transaction` com PK/FK):**
   - Texto ASCII: [`docs/diagramas/q2-modelagem-er/er-model.txt`](./docs/diagramas/q2-modelagem-er/er-model.txt)
   - PlantUML: [`docs/diagramas/q2-modelagem-er/er-model.puml`](./docs/diagramas/q2-modelagem-er/er-model.puml)
   - SQL de referência: [`docs/diagramas/q2-modelagem-er/schema.sql`](./docs/diagramas/q2-modelagem-er/schema.sql)
   - Explicação: [`docs/diagramas/q2-modelagem-er/README.md`](./docs/diagramas/q2-modelagem-er/README.md)

3. **Diagrama de sequência de Checkout (`React → API → RabbitMQ → Worker → PostgreSQL`):**
   - Texto ASCII: [`docs/diagramas/q3-sequencia-checkout/checkout-sequence.txt`](./docs/diagramas/q3-sequencia-checkout/checkout-sequence.txt)
   - PlantUML: [`docs/diagramas/q3-sequencia-checkout/checkout-sequence.puml`](./docs/diagramas/q3-sequencia-checkout/checkout-sequence.puml)
   - Passo a passo: [`docs/diagramas/q3-sequencia-checkout/README.md`](./docs/diagramas/q3-sequencia-checkout/README.md)

---

### Parte 2 — Codificação
4. **Dockerfile mínimo para aplicação Node.js que roda `npm start`:**
   - Arquivo principal: [`Dockerfile`](./Dockerfile)
   - Arquivos de apoio: [`package.json`](./package.json) e [`src/index.js`](./src/index.js)

5. **Transação com `node-postgres` (cria usuário + conta vinculada + rollback em caso de erro):**
   - Arquivo principal: [`src/transaction.js`](./src/transaction.js)

---

## 🚀 Como Executar

### Instalar dependências e rodar os testes locais
```bash
npm install
npm test
```

### Rodar a aplicação (`npm start`)
```bash
npm start
```

### Build e execução via Docker (Questão 4)
```bash
docker build -t app-node .
docker run --rm -p 3000:3000 app-node
```
