"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { StationCard } from "@/components/station-card";
import { PageLoading } from "@/components/loading-spinner";
import { ProtectedRoute } from "@/components/protected-route";
import { api, type Favourite, type Station } from "@/lib/api";

export default function FavouritesPage() {
  const [favourites, setFavourites] = useState<(Favourite & Station)[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = async () => {
    try {
      const data = await api<{ favourites: (Favourite & Station)[] } | (Favourite & Station)[]>("/api/favourites", {
        requiresAuth: true,
      });
      // API may return { favourites: [...] } or plain array
      const favouritesArray = Array.isArray(data) ? data : (data.favourites || []);
      setFavourites(favouritesArray);
    } catch (error) {
      toast.error("Failed to load favourites");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, []);

  const removeFavourite = async (stationId: number) => {
    try {
      await api(`/api/favourites/${stationId}`, {
        method: "DELETE",
        requiresAuth: true,
      });
      setFavourites((prev) => prev.filter((f) => f.station_id !== stationId));
      toast.success("Removed from favourites");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove favourite"
      );
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen pb-20 bg-background">
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="max-w-lg mx-auto p-4">
            <h1 className="text-xl font-bold text-foreground">
              My Favourites
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4">
          {loading ? (
            <PageLoading />
          ) : !Array.isArray(favourites) || favourites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No favourites yet</p>
              <p className="text-sm">
                Add stations to your favourites from the search page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {favourites.length} saved station
                {favourites.length !== 1 ? "s" : ""}
              </p>
              {Array.isArray(favourites) && favourites.map((fav) => (
                <StationCard
                  key={fav.favourite_id || fav.station_id}
                  station={{
                    station_id: fav.station_id,
                    name: fav.station_name || fav.name,
                    address: fav.address || "",
                    city: fav.city,
                    country: fav.country,
                    is_verified: fav.is_verified || false,
                    avg_rating: fav.avg_rating,
                    fuels: fav.fuels,
                  }}
                  showRemoveButton
                  onRemove={() => removeFavourite(fav.station_id)}
                />
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </main>
    </ProtectedRoute>
  );
}
