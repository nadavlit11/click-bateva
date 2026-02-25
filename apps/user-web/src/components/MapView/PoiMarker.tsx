import { useCallback, useState } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Poi } from "../../types";

interface PoiMarkerProps {
  poi: Poi;
  color: string;
  iconUrl: string | null;
  selected: boolean;
  showLabel: boolean;
  onClick: () => void;
  setMarkerRef: (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => void;
}

export function PoiMarker({ poi, color, iconUrl, selected, showLabel, onClick, setMarkerRef }: PoiMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const ref = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null) => setMarkerRef(marker, poi.id),
    [setMarkerRef, poi.id]
  );

  const boxShadow = selected
    ? `0 0 0 3px white, 0 0 0 5px ${color}, 0 4px 12px rgba(0,0,0,0.25)`
    : hovered
      ? "0 5px 15px rgba(0,0,0,0.3)"
      : "0 3px 10px rgba(0,0,0,0.25)";

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
        {/* Teardrop marker */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50% 50% 50% 0",
            transform: hovered ? "rotate(-45deg) scale(1.15)" : "rotate(-45deg)",
            background: `linear-gradient(135deg, ${color}dd, ${color})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              style={{
                transform: "rotate(45deg)",
                width: 16,
                height: 16,
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <span style={{ transform: "rotate(45deg)", fontSize: 16, lineHeight: 1 }}>📍</span>
          )}
        </div>

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
