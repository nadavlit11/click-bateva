import { useState } from "react";
import type { DayHours } from "../../types";
import {
  DAY_KEYS,
  DAY_NAMES_HE,
  getOpeningStatusText,
  isCurrentlyOpen,
} from "../../lib/openingStatus";

interface OpeningHoursDisplayProps {
  openingHours: Record<string, DayHours | null> | string | null;
}

export function OpeningHoursDisplay({
  openingHours,
}: OpeningHoursDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!openingHours) return null;

  if (openingHours === "by_appointment") {
    return (
      <p className="text-xs text-gray-500 mb-2">
        {"🕐 בתיאום מראש"}
      </p>
    );
  }

  if (typeof openingHours === "string") return null;

  const open = isCurrentlyOpen(openingHours);
  const statusText = getOpeningStatusText(openingHours);
  const todayIndex = new Date().getDay();

  return (
    <div className="text-xs mb-2">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 w-full text-start"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            open ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span
          className={`flex-1 ${
            open ? "text-green-600" : "text-red-500"
          }`}
        >
          {statusText}
        </span>
        <span className="text-gray-400">
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {expanded && (
        <div className="mt-1 mr-3.5 space-y-0.5 text-gray-600">
          {DAY_KEYS.map((day, i) => {
            const hours = openingHours[day];
            const isToday = i === todayIndex;
            return (
              <div
                key={day}
                className={`flex justify-between ${
                  isToday ? "font-bold text-gray-900" : ""
                }`}
              >
                <span>{DAY_NAMES_HE[day]}</span>
                <span
                  dir="ltr"
                  className={!hours ? "text-red-500" : ""}
                >
                  {hours
                    ? `${hours.open}\u2013${hours.close}`
                    : "\u05E1\u05D2\u05D5\u05E8"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
