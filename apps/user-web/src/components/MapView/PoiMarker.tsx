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

  const boxShadow = hovered
    ? "0 4px 14px rgba(0,0,0,0.35)"
    : "0 2px 8px rgba(0,0,0,0.25)";

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
        {/* White circle bubble marker */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow,
            outline: selected ? `3px solid ${color}` : "none",
            outlineOffset: "2px",
            transform: hovered || selected ? "scale(1.15)" : "scale(1)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              style={{
                width: 22,
                height: 22,
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <span style={{ fontSize: 20, lineHeight: 1 }}>📍</span>
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
