import { useCallback, useState } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { Poi } from "../../../types";

interface PoiMarkerProps {
  poi: Poi;
  color: string;
  borderColor?: string | null;
  iconUrl: string | null;
  selected: boolean;
  showLabel: boolean;
  pinSize: number;
  onClick: () => void;
  setMarkerRef: (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => void;
  tripNumber?: number;
  isDimmed?: boolean;
  iconFlicker?: boolean;
  iconSize?: number;
  markerSize?: number;
}

const AMBER = "#F59E0B";

export function PoiMarker({ poi, color, borderColor, iconUrl, selected, showLabel, pinSize, onClick, setMarkerRef, tripNumber, isDimmed, iconFlicker, iconSize, markerSize }: PoiMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const ref = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null) => setMarkerRef(marker, poi.id),
    [setMarkerRef, poi.id]
  );

  const baseSize = iconSize ?? markerSize ?? pinSize;
  // Icon = 50% of circle, border = 7% of circle
  const circleSize = Math.round(baseSize / 0.5);
  const borderWidth = Math.round(circleSize * 0.07);
  const markerColor = tripNumber ? AMBER : color;
  const dropShadow = selected
    ? `drop-shadow(0 0 5px ${markerColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.3))`
    : hovered
    ? "drop-shadow(0 3px 8px rgba(0,0,0,0.45))"
    : "drop-shadow(0 2px 5px rgba(0,0,0,0.3))";

  return (
    <AdvancedMarker
      position={poi.location}
      onClick={onClick}
      zIndex={selected ? 10 : tripNumber ? 5 : 1}
      ref={ref}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          fontFamily: "Rubik, sans-serif",
          opacity: isDimmed ? 0.3 : 1,
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          style={{
            position: "relative",
            width: circleSize,
            height: circleSize,
            borderRadius: "50%",
            backgroundColor: markerColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...(borderColor ? {
              boxShadow: `0 0 0 ${borderWidth}px ${borderColor}`,
            } : {}),
          }}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className={iconFlicker ? "animate-pulse" : undefined}
              style={{
                width: baseSize,
                height: baseSize,
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
                fontSize: baseSize,
                lineHeight: 1,
                filter: dropShadow,
                transform: hovered || selected ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.2s ease, filter 0.2s ease",
                display: "block",
              }}
            >📍</span>
          )}

          {/* Trip number badge */}
          {tripNumber !== undefined && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: AMBER,
                color: "white",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                border: "1.5px solid white",
              }}
            >
              {tripNumber}
            </span>
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
