export type ScheduleType = "every_x_minutes" | "every_x_hours" | "daily_at" | "weekly_at";

export function parseTimeOfDay(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error("Invalid time format. Expected HH:mm.");
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid time value.");
  }

  return { hours, minutes };
}

export function computeNextRunAt(options: {
  scheduleType: ScheduleType;
  scheduleValue: string;
  timezone?: string;
  fromDate?: Date;
}) {
  const now = options.fromDate ?? new Date();

  if (options.scheduleType === "every_x_minutes") {
    const minutes = Number(options.scheduleValue);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new Error("scheduleValue for every_x_minutes must be a positive number.");
    }

    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  if (options.scheduleType === "every_x_hours") {
    const hours = Number(options.scheduleValue);
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new Error("scheduleValue for every_x_hours must be a positive number.");
    }

    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  const tz = options.timezone || "America/New_York";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  });

  const parts = formatter.formatToParts(now);
  const pick = (type: string) => parts.find((item) => item.type === type)?.value;
  const month = Number(pick("month"));
  const day = Number(pick("day"));
  const year = Number(pick("year"));
  const currentHour = Number(pick("hour"));
  const currentMinute = Number(pick("minute"));
  const currentWeekday = pick("weekday") || "Mon";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  const baseUtc = Date.UTC(year, month - 1, day, 0, 0, 0);

  if (options.scheduleType === "daily_at") {
    const { hours, minutes } = parseTimeOfDay(options.scheduleValue);

    let next = new Date(baseUtc + (hours * 60 + minutes) * 60 * 1000);
    if (hours < currentHour || (hours === currentHour && minutes <= currentMinute)) {
      next = new Date(next.getTime() + 24 * 60 * 60 * 1000);
    }

    return next;
  }

  const [weekdayStr, timeStr] = options.scheduleValue.split("|");
  if (!weekdayStr || !timeStr) {
    throw new Error("weekly_at scheduleValue must be DAY|HH:mm (example: MON|09:00)");
  }

  const targetWeekdayMap: Record<string, number> = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6
  };

  const targetWeekday = targetWeekdayMap[weekdayStr.toUpperCase()];
  if (targetWeekday === undefined) {
    throw new Error("Invalid weekly day. Use SUN, MON, TUE, WED, THU, FRI, SAT.");
  }

  const { hours, minutes } = parseTimeOfDay(timeStr);
  const currentWeekdayNumber = weekdayMap[currentWeekday] ?? 1;

  let dayDelta = targetWeekday - currentWeekdayNumber;
  if (dayDelta < 0) {
    dayDelta += 7;
  }

  if (dayDelta === 0 && (hours < currentHour || (hours === currentHour && minutes <= currentMinute))) {
    dayDelta = 7;
  }

  return new Date(baseUtc + dayDelta * 24 * 60 * 60 * 1000 + (hours * 60 + minutes) * 60 * 1000);
}
