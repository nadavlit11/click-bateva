import { useState, useMemo } from "react";
import type { TripDoc, Poi, Category } from "../../types";
import { reportError } from "../../lib/errorReporting";

const DAY_EMOJIS = ["🏕️", "🌲", "🏔️", "🌊", "🦁", "🌄", "⛺"];

interface TripPanelProps {
  trip: TripDoc | null;
  allPois: Poi[];
  categories: Category[];
  orderedTripPoiIds: string[];
  onRemovePoi: (poiId: string) => void;
  onAddDay: () => void;
  onSetClientName: (name: string) => void;
  onClearTrip: () => void;
  onShareTrip: () => Promise<string>;
  onNewTrip: () => void;
  onPoiSelect: (poiId: string) => void;
}

export function TripPanel({
  trip,
  allPois,
  categories,
  orderedTripPoiIds,
  onRemovePoi,
  onAddDay,
  onSetClientName,
  onClearTrip,
  onShareTrip,
  onNewTrip,
  onPoiSelect,
}: TripPanelProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const poiMap = useMemo(() => new Map(allPois.map(p => [p.id, p])), [allPois]);
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const tripNumbers = useMemo(() => new Map(orderedTripPoiIds.map((id, i) => [id, i + 1])), [orderedTripPoiIds]);

  async function handleShare() {
    setSharing(true);
    try {
      const tripId = await onShareTrip();
      const url = `${window.location.origin}/trip/${tripId}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
    } catch (err) {
      reportError(err, { source: "TripPanel.handleShare" });
    } finally {
      setSharing(false);
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!trip || orderedTripPoiIds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="text-5xl mb-4">✈️</div>
        <h3 className="text-base font-semibold text-gray-700 mb-1">הטיול שלך מחכה</h3>
        <p className="text-sm text-gray-400">פתח מקום במפה ולחץ &quot;הוסף לטיול&quot;</p>
      </div>
    );
  }

  const numDays = trip.numDays ?? 1;

  // Group POIs by dayNumber (from the entry stored in trip.pois)
  const byDay: Poi[][] = Array.from({ length: numDays }, () => []);
  for (const entry of trip.pois) {
    const poi = poiMap.get(entry.poiId);
    if (!poi) continue;
    const dayIdx = Math.min((entry.dayNumber ?? 1) - 1, numDays - 1);
    byDay[dayIdx].push(poi);
  }
  // Sort each day's POIs by addedAt
  const poiToEntry = new Map(trip.pois.map(e => [e.poiId, e]));
  for (const dayPois of byDay) {
    dayPois.sort((a, b) => (poiToEntry.get(a.id)?.addedAt ?? 0) - (poiToEntry.get(b.id)?.addedAt ?? 0));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Client name */}
      <div className="px-4 pt-3 pb-2">
        <input
          type="text"
          defaultValue={trip.clientName}
          onBlur={(e) => onSetClientName(e.target.value)}
          placeholder="שם הלקוח / שם הטיול"
          className="w-full text-sm text-gray-700 border-b border-gray-200 focus:border-green-500 focus:outline-none pb-1 bg-transparent placeholder-gray-400"
        />
      </div>

      {/* Trip plan — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {byDay.map((dayPois, dayIdx) => (
          <div key={dayIdx}>
            {/* Day header */}
            <div
              className="rounded-xl px-3 py-2 mb-2 flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}
            >
              <span className="text-base">{DAY_EMOJIS[dayIdx] ?? "📍"}</span>
              <span className="text-sm font-semibold text-white">יום {dayIdx + 1}</span>
            </div>

            {/* POI rows */}
            <div className="space-y-1">
              {dayPois.map((poi) => {
                const cat = catMap.get(poi.categoryId);
                const tripNum = tripNumbers.get(poi.id) ?? 0;
                return (
                  <div
                    key={poi.id}
                    className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer group"
                    onClick={() => onPoiSelect(poi.id)}
                  >
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white text-xs"
                      style={{ backgroundColor: cat?.color ?? "#6b7280" }}
                    >
                      {cat?.iconUrl ? (
                        <img src={cat.iconUrl} alt="" className="w-4 h-4" />
                      ) : (
                        "📍"
                      )}
                    </span>

                    <span className="flex-1 text-sm text-gray-700 font-medium truncate">
                      {poi.name}
                    </span>

                    <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center font-bold shrink-0">
                      {tripNum}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePoi(poi.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all text-base leading-none shrink-0"
                      title="הסר מהטיול"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {/* Add Day button — only after the last day */}
              {dayIdx === numDays - 1 && (
                <button
                  onClick={onAddDay}
                  className="w-full mt-1 py-2 text-xs text-teal-600 border border-dashed border-teal-300 rounded-xl hover:bg-teal-50 transition-colors"
                >
                  ➕ הוסף יום {numDays + 1}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Share URL (shown after sharing) */}
      {shareUrl && (
        <div className="mx-4 mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-700 font-medium mb-1">הקישור הועתק! שתף עם הלקוח:</p>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-green-600 underline break-all"
            dir="ltr"
          >
            {shareUrl}
          </a>
        </div>
      )}

      {/* Footer actions */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2">
        <button
          onClick={onClearTrip}
          className="flex-1 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          🗑️ נקה
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex-1 py-2 text-xs text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {sharing ? "..." : "📤 שתף לקוח"}
        </button>
        <button
          onClick={onNewTrip}
          className="flex-1 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ➕ טיול חדש
        </button>
      </div>
    </div>
  );
}
