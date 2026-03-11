import { listCronJobRuns } from "@/lib/cron-db";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { jobId } = await params;
    const runs = await listCronJobRuns(jobId);
    return Response.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron runs error";
    return Response.json({ error: message }, { status: 500 });
  }
}
