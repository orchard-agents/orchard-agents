import {
  DEFAULT_CLIENT_ID,
  getSettingsBundle,
  saveAgentSettings,
  saveGlobalSettings,
  type AgentSettings,
  type GlobalSettings
} from "@/lib/runtime-settings";

function mcpConfigUrlFromMcpUrl(mcpUrl: string) {
  const parsed = new URL(mcpUrl);
  parsed.pathname = parsed.pathname.replace(/\/mcp\/?$/, "/config");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function mapStatus(bundle: Awaited<ReturnType<typeof getSettingsBundle>>) {
  return {
    global: {
      anthropicApiKey: Boolean(bundle.global.anthropicApiKey)
    },
    agents: bundle.agents.map((agent) => ({
      agentId: agent.agentId,
      integration: agent.integration,
      useGlobalAnthropic: agent.useGlobalAnthropic,
      anthropicApiKeyOverride: Boolean(agent.anthropicApiKeyOverride),
      twitterMcpUrl: Boolean(agent.twitterMcpUrl),
      twitterApiKey: Boolean(agent.twitterApiKey),
      twitterApiSecret: Boolean(agent.twitterApiSecret),
      twitterAccessToken: Boolean(agent.twitterAccessToken),
      twitterAccessSecret: Boolean(agent.twitterAccessSecret),
      discordMcpUrl: Boolean(agent.discordMcpUrl),
      discordBotToken: Boolean(agent.discordBotToken),
      discordGuildName: Boolean(agent.discordGuildName),
      discordDefaultChannelName: Boolean(agent.discordDefaultChannelName)
    }))
  };
}

async function syncTwitterCredentials(agent: AgentSettings) {
  if (agent.integration !== "twitter") {
    return;
  }

  const configUrl = mcpConfigUrlFromMcpUrl(agent.twitterMcpUrl);

  await fetch(configUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      twitterApiKey: agent.twitterApiKey,
      twitterApiSecret: agent.twitterApiSecret,
      twitterAccessToken: agent.twitterAccessToken,
      twitterAccessSecret: agent.twitterAccessSecret
    })
  });
}

async function syncDiscordCredentials(agent: AgentSettings) {
  if (agent.integration !== "discord") {
    return;
  }

  const configUrl = mcpConfigUrlFromMcpUrl(agent.discordMcpUrl);

  await fetch(configUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      discordBotToken: agent.discordBotToken,
      discordGuildName: agent.discordGuildName,
      discordDefaultChannelName: agent.discordDefaultChannelName
    })
  });
}

export async function GET() {
  const bundle = await getSettingsBundle({
    clientId: DEFAULT_CLIENT_ID,
    forceRefresh: true
  });

  return Response.json({
    settings: bundle,
    status: mapStatus(bundle)
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      | { scope: "global"; global: GlobalSettings }
      | { scope: "agent"; agent: AgentSettings };

    if (body.scope === "global") {
      const bundle = await saveGlobalSettings(body.global, {
        clientId: DEFAULT_CLIENT_ID
      });

      return Response.json({ ok: true, settings: bundle, status: mapStatus(bundle) });
    }

    const bundle = await saveAgentSettings(body.agent, {
      clientId: DEFAULT_CLIENT_ID
    });

    await syncTwitterCredentials(body.agent);
    await syncDiscordCredentials(body.agent);

    return Response.json({ ok: true, settings: bundle, status: mapStatus(bundle) });
  } catch (error) {
    const baseMessage = error instanceof Error ? error.message : "Unknown settings error";
    const message = baseMessage.includes("public.agent_credentials")
      ? `${baseMessage}. Run apps/agent-app/supabase.sql in Supabase SQL editor first.`
      : baseMessage;
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
