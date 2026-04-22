"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, History, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { PageLoading } from "@/components/loading-spinner";
import { ProtectedRoute } from "@/components/protected-route";
import { api, type SearchHistory, type FuelType } from "@/lib/api";

export default function HistoryPage() {
  const [searches, setSearches] = useState<SearchHistory[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [searchData, fuelData] = await Promise.all([
          api<{ searches: SearchHistory[] } | SearchHistory[]>("/api/users/searches", { requiresAuth: true }),
          api<{ fuels: FuelType[] }>("/api/fueltypes"),
        ]);
        // Handle wrapper objects
        const searchesArray = Array.isArray(searchData) ? searchData : (searchData.searches || []);
        setSearches(searchesArray);
        
        if (fuelData.fuels && Array.isArray(fuelData.fuels)) {
          // Deduplicate by fuel_name
          const uniqueFuels = fuelData.fuels.reduce((acc: FuelType[], fuel) => {
            if (!acc.find(f => f.fuel_name === fuel.fuel_name)) {
              acc.push(fuel);
            }
            return acc;
          }, []);
          setFuelTypes(uniqueFuels);
        }
      } catch (error) {
        toast.error("Failed to load search history");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getFuelName = (fuelTypeId: number | undefined) => {
    if (!fuelTypeId) return null;
    const fuel = fuelTypes.find((f) => f.fuel_id === fuelTypeId);
    return fuel ? fuel.fuel_name : null;
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen pb-20 bg-background">
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="max-w-lg mx-auto p-4 flex items-center gap-3">
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-foreground">
              Search History
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4">
          {loading ? (
            <PageLoading />
          ) : !Array.isArray(searches) || searches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No search history yet</p>
              <p className="text-sm">
                Your searches will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(searches) && searches.map((search) => (
                <Card key={search.search_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Search className="h-5 w-5 text-[#FF6B00] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {search.query_text || "(All stations)"}
                        </p>
                        {search.fuel_type_id && (
                          <p className="text-sm text-muted-foreground">
                            Fuel filter: {getFuelName(search.fuel_type_id)}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-muted-foreground">
                            {search.results_count} result
                            {search.results_count !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(search.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </main>
    </ProtectedRoute>
  );
}
