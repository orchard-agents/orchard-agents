export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return Response.json(
      { error: "Missing TELEGRAM_BOT_TOKEN environment variable." },
      { status: 500 }
    );
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const body = await response.text();

  if (!response.ok) {
    return Response.json(
      { error: `Failed to get webhook info (${response.status})`, details: body },
      { status: 500 }
    );
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
