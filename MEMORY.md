# Orchard Agent Memory

## Project Overview
- Monorepo root: `orchard-agents`
- Stack: Next.js 15 App Router + AI SDK v6 + Anthropic + MCP server for X/Twitter
- Workspaces:
  - `apps/agent-app` (user-facing chat UI + `/api/chat`)
  - `mcps/twitter` (MCP server exposing Twitter tools at `/api/mcp`)
  - `packages/shared` (shared TS types)
  - Telegram connector now lives in `apps/agent-app` API routes

## Current Status
- End-to-end flow is working with valid credentials:
  - Profile fetch works
  - Timeline fetch works
  - Search works
  - Draft + explicit confirmation + post works
- Verified real post from agent flow:
  - `https://twitter.com/i/web/status/2031146525900832937`
- Deployed on Vercel (Orchard Agents team):
  - Agent app: `https://orchard-agent-app.vercel.app`
  - Twitter MCP: `https://orchard-twitter-mcp.vercel.app`
  - MCP endpoint used by agent: `https://orchard-twitter-mcp.vercel.app/api/mcp`
  - Telegram webhook: `https://orchard-agent-app.vercel.app/api/telegram/webhook`

## Important Files
- Agent API route: `apps/agent-app/app/api/chat/route.ts`
- Shared agent runner: `apps/agent-app/lib/chat-agent.ts`
- Agent system prompt: `apps/agent-app/lib/agent.ts`
- Chat UI: `apps/agent-app/components/chat.tsx`
- Telegram webhook route: `apps/agent-app/app/api/telegram/webhook/route.ts`
- Telegram webhook setup route: `apps/agent-app/app/api/telegram/set-webhook/route.ts`
- Telegram webhook info route: `apps/agent-app/app/api/telegram/webhook-info/route.ts`
- Telegram conversation memory/send helper: `apps/agent-app/lib/telegram.ts`
- MCP route: `mcps/twitter/app/api/mcp/route.ts`
- Twitter wrapper: `mcps/twitter/lib/twitter-client.ts`

## Key Implementation Notes
- Agent uses `createMCPClient` from `@ai-sdk/mcp` (not `experimental_createMCPClient` from `ai`).
- Agent uses `generateText` with multi-step tool loop via `stopWhen: stepCountIs(5)`.
- Removed raw tool-output fallback in chat response to prevent JSON dump in UI.
- Telegram connector stores per-chat history in-memory (last 20 messages), supports `/start` and `/reset`.
- MCP tools implemented:
  - `post_tweet`
  - `get_my_timeline`
  - `search_tweets`
  - `get_my_profile`
- Twitter min result constraints handled:
  - Timeline endpoint requests at least 5, then slices to requested `count`.
  - Search endpoint requests at least 10, then slices to requested `count`.

## Environment Variables
- `apps/agent-app/.env.local`
  - `ANTHROPIC_API_KEY`
  - `TWITTER_MCP_URL=http://localhost:3001/api/mcp`
  - `TELEGRAM_BOT_TOKEN`
  - `APP_BASE_URL` (public HTTPS URL used for Telegram webhook registration)
- `mcps/twitter/.env.local`
  - `TWITTER_API_KEY`
  - `TWITTER_API_SECRET`
  - `TWITTER_ACCESS_TOKEN`
  - `TWITTER_ACCESS_SECRET`

## Run Commands
- Install:
  - `corepack pnpm install`
- Start MCP:
  - `corepack pnpm --filter twitter-mcp dev`
- Start Agent app:
  - `corepack pnpm --filter agent-app dev`
- Open UI:
  - `http://localhost:3000`
- Set Telegram webhook after app is reachable on a public URL:
  - `POST http://localhost:3000/api/telegram/set-webhook`
- Check Telegram webhook status:
  - `GET http://localhost:3000/api/telegram/webhook-info`

## Known Gotchas
- `pnpm` may not be globally installed; use Corepack (`corepack pnpm ...`).
- `corepack enable pnpm` can fail on permission issues; direct `corepack pnpm` works.
- Turbo `pnpm dev`/`pnpm build` may fail to find package manager binary in this environment; per-package commands are reliable.
- If Twitter auth fails with `401` / code `89`, credentials are invalid/expired or mismatched app/token pair.
- If UI behavior seems stale, restart both dev servers and refresh browser.
- Telegram webhooks require a publicly reachable HTTPS URL (localhost alone is not enough).

## Security Reminder
- Credentials were shared in chat during setup. Rotate all exposed keys/tokens before production use.
