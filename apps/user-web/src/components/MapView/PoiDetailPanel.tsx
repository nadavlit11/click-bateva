import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import type { Poi, Category, Tag } from "../../types";
import { lighten } from "../../lib/colorUtils";

interface PoiDetailPanelProps {
  poi: Poi;
  category: Category | undefined;
  tags: Tag[];
  onClose: () => void;
}

export function PoiDetailPanel({ poi, category, tags, onClose }: PoiDetailPanelProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const color = category?.color ?? "#4caf50";
  // mainImage is always first; poi.images are the extra images
  const allImages = [
    ...(poi.mainImage ? [poi.mainImage] : []),
    ...poi.images,
  ];
  const hasImages = allImages.length > 0;
  const slideCount = hasImages ? allImages.length : 1;

  // Reset slide when POI changes
  useEffect(() => { setCurrentSlide(0); }, [poi.id]);

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
      className="absolute top-4 left-4 w-[300px] bg-white rounded-2xl shadow-xl overflow-hidden z-10 max-h-[calc(100vh-2rem)] overflow-y-auto"
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

        <h2 className="text-xl font-bold text-gray-800 mt-2">{poi.name}</h2>

        {poi.description && (
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{poi.description}</p>
        )}

        {/* Info + contact section */}
        {(poi.openingHours || poi.price || poi.phone || poi.email || poi.website) && (
          <div className="h-px bg-gray-100 my-3" />
        )}

        {poi.openingHours && (
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">🕐</span>
            <span className="text-sm text-gray-700">{poi.openingHours}</span>
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
          <div className="flex items-center gap-2">
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

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <div className="h-px bg-gray-100 my-3" />
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span key={tag.id} className="bg-gray-100 text-gray-600 rounded-full text-xs px-2.5 py-0.5">
                  {tag.name}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
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
