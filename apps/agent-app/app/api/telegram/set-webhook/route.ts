export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appUrl = process.env.APP_BASE_URL;

  if (!token) {
    return Response.json(
      { error: "Missing TELEGRAM_BOT_TOKEN environment variable." },
      { status: 500 }
    );
  }

  if (!appUrl) {
    return Response.json(
      { error: "Missing APP_BASE_URL environment variable." },
      { status: 500 }
    );
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"]
    })
  });

  const body = await response.text();

  if (!response.ok) {
    return Response.json(
      { error: `Failed to set webhook (${response.status})`, details: body },
      { status: 500 }
    );
  }

  return Response.json({ ok: true, webhookUrl, telegram: body });
}
