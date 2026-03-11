import type { CronJob, CronRun } from "./types";

export function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function formatSchedule(job: CronJob) {
  if (job.schedule_type === "every_x_minutes") {
    return `Every ${job.schedule_value} minute(s)`;
  }

  if (job.schedule_type === "every_x_hours") {
    return `Every ${job.schedule_value} hour(s)`;
  }

  if (job.schedule_type === "daily_at") {
    return `Daily at ${job.schedule_value}`;
  }

  const [day, time] = job.schedule_value.split("|");
  return `Weekly on ${day} at ${time}`;
}

export function getRunActionBadge(run: CronRun) {
  const output = run.output ?? "";
  const error = run.error ?? "";

  if (output.includes("Cron action executed via tools:")) {
    return {
      label: "Action Executed",
      className: "bg-emerald-700/60 text-emerald-100"
    };
  }

  if (error.includes("Action mode requires at least one tool execution")) {
    return {
      label: "No Action",
      className: "bg-red-900/60 text-red-200"
    };
  }

  return {
    label: "Unknown",
    className: "bg-neutral-700 text-neutral-200"
  };
}
