"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Search as SearchIcon,
  Map,
  List,
  Navigation,
  Filter,
  Fuel,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { StationCard } from "@/components/station-card";
import { PageLoading } from "@/components/loading-spinner";
import { Spinner } from "@/components/ui/spinner";
import { api, type FuelType, type Station, isAuthenticated } from "@/lib/api";

// Dynamically import the map to avoid SSR issues with react-simple-maps
const StationMap = dynamic(
  () =>
    import("@/components/station-map").then((mod) => ({
      default: mod.StationMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[350px] rounded-lg bg-card border border-border flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    ),
  }
);

const COUNTRIES = ["Lesotho", "South Africa"];

interface NearestStationInfo {
  station: Station;
  distance: number;
}

export default function SearchPage() {
  const router = useRouter();
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("map"); // Default to map view
  const [showFilters, setShowFilters] = useState(false);

  // GPS and nearby station state
  const [hasGpsPermission, setHasGpsPermission] = useState(false);
  const [nearestStation, setNearestStation] = useState<NearestStationInfo | null>(null);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [autoLoadedNearby, setAutoLoadedNearby] = useState(false);

  // Search filters
  const [searchQuery, setSearchQuery] = useState("");
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("");

  // Check GPS availability and auto-load nearby stations
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.permissions
        ?.query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") {
            setHasGpsPermission(true);
            // Auto-load stations if GPS is already granted
            if (!autoLoadedNearby) {
              loadAllStations();
              setAutoLoadedNearby(true);
            }
          }
          result.onchange = () => {
            const granted = result.state === "granted";
            setHasGpsPermission(granted);
            if (granted && !autoLoadedNearby) {
              loadAllStations();
              setAutoLoadedNearby(true);
            }
          };
        })
        .catch(() => {
          // Permissions API not supported, try to load stations anyway
          if (!autoLoadedNearby) {
            loadAllStations();
            setAutoLoadedNearby(true);
          }
        });
    }
  }, [autoLoadedNearby]);

  // Load fuel types on mount
  useEffect(() => {
    const fetchFuelTypes = async () => {
      try {
        const data = await api<{ fuels: FuelType[] } | FuelType[]>("/api/fueltypes");
        const fuelsArray = Array.isArray(data) ? data : data.fuels || [];
        if (fuelsArray.length > 0) {
          // Deduplicate by fuel_name
          const uniqueFuels = fuelsArray.reduce((acc: FuelType[], fuel) => {
            if (!acc.find((f) => f.fuel_name === fuel.fuel_name)) {
              acc.push(fuel);
            }
            return acc;
          }, []);
          setFuelTypes(uniqueFuels);
        }
      } catch (error) {
        console.error("Failed to load fuel types:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFuelTypes();
  }, []);

  // Load all stations (for GPS-based nearby display)
  const loadAllStations = async () => {
    setSearching(true);
    try {
      // Load stations from SA and Lesotho
      const data = await api<{ count: number; stations: Station[] } | Station[]>(
        "/api/stations"
      );
      const stationsArray = Array.isArray(data) ? data : data.stations || [];
      setStations(stationsArray);
      setHasSearched(true);
    } catch (error) {
      console.error("Failed to load stations:", error);
    } finally {
      setSearching(false);
    }
  };

  // Handle nearest station found from map
  const handleNearestStationFound = useCallback(
    (station: Station, distance: number) => {
      setNearestStation({ station, distance });
    },
    []
  );

  const handleSearch = useCallback(async () => {
    setSearching(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (fuelTypeFilter && fuelTypeFilter !== "all")
        params.append("fuel_type_id", fuelTypeFilter);
      if (countryFilter && countryFilter !== "all")
        params.append("country", countryFilter);

      const queryString = params.toString();
      const data = await api<{ count: number; stations: Station[] } | Station[]>(
        `/api/stations${queryString ? `?${queryString}` : ""}`
      );
      const stationsArray = Array.isArray(data) ? data : data.stations || [];
      setStations(stationsArray);

      // Log search if user is authenticated
      if (isAuthenticated()) {
        try {
          await api("/api/users/searches", {
            method: "POST",
            requiresAuth: true,
            body: JSON.stringify({
              query_text: searchQuery.trim() || "",
              fuel_type_id:
                fuelTypeFilter && fuelTypeFilter !== "all"
                  ? parseInt(fuelTypeFilter)
                  : null,
              results_count: stationsArray.length,
            }),
          });
        } catch {
          // Silently fail - search logging is not critical
        }
      }
    } catch (error) {
      toast.error("Search failed");
      console.error(error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, fuelTypeFilter, countryFilter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFuelTypeFilter("");
    setCountryFilter("");
    setShowOnlyAvailable(false);
  };

  const hasActiveFilters =
    searchQuery || fuelTypeFilter || countryFilter || showOnlyAvailable;

  // Format distance for display
  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <main className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-[#FF6B00]" />
              <h1 className="text-xl font-bold text-foreground">Find Fuel</h1>
            </div>
            <div className="flex items-center gap-1">
              {/* Filter toggle */}
              <Button
                variant={showFilters ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Filter className="h-4 w-4" />
              </Button>
              {/* View mode toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
                className="text-muted-foreground hover:text-foreground"
              >
                {viewMode === "list" ? (
                  <>
                    <Map className="h-4 w-4 mr-1" />
                    Map
                  </>
                ) : (
                  <>
                    <List className="h-4 w-4 mr-1" />
                    List
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={searching}
              className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
            >
              {searching ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex gap-2">
                <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Fuel Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fuels</SelectItem>
                    {Array.isArray(fuelTypes) &&
                      fuelTypes.map((fuel) => (
                        <SelectItem
                          key={fuel.fuel_id}
                          value={fuel.fuel_id.toString()}
                        >
                          <span style={{ color: fuel.color_hex }}>
                            {fuel.fuel_name}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="available-only"
                    checked={showOnlyAvailable}
                    onCheckedChange={setShowOnlyAvailable}
                  />
                  <Label
                    htmlFor="available-only"
                    className="text-sm cursor-pointer"
                  >
                    Show only stations with fuel available
                  </Label>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Active filters badges */}
          {hasActiveFilters && !showFilters && (
            <div className="flex flex-wrap gap-1">
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  &quot;{searchQuery}&quot;
                </Badge>
              )}
              {fuelTypeFilter && fuelTypeFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {fuelTypes.find((f) => f.fuel_id.toString() === fuelTypeFilter)
                    ?.fuel_name || "Fuel"}
                </Badge>
              )}
              {countryFilter && countryFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {countryFilter}
                </Badge>
              )}
              {showOnlyAvailable && (
                <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                  Available Only
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        {/* Map View - Always shows when in map mode */}
        {viewMode === "map" && (
          <div className="mb-4">
            <StationMap
              stations={Array.isArray(stations) ? stations : []}
              onStationClick={(station) =>
                router.push(`/stations/${station.station_id}`)
              }
              showUserLocation={true}
              onNearestStationFound={handleNearestStationFound}
              showOnlyAvailable={showOnlyAvailable}
              highlightNearest={true}
              autoCenter={true}
            />
          </div>
        )}

        {/* Nearest Station Quick Card (only in list view) */}
        {viewMode === "list" && nearestStation && hasGpsPermission && (
          <Card
            className="mb-4 border-[#FF6B00] bg-[#FF6B00]/5 cursor-pointer hover:bg-[#FF6B00]/10 transition-colors"
            onClick={() =>
              router.push(`/stations/${nearestStation.station.station_id}`)
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-[#FF6B00]/20">
                  <Navigation className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#FF6B00] font-medium">
                    Nearest Station
                  </p>
                  <p className="font-semibold text-foreground truncate">
                    {nearestStation.station.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nearestStation.station.city}, {nearestStation.station.country}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#FF6B00]">
                    {formatDistance(nearestStation.distance)}
                  </p>
                  <p className="text-xs text-muted-foreground">away</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading/Empty/Results states */}
        {!hasSearched && !searching ? (
          <div className="text-center py-8 text-muted-foreground">
            <Navigation className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Finding stations near you...</p>
            <p className="text-sm mt-1">
              {hasGpsPermission
                ? "Loading nearby fuel stations"
                : "Enable GPS to find the nearest station"}
            </p>
            {!hasGpsPermission && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadAllStations}
                className="mt-4 border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00]/10"
              >
                <SearchIcon className="h-4 w-4 mr-2" />
                Browse All Stations
              </Button>
            )}
          </div>
        ) : searching ? (
          <div className="py-8">
            <PageLoading />
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No stations found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {stations.length} station{stations.length !== 1 ? "s" : ""} found
            </p>

            {/* Station list */}
            {Array.isArray(stations) &&
              stations.map((station) => (
                <StationCard key={station.station_id} station={station} />
              ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
