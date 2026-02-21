import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { CATEGORY_EMOJI } from "../../data/defaults";
import type { Poi } from "../../types";

interface PoiMarkerProps {
  poi: Poi;
  color: string;    // hex from matching category
  selected: boolean;
  onClick: () => void;
}

export function PoiMarker({ poi, color, selected, onClick }: PoiMarkerProps) {
  return (
    <AdvancedMarker position={poi.location} onClick={onClick} zIndex={selected ? 10 : 1}>
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
            width: selected ? 46 : 36,
            height: selected ? 46 : 36,
            borderRadius: "50% 50% 50% 0",
            transform: "rotate(-45deg)",
            background: `linear-gradient(135deg, ${color}dd, ${color})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: selected
              ? `0 0 0 3px white, 0 0 0 5px ${color}, 0 6px 16px rgba(0,0,0,0.35)`
              : "0 3px 10px rgba(0,0,0,0.25)",
            transition: "width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          <span style={{ transform: "rotate(45deg)", fontSize: selected ? 20 : 16, lineHeight: 1 }}>
            {CATEGORY_EMOJI[poi.categoryId] ?? "📍"}
          </span>
        </div>

        {/* Name label */}
        <div
          style={{
            marginTop: 6,
            background: selected ? color : "white",
            borderRadius: 999,
            padding: "2px 9px",
            fontSize: 11,
            fontWeight: selected ? 700 : 500,
            whiteSpace: "nowrap",
            boxShadow: "0 1px 6px rgba(0,0,0,0.18)",
            color: selected ? "white" : "#374151",
            transition: "background 0.2s ease, color 0.2s ease",
          }}
        >
          {poi.name}
        </div>
      </div>
    </AdvancedMarker>
  );
}
