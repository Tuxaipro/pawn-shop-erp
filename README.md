# Pawn ERP

Modern pawn shop ERP — Node.js API, React UI, PostgreSQL.

## Modules

Built in order: **Customers → Loans → Interest → Renewal → Repledge → Auction → Inventory → Accounts → Reports**.

## Development

```bash
docker compose up -d

cd pawn-ts && cp .env.example .env && npm install && npm run db:push && npm run db:seed && npm run dev
cd pawn-erp && npm install && npm run dev
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:5174 |
| API      | http://localhost:3002/api/v1 |

Legacy PHP system is preserved under `legacy/`.
