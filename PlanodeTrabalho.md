# Plano de Trabalho para Desafio Hertz

---

## 1. Definição de Escopo e Inicialização

* Detalhar funcionalidades e requisitos.
* Escolher tecnologias: **TypeScript**, Node.js (Express ou NestJS), MySQL, RabbitMQ.
* Criar repositório GitHub público e estrutura inicial de pastas.
* Elaborar `docker-compose.yml` básico com serviços de MySQL, RabbitMQ e aplicação.

---
## 2. Modelagem de Dados

* Desenhar diagrama entidade-relacionamento (ER) para o banco de pedidos.
* Definir esquema SQL para MySQL.
* Implementar migrations com TypeORM, Sequelize ou Knex (ou similar).

---

## 3. Implementação do Consumidor RabbitMQ

* Configurar conexão com fila RabbitMQ usando `amqplib` ou `nestjs/rabbitmq`.
* Implementar serviço em TypeScript que consome mensagens de pedidos.
* Calcular valor total do pedido e persistir no MySQL.


---

## 4. Desenvolvimento da API REST

* Criar aplicação em Express ou NestJS com TypeScript.
* Endpoints:

    * `GET /orders/:id/total` – valor total do pedido
    * `GET /customers/:id/orders/count` – quantidade de pedidos por cliente
    * `GET /customers/:id/orders` – lista de pedidos de um cliente
* Escrever testes unitários e de integração (Jest ou Mocha + Chai).

---

## 5. Dockerização Completa

* Criar `Dockerfile` e atualizar `docker-compose.yml` para todos os serviços.
* Testar build e startup via Docker Compose.
* Publicar imagem(s) no DockerHub.

---

## 6. Testes de Integração e Carga

* Configurar Jest.
* Testes Unitários.
* Testes de integração.
---


## Estrutura de Pastas

```plaintext
hertz-order-processor/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   ├── repositories/
│   ├── queue/
│   ├── routes/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── tests/
```

## Tecnologias Principais

* **Linguagem:** TypeScript
* **Runtime:** Node.js 18+
* **Framework:** Express
* **Mensageria:** RabbitMQ
* **Banco de Dados:** MySQL
* **ORM/Migrations:** TypeORM
* **Contêineres:** Docker
* **Testes:** Jest


    "docker-migration:run": "docker exec app npx typeorm migration:run -d dist/config/database.js ",
    "docker-seed:run": "docker exec app npm run typeorm seed:run -d dist/config/database.js",
    "docker-start": "docker-compose up -d"