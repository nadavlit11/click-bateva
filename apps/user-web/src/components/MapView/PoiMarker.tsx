import { useCallback, useState } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Poi } from "../../types";

interface PoiMarkerProps {
  poi: Poi;
  color: string;
  iconUrl: string | null;
  selected: boolean;
  showLabel: boolean;
  pinSize: number;
  onClick: () => void;
  setMarkerRef: (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => void;
}

export function PoiMarker({ poi, color, iconUrl, selected, showLabel, pinSize, onClick, setMarkerRef }: PoiMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const ref = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null) => setMarkerRef(marker, poi.id),
    [setMarkerRef, poi.id]
  );

  const dropShadow = selected
    ? `drop-shadow(0 0 5px ${color}) drop-shadow(0 2px 4px rgba(0,0,0,0.3))`
    : hovered
    ? "drop-shadow(0 3px 8px rgba(0,0,0,0.45))"
    : "drop-shadow(0 2px 5px rgba(0,0,0,0.3))";

  return (
    <AdvancedMarker position={poi.location} onClick={onClick} zIndex={selected ? 10 : 1} ref={ref}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          fontFamily: "Rubik, sans-serif",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            style={{
              width: pinSize,
              height: pinSize,
              objectFit: "contain",
              display: "block",
              filter: dropShadow,
              transform: hovered || selected ? "scale(1.2)" : "scale(1)",
              transition: "transform 0.2s ease, filter 0.2s ease",
            }}
          />
        ) : (
          <span
            style={{
              fontSize: pinSize,
              lineHeight: 1,
              filter: dropShadow,
              transform: hovered || selected ? "scale(1.2)" : "scale(1)",
              transition: "transform 0.2s ease, filter 0.2s ease",
              display: "block",
            }}
          >📍</span>
        )}

        {/* Name label — only at high zoom */}
        {showLabel && (
          <div
            style={{
              marginTop: 6,
              background: "white",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxShadow: "0 1px 6px rgba(0,0,0,0.18)",
              color: "#374151",
            }}
          >
            {poi.name}
          </div>
        )}
      </div>
    </AdvancedMarker>
  );
}
