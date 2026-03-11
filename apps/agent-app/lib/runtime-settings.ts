import {
  decryptRowPayload,
  isSettingsDatabaseConfigured,
  readAllSettingsFromDatabase,
  writeSettingsToDatabase
} from "@/lib/settings-db";

export const DEFAULT_CLIENT_ID = "default-client";
export const GLOBAL_SETTINGS_ID = "__global__";
export const DEFAULT_AGENT_ID = "twitter-poster";
const DEFAULT_TWITTER_MCP_URL = "http://localhost:3001/api/mcp";
const DEFAULT_DISCORD_MCP_URL = "http://localhost:3002/api/mcp";

export interface GlobalSettings {
  anthropicApiKey: string;
}

export interface AgentSettings {
  agentId: string;
  name: string;
  integration: "twitter" | "discord";
  useGlobalAnthropic: boolean;
  anthropicApiKeyOverride: string;
  twitterMcpUrl: string;
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
  discordMcpUrl: string;
  discordBotToken: string;
  discordGuildName: string;
  discordDefaultChannelName: string;
}

export interface RuntimeSettingsBundle {
  global: GlobalSettings;
  agents: AgentSettings[];
}

export interface EffectiveRuntimeSettings {
  integration: "twitter" | "discord";
  anthropicApiKey: string;
  twitterMcpUrl: string;
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
  discordMcpUrl: string;
  discordBotToken: string;
  discordGuildName: string;
  discordDefaultChannelName: string;
}

interface RuntimeStore {
  bundle?: RuntimeSettingsBundle;
}

declare global {
  var __orchardRuntimeStore__: RuntimeStore | undefined;
}

function getStore() {
  if (!globalThis.__orchardRuntimeStore__) {
    globalThis.__orchardRuntimeStore__ = {};
  }

  return globalThis.__orchardRuntimeStore__;
}

function globalFromEnvironment(): GlobalSettings {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? ""
  };
}

function defaultTwitterAgent(): AgentSettings {
  return {
    agentId: DEFAULT_AGENT_ID,
    name: "Twitter Poster",
    integration: "twitter",
    useGlobalAnthropic: true,
    anthropicApiKeyOverride: "",
    twitterMcpUrl: process.env.TWITTER_MCP_URL ?? DEFAULT_TWITTER_MCP_URL,
    twitterApiKey: "",
    twitterApiSecret: "",
    twitterAccessToken: "",
    twitterAccessSecret: "",
    discordMcpUrl: process.env.DISCORD_MCP_URL ?? DEFAULT_DISCORD_MCP_URL,
    discordBotToken: "",
    discordGuildName: "orchard agents",
    discordDefaultChannelName: "general"
  };
}

function defaultDiscordAgent(): AgentSettings {
  return {
    agentId: "discord-poster",
    name: "Discord Poster",
    integration: "discord",
    useGlobalAnthropic: true,
    anthropicApiKeyOverride: "",
    twitterMcpUrl: process.env.TWITTER_MCP_URL ?? DEFAULT_TWITTER_MCP_URL,
    twitterApiKey: "",
    twitterApiSecret: "",
    twitterAccessToken: "",
    twitterAccessSecret: "",
    discordMcpUrl: process.env.DISCORD_MCP_URL ?? DEFAULT_DISCORD_MCP_URL,
    discordBotToken: "",
    discordGuildName: "orchard agents",
    discordDefaultChannelName: "general"
  };
}

function sanitizeAgentSettings(agent: Partial<AgentSettings>, fallbackAgentId = DEFAULT_AGENT_ID): AgentSettings {
  return {
    agentId: agent.agentId ?? fallbackAgentId,
    name: agent.name ?? "Twitter Poster",
    integration: agent.integration ?? "twitter",
    useGlobalAnthropic: agent.useGlobalAnthropic ?? true,
    anthropicApiKeyOverride: agent.anthropicApiKeyOverride ?? "",
    twitterMcpUrl:
      agent.twitterMcpUrl || process.env.TWITTER_MCP_URL || DEFAULT_TWITTER_MCP_URL,
    twitterApiKey: agent.twitterApiKey ?? "",
    twitterApiSecret: agent.twitterApiSecret ?? "",
    twitterAccessToken: agent.twitterAccessToken ?? "",
    twitterAccessSecret: agent.twitterAccessSecret ?? "",
    discordMcpUrl:
      agent.discordMcpUrl || process.env.DISCORD_MCP_URL || DEFAULT_DISCORD_MCP_URL,
    discordBotToken: agent.discordBotToken ?? "",
    discordGuildName: agent.discordGuildName || "orchard agents",
    discordDefaultChannelName: agent.discordDefaultChannelName || "general"
  };
}

export async function getSettingsBundle(options?: { clientId?: string; forceRefresh?: boolean }) {
  const store = getStore();
  const clientId = options?.clientId ?? DEFAULT_CLIENT_ID;

  if (!options?.forceRefresh && store.bundle) {
    return store.bundle;
  }

  const initial: RuntimeSettingsBundle = {
    global: globalFromEnvironment(),
    agents: [defaultTwitterAgent(), defaultDiscordAgent()]
  };

  if (isSettingsDatabaseConfigured()) {
    try {
      const rows = await readAllSettingsFromDatabase(clientId);

      for (const row of rows) {
        if (row.agent_id === GLOBAL_SETTINGS_ID) {
          initial.global = decryptRowPayload<GlobalSettings>(row);
          continue;
        }

        const parsedAgent = sanitizeAgentSettings(
          decryptRowPayload<Partial<AgentSettings>>(row),
          row.agent_id
        );
        const existingIndex = initial.agents.findIndex((item) => item.agentId === row.agent_id);

        if (existingIndex >= 0) {
          initial.agents[existingIndex] = parsedAgent;
        } else {
          initial.agents.push(parsedAgent);
        }
      }
    } catch (error) {
      console.error("Failed to load settings bundle from database, falling back to env:", error);
    }
  }

  store.bundle = initial;
  return initial;
}

export async function saveGlobalSettings(
  global: GlobalSettings,
  options?: { clientId?: string }
) {
  const clientId = options?.clientId ?? DEFAULT_CLIENT_ID;

  if (isSettingsDatabaseConfigured()) {
    await writeSettingsToDatabase(clientId, GLOBAL_SETTINGS_ID, global);
  }

  const bundle = await getSettingsBundle({ clientId, forceRefresh: true });
  bundle.global = global;
  getStore().bundle = bundle;
  return bundle;
}

export async function saveAgentSettings(
  agent: AgentSettings,
  options?: { clientId?: string }
) {
  const clientId = options?.clientId ?? DEFAULT_CLIENT_ID;
  const sanitized = sanitizeAgentSettings(agent);

  if (isSettingsDatabaseConfigured()) {
    await writeSettingsToDatabase(clientId, sanitized.agentId, sanitized);
  }

  const bundle = await getSettingsBundle({ clientId, forceRefresh: true });
  const existingIndex = bundle.agents.findIndex((item) => item.agentId === sanitized.agentId);

  if (existingIndex >= 0) {
    bundle.agents[existingIndex] = sanitized;
  } else {
    bundle.agents.push(sanitized);
  }

  getStore().bundle = bundle;
  return bundle;
}

export function resolveEffectiveSettings(bundle: RuntimeSettingsBundle, agentId = DEFAULT_AGENT_ID) {
  const selectedAgent =
    bundle.agents.find((agent) => agent.agentId === agentId) ??
    bundle.agents.find((agent) => agent.agentId === DEFAULT_AGENT_ID) ??
    defaultTwitterAgent();

  const anthropicApiKey = selectedAgent.useGlobalAnthropic
    ? bundle.global.anthropicApiKey
    : selectedAgent.anthropicApiKeyOverride || bundle.global.anthropicApiKey;

  return {
    selectedAgent,
    settings: {
      integration: selectedAgent.integration,
      anthropicApiKey,
      twitterMcpUrl: selectedAgent.twitterMcpUrl,
      twitterApiKey: selectedAgent.twitterApiKey,
      twitterApiSecret: selectedAgent.twitterApiSecret,
      twitterAccessToken: selectedAgent.twitterAccessToken,
      twitterAccessSecret: selectedAgent.twitterAccessSecret,
      discordMcpUrl: selectedAgent.discordMcpUrl,
      discordBotToken: selectedAgent.discordBotToken,
      discordGuildName: selectedAgent.discordGuildName,
      discordDefaultChannelName: selectedAgent.discordDefaultChannelName
    } satisfies EffectiveRuntimeSettings
  };
}
