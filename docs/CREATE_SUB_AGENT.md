# Create a New Sub-Agent

This is the canonical workflow to add a new integration agent (for example: LinkedIn, Slack, Notion).

## 1) Create MCP service

Create `mcps/<integration>/` with same structure as `mcps/twitter` or `mcps/discord`:

- `app/api/mcp/route.ts` (register MCP tools)
- `app/api/config/route.ts` (runtime credential updates)
- `lib/<integration>-client.ts` (API wrapper)
- `lib/runtime-config.ts`
- `package.json`, `next.config.ts`, `tsconfig.json`, `.env.example`

Requirements:

- expose only integration-specific tools
- return clear tool errors
- support runtime credential updates via `/api/config`

## 2) Add prompts

In `apps/agent-app/lib/agent.ts`:

- add `ORCHARD_<INTEGRATION>_SYSTEM_PROMPT`
- keep existing safety rules for posting and confirmation for chat mode

## 3) Extend settings model

In `apps/agent-app/lib/runtime-settings.ts`:

- extend `AgentSettings` with integration fields
- add defaults in `default...Agent()`
- include fields in `resolveEffectiveSettings`

## 4) Wire orchestration

In `apps/agent-app/lib/chat-agent.ts`:

- sync integration credentials to MCP `/api/config`
- route MCP URL by agent integration
- preserve scheduled-run action mode behavior

## 5) Extend settings API + UI

API:

- `apps/agent-app/app/api/settings/route.ts`
- include status mapping + config sync calls

UI:

- `apps/agent-app/app/settings/page.tsx`
- add fields (show/hide + set/missing badges)

## 6) Mailbox support

In `apps/agent-app/components/chat.tsx`:

- add default sub-agent entry
- add prompt reset mapping for new integration

## 7) Env + scripts

Update:

- `apps/agent-app/.env.example`
- root `package.json` scripts (`dev:<integration>`)

## 8) Validate

```bash
corepack pnpm --filter agent-app build
corepack pnpm --filter <integration>-mcp build
```

Manual checks:

- settings save and reload
- MCP `/api/config` updates credentials
- agent calls tools successfully
- recurring tasks execute action and produce run evidence

## 9) Deploy

- deploy MCP to Vercel
- deploy `agent-app` with updated envs
- set integration MCP URL in settings
