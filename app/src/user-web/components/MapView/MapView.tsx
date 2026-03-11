import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import { PoiMarker } from "./PoiMarker";
import { TripRouteOverlay } from "./TripRouteOverlay";
import type { Poi, Category, Subcategory } from "../../../types";

interface MapViewProps {
  pois: Poi[];
  categories: Category[];
  subcategories: Subcategory[];
  selectedPoiId: string | null;
  onPoiClick: (poi: Poi) => void;
  onMapClick?: () => void;
  focusLocation?: { lat: number; lng: number; zoom?: number } | null;
  onFocusConsumed?: () => void;
  pinSize?: number;
  highlightPoi?: Poi | null;
  orderedTripPoiIds?: string[];
  activeDayPoiIds?: string[];
}

function firstSubMatch<T>(sids: string[], map: Record<string, T>): T | undefined {
  for (const sid of sids) {
    if (map[sid] != null) return map[sid];
  }
  return undefined;
}

const ISRAEL_CENTER = { lat: 31.5, lng: 34.8 };
const MAP_ID = "DEMO_MAP_ID";
const ISRAEL_BOUNDS = { north: 33.8, south: 29.0, west: 33.8, east: 36.0 };
const LABEL_ZOOM_THRESHOLD = 12;

export function MapView({ pois, categories, subcategories, selectedPoiId, onPoiClick, onMapClick, focusLocation, onFocusConsumed, pinSize = 24, highlightPoi, orderedTripPoiIds = [], activeDayPoiIds = [] }: MapViewProps) {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} language="he" region="IL">
      <GoogleMap
        defaultCenter={ISRAEL_CENTER}
        defaultZoom={8}
        mapId={MAP_ID}
        gestureHandling="greedy"
        mapTypeControl={false}
        fullscreenControl={false}
        streetViewControl={false}
        minZoom={8}
        restriction={{ latLngBounds: ISRAEL_BOUNDS, strictBounds: false }}
        className="w-full h-full"
        onClick={onMapClick}
      >
        <ClusteredPoiMarkers
          pois={pois}
          categories={categories}
          subcategories={subcategories}
          selectedPoiId={selectedPoiId}
          onPoiClick={onPoiClick}
          focusLocation={focusLocation}
          onFocusConsumed={onFocusConsumed}
          pinSize={pinSize}
          highlightPoi={highlightPoi}
          orderedTripPoiIds={orderedTripPoiIds}
          activeDayPoiIds={activeDayPoiIds}
        />
      </GoogleMap>
    </APIProvider>
  );
}

interface ClusteredPoiMarkersProps {
  pois: Poi[];
  categories: Category[];
  subcategories: Subcategory[];
  selectedPoiId: string | null;
  onPoiClick: (poi: Poi) => void;
  focusLocation?: { lat: number; lng: number; zoom?: number } | null;
  onFocusConsumed?: () => void;
  pinSize: number;
  highlightPoi?: Poi | null;
  orderedTripPoiIds: string[];
  activeDayPoiIds: string[];
}

function ClusteredPoiMarkers({ pois, categories, subcategories, selectedPoiId, onPoiClick, focusLocation, onFocusConsumed, pinSize, highlightPoi, orderedTripPoiIds, activeDayPoiIds }: ClusteredPoiMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(8);
  const clusterer = useRef<MarkerClusterer | null>(null);
  const [markers, setMarkers] = useState<Record<string, Marker>>({});

  const catMaps = useMemo(() => {
    const color: Record<string, string> = {};
    const iconUrl: Record<string, string | null> = {};
    const borderColor: Record<string, string> = {};
    const markerSize: Record<string, number> = {};
    for (const c of categories) {
      color[c.id] = c.color;
      iconUrl[c.id] = c.iconUrl;
      if (c.borderColor) borderColor[c.id] = c.borderColor;
      if (c.markerSize != null) markerSize[c.id] = c.markerSize;
    }
    return { color, iconUrl, borderColor, markerSize };
  }, [categories]);

  const subMaps = useMemo(() => {
    const iconUrl: Record<string, string> = {};
    const color: Record<string, string> = {};
    const borderColor: Record<string, string> = {};
    const markerSize: Record<string, number> = {};
    for (const s of subcategories) {
      if (s.iconUrl) iconUrl[s.id] = s.iconUrl;
      if (s.color) color[s.id] = s.color;
      if (s.borderColor) borderColor[s.id] = s.borderColor;
      if (s.markerSize != null) markerSize[s.id] = s.markerSize;
    }
    return { iconUrl, color, borderColor, markerSize };
  }, [subcategories]);

  // Trip number map: poiId → 1-indexed position
  const tripNumberMap = useMemo(
    () => new Map(orderedTripPoiIds.map((id, i) => [id, i + 1])),
    [orderedTripPoiIds]
  );


  // Poi lookup + active day route
  const poiMap = useMemo(() => new Map(pois.map(p => [p.id, p])), [pois]);
  const activeDayPois = useMemo(
    () => activeDayPoiIds.map(id => poiMap.get(id)).filter(Boolean) as Poi[],
    [activeDayPoiIds, poiMap]
  );

  // Initialize clusterer when map is ready
  useEffect(() => {
    if (!map) return;
    clusterer.current = new MarkerClusterer({
      map,
      algorithm: new SuperClusterAlgorithm({ radius: 25, maxZoom: 14 }),
      onClusterClick: (_event, cluster, map) => {
        const currentZoom = map.getZoom() ?? 8;
        // Extract primitives immediately — LatLng references can go stale
        // when the clusterer re-renders on the next idle event.
        const pos = cluster.bounds?.getCenter() ?? cluster.position;
        const ll = new google.maps.LatLng(pos);
        map.moveCamera({ center: { lat: ll.lat(), lng: ll.lng() }, zoom: currentZoom + 3 });
      },
      renderer: {
        render({ count, position }) {
          const size = Math.min(24 + Math.floor(count / 5) * 2, 48);
          const el = document.createElement("div");
          el.style.cssText = `
            width: ${size}px; height: ${size}px;
            box-sizing: border-box;
            background: rgba(22, 163, 74, 0.85);
            border: 2px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 12px; font-weight: 600;
            font-family: Rubik, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          `;
          el.textContent = String(count);
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: el,
            zIndex: 0,
          });
        },
      },
    });
    return () => {
      clusterer.current?.setMap(null);
      clusterer.current = null;
    };
  }, [map]);

  // Track zoom changes
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("zoom_changed", () => {
      setZoom(Math.round(map.getZoom() ?? 8));
    });
    return () => listener.remove();
  }, [map]);

  // Sync clusterer whenever the markers state changes
  useEffect(() => {
    if (!clusterer.current) return;
    clusterer.current.clearMarkers(true);
    clusterer.current.addMarkers(Object.values(markers));
  }, [markers]);

  // Pan and zoom to a focused location when requested
  useEffect(() => {
    if (!map || !focusLocation) return;
    map.moveCamera({ center: { lat: focusLocation.lat, lng: focusLocation.lng }, ...(focusLocation.zoom != null && { zoom: focusLocation.zoom }) });
    onFocusConsumed?.();
  }, [focusLocation, map, onFocusConsumed]);

  // Ref callback: register/unregister marker elements via state (not ref)
  // so the sync effect re-runs when markers actually become available
  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => {
      setMarkers(prev => {
        if (marker && prev[key]) return prev;
        if (!marker && !prev[key]) return prev;
        if (marker) {
          return { ...prev, [key]: marker };
        } else {
          const next = { ...prev };
          delete next[key];
          return next;
        }
      });
    },
    []
  );

  const effectivePois = useMemo(() => {
    if (!highlightPoi || pois.some(p => p.id === highlightPoi.id)) return pois;
    return [...pois, highlightPoi];
  }, [pois, highlightPoi]);

  const showLabels = zoom >= LABEL_ZOOM_THRESHOLD;

  return (
    <>
      {effectivePois.map((poi) => {
        const sids = poi.subcategoryIds;
        const resolvedIconUrl = poi.iconUrl
          ?? firstSubMatch(sids, subMaps.iconUrl)
          ?? catMaps.iconUrl[poi.categoryId]
          ?? null;
        const resolvedColor = poi.color
          ?? firstSubMatch(sids, subMaps.color)
          ?? catMaps.color[poi.categoryId]
          ?? "#4caf50";
        const resolvedBorderColor = poi.borderColor
          ?? firstSubMatch(sids, subMaps.borderColor)
          ?? catMaps.borderColor[poi.categoryId]
          ?? "#000000";
        const resolvedMarkerSize = poi.markerSize
          ?? firstSubMatch(sids, subMaps.markerSize)
          ?? catMaps.markerSize[poi.categoryId]
          ?? undefined;
        const tripNumber = tripNumberMap.get(poi.id);
        return (
          <PoiMarker
            key={poi.id}
            poi={poi}
            color={resolvedColor}
            borderColor={resolvedBorderColor}
            iconUrl={resolvedIconUrl}
            selected={poi.id === selectedPoiId}
            showLabel={showLabels}
            pinSize={pinSize}
            onClick={() => onPoiClick(poi)}
            setMarkerRef={setMarkerRef}
            tripNumber={tripNumber}
            markerSize={resolvedMarkerSize}
          />
        );
      })}
      {activeDayPois.length >= 2 && (
        <TripRouteOverlay orderedPois={activeDayPois} />
      )}
    </>
  );
}
