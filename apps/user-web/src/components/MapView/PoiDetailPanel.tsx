import { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import type { Poi, Category, DayHours } from "../../types";
import { lighten } from "../../lib/colorUtils";
import { DAY_KEYS, DAY_NAMES_HE, getOpeningStatusText } from "../../lib/openingStatus";
import { renderBoldText } from "../../lib/renderBoldText";

interface PoiDetailPanelProps {
  poi: Poi;
  category: Category | undefined;
  onClose: () => void;
}

export function PoiDetailPanel({ poi, category, onClose }: PoiDetailPanelProps) {
  const [virtualSlide, setVirtualSlide] = useState(0);
  const [skipTransition, setSkipTransition] = useState(false);
  const isDesktop = useMemo(() => typeof window !== "undefined" && !("ontouchstart" in window), []);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
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
  // For infinite carousel: triple the array when there are multiple slides
  const tripled = slideCount > 1 ? [...allImages, ...allImages, ...allImages] : allImages;

  // Reset state when POI changes
  // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local state on key change is intentional
  useEffect(() => { setVirtualSlide(slideCount > 1 ? slideCount : 0); setDescExpanded(false); setHoursExpanded(false); setShowPhoneModal(false); }, [poi.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPhoneModal) { setShowPhoneModal(false); }
        else { onClose(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, showPhoneModal]);

  // RTL: left button = next, right button = prev
  function next() { setVirtualSlide(s => s + 1); }
  function prev() { setVirtualSlide(s => s - 1); }

  // Reset skipTransition after one frame (avoids reading ref during render)
  useEffect(() => {
    if (!skipTransition) return;
    const id = requestAnimationFrame(() => setSkipTransition(false));
    return () => cancelAnimationFrame(id);
  }, [skipTransition]);

  function handleTransitionEnd() {
    if (slideCount <= 1) return;
    if (virtualSlide < slideCount) {
      setSkipTransition(true);
      setVirtualSlide(virtualSlide + slideCount);
    } else if (virtualSlide >= 2 * slideCount) {
      setSkipTransition(true);
      setVirtualSlide(virtualSlide - slideCount);
    }
  }

  // Guard against username@host URL confusion attacks (e.g. "trusted.com@evil.com")
  const safeWebsiteHref = (() => {
    if (!poi.website) return null;
    try {
      const url = new URL(`https://${poi.website}`);
      return url.hostname === poi.website ? url.href : null;
    } catch { return null; }
  })();

  // Validate facebook URL
  const safeFacebookHref = (() => {
    if (!poi.facebook) return null;
    try {
      const url = new URL(poi.facebook);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
      return null;
    } catch { return null; }
  })();

  // WhatsApp: normalize Israeli phone — strip non-digits, replace leading 0 with 972
  const whatsappHref = (() => {
    if (!poi.whatsapp) return null;
    const digits = poi.whatsapp.replace(/\D/g, "");
    const normalized = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
    return `https://wa.me/${normalized}?text=${encodeURIComponent("שלום, הגעתי אליכם דרך מפת קליק בטבע")}`;
  })();

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.location.lat},${poi.location.lng}`;

  return (
    <div
      className="absolute top-4 left-4 w-[300px] bg-white rounded-2xl shadow-xl overflow-hidden z-10 max-h-[calc(100dvh-120px-2rem)] md:max-h-[calc(100dvh-2rem)]"
      style={{ outline: `3px solid ${color}` }}
    >

      {/* Floating close button — positioned over scrollable content */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 10, left: 10,
          width: 30, height: 30,
          background: "white", border: "none", borderRadius: "50%", cursor: "pointer",
          fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)", color: "#374151", zIndex: 10,
        }}
        aria-label="סגור"
      >
        ×
      </button>

      <div className="overflow-y-auto max-h-[inherit]">

      {/* ── Carousel ── */}
      <div style={{ position: "relative", height: 180, overflow: "hidden" }}>

        {/* Track */}
        <div
          style={{
            display: "flex",
            height: "100%",
            direction: "ltr",
            transition: skipTransition ? "none" : "transform 0.3s ease",
            transform: `translateX(${-virtualSlide * 100}%)`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {hasImages ? (
            tripled.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={poi.name}
                loading="lazy"
                decoding="async"
                style={{ flex: "0 0 100%", height: "100%", objectFit: "contain", backgroundColor: "#f3f4f6" }}
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
                onClick={() => setVirtualSlide(slideCount + i)}
                aria-label={`תמונה ${i + 1}`}
                style={{
                  width: 6, height: 6, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
                  background: i === virtualSlide % slideCount ? "white" : "rgba(255,255,255,0.5)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>
        )}
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

        <h2 className="text-xl font-bold text-gray-800 mt-2">{poi.name}</h2>

        {/* Quick-action icon row */}
        <div className="flex justify-center gap-3 mt-3">
          {poi.phone && (
            isDesktop
              ? <ActionIcon href={`tel:${poi.phone}`} icon={ICON_PHONE} label="שיחה" color={color} asButton onClick={() => setShowPhoneModal(true)} />
              : <ActionIcon href={`tel:${poi.phone}`} icon={ICON_PHONE} label="שיחה" color={color} />
          )}
          <ActionIcon href={googleMapsUrl} icon={ICON_PIN} label="ניווט" color={color} external />
          {whatsappHref && <ActionIcon href={whatsappHref} icon={ICON_WHATSAPP} label="הודעה" color={color} external />}
          {safeWebsiteHref && <ActionIcon href={safeWebsiteHref} icon={ICON_GLOBE} label="אתר" color={color} external />}
          {safeFacebookHref && <ActionIcon href={safeFacebookHref} icon={ICON_FACEBOOK} label="פייסבוק" color={color} external />}
        </div>

        {poi.description && (
          <div className="mt-1">
            <p
              className={`text-sm text-gray-500 leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}
            >
              {renderBoldText(poi.description)}
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
        {(poi.openingHours || poi.price || poi.email || poi.videos.length > 0) && (
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

        {poi.email && (
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">✉️</span>
            <a href={`mailto:${poi.email}`} className="text-sm text-gray-700 truncate">
              {poi.email}
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
      </div>{/* end scrollable wrapper */}

      {/* Phone modal — desktop only */}
      {showPhoneModal && (
        <div
          onClick={() => setShowPhoneModal(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              padding: "1.5rem",
              textAlign: "center",
              minWidth: 240,
            }}
          >
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>מספר טלפון</p>
            <p className="text-2xl font-bold text-gray-800 my-3 dir-ltr">{poi.phone}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
              <a
                href={`tel:${poi.phone}`}
                style={{
                  background: "#16a34a", color: "white",
                  padding: "8px 20px", borderRadius: 8,
                  fontWeight: 600, fontSize: 14,
                  textDecoration: "none",
                }}
              >
                חייג
              </a>
              <button
                onClick={() => setShowPhoneModal(false)}
                style={{
                  background: "#e5e7eb", color: "#374151",
                  padding: "8px 20px", borderRadius: 8,
                  fontWeight: 600, fontSize: 14,
                  border: "none", cursor: "pointer",
                }}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionIcon({ href, icon, label, color, external, asButton, onClick }: {
  href: string; icon: string; label: string; color: string; external?: boolean; asButton?: boolean; onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: color }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
          <path d={icon} />
        </svg>
      </span>
      <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
    </>
  );
  if (asButton) {
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-1" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        {inner}
      </button>
    );
  }
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex flex-col items-center gap-1"
    >
      {inner}
    </a>
  );
}

const ICON_PHONE = "M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z";
const ICON_PIN = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z";
const ICON_WHATSAPP = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";
const ICON_GLOBE = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z";
const ICON_FACEBOOK = "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z";

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
