import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import type { Poi, Category, DayHours } from "../../types";
import { lighten } from "../../lib/colorUtils";
import { DAY_KEYS, DAY_NAMES_HE, getOpeningStatusText } from "../../lib/openingStatus";

interface PoiDetailPanelProps {
  poi: Poi;
  category: Category | undefined;
  onClose: () => void;
}

export function PoiDetailPanel({ poi, category, onClose }: PoiDetailPanelProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const color = category?.color ?? "#4caf50";
  // mainImage is always first; poi.images are the extra images
  const allImages = [
    ...(poi.mainImage ? [poi.mainImage] : []),
    ...poi.images,
  ];
  const hasImages = allImages.length > 0;
  const slideCount = hasImages ? allImages.length : 1;

  // Reset state when POI changes
  useEffect(() => { setCurrentSlide(0); setDescExpanded(false); setHoursExpanded(false); }, [poi.id]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // RTL: left button = next, right button = prev
  function next() { setCurrentSlide(s => (s + 1) % slideCount); }
  function prev() { setCurrentSlide(s => (s - 1 + slideCount) % slideCount); }

  // Guard against username@host URL confusion attacks (e.g. "trusted.com@evil.com")
  const safeWebsiteHref = (() => {
    if (!poi.website) return null;
    try {
      const url = new URL(`https://${poi.website}`);
      return url.hostname === poi.website ? url.href : null;
    } catch { return null; }
  })();

  return (
    <div
      className="absolute top-4 left-4 w-[300px] bg-white rounded-2xl shadow-xl overflow-hidden z-10 max-h-[calc(100dvh-120px-2rem)] md:max-h-[calc(100dvh-2rem)] overflow-y-auto"
      style={{ outline: `3px solid ${color}` }}
    >

      {/* ── Carousel ── */}
      <div style={{ position: "relative", height: 180, overflow: "hidden" }}>

        {/* Track */}
        <div
          style={{
            display: "flex",
            height: "100%",
            direction: "ltr",
            transition: "transform 0.3s ease",
            transform: `translateX(${-currentSlide * 100}%)`,
          }}
        >
          {hasImages ? (
            allImages.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={poi.name}
                style={{ flex: "0 0 100%", height: "100%", objectFit: "cover" }}
              />
            ))
          ) : (
            <div
              style={{
                flex: "0 0 100%",
                height: "100%",
                background: `linear-gradient(135deg, ${color}cc, ${color})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {category?.iconUrl ? (
                <img
                  src={category.iconUrl}
                  alt=""
                  style={{ width: 64, height: 64, objectFit: "contain", opacity: 0.9 }}
                />
              ) : (
                <span style={{ fontSize: 56 }}>📍</span>
              )}
            </div>
          )}
        </div>

        {/* Arrows — only when multiple slides */}
        {slideCount > 1 && (
          <>
            <button onClick={next} style={arrowStyle("left")} aria-label="תמונה הבאה">‹</button>
            <button onClick={prev} style={arrowStyle("right")} aria-label="תמונה קודמת">›</button>
          </>
        )}

        {/* Dots — only when multiple slides */}
        {slideCount > 1 && (
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                aria-label={`תמונה ${i + 1}`}
                style={{
                  width: 6, height: 6, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
                  background: i === currentSlide ? "white" : "rgba(255,255,255,0.5)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 10, right: 10,
            width: 30, height: 30,
            background: "white", border: "none", borderRadius: "50%", cursor: "pointer",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)", color: "#374151", zIndex: 3,
          }}
          aria-label="סגור"
        >
          ×
        </button>
      </div>

      {/* ── Body ── */}
      <div className="px-4 pb-5 pt-3">

        {/* Category chip */}
        {category && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: lighten(color), color, border: `1px solid ${color}44` }}
          >
            {category.iconUrl ? (
              <img
                src={category.iconUrl}
                alt=""
                style={{ width: 13, height: 13, objectFit: "contain", filter: `opacity(0.85)` }}
              />
            ) : null}
            {category.name}
          </span>
        )}

        <div className="flex items-start justify-between gap-2 mt-2">
          <h2 className="text-xl font-bold text-gray-800">{poi.name}</h2>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${poi.location.lat},${poi.location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors"
            style={{ color }}
            aria-label="ניווט"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
            </svg>
          </a>
        </div>

        {poi.description && (
          <div className="mt-1">
            <p
              className={`text-sm text-gray-500 leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}
            >
              {poi.description}
            </p>
            {poi.description.length > 120 && (
              <button
                onClick={() => setDescExpanded(v => !v)}
                className="text-xs font-medium mt-1"
                style={{ color }}
              >
                {descExpanded ? "הצג פחות" : "קרא עוד"}
              </button>
            )}
          </div>
        )}

        {/* Restaurant buttons */}
        {category?.id === "food" && (poi.kashrutCertUrl || poi.menuUrl) && (
          <div className="flex gap-2 mt-3">
            {poi.kashrutCertUrl && (
              <a
                href={poi.kashrutCertUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 text-center text-xs font-medium rounded-lg border transition-colors hover:opacity-80"
                style={{ borderColor: color, color }}
              >
                צפייה בתעודת כשרות
              </a>
            )}
            {poi.menuUrl && (
              <a
                href={poi.menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 text-center text-xs font-medium rounded-lg border transition-colors hover:opacity-80"
                style={{ borderColor: color, color }}
              >
                צפייה בתפריט
              </a>
            )}
          </div>
        )}

        {/* Info + contact section */}
        {(poi.openingHours || poi.price || poi.phone || poi.email || poi.website || poi.videos.length > 0) && (
          <div className="h-px bg-gray-100 my-3" />
        )}

        {poi.openingHours && (
          <div className="mb-2">
            {poi.openingHours === "by_appointment" ? (
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">🕐</span>
                <span className="text-sm text-gray-700">בתיאום מראש</span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setHoursExpanded(v => !v)}
                  className="flex items-center gap-2 w-full text-start"
                >
                  <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">🕐</span>
                  <span className="text-sm text-gray-700 flex-1">
                    {getOpeningStatusText(poi.openingHours)}
                  </span>
                  <span className="text-xs text-gray-400">{hoursExpanded ? "▲" : "▼"}</span>
                </button>
                {hoursExpanded && (
                  <div className="mr-9 mt-1 text-sm text-gray-600 leading-relaxed">
                    {typeof poi.openingHours === "string"
                      ? <span className="whitespace-pre-line">{poi.openingHours.split("\n").slice(1).join("\n")}</span>
                      : (
                        <div className="space-y-0.5">
                          {DAY_KEYS.map(day => {
                            const hours = (poi.openingHours as Record<string, DayHours | null>)[day];
                            const isToday = day === DAY_KEYS[new Date().getDay()];
                            return (
                              <div key={day} className={`flex justify-between ${isToday ? "font-bold text-gray-900" : ""}`}>
                                <span>{DAY_NAMES_HE[day]}</span>
                                <span dir="ltr">{hours ? `${hours.open}–${hours.close}` : "סגור"}</span>
                              </div>
                            );
                          })}
                        </div>
                      )
                    }
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {poi.price && (
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">💰</span>
            <span className="text-sm text-gray-700">{poi.price}</span>
          </div>
        )}

        {poi.phone && (
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">📞</span>
            <a href={`tel:${poi.phone}`} className="text-sm text-gray-700">
              {poi.phone}
            </a>
          </div>
        )}

        {poi.email && (
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">✉️</span>
            <a href={`mailto:${poi.email}`} className="text-sm text-gray-700 truncate">
              {poi.email}
            </a>
          </div>
        )}

        {safeWebsiteHref && (
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">🌐</span>
            <a
              href={safeWebsiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 font-medium hover:text-emerald-700 truncate"
            >
              {poi.website}
            </a>
          </div>
        )}

        {poi.videos.length > 0 && poi.videos.map((url, i) => {
          const ytId = extractYouTubeId(url);
          if (ytId) {
            return (
              <div key={i} className="mb-2 rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                  title={`${poi.name} video ${i + 1}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full aspect-video"
                />
              </div>
            );
          }
          let safeUrl: string | null = null;
          let displayText: string;
          try {
            const parsed = new URL(url);
            if (parsed.protocol === "https:" || parsed.protocol === "http:") {
              safeUrl = parsed.href;
              displayText = parsed.hostname;
            } else {
              displayText = url;
            }
          } catch { displayText = url; }
          if (!safeUrl) return null;
          return (
            <div key={i} className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">🎬</span>
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 font-medium hover:text-emerald-700 truncate"
              >
                {displayText}
              </a>
            </div>
          );
        })}

      </div>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      // /watch?v=ID, /shorts/ID, /embed/ID
      if (u.searchParams.has("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|embed)\/([^/?]+)/);
      return m ? m[2] : null;
    }
    return null;
  } catch { return null; }
}

function arrowStyle(side: "left" | "right"): CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 8,
    transform: "translateY(-50%)",
    width: 28, height: 28,
    background: "rgba(255,255,255,0.85)",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: 2,
    color: "#374151",
    direction: "ltr",
  };
}
