# FinWise

FinWise is a personal finance assistant built as a local full-stack application. It combines account and transaction management, budget tracking, asset and liability views, family collaboration, financial analysis, bill import, and an optional AI assistant.

## Highlights

- Full-stack architecture: Next.js frontend, FastAPI backend, PostgreSQL database, and Alembic migrations.
- Local-first development: can run locally with Docker Compose or with separate frontend/backend dev servers.
- Personal finance workflow: dashboard, accounts, transactions, budgets, goals, assets, liabilities, family members, and settings.
- AI-assisted interaction: optional DeepSeek/OpenAI-compatible API integration for bill parsing and floating assistant features.
- Data analysis layer: Python backend APIs plus R scripts for trend analysis, forecasting, budget reports, suggestions, and health scoring.
- Desktop-ready direction: includes Tauri configuration for packaging the frontend as a desktop app.

## Repository Structure

```text
.
├── docker-compose.yml
├── finwise/                 # Next.js + Tauri frontend
├── finwise-backend/         # FastAPI backend
├── diagrams/                # Architecture and data-flow diagrams
└── screenshots/             # UI screenshots and demo GIFs
```

## Tech Stack

- Frontend: Next.js, React, TypeScript, Zustand, TanStack Query, Recharts, Framer Motion
- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic, PostgreSQL
- Analysis: Python, pandas, R scripts
- AI: OpenAI-compatible client with DeepSeek endpoint support
- DevOps: Docker, Docker Compose
- Desktop: Tauri

## Local Setup

1. Copy environment examples:

```bash
cp .env.example .env
cp finwise/.env.local.example finwise/.env.local
cp finwise-backend/.env.example finwise-backend/.env
```

2. Edit the copied environment files and replace placeholder values.

3. Start database and backend:

```bash
docker compose up db backend
```

4. Start frontend:

```bash
cd finwise
npm install
npm run dev
```

5. Open `http://localhost:3000`.

## Notes

- Real `.env` files are intentionally ignored and should not be committed.
- `DEEPSEEK_API_KEY` is optional. If it is not configured, the non-AI finance features can still run while AI endpoints return a friendly missing-key message.
- This project was developed and tested locally.
