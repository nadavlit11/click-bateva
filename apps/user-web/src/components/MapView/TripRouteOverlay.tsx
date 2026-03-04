import { useEffect, useRef, useMemo } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { Poi } from "../../types";
import { reportError } from "../../lib/errorReporting";

interface TripRouteOverlayProps {
  orderedPois: Poi[];
}

export function TripRouteOverlay({ orderedPois }: TripRouteOverlayProps) {
  const map = useMap();
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);
  const fallbackRef = useRef<google.maps.Polyline | null>(null);

  // Serialize coords to detect real changes and avoid unnecessary API calls
  const coordsKey = useMemo(
    () => orderedPois.map(p => `${p.location.lat},${p.location.lng}`).join("|"),
    [orderedPois]
  );

  useEffect(() => {
    if (!map) return;

    if (orderedPois.length < 2) {
      rendererRef.current?.setMap(null);
      fallbackRef.current?.setMap(null);
      return;
    }

    if (!serviceRef.current) {
      serviceRef.current = new google.maps.DirectionsService();
    }
    if (!rendererRef.current) {
      rendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: "#2563EB",
          strokeOpacity: 0.8,
          strokeWeight: 5,
        },
      });
    }

    const origin = orderedPois[0].location;
    const dest = orderedPois[orderedPois.length - 1].location;
    const waypoints = orderedPois.slice(1, -1).map(p => ({
      location: { lat: p.location.lat, lng: p.location.lng },
      stopover: true,
    }));

    // Clear fallback before attempting directions
    fallbackRef.current?.setMap(null);

    serviceRef.current.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: dest.lat, lng: dest.lng },
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          rendererRef.current!.setMap(map);
          rendererRef.current!.setDirections(result);
        } else {
          // Fallback to straight line if directions fail
          reportError(new Error(`Directions API failed: ${status}`), { source: "TripRouteOverlay" });
          rendererRef.current?.setMap(null);
          const path = orderedPois.map(p => ({
            lat: p.location.lat,
            lng: p.location.lng,
          }));
          if (fallbackRef.current) {
            fallbackRef.current.setPath(path);
            fallbackRef.current.setMap(map);
          } else {
            fallbackRef.current = new google.maps.Polyline({
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
        }
      }
    );

    return () => {
      rendererRef.current?.setMap(null);
      fallbackRef.current?.setMap(null);
    };
  }, [map, coordsKey]);

  return null;
}
