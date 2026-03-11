import { DEFAULT_CLIENT_ID } from "@/lib/runtime-settings";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { computeNextRunAt, type ScheduleType } from "@/lib/cron-utils";

export interface CronJobRecord {
  id: string;
  client_id: string;
  agent_id: string;
  conversation_id: string;
  name: string;
  prompt: string;
  schedule_type: ScheduleType;
  schedule_value: string;
  timezone: string;
  enabled: boolean;
  is_running: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CronJobRunRecord {
  id: string;
  cron_job_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  output: string | null;
  error: string | null;
}

export async function listCronJobs(clientId = DEFAULT_CLIENT_ID) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cron_jobs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list cron jobs: ${error.message}`);
  }

  return (data ?? []) as CronJobRecord[];
}

export async function createCronJob(input: {
  clientId?: string;
  agentId: string;
  conversationId: string;
  name: string;
  prompt: string;
  scheduleType: ScheduleType;
  scheduleValue: string;
  timezone?: string;
  enabled?: boolean;
}) {
  const supabase = getSupabaseAdminClient();
  const timezone = input.timezone || "America/New_York";
  const enabled = input.enabled ?? true;
  const nextRunAt = enabled
    ? computeNextRunAt({
        scheduleType: input.scheduleType,
        scheduleValue: input.scheduleValue,
        timezone
      }).toISOString()
    : null;

  const { data, error } = await supabase
    .from("cron_jobs")
    .insert({
      client_id: input.clientId ?? DEFAULT_CLIENT_ID,
      agent_id: input.agentId,
      conversation_id: input.conversationId,
      name: input.name,
      prompt: input.prompt,
      schedule_type: input.scheduleType,
      schedule_value: input.scheduleValue,
      timezone,
      enabled,
      next_run_at: nextRunAt,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single<CronJobRecord>();

  if (error || !data) {
    throw new Error(`Failed to create cron job: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function updateCronJob(
  jobId: string,
  patch: Partial<{
    name: string;
    prompt: string;
    scheduleType: ScheduleType;
    scheduleValue: string;
    timezone: string;
    enabled: boolean;
  }>
) {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from("cron_jobs")
    .select("*")
    .eq("id", jobId)
    .single<CronJobRecord>();

  if (fetchError || !existing) {
    throw new Error(`Failed to load cron job: ${fetchError?.message ?? "Not found"}`);
  }

  const scheduleType = patch.scheduleType ?? existing.schedule_type;
  const scheduleValue = patch.scheduleValue ?? existing.schedule_value;
  const timezone = patch.timezone ?? existing.timezone;
  const enabled = patch.enabled ?? existing.enabled;

  const nextRunAt = enabled
    ? computeNextRunAt({
        scheduleType,
        scheduleValue,
        timezone
      }).toISOString()
    : null;

  const { data, error } = await supabase
    .from("cron_jobs")
    .update({
      name: patch.name ?? existing.name,
      prompt: patch.prompt ?? existing.prompt,
      schedule_type: scheduleType,
      schedule_value: scheduleValue,
      timezone,
      enabled,
      next_run_at: nextRunAt,
      updated_at: new Date().toISOString(),
      last_error: null
    })
    .eq("id", jobId)
    .select("*")
    .single<CronJobRecord>();

  if (error || !data) {
    throw new Error(`Failed to update cron job: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function deleteCronJob(jobId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("cron_jobs").delete().eq("id", jobId);

  if (error) {
    throw new Error(`Failed to delete cron job: ${error.message}`);
  }
}

export async function listCronJobRuns(jobId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cron_job_runs")
    .select("*")
    .eq("cron_job_id", jobId)
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to list cron runs: ${error.message}`);
  }

  return (data ?? []) as CronJobRunRecord[];
}

export async function findDueCronJobs(now = new Date(), limit = 10) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cron_jobs")
    .select("*")
    .eq("enabled", true)
    .eq("is_running", false)
    .lte("next_run_at", now.toISOString())
    .order("next_run_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch due cron jobs: ${error.message}`);
  }

  return (data ?? []) as CronJobRecord[];
}

export async function claimCronJob(jobId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cron_jobs")
    .update({
      is_running: true,
      updated_at: new Date().toISOString()
    })
    .eq("id", jobId)
    .eq("is_running", false)
    .select("*")
    .single<CronJobRecord>();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(`Failed to claim cron job: ${error.message}`);
  }

  return data;
}

export async function createCronRun(jobId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cron_job_runs")
    .insert({
      cron_job_id: jobId,
      status: "running",
      started_at: new Date().toISOString()
    })
    .select("*")
    .single<CronJobRunRecord>();

  if (error || !data) {
    throw new Error(`Failed to create cron run: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

export async function completeCronRun(params: {
  runId: string;
  job: CronJobRecord;
  status: "success" | "failed";
  output?: string;
  error?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const finishedAt = new Date();

  const { error: runError } = await supabase
    .from("cron_job_runs")
    .update({
      status: params.status,
      output: params.output ?? null,
      error: params.error ?? null,
      finished_at: finishedAt.toISOString()
    })
    .eq("id", params.runId);

  if (runError) {
    throw new Error(`Failed to update cron run: ${runError.message}`);
  }

  const nextRunAt = params.job.enabled
    ? computeNextRunAt({
        scheduleType: params.job.schedule_type,
        scheduleValue: params.job.schedule_value,
        timezone: params.job.timezone,
        fromDate: finishedAt
      }).toISOString()
    : null;

  const { error: jobError } = await supabase
    .from("cron_jobs")
    .update({
      is_running: false,
      last_run_at: finishedAt.toISOString(),
      last_status: params.status,
      last_error: params.error ?? null,
      next_run_at: nextRunAt,
      updated_at: finishedAt.toISOString()
    })
    .eq("id", params.job.id);

  if (jobError) {
    throw new Error(`Failed to update cron job after run: ${jobError.message}`);
  }
}
