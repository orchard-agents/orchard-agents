import {
  getDiscordRuntimeConfig,
  type DiscordRuntimeConfig,
  updateDiscordRuntimeConfig
} from "@/lib/runtime-config";

export async function GET() {
  const config = getDiscordRuntimeConfig();

  return Response.json({
    config,
    status: {
      discordBotToken: Boolean(config.discordBotToken),
      discordGuildName: Boolean(config.discordGuildName),
      discordDefaultChannelName: Boolean(config.discordDefaultChannelName)
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DiscordRuntimeConfig>;
    const config = updateDiscordRuntimeConfig(body);
    return Response.json({ ok: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown config error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
