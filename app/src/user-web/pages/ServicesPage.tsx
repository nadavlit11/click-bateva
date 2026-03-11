import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePois, useCategories, useSubcategories } from "../../hooks/useFirestoreData";
import { filterPois } from "../../lib/filterPois";
import { lighten, lightenBorder } from "../../lib/colorUtils";
import { renderBoldText } from "../../lib/renderBoldText";
import { getOpeningStatusText } from "../../lib/openingStatus";
import { safeHttpUrl } from "../../lib/urlUtils";
import type { Poi, Subcategory } from "../../types";
import type { MapKey } from "../../hooks/useFirestoreData";

const isDesktop = !("ontouchstart" in window);

function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

export default function ServicesPage() {
  const { user, role } = useAuth();
  const mapKey: MapKey = role === "travel_agent" ? "agents" : "groups";
  const { pois, loading } = usePois(mapKey);
  const categories = useCategories();
  const subcategories = useSubcategories();

  const locationlessCategory = useMemo(
    () => categories.find(c => c.locationless === true),
    [categories],
  );

  const categoryId = locationlessCategory?.id;

  const catSubcategories = useMemo(
    () => subcategories.filter(s => s.categoryId === categoryId),
    [subcategories, categoryId],
  );

  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const locationlessPois = useMemo(
    () => pois.filter(p => p.categoryId === categoryId),
    [pois, categoryId],
  );

  const filteredPois = useMemo(() => {
    let result = locationlessPois;
    if (selectedSubs.size > 0) {
      result = filterPois(result, {
        selectedCategories: new Set(categoryId ? [categoryId] : []),
        selectedSubcategories: selectedSubs,
        subcategories,
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [locationlessPois, selectedSubs, categoryId, subcategories, searchQuery]);

  function toggleSub(id: string) {
    setSelectedSubs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const color = locationlessCategory?.color ?? "#6366f1";

  return (
    <div className="min-h-dvh bg-gray-50 overflow-y-auto" dir="rtl" style={{ position: "fixed", inset: 0 }}>
      {/* Header bar */}
      <header className="sticky top-0 z-10 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          חזרה למפה
        </Link>
        {user?.displayName && (
          <p className="text-sm text-green-700 font-medium">
            {user.displayName}, ברוך הבא למפת קליק בטבע
          </p>
        )}
      </header>

      {/* Title + search */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-3">
          {locationlessCategory?.name ?? "בכל הארץ"}
        </h1>
        <div className="max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="חיפוש..."
            className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Subcategory filter chips */}
      {catSubcategories.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex gap-2 flex-wrap">
          {catSubcategories.map(sub => {
            const active = selectedSubs.has(sub.id);
            return (
              <button
                key={sub.id}
                onClick={() => toggleSub(sub.id)}
                className="py-1.5 px-3 rounded-full border-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: active ? lighten(color) : "white",
                  borderColor: active ? color : lightenBorder(color),
                  boxShadow: active ? `0 0 0 1px ${color}` : "none",
                }}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          טוען...
        </div>
      ) : filteredPois.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-3xl mb-2">🔍</span>
          <p className="text-sm">לא נמצאו תוצאות</p>
        </div>
      ) : (
        <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPois.map(poi => (
            <ServiceCard
              key={poi.id}
              poi={poi}
              color={color}
              subcategories={catSubcategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Image Carousel ── */
function ImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <div className="h-40 overflow-hidden">
        <img src={images[0]} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="relative h-40 overflow-hidden group">
      <img src={images[idx]} alt={name} className="w-full h-full object-cover" />
      <button
        onClick={() => setIdx(i => (i + 1) % images.length)}
        className="absolute top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ right: "4px" }}
      >
        ‹
      </button>
      <button
        onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
        className="absolute top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: "4px" }}
      >
        ›
      </button>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Service Card ── */
function ServiceCard({
  poi,
  color,
  subcategories,
}: {
  poi: Poi;
  color: string;
  subcategories: Subcategory[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const allImages = [poi.mainImage, ...poi.images].filter(Boolean) as string[];

  const whatsappHref = (() => {
    if (!poi.whatsapp) return null;
    const digits = poi.whatsapp.replace(/\D/g, "");
    const normalized = digits.startsWith("0") ? "972" + digits.slice(1) : digits;
    return `https://wa.me/${normalized}?text=${encodeURIComponent("שלום, הגעתי אליכם דרך מפת קליק בטבע")}`;
  })();

  const safeWebsiteHref = (() => {
    if (!poi.website) return null;
    const raw = poi.website.trim();
    const withProto = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    return safeHttpUrl(withProto);
  })();

  const safeFacebookHref = safeHttpUrl(poi.facebook);

  const matchedSubs = subcategories.filter(s => poi.subcategoryIds.includes(s.id));

  const openingText = poi.openingHours && typeof poi.openingHours !== "string"
    ? getOpeningStatusText(poi.openingHours)
    : poi.openingHours === "by_appointment" ? "בתיאום מראש" : null;

  const peopleText = (() => {
    if (poi.minPeople && poi.maxPeople) return `${poi.minPeople}-${poi.maxPeople} אנשים`;
    if (poi.maxPeople) return `עד ${poi.maxPeople} אנשים`;
    if (poi.minPeople) return `מינימום ${poi.minPeople} אנשים`;
    if (poi.capacity) return poi.capacity;
    return null;
  })();

  const firstVideoUrl = poi.videos?.length > 0 ? poi.videos[0] : null;
  const youTubeId = firstVideoUrl ? getYouTubeId(firstVideoUrl) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
      {/* Image carousel */}
      {allImages.length > 0 ? (
        <ImageCarousel images={allImages} name={poi.name} />
      ) : (
        <div
          className="h-24 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${lighten(color)}, ${color}20)` }}
        >
          <span className="text-3xl opacity-50">📍</span>
        </div>
      )}

      <div className="p-4">
        {/* Name */}
        <h3 className="text-base font-bold text-gray-800 mb-1">{poi.name}</h3>

        {/* Subcategory tags */}
        {matchedSubs.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {matchedSubs.map(s => (
              <span
                key={s.id}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: lighten(color), color }}
              >
                {s.name}
              </span>
            ))}
          </div>
        )}

        {/* Opening hours */}
        {openingText && (
          <p className="text-xs text-gray-500 mb-2">{openingText}</p>
        )}

        {/* People count */}
        {peopleText && (
          <p className="text-xs text-gray-500 mb-2">👥 {peopleText}</p>
        )}

        {/* Description */}
        {poi.description && (
          <div className="mb-3">
            <p className={`text-sm text-gray-600 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
              {renderBoldText(poi.description)}
            </p>
            {poi.description.length > 120 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-xs font-medium mt-1"
                style={{ color }}
              >
                {expanded ? "פחות" : "עוד..."}
              </button>
            )}
          </div>
        )}

        {/* Video */}
        {firstVideoUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            {youTubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youTubeId}`}
                title={poi.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video rounded-lg"
              />
            ) : (
              <video
                src={firstVideoUrl}
                controls
                preload="metadata"
                className="w-full rounded-lg"
              />
            )}
          </div>
        )}

        {/* Contact actions */}
        <div className="flex gap-2 flex-wrap">
          {poi.phone && (
            isDesktop ? (
              <button
                onClick={() => setShowPhoneModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: color }}
              >
                <PhoneIcon />
                התקשר
              </button>
            ) : (
              <a
                href={`tel:${poi.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: color }}
              >
                <PhoneIcon />
                התקשר
              </a>
            )
          )}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500 text-white transition-opacity hover:opacity-80"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
              וואטסאפ
            </a>
          )}
          {safeFacebookHref && (
            <a
              href={safeFacebookHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-600 text-white transition-opacity hover:opacity-80"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              פייסבוק
            </a>
          )}
          {safeWebsiteHref && (
            <a
              href={safeWebsiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              אתר
            </a>
          )}
        </div>
      </div>

      {/* Phone modal (desktop) */}
      {showPhoneModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPhoneModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-xl text-center max-w-xs mx-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm text-gray-500 mb-1">מספר טלפון</p>
            <p className="text-2xl font-bold text-gray-800 my-3" dir="ltr">{poi.phone}</p>
            <button
              onClick={() => setShowPhoneModal(false)}
              className="px-5 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
