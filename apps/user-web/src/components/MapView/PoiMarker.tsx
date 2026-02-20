import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { CATEGORY_EMOJI } from "../../data/defaults";
import type { Poi } from "../../types";

interface PoiMarkerProps {
  poi: Poi;
  color: string;    // hex from matching category
  onClick: () => void;
}

export function PoiMarker({ poi, color, onClick }: PoiMarkerProps) {
  return (
    <AdvancedMarker position={poi.location} onClick={onClick}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          fontFamily: "Rubik, sans-serif",
        }}
      >
        {/* Teardrop marker */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50% 50% 50% 0",
            transform: "rotate(-45deg)",
            background: `linear-gradient(135deg, ${color}dd, ${color})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          <span style={{ transform: "rotate(45deg)", fontSize: 16, lineHeight: 1 }}>
            {CATEGORY_EMOJI[poi.categoryId] ?? "📍"}
          </span>
        </div>

        {/* Name label */}
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
      </div>
    </AdvancedMarker>
  );
}
