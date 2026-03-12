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
  markerSize?: number;
  iconSize?: number;
}

const AMBER = "#F59E0B";

export function PoiMarker({ poi, color, borderColor, iconUrl, selected, showLabel, pinSize, onClick, setMarkerRef, tripNumber, isDimmed, markerSize, iconSize }: PoiMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const ref = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null) => setMarkerRef(marker, poi.id),
    [setMarkerRef, poi.id]
  );

  // pinSize/markerSize = circle diameter; iconSize = percentage of interior (default 50%)
  const circleSize = markerSize ?? pinSize;
  const borderWidth = Math.round(circleSize * 0.1);
  const innerSize = circleSize - 2 * borderWidth;
  const baseSize = iconSize != null
    ? Math.round(innerSize * (iconSize / 100))
    : Math.round(innerSize * 0.5);
  const markerColor = tripNumber ? AMBER : color;
  const dropShadow = selected
    ? `drop-shadow(0 0 5px ${markerColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.3))`
    : hovered
    ? "drop-shadow(0 3px 8px rgba(0,0,0,0.45))"
    : "drop-shadow(0 2px 5px rgba(0,0,0,0.3))";

  const selectedRing = selected
    ? `0 0 0 4px white, 0 0 12px 4px ${markerColor}88`
    : undefined;

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
            border: borderColor
              ? `${borderWidth}px solid ${borderColor}`
              : `${borderWidth}px solid transparent`,
            boxSizing: "border-box",
            boxShadow: selectedRing,
            animation: selected ? "poi-pulse 1.5s ease-in-out infinite" : undefined,
          }}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className={poi.flicker ? "animate-pulse" : undefined}
              style={{
                width: baseSize,
                height: baseSize,
                objectFit: "contain",
                display: "block",
                filter: dropShadow,
                transform: hovered || selected ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.2s ease, filter 0.2s ease",
              }}
              onError={e => { e.currentTarget.hidden = true }}
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
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxShadow: "0 1px 6px rgba(0,0,0,0.18)",
              color: "#000000",
            }}
          >
            {poi.name}
          </div>
        )}
      </div>
    </AdvancedMarker>
  );
}
