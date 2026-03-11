import { createAnthropic } from "@ai-sdk/anthropic";
import { createMCPClient } from "@ai-sdk/mcp";
import { generateText, stepCountIs } from "ai";
import { ORCHARD_SYSTEM_PROMPT } from "@/lib/agent";
import { getSettingsBundle, resolveEffectiveSettings } from "@/lib/runtime-settings";

function mcpConfigUrlFromMcpUrl(mcpUrl: string) {
  const parsed = new URL(mcpUrl);
  parsed.pathname = parsed.pathname.replace(/\/mcp\/?$/, "/config");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

async function syncTwitterCredentialsToMcp(
  settings: ReturnType<typeof resolveEffectiveSettings>["settings"]
) {
  const configUrl = mcpConfigUrlFromMcpUrl(settings.twitterMcpUrl);

  await fetch(configUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      twitterApiKey: settings.twitterApiKey,
      twitterApiSecret: settings.twitterApiSecret,
      twitterAccessToken: settings.twitterAccessToken,
      twitterAccessSecret: settings.twitterAccessSecret
    })
  });
}

async function syncDiscordCredentialsToMcp(
  settings: ReturnType<typeof resolveEffectiveSettings>["settings"]
) {
  const configUrl = mcpConfigUrlFromMcpUrl(settings.discordMcpUrl);

  await fetch(configUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      discordBotToken: settings.discordBotToken,
      discordGuildName: settings.discordGuildName,
      discordDefaultChannelName: settings.discordDefaultChannelName
    })
  });
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRunResult {
  text: string;
  toolCalls: unknown[];
  toolResults: unknown[];
}

export async function runOrchardAgent(
  messages: AgentMessage[],
  systemPrompt = ORCHARD_SYSTEM_PROMPT,
  options?: { agentId?: string; isScheduledRun?: boolean }
): Promise<AgentRunResult> {
  const bundle = await getSettingsBundle();
  const { settings } = resolveEffectiveSettings(bundle, options?.agentId);
  const anthropic = createAnthropic({ apiKey: settings.anthropicApiKey });
  const effectiveSystemPrompt = options?.isScheduledRun
    ? `${systemPrompt}\n\nSCHEDULED EXECUTION CONTEXT:\n- This request is triggered by an authorized cron job already approved by the user.\n- Do not ask for additional posting confirmation.\n- Execute the required tool actions directly and report what was done.`
    : systemPrompt;

  if (settings.integration === "twitter") {
    await syncTwitterCredentialsToMcp(settings);
  } else {
    await syncDiscordCredentialsToMcp(settings);
  }

  const mcpClient = await createMCPClient({
    transport: {
      type: "http",
      url: settings.integration === "twitter" ? settings.twitterMcpUrl : settings.discordMcpUrl
    }
  });

  try {
    const tools = await mcpClient.tools();

    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: effectiveSystemPrompt,
      messages: messages as never,
      tools,
      stopWhen: stepCountIs(5)
    });

    return {
      text: result.text || "I could not generate a response.",
      toolCalls: result.toolCalls,
      toolResults: result.toolResults
    };
  } finally {
    await mcpClient.close();
  }
}
