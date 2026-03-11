import {
  getTwitterRuntimeConfig,
  type TwitterRuntimeConfig,
  updateTwitterRuntimeConfig
} from "@/lib/runtime-config";

export async function GET() {
  const config = getTwitterRuntimeConfig();

  return Response.json({
    config,
    status: {
      twitterApiKey: Boolean(config.twitterApiKey),
      twitterApiSecret: Boolean(config.twitterApiSecret),
      twitterAccessToken: Boolean(config.twitterAccessToken),
      twitterAccessSecret: Boolean(config.twitterAccessSecret)
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<TwitterRuntimeConfig>;
    const config = updateTwitterRuntimeConfig(body);
    return Response.json({ ok: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown config error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
