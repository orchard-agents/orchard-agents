import {
  getInstagramRuntimeConfig,
  type InstagramRuntimeConfig,
  updateInstagramRuntimeConfig
} from "@/lib/runtime-config";

export async function GET() {
  const config = getInstagramRuntimeConfig();

  return Response.json({
    config,
    status: {
      facebookAccessToken: Boolean(config.facebookAccessToken),
      instagramBusinessAccountId: Boolean(config.instagramBusinessAccountId)
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<InstagramRuntimeConfig>;
    const config = updateInstagramRuntimeConfig(body);
    return Response.json({ ok: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown config error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
