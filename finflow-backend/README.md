# FinFlow Pro — Backend API

> Financial Transaction & Payout Management Platform  
> Node.js 20 LTS · Express 4 · MongoDB Atlas · Redis (Upstash)

## Architecture

```
src/
├── config/          → Database, Redis, and environment configuration
├── controllers/     → Route handlers (thin layer — delegates to services)
├── models/          → Mongoose schemas and models
├── routes/          → Express router definitions (one file per resource)
├── services/        → Core business logic (fee engine, commission, notifications)
├── middleware/      → Express middleware (auth, validation, rate-limiting)
├── utils/           → Shared utilities (logger, encryption, API response helpers)
├── jobs/            → BullMQ workers for async processing
└── app.js           → Application entry point
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env
# Fill in your MongoDB Atlas URI, Redis, Twilio, Cloudinary, etc.

# 3. Start development server
npm run dev

# 4. Or use Docker
docker-compose up -d
```

## API Base URL

```
http://localhost:5000/api/v1
```

## Key Endpoints

| Resource       | Method | Path                          |
|----------------|--------|-------------------------------|
| Auth           | POST   | /auth/login                   |
| Auth           | POST   | /auth/register                |
| Auth           | POST   | /auth/refresh-token           |
| Transactions   | GET    | /transactions                 |
| Transactions   | POST   | /transactions                 |
| Wallets        | GET    | /wallets                      |
| Clients        | GET    | /clients                      |
| Agents         | GET    | /agents                       |
| Reports        | GET    | /reports/daily                |
| Integrations   | POST   | /integrations/telegram/webhook|

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4
- **Database:** MongoDB Atlas (Mongoose 8)
- **Cache:** Redis (Upstash) via ioredis
- **Queue:** BullMQ
- **Auth:** JWT (access 15min / refresh 7d) + bcrypt (12 rounds)
- **SMS/WhatsApp:** Twilio
- **Telegram:** grammy.js
- **PDF:** Puppeteer (server-side)
- **Storage:** Cloudinary

## License

Proprietary — All rights reserved.
