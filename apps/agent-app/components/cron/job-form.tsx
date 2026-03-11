import type { AgentConfig, JobFormState } from "../chat/types";

interface JobFormProps {
  agents: AgentConfig[];
  selectedAgentId: string;
  jobForm: JobFormState;
  onAgentChange: (agentId: string) => void;
  onFormChange: (update: Partial<JobFormState>) => void;
  onCreateJob: () => void;
}

export function JobForm({
  agents,
  selectedAgentId,
  jobForm,
  onAgentChange,
  onFormChange,
  onCreateJob
}: JobFormProps) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
      <p className="mb-3 text-sm font-semibold">Create Recurring Task</p>
      <div className="mb-3 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-100">
        Mode: <span className="font-semibold">Action</span> (default). Recurring tasks are executed as real tool actions,
        not advisory replies.
      </div>
      <div className="space-y-3">
        <input
          value={jobForm.name}
          onChange={(event) => onFormChange({ name: event.target.value })}
          placeholder="Job name"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        />

        <textarea
          value={jobForm.prompt}
          onChange={(event) => onFormChange({ prompt: event.target.value })}
          placeholder="Prompt to run each schedule"
          className="h-28 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        />

        <select
          value={selectedAgentId}
          onChange={(event) => onAgentChange(event.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>

        <select
          value={jobForm.scheduleType}
          onChange={(event) =>
            onFormChange({
              scheduleType: event.target.value as JobFormState["scheduleType"]
            })
          }
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        >
          <option value="every_x_minutes">Every X minutes</option>
          <option value="every_x_hours">Every X hours</option>
          <option value="daily_at">Daily at time</option>
          <option value="weekly_at">Weekly on day/time</option>
        </select>

        {jobForm.scheduleType === "every_x_minutes" ? (
          <select
            value={jobForm.intervalMinutes}
            onChange={(event) => onFormChange({ intervalMinutes: event.target.value })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          >
            <option value="5">Every 5 minutes</option>
            <option value="10">Every 10 minutes</option>
            <option value="15">Every 15 minutes</option>
            <option value="20">Every 20 minutes</option>
            <option value="30">Every 30 minutes</option>
            <option value="45">Every 45 minutes</option>
            <option value="60">Every 60 minutes</option>
          </select>
        ) : null}

        {jobForm.scheduleType === "every_x_hours" ? (
          <select
            value={jobForm.intervalHours}
            onChange={(event) => onFormChange({ intervalHours: event.target.value })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          >
            <option value="1">Every 1 hour</option>
            <option value="2">Every 2 hours</option>
            <option value="3">Every 3 hours</option>
            <option value="4">Every 4 hours</option>
            <option value="6">Every 6 hours</option>
            <option value="8">Every 8 hours</option>
            <option value="12">Every 12 hours</option>
            <option value="24">Every 24 hours</option>
          </select>
        ) : null}

        {jobForm.scheduleType === "daily_at" ? (
          <input
            type="time"
            value={jobForm.dailyTime}
            onChange={(event) => onFormChange({ dailyTime: event.target.value })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          />
        ) : null}

        {jobForm.scheduleType === "weekly_at" ? (
          <div className="grid grid-cols-2 gap-2">
            <select
              value={jobForm.weeklyDay}
              onChange={(event) => onFormChange({ weeklyDay: event.target.value })}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
            >
              <option value="MON">Monday</option>
              <option value="TUE">Tuesday</option>
              <option value="WED">Wednesday</option>
              <option value="THU">Thursday</option>
              <option value="FRI">Friday</option>
              <option value="SAT">Saturday</option>
              <option value="SUN">Sunday</option>
            </select>
            <input
              type="time"
              value={jobForm.weeklyTime}
              onChange={(event) => onFormChange({ weeklyTime: event.target.value })}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        <input
          value={jobForm.timezone}
          onChange={(event) => onFormChange({ timezone: event.target.value })}
          placeholder="Timezone (America/New_York)"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
        />

        <div className="flex items-center gap-2 text-sm">
          <input
            id="cron-enabled"
            type="checkbox"
            checked={jobForm.enabled}
            onChange={(event) => onFormChange({ enabled: event.target.checked })}
          />
          <label htmlFor="cron-enabled">Enabled</label>
        </div>

        <button
          type="button"
          onClick={onCreateJob}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
        >
          Create job
        </button>
      </div>
    </section>
  );
}
