import {
  getLinkedInRuntimeConfig,
  type LinkedInRuntimeConfig,
  updateLinkedInRuntimeConfig
} from "@/lib/runtime-config";

export async function GET() {
  const config = getLinkedInRuntimeConfig();

  return Response.json({
    config,
    status: {
      linkedinAccessToken: Boolean(config.linkedinAccessToken),
      linkedinPersonUrn: Boolean(config.linkedinPersonUrn)
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<LinkedInRuntimeConfig>;
    const config = updateLinkedInRuntimeConfig(body);
    return Response.json({ ok: true, config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown config error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
