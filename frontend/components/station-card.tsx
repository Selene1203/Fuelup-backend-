"use client";

import Link from "next/link";
import { MapPin, Clock, BadgeCheck, Fuel, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./star-rating";
import type { Station, StationFuel } from "@/lib/api";

interface StationCardProps {
  station: Station & { fuels?: StationFuel[] };
  showRemoveButton?: boolean;
  onRemove?: () => void;
  showDistance?: boolean;
  distance?: number;
}

// Check fuel availability status
function getFuelAvailabilityStatus(fuels: StationFuel[] | undefined): {
  status: "all" | "some" | "none" | "unknown";
  availableCount: number;
  totalCount: number;
} {
  if (!fuels || !Array.isArray(fuels) || fuels.length === 0) {
    return { status: "unknown", availableCount: 0, totalCount: 0 };
  }
  
  const availableCount = fuels.filter((f) => f.is_available).length;
  const totalCount = fuels.length;
  
  if (availableCount === totalCount) {
    return { status: "all", availableCount, totalCount };
  } else if (availableCount > 0) {
    return { status: "some", availableCount, totalCount };
  }
  return { status: "none", availableCount, totalCount };
}

// Format distance for display
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function StationCard({
  station,
  showRemoveButton,
  onRemove,
  showDistance,
  distance,
}: StationCardProps) {
  const availability = getFuelAvailabilityStatus(station.fuels);
  
  // Get availability badge styles
  const getAvailabilityBadge = () => {
    switch (availability.status) {
      case "all":
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px]">
            <CheckCircle className="h-3 w-3 mr-1" />
            All Fuel Available
          </Badge>
        );
      case "some":
        return (
          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" />
            {availability.availableCount}/{availability.totalCount} Available
          </Badge>
        );
      case "none":
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px]">
            <XCircle className="h-3 w-3 mr-1" />
            Out of Stock
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden hover:border-[#FF6B00]/50 transition-colors">
      <Link href={`/stations/${station.station_id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  {station.name}
                </h3>
                {station.is_verified && (
                  <BadgeCheck className="h-4 w-4 text-[#FF6B00] flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {station.city}, {station.country}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {station.avg_rating !== undefined && station.avg_rating > 0 && (
                <div className="flex items-center gap-1">
                  <StarRating rating={Math.round(station.avg_rating)} size="sm" />
                  <span className="text-sm text-muted-foreground">
                    {station.avg_rating.toFixed(1)}
                  </span>
                </div>
              )}
              {showDistance && distance !== undefined && (
                <span className="text-sm font-medium text-[#FF6B00]">
                  {formatDistance(distance)}
                </span>
              )}
            </div>
          </div>

          {station.opening_hours && (
            <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{station.opening_hours}</span>
            </div>
          )}

          {/* Fuel Availability Status */}
          {availability.status !== "unknown" && (
            <div className="mt-3">
              {getAvailabilityBadge()}
            </div>
          )}

          {/* Fuel Types */}
          {station.fuels && Array.isArray(station.fuels) && station.fuels.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              {station.fuels.slice(0, 4).map((fuel) => (
                <Badge
                  key={fuel.fuel_id || fuel.fuel_type_id}
                  variant="outline"
                  className={`text-xs ${
                    fuel.is_available
                      ? ""
                      : "opacity-50 line-through"
                  }`}
                  style={{
                    borderColor: fuel.is_available ? fuel.color_hex : "#6B7280",
                    color: fuel.is_available ? fuel.color_hex : "#6B7280",
                  }}
                >
                  {fuel.fuel_name}
                  {fuel.price_per_liter && fuel.is_available && (
                    <span className="ml-1 font-semibold">
                      R{fuel.price_per_liter.toFixed(2)}
                    </span>
                  )}
                </Badge>
              ))}
              {station.fuels.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{station.fuels.length - 4}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Link>
      {showRemoveButton && onRemove && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            className="text-sm text-destructive hover:underline"
          >
            Remove from favourites
          </button>
        </div>
      )}
    </Card>
  );
}
