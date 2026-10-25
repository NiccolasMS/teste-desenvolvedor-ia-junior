# Questão 3 — Diagrama de Sequência de Checkout (`React → API → RabbitMQ → Worker → PostgreSQL`)

> **Enunciado:** *Esboce (texto) um **diagrama de sequência** para um fluxo de "checkout" que envolve React → API → RabbitMQ → Worker → PostgreSQL.*

* 📄 Versão em Texto ASCII puro: [`checkout-sequence.txt`](./checkout-sequence.txt)
* 🌱 Versão em PlantUML: [`checkout-sequence.puml`](./checkout-sequence.puml)

---

## Visualização Renderizada (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    participant React as React (Frontend)
    participant API as API (Backend)
    participant RMQ as RabbitMQ (Fila)
    participant Worker as Worker (Consumer)
    participant DB as PostgreSQL (DB)

    rect rgb(235, 245, 255)
    Note over React,RMQ: Fase 1 — Enfileiramento Rápido (Não-Bloqueante)
    React->>API: POST /checkout { items, payment }
    activate API
    API->>API: Valida dados e gera orderId
    API-)RMQ: Publica mensagem na fila "checkout_queue"
    API-->>React: HTTP 202 Accepted { orderId, status: "PROCESSING" }
    deactivate API
    end

    rect rgb(240, 255, 240)
    Note over RMQ,DB: Fase 2 — Processamento Assíncrono e Transacional
    RMQ-)Worker: Entrega mensagem da fila (consume)
    activate Worker
    Worker->>DB: BEGIN
    activate DB
    Worker->>DB: INSERT pedido + INSERT transação + UPDATE estoque
    alt Sucesso na Transação
        Worker->>DB: COMMIT
        DB-->>Worker: Sucesso
        Worker-)RMQ: ACK (Remove mensagem da fila)
    else Falha / Erro
        Worker->>DB: ROLLBACK
        DB-->>Worker: Revertido
        Worker-)RMQ: NACK (Envia para fila de erro / DLQ)
    end
    deactivate DB
    deactivate Worker
    end
```

---

## Passo a Passo do Fluxo

1. **`React → API`:** O frontend React envia `POST /checkout` com os itens do carrinho e dados de pagamento.
2. **`API → RabbitMQ`:** A API valida o contrato da requisição, gera o `orderId` e publica a mensagem na fila `checkout_queue` do RabbitMQ.
3. **`API → React` (`HTTP 202 Accepted`):** A API responde imediatamente ao usuário informando que o pedido foi aceito para processamento, sem travar a interface.
4. **`RabbitMQ → Worker`:** O Worker em background consome a mensagem da fila.
5. **`Worker → PostgreSQL`:** O Worker abre uma transação (`BEGIN`), grava o pedido e a transação financeira, atualiza o estoque e confirma com `COMMIT`.
6. **`Worker → RabbitMQ` (`ACK` / `NACK`):** Após o sucesso no PostgreSQL, o Worker envia `ACK` ao RabbitMQ para remover a mensagem da fila (ou faz `ROLLBACK` + `NACK` para a *Dead Letter Queue* em caso de erro).
