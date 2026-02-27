import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { Poi } from "../../types";

interface TripRouteOverlayProps {
  orderedPois: Poi[];
}

export function TripRouteOverlay({ orderedPois }: TripRouteOverlayProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || orderedPois.length < 2) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      return;
    }

    const path = orderedPois.map(p => ({ lat: p.location.lat, lng: p.location.lng }));

    if (polylineRef.current) {
      polylineRef.current.setPath(path);
    } else {
      polylineRef.current = new google.maps.Polyline({
        path,
        map,
        strokeColor: "#F59E0B",
        strokeOpacity: 0,
        strokeWeight: 3,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              scale: 3,
            },
            offset: "0",
            repeat: "16px",
          },
        ],
      });
    }

    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [map, orderedPois]);

  return null;
}
