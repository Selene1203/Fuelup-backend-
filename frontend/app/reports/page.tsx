"use client";

import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BottomNav } from "@/components/bottom-nav";
import { PageLoading } from "@/components/loading-spinner";
import { ProtectedRoute } from "@/components/protected-route";
import { StarRating } from "@/components/star-rating";
import {
  api,
  type ReportStation,
  type ReportUser,
  type FuelPriceReport,
  type PriceHistoryReport,
  type SearchActivityReport,
  type ReviewsReport,
} from "@/lib/api";

export default function ReportsPage() {
  const [stations, setStations] = useState<ReportStation[]>([]);
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStation1, setSelectedStation1] = useState<string>("");
  const [selectedStation2, setSelectedStation2] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedStation4, setSelectedStation4] = useState<string>("");

  const [fuelPrices, setFuelPrices] = useState<FuelPriceReport[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryReport[]>([]);
  const [searchActivity, setSearchActivity] = useState<SearchActivityReport[]>(
    []
  );
  const [reviews, setReviews] = useState<ReviewsReport | null>(null);

  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [stationsResponse, usersResponse] = await Promise.all([
          api<ReportStation[] | { stations: ReportStation[] }>("/api/reports/stations", { requiresAuth: true }),
          api<ReportUser[] | { users: ReportUser[] }>("/api/reports/users", { requiresAuth: true }),
        ]);
        // Handle different API response formats
        const stationsArray = Array.isArray(stationsResponse) 
          ? stationsResponse 
          : (stationsResponse as { stations?: ReportStation[] }).stations || [];
        const usersArray = Array.isArray(usersResponse) 
          ? usersResponse 
          : (usersResponse as { users?: ReportUser[] }).users || [];
        setStations(stationsArray);
        setUsers(usersArray);
      } catch (error) {
        toast.error("Failed to load report options");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDropdowns();
  }, []);

  const fetchFuelPrices = async (stationId: string) => {
    if (!stationId) return;
    setReportLoading(true);
    try {
      const data = await api<FuelPriceReport[] | { fuelPrices: FuelPriceReport[] }>(
        `/api/reports/fuel-prices/${stationId}`,
        { requiresAuth: true }
      );
      const fuelPricesArray = Array.isArray(data) 
        ? data 
        : (data as { fuelPrices?: FuelPriceReport[] }).fuelPrices || [];
      setFuelPrices(fuelPricesArray);
    } catch (error) {
      toast.error("Failed to load fuel prices report");
      console.error(error);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchPriceHistory = async (stationId: string) => {
    if (!stationId) return;
    setReportLoading(true);
    try {
      const data = await api<PriceHistoryReport[] | { priceHistory: PriceHistoryReport[] }>(
        `/api/reports/price-history/${stationId}`,
        { requiresAuth: true }
      );
      const priceHistoryArray = Array.isArray(data) 
        ? data 
        : (data as { priceHistory?: PriceHistoryReport[] }).priceHistory || [];
      setPriceHistory(priceHistoryArray);
    } catch (error) {
      toast.error("Failed to load price history report");
      console.error(error);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchSearchActivity = async (userId: string) => {
    if (!userId) return;
    setReportLoading(true);
    try {
      const data = await api<SearchActivityReport[] | { searchActivity: SearchActivityReport[] }>(
        `/api/reports/search-activity/${userId}`,
        { requiresAuth: true }
      );
      const searchActivityArray = Array.isArray(data) 
        ? data 
        : (data as { searchActivity?: SearchActivityReport[] }).searchActivity || [];
      setSearchActivity(searchActivityArray);
    } catch (error) {
      toast.error("Failed to load search activity report");
      console.error(error);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchReviews = async (stationId: string) => {
    if (!stationId) return;
    setReportLoading(true);
    try {
      const data = await api<ReviewsReport>(
        `/api/reports/reviews/${stationId}`,
        { requiresAuth: true }
      );
      setReviews(data);
    } catch (error) {
      toast.error("Failed to load reviews report");
      console.error(error);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <PageLoading />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen pb-20 bg-background">
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="max-w-lg mx-auto p-4">
            <h1 className="text-xl font-bold text-foreground">Reports</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4">
          <Tabs defaultValue="fuel-prices" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="fuel-prices" className="text-xs">
                Prices
              </TabsTrigger>
              <TabsTrigger value="price-history" className="text-xs">
                History
              </TabsTrigger>
              <TabsTrigger value="search-activity" className="text-xs">
                Searches
              </TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs">
                Reviews
              </TabsTrigger>
            </TabsList>

            {/* Fuel Prices Report */}
            <TabsContent value="fuel-prices">
              <Card>
                <CardHeader>
                  <CardTitle>Station Fuel Price Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={selectedStation1}
                    onValueChange={(value) => {
                      setSelectedStation1(value);
                      fetchFuelPrices(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(stations) && stations.map((station) => (
                        <SelectItem
                          key={station.station_id}
                          value={station.station_id.toString()}
                        >
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {reportLoading ? (
                    <PageLoading />
                  ) : Array.isArray(fuelPrices) && fuelPrices.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fuel</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Available</TableHead>
                            <TableHead>Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fuelPrices.map((fuel, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{fuel.fuel_name}</TableCell>
                              <TableCell>
                                R{fuel.price_per_liter.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {fuel.is_available ? "Yes" : "No"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {new Date(fuel.last_updated).toLocaleDateString()}
                                <br />
                                <span className="text-muted-foreground">
                                  by {fuel.updated_by}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button onClick={handlePrint} variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </>
                  ) : selectedStation1 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No fuel price data available
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Price History Report */}
            <TabsContent value="price-history">
              <Card>
                <CardHeader>
                  <CardTitle>Price Change History Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={selectedStation2}
                    onValueChange={(value) => {
                      setSelectedStation2(value);
                      fetchPriceHistory(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(stations) && stations.map((station) => (
                        <SelectItem
                          key={station.station_id}
                          value={station.station_id.toString()}
                        >
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {reportLoading ? (
                    <PageLoading />
                  ) : Array.isArray(priceHistory) && priceHistory.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fuel</TableHead>
                            <TableHead>Old</TableHead>
                            <TableHead>New</TableHead>
                            <TableHead>Change</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {priceHistory.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.fuel_name}</TableCell>
                              <TableCell>R{item.old_price.toFixed(2)}</TableCell>
                              <TableCell>R{item.new_price.toFixed(2)}</TableCell>
                              <TableCell
                                className={
                                  item.change > 0
                                    ? "text-red-500"
                                    : "text-green-500"
                                }
                              >
                                {item.change > 0 ? "+" : ""}
                                {item.change.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {new Date(item.changed_at).toLocaleDateString()}
                                <br />
                                <span className="text-muted-foreground">
                                  by {item.changed_by}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button onClick={handlePrint} variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </>
                  ) : selectedStation2 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No price history data available
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Search Activity Report */}
            <TabsContent value="search-activity">
              <Card>
                <CardHeader>
                  <CardTitle>User Search Activity Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={selectedUser}
                    onValueChange={(value) => {
                      setSelectedUser(value);
                      fetchSearchActivity(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(users) && users.map((user) => (
                        <SelectItem
                          key={user.user_id}
                          value={user.user_id.toString()}
                        >
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {reportLoading ? (
                    <PageLoading />
                  ) : Array.isArray(searchActivity) && searchActivity.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Query</TableHead>
                            <TableHead>Filter</TableHead>
                            <TableHead>Results</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchActivity.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.query_text || "(All)"}</TableCell>
                              <TableCell>{item.fuel_filter || "-"}</TableCell>
                              <TableCell>{item.results_count}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(item.searched_at).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button onClick={handlePrint} variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </>
                  ) : selectedUser ? (
                    <p className="text-center text-muted-foreground py-4">
                      No search activity data available
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Report */}
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle>Station Reviews and Ratings Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={selectedStation4}
                    onValueChange={(value) => {
                      setSelectedStation4(value);
                      fetchReviews(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(stations) && stations.map((station) => (
                        <SelectItem
                          key={station.station_id}
                          value={station.station_id.toString()}
                        >
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {reportLoading ? (
                    <PageLoading />
                  ) : reviews ? (
                    <>
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          Average Rating
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <StarRating
                            rating={Math.round(reviews.average_rating)}
                            size="lg"
                          />
                          <span className="text-2xl font-bold">
                            {reviews.average_rating.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {reviews.reviews.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Reviewer</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead>Comment</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reviews.reviews.map((review, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{review.reviewer_name}</TableCell>
                                <TableCell>
                                  <StarRating rating={review.rating} size="sm" />
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate">
                                  {review.comment}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {new Date(
                                    review.created_at
                                  ).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No reviews yet
                        </p>
                      )}
                      <Button onClick={handlePrint} variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </>
                  ) : selectedStation4 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No reviews data available
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <BottomNav />
      </main>
    </ProtectedRoute>
  );
}
