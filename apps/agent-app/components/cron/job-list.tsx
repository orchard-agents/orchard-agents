import type { CronJob } from "../chat/types";
import { formatSchedule } from "../chat/utils";

interface JobListProps {
  jobs: CronJob[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onToggleJob: (job: CronJob) => void;
  onDeleteJob: (jobId: string) => void;
}

export function JobList({ jobs, selectedJobId, onSelectJob, onToggleJob, onDeleteJob }: JobListProps) {
  return (
    <div className="min-h-0 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
      <p className="mb-2 text-sm font-semibold">Recurring Tasks</p>
      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className={`rounded-lg border p-3 ${
              selectedJobId === job.id ? "border-emerald-500/60 bg-emerald-600/20" : "border-neutral-700"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectJob(job.id)}
              className="w-full text-left"
            >
              <p className="truncate text-sm font-medium">{job.name}</p>
              <p className="text-[11px] text-emerald-300">Mode: Action</p>
              <p className="truncate text-xs text-neutral-400">{formatSchedule(job)}</p>
              <p className="truncate text-xs text-neutral-400">
                Next: {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : "none"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onToggleJob(job)}
              className="mt-2 rounded border border-neutral-700 px-2 py-1 text-xs"
            >
              {job.enabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              onClick={() => onDeleteJob(job.id)}
              className="ml-2 mt-2 rounded border border-red-700/60 px-2 py-1 text-xs text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
