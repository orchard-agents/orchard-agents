import { deleteCronJob, updateCronJob } from "@/lib/cron-db";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { jobId } = await params;
    const body = (await request.json()) as Partial<{
      name: string;
      prompt: string;
      scheduleType: "every_x_minutes" | "every_x_hours" | "daily_at" | "weekly_at";
      scheduleValue: string;
      timezone: string;
      enabled: boolean;
    }>;

    const job = await updateCronJob(jobId, body);
    return Response.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron update error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { jobId } = await params;
    await deleteCronJob(jobId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron delete error";
    return Response.json({ error: message }, { status: 500 });
  }
}
