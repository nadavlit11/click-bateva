import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TripDoc, Poi, Category } from "../../../types";
import { reportError } from "../../../lib/errorReporting";

const DAY_EMOJIS = ["🏕️", "🌲", "🏔️", "🌊", "🦁", "🌄", "⛺"];

interface TripPanelProps {
  trip: TripDoc | null;
  allPois: Poi[];
  categories: Category[];
  orderedTripPoiIds: string[];
  activeDayNumber: number;
  onSetActiveDayNumber: (n: number) => void;
  onRemovePoi: (poiId: string) => void;
  onReorderPoi: (poiId: string, newDay: number, newIndex: number) => void;
  onAddDay: () => void;
  onSetClientName: (name: string) => void;
  onClearTrip: () => void;
  onShareTrip: () => Promise<string>;
  onNewTrip: () => void;
  onPoiSelect: (poiId: string) => void;
  isLoggedIn: boolean;
  onLoginClick: () => void;
}

// ── Sortable POI row ────────────────────────────────────────────────────────

interface SortablePoiRowProps {
  poi: Poi;
  cat: Category | undefined;
  tripNum: number;
  onPoiSelect: (poiId: string) => void;
  onRemovePoi: (poiId: string) => void;
}

function SortablePoiRow({ poi, cat, tripNum, onPoiSelect, onRemovePoi }: SortablePoiRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: poi.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer group"
      onClick={() => onPoiSelect(poi.id)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        onClick={e => e.stopPropagation()}
        title="גרור לשינוי סדר"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>

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
}

// ── Static row for drag overlay ─────────────────────────────────────────────

function PoiRowOverlay({ poi, cat, tripNum }: { poi: Poi; cat: Category | undefined; tripNum: number }) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white shadow-lg border border-gray-200">
      <span className="text-gray-400 shrink-0">
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </span>
      <span
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white text-xs"
        style={{ backgroundColor: cat?.color ?? "#6b7280" }}
      >
        {cat?.iconUrl ? <img src={cat.iconUrl} alt="" className="w-4 h-4" /> : "📍"}
      </span>
      <span className="flex-1 text-sm text-gray-700 font-medium truncate">{poi.name}</span>
      <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center font-bold shrink-0">
        {tripNum}
      </span>
    </div>
  );
}

// ── Main TripPanel ──────────────────────────────────────────────────────────

export function TripPanel({
  trip,
  allPois,
  categories,
  orderedTripPoiIds,
  activeDayNumber,
  onSetActiveDayNumber,
  onRemovePoi,
  onReorderPoi,
  onAddDay,
  onSetClientName,
  onClearTrip,
  onShareTrip,
  onNewTrip,
  onPoiSelect,
  isLoggedIn,
  onLoginClick,
}: TripPanelProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const poiMap = useMemo(() => new Map(allPois.map(p => [p.id, p])), [allPois]);
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const tripNumbers = useMemo(
    () => new Map(orderedTripPoiIds.map((id, i) => [id, i + 1])),
    [orderedTripPoiIds]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  async function handleShare() {
    if (!isLoggedIn) {
      setShowLoginHint(true);
      return;
    }
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

  // Find which day a POI belongs to
  function findPoiDay(poiId: string): number {
    for (let d = 0; d < byDay.length; d++) {
      if (byDay[d].some(p => p.id === poiId)) return d + 1;
    }
    return 1;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activePoiId = active.id as string;
    const overPoiId = over.id as string;

    // Determine destination day and index
    const overDay = findPoiDay(overPoiId);
    const dayPois = byDay[overDay - 1];
    const overIndex = dayPois.findIndex(p => p.id === overPoiId);

    onReorderPoi(activePoiId, overDay, overIndex);
  }

  const activePoi = activeId ? poiMap.get(activeId) : null;
  const activeCat = activePoi ? catMap.get(activePoi.categoryId) : undefined;

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

      {/* Active day indicator */}
      <div className="px-4 pb-2">
        <p className="text-xs text-gray-400">
          מוסיף ל<span className="font-semibold text-teal-600">יום {activeDayNumber}</span> — לחץ על יום אחר לשינוי
        </p>
      </div>

      {/* Trip plan — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {byDay.map((dayPois, dayIdx) => {
            const dayNumber = dayIdx + 1;
            const isActive = dayNumber === activeDayNumber;
            return (
              <div key={dayIdx}>
                {/* Day header — clickable to set active day */}
                <button
                  className="w-full rounded-xl px-3 py-2 mb-2 flex items-center gap-2 text-start transition-opacity"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #0d9488, #0891b2)"
                      : "linear-gradient(135deg, #5eead4, #67e8f9)",
                    opacity: isActive ? 1 : 0.7,
                  }}
                  onClick={() => onSetActiveDayNumber(dayNumber)}
                  title={`הוסף לטיול ליום ${dayNumber}`}
                >
                  <span className="text-base">{DAY_EMOJIS[dayIdx] ?? "📍"}</span>
                  <span className="text-sm font-semibold text-white">יום {dayNumber}</span>
                  {isActive && (
                    <span className="ms-auto text-xs bg-white/30 text-white rounded-full px-2 py-0.5 font-medium">
                      פעיל
                    </span>
                  )}
                </button>

                {/* Sortable POI rows */}
                <SortableContext items={dayPois.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {dayPois.map((poi) => (
                      <SortablePoiRow
                        key={poi.id}
                        poi={poi}
                        cat={catMap.get(poi.categoryId)}
                        tripNum={tripNumbers.get(poi.id) ?? 0}
                        onPoiSelect={onPoiSelect}
                        onRemovePoi={onRemovePoi}
                      />
                    ))}
                  </div>
                </SortableContext>

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
            );
          })}

          <DragOverlay>
            {activePoi && (
              <PoiRowOverlay
                poi={activePoi}
                cat={activeCat}
                tripNum={tripNumbers.get(activePoi.id) ?? 0}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Login hint for anonymous users */}
      {showLoginHint && !isLoggedIn && (
        <div className="mx-4 mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <p className="text-xs text-amber-700">יש להתחבר כדי לשתף את הטיול</p>
          <button
            onClick={onLoginClick}
            className="text-xs text-amber-700 font-semibold underline shrink-0 ms-2"
          >
            התחבר
          </button>
        </div>
      )}

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
