# Orchard Agents

Monorepo for a multi-agent workspace with:

- Next.js mailbox UI (`apps/agent-app`)
- MCP integrations (`mcps/*`)
- Shared package workspace (`packages/*`)

Current sub-agents:

- `twitter-poster` (Twitter/X MCP)
- `discord-poster` (Discord MCP)

The system supports:

- multi-conversation mailbox
- per-agent prompt editing
- Telegram connector
- recurring task execution (action mode)
- secure credentials persistence in Supabase (encrypted)

## Tech Stack

- Node.js 22+
- pnpm workspaces + Turbo
- Next.js 15 (App Router, TypeScript)
- Vercel AI SDK + Anthropic
- MCP via `mcp-handler`
- Supabase Postgres (encrypted settings)

## Monorepo Layout

```text
apps/
  agent-app/          # mailbox UI, APIs, scheduler endpoints
mcps/
  twitter/            # Twitter MCP
  discord/            # Discord MCP
packages/
  shared/             # shared types
```

## Local Setup

1) Install dependencies

```bash
corepack pnpm install
```

2) Configure env files

- `apps/agent-app/.env.local`
- `mcps/twitter/.env.local`
- `mcps/discord/.env.local`

Use `.env.example` in each app as a template.

For `apps/agent-app/.env.local`, add password auth values:

- `APP_PASSWORD=Orchardagents123`

3) Run services (separate terminals)

```bash
corepack pnpm --filter twitter-mcp dev
corepack pnpm --filter discord-mcp dev
corepack pnpm --filter agent-app dev
```

Open `http://localhost:3000`.

## Authentication (Password)

- App routes are protected by password middleware.
- Login page is `/login`.
- Public routes are:
  - `/login`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `POST /api/cron/tick` (still protected by `CRON_SECRET`)
  - `POST /api/telegram/webhook` (Telegram inbound)
- All other UI and API routes require a valid auth cookie from `/api/auth/login`.

## Production

Primary app:

- `https://orchard-agent-app.vercel.app`

MCP services:

- `https://orchard-twitter-mcp.vercel.app`
- `https://orchard-discord-mcp.vercel.app`

## Supabase Migration

Run this whenever schema updates are added:

```bash
# open and run in Supabase SQL Editor
apps/agent-app/supabase.sql
```

Tables include:

- encrypted agent credentials
- conversations and messages
- recurring tasks and run history

## Recurring Tasks

- Managed in mailbox `Recurring Tasks` tab
- **Action mode by default**
- Run must execute at least one MCP tool or it is marked failed
- Run details show action badges and run output

Scheduler endpoint:

- `POST /api/cron/tick`
- requires `CRON_SECRET` via `x-cron-secret` or `Authorization: Bearer ...`

## Vercel Cron Note

Vercel Hobby does not support every-15-minute cron schedules.

For 15-minute scheduling, use an external scheduler (for example cron-job.org) hitting:

`https://orchard-agent-app.vercel.app/api/cron/tick`

with header:

`x-cron-secret: <CRON_SECRET>`

## Telegram

Routes:

- `POST /api/telegram/webhook`
- `POST /api/telegram/set-webhook`
- `GET /api/telegram/webhook-info`

## Build & Validate

```bash
corepack pnpm --filter agent-app build
corepack pnpm --filter twitter-mcp build
corepack pnpm --filter discord-mcp build
```

## Continue Development

See:

- `docs/CREATE_SUB_AGENT.md`
- `docs/ENGINEERING_HANDOFF.md`
