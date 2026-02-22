import type { DayHours } from "../types";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DAY_NAMES_HE: Record<string, string> = {
  sunday: "ראשון", monday: "שני", tuesday: "שלישי", wednesday: "רביעי",
  thursday: "חמישי", friday: "שישי", saturday: "שבת",
};

export { DAY_KEYS, DAY_NAMES_HE };

export function getOpeningStatusText(
  openingHours: Record<string, DayHours | null> | string,
  now: Date = new Date(),
): string {
  if (typeof openingHours === "string") {
    return openingHours.split("\n")[0];
  }

  const todayKey = DAY_KEYS[now.getDay()];
  const todayHours = openingHours[todayKey];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (todayHours) {
    if (currentTime >= todayHours.open && currentTime < todayHours.close) {
      return `פתוח עד ${todayHours.close}`;
    }
    if (currentTime < todayHours.open) {
      return `סגור. יפתח ב-${todayHours.open}`;
    }
  }

  // Closed now — find next opening across the week
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (now.getDay() + i) % 7;
    const nextDayKey = DAY_KEYS[nextDayIndex];
    const nextHours = openingHours[nextDayKey];
    if (nextHours) {
      if (i === 1) return `סגור. יפתח מחר ב-${nextHours.open}`;
      return `סגור. יפתח ביום ${DAY_NAMES_HE[nextDayKey]} ${nextHours.open}`;
    }
  }

  return "סגור";
}
