# Engineering Handoff

This repo is designed so another coding agent can continue without chat history.

## Current System Guarantees

- Multi-agent mailbox UI with server-side conversations
- Agent-scoped MCP routing (Twitter + Discord)
- Secure encrypted credential persistence in Supabase
- Recurring tasks with execution logs
- Scheduled runs are action-enforced (no tool call => run fails)
- Password authentication protects UI and most API routes

## Core Files

- Mailbox UI: `apps/agent-app/components/chat.tsx`
- Chat orchestration: `apps/agent-app/lib/chat-agent.ts`
- Settings model: `apps/agent-app/lib/runtime-settings.ts`
- Settings API: `apps/agent-app/app/api/settings/route.ts`
- Conversations API: `apps/agent-app/app/api/conversations/**`
- Recurring tasks API: `apps/agent-app/app/api/cron/**`
- Cron scheduler logic: `apps/agent-app/lib/cron-db.ts`, `apps/agent-app/lib/cron-utils.ts`

## Required Environment

`apps/agent-app/.env.local`:

- `ANTHROPIC_API_KEY`
- `APP_PASSWORD`
- `TWITTER_MCP_URL`
- `DISCORD_MCP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SETTINGS_ENCRYPTION_KEY`
- `CRON_SECRET`
- `TELEGRAM_BOT_TOKEN` (optional if not using Telegram)
- `APP_BASE_URL` (for webhook setup)

MCP env files:

- `mcps/twitter/.env.local`
- `mcps/discord/.env.local`

## Database

Run/refresh SQL schema using:

- `apps/agent-app/supabase.sql`

## Recurring Task Behavior

- Tasks default to Action mode
- Scheduler endpoint: `POST /api/cron/tick`
- Must pass `CRON_SECRET` header
- Run details include:
  - status
  - output/error
  - action badge logic from tool-execution evidence

## Known Constraints

- Vercel Hobby does not support frequent native cron; use external scheduler for 15-min heartbeat.
- Scheduled tasks are currently single-client (`default-client`) even though auth is enabled.

## Recommended Next Steps

1. Add true `client_id` scoping from authenticated identity
2. Add run-now button in UI for recurring tasks
3. Add per-task allowed-tool constraints
4. Add structured action evidence fields in DB (tool names/ids)
