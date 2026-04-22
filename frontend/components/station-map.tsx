"use client";

import { useState, useEffect, useMemo, memo, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { Navigation, RefreshCw, Fuel, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Station } from "@/lib/api";

// Free TopoJSON - no API key needed
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// South Africa & Lesotho center coordinates
const SA_CENTER: [number, number] = [25.5, -29.5];
const SA_ZOOM_SCALE = 800;

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface StationWithDistance extends Station {
  distance?: number;
}

interface StationMapProps {
  stations: Station[];
  onStationClick?: (station: Station) => void;
  showUserLocation?: boolean;
  onNearestStationFound?: (station: Station, distance: number) => void;
  showOnlyAvailable?: boolean;
  highlightNearest?: boolean;
  autoCenter?: boolean;
}

// Calculate distance between two points using Haversine formula (returns km)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if a station has any available fuel
function hasAvailableFuel(station: Station): boolean {
  if (!station.fuels || !Array.isArray(station.fuels)) return false;
  return station.fuels.some((fuel) => fuel.is_available);
}

// Get availability status color
function getAvailabilityColor(station: Station): string {
  if (!station.fuels || !Array.isArray(station.fuels) || station.fuels.length === 0) {
    return "#6B7280"; // Gray - unknown
  }
  const availableCount = station.fuels.filter((f) => f.is_available).length;
  if (availableCount === station.fuels.length) return "#22C55E"; // Green - all available
  if (availableCount > 0) return "#F59E0B"; // Amber - some available
  return "#EF4444"; // Red - none available
}

function StationMapComponent({
  stations,
  onStationClick,
  showUserLocation = true,
  onNearestStationFound,
  showOnlyAvailable = false,
  highlightNearest = true,
  autoCenter = true,
}: StationMapProps) {
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // Ensure stations is always an array
  const safeStations = Array.isArray(stations) ? stations : [];

  // Filter stations by availability if needed
  const filteredStations = useMemo(() => {
    if (!showOnlyAvailable) return safeStations;
    return safeStations.filter(hasAvailableFuel);
  }, [safeStations, showOnlyAvailable]);

  // Calculate distances and find nearest station
  const stationsWithDistance: StationWithDistance[] = useMemo(() => {
    if (!userLocation) return filteredStations;

    return filteredStations
      .map((station) => {
        const lat = parseFloat(String(station.latitude));
        const lng = parseFloat(String(station.longitude));
        if (isNaN(lat) || isNaN(lng)) return { ...station, distance: Infinity };

        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          lat,
          lng
        );
        return { ...station, distance };
      })
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [filteredStations, userLocation]);

  // Find the nearest station
  const nearestStation = useMemo(() => {
    if (!userLocation || stationsWithDistance.length === 0) return null;
    const nearest = stationsWithDistance[0];
    if (nearest.distance === Infinity) return null;
    return nearest;
  }, [stationsWithDistance, userLocation]);

  // Notify parent about nearest station
  useEffect(() => {
    if (nearestStation && onNearestStationFound && nearestStation.distance !== undefined) {
      onNearestStationFound(nearestStation, nearestStation.distance);
    }
  }, [nearestStation, onNearestStationFound]);

  // Get user's GPS location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }

    setIsLoadingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError("");
        setIsLoadingLocation(false);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out");
            break;
          default:
            setLocationError("Unknown location error");
        }
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Watch user location continuously
  useEffect(() => {
    if (!showUserLocation) return;

    requestLocation();

    const watchId = navigator.geolocation?.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError("");
      },
      () => {
        // Silent fail for watch - initial position already handled
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 10000,
      }
    );

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation?.clearWatch(watchId);
      }
    };
  }, [showUserLocation, requestLocation]);

  // Calculate map center - focus on SA/Lesotho region or user location
  const mapCenter = useMemo((): [number, number] => {
    if (autoCenter && userLocation) {
      return [userLocation.longitude, userLocation.latitude];
    }
    return SA_CENTER;
  }, [autoCenter, userLocation]);

  // Handle station click
  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    onStationClick?.(station);
  };

  // Format distance for display
  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-card border border-border">
      {/* Map Header with controls */}
      <div className="absolute top-0 left-0 right-0 z-20 p-2 bg-gradient-to-b from-background/90 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#FF6B00]" />
            <span className="text-xs font-medium text-foreground">
              {filteredStations.length} station{filteredStations.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* GPS Status */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                userLocation
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Navigation
                className={`h-3 w-3 ${isLoadingLocation ? "animate-pulse" : ""}`}
              />
              {isLoadingLocation
                ? "Locating..."
                : userLocation
                ? "GPS Active"
                : locationError || "GPS Off"}
            </div>
            {/* Refresh Location Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={requestLocation}
              disabled={isLoadingLocation}
            >
              <RefreshCw
                className={`h-3 w-3 ${isLoadingLocation ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Nearest Station Banner */}
      {nearestStation && highlightNearest && (
        <div
          className="absolute top-10 left-2 right-2 z-20 p-2 rounded-lg bg-[#FF6B00]/90 text-white cursor-pointer hover:bg-[#FF6B00] transition-colors"
          onClick={() => handleStationClick(nearestStation)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-white/20">
                <Fuel className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold">Nearest Station</p>
                <p className="text-sm font-bold truncate max-w-[180px]">
                  {nearestStation.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">
                {nearestStation.distance !== undefined
                  ? formatDistance(nearestStation.distance)
                  : "N/A"}
              </p>
              <Badge
                variant="secondary"
                className="text-[10px] bg-white/20 text-white border-0"
              >
                {hasAvailableFuel(nearestStation) ? "Fuel Available" : "Check Stock"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltipContent && (
        <div
          className="absolute z-50 px-3 py-2 text-xs bg-popover text-popover-foreground rounded-lg shadow-lg pointer-events-none border border-border"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltipContent}
        </div>
      )}

      {/* Map */}
      <div className="h-[350px]">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: SA_ZOOM_SCALE,
            center: mapCenter,
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup center={mapCenter} zoom={1} minZoom={0.5} maxZoom={8}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const isSAorLesotho =
                    geo.properties.name === "South Africa" ||
                    geo.properties.name === "Lesotho";
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isSAorLesotho ? "#3A3A3A" : "#1F1F1F"}
                      stroke={isSAorLesotho ? "#FF6B00" : "#2A2A2A"}
                      strokeWidth={isSAorLesotho ? 1 : 0.5}
                      style={{
                        default: { outline: "none" },
                        hover: {
                          fill: isSAorLesotho ? "#4A4A4A" : "#2A2A2A",
                          outline: "none",
                        },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* User location marker */}
            {userLocation && (
              <Marker
                coordinates={[userLocation.longitude, userLocation.latitude]}
              >
                <g>
                  <circle
                    r={12}
                    fill="rgba(59, 130, 246, 0.2)"
                    className="animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                  <circle r={10} fill="rgba(59, 130, 246, 0.3)" />
                  <circle r={6} fill="#3B82F6" stroke="#fff" strokeWidth={2} />
                  <circle r={2} fill="#fff" />
                </g>
              </Marker>
            )}

            {/* Station markers */}
            {stationsWithDistance
              .filter((station) => station.latitude && station.longitude)
              .map((station) => {
                const lat = parseFloat(String(station.latitude));
                const lng = parseFloat(String(station.longitude));

                if (isNaN(lat) || isNaN(lng)) return null;

                const isNearest =
                  highlightNearest && nearestStation?.station_id === station.station_id;
                const availabilityColor = getAvailabilityColor(station);
                const isSelected = selectedStation?.station_id === station.station_id;

                return (
                  <Marker
                    key={station.station_id}
                    coordinates={[lng, lat]}
                    onMouseEnter={(e) => {
                      const distanceText =
                        station.distance !== undefined && station.distance !== Infinity
                          ? ` (${formatDistance(station.distance)})`
                          : "";
                      const availText = hasAvailableFuel(station)
                        ? " - Fuel Available"
                        : " - Check Stock";
                      setTooltipContent(`${station.name}${distanceText}${availText}`);
                      const rect = (
                        e.target as SVGElement
                      ).getBoundingClientRect();
                      const container = (
                        e.target as SVGElement
                      ).closest(".relative");
                      if (container) {
                        const containerRect = container.getBoundingClientRect();
                        setTooltipPosition({
                          x: rect.left - containerRect.left + rect.width / 2,
                          y: rect.top - containerRect.top - 5,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltipContent("")}
                    onClick={() => handleStationClick(station)}
                    style={{ cursor: "pointer" }}
                  >
                    {isNearest ? (
                      // Highlighted nearest station marker
                      <g>
                        <circle
                          r={14}
                          fill="rgba(255, 107, 0, 0.3)"
                          className="animate-pulse"
                        />
                        <circle
                          r={10}
                          fill="#FF6B00"
                          stroke="#fff"
                          strokeWidth={3}
                        />
                        <circle r={4} fill="#fff" />
                      </g>
                    ) : (
                      // Regular station marker with availability color
                      <g>
                        {isSelected && (
                          <circle r={12} fill="rgba(255, 107, 0, 0.2)" />
                        )}
                        <circle
                          r={7}
                          fill={availabilityColor}
                          stroke="#fff"
                          strokeWidth={2}
                          className="transition-transform hover:scale-150"
                        />
                      </g>
                    )}
                  </Marker>
                );
              })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-20 flex flex-wrap gap-2 text-[10px]">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>All Available</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span>Some Available</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80">
          <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
          <span>Out of Stock</span>
        </div>
      </div>

      {/* Empty state */}
      {filteredStations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-10">
          <div className="text-center p-4">
            <Fuel className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              {showOnlyAvailable
                ? "No stations with available fuel found"
                : "No stations found in this area"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching or adjusting filters
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export const StationMap = memo(StationMapComponent);
