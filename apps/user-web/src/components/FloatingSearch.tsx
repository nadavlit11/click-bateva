import { useState, useEffect, useRef, useCallback } from "react";
import type { Poi } from "../types";

interface GeoResult {
  label: string;
  lat: number;
  lng: number;
}

interface GeocodingResult {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
}

interface FloatingSearchProps {
  pois: Poi[];
  mapsApiKey: string;
  onPoiSelect: (poi: Poi) => void;
  onLocationSelect: (loc: { lat: number; lng: number; zoom: number }) => void;
}

export function FloatingSearch({ pois, mapsApiKey, onPoiSelect, onLocationSelect }: FloatingSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [poiResults, setPoiResults] = useState<Poi[]>([]);
  const [locationResults, setLocationResults] = useState<GeoResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setPoiResults([]);
      setLocationResults([]);
      setOpen(false);
      return;
    }

    // POI search — local, by name
    const matched = pois.filter(p => p.name.includes(q)).slice(0, 5);
    setPoiResults(matched);

    // Location search — Google Geocoding REST API (Hebrew, Israel only)
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&language=he&region=IL&components=country:IL&key=${mapsApiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && Array.isArray(data.results)) {
        const locs: GeoResult[] = data.results.slice(0, 3).map((r: GeocodingResult) => ({
          label: r.formatted_address as string,
          lat: r.geometry.location.lat as number,
          lng: r.geometry.location.lng as number,
        }));
        setLocationResults(locs);
      } else {
        setLocationResults([]);
      }
    } catch {
      setLocationResults([]);
    }

    setOpen(true);
  }, [pois, mapsApiKey]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 300);
  }

  function handlePoiClick(poi: Poi) {
    onPoiSelect(poi);
    setQuery("");
    setOpen(false);
  }

  function handleLocationClick(loc: GeoResult) {
    onLocationSelect({ lat: loc.lat, lng: loc.lng, zoom: 13 });
    setQuery("");
    setOpen(false);
  }

  const hasResults = poiResults.length > 0 || locationResults.length > 0;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query && hasResults && setOpen(true)}
          placeholder="חפש מקום..."
          className="w-full py-2.5 px-4 ps-10 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-lg"
        />
        <svg className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {open && hasResults && (
        <div
          className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
          style={{ maxHeight: 320, overflowY: "auto" }}
        >
          {poiResults.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">נקודות</div>
              {poiResults.map(poi => (
                <button
                  key={poi.id}
                  onMouseDown={() => handlePoiClick(poi)}
                  className="w-full text-right px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                  {poi.name}
                </button>
              ))}
            </>
          )}
          {locationResults.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-100">מיקומים</div>
              {locationResults.map((loc, i) => (
                <button
                  key={i}
                  onMouseDown={() => handleLocationClick(loc)}
                  className="w-full text-right px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {loc.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
