"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  Search,
  Clock,
  Edit2,
  Plus,
  LogOut,
  Fuel,
  Trash2,
  RefreshCw,
  Check,
  X,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PageLoading } from "@/components/loading-spinner";
import { ProtectedRoute } from "@/components/protected-route";
import { StarRating } from "@/components/star-rating";
import { Spinner } from "@/components/ui/spinner";
import {
  api,
  ensureArray,
  type AdminStation,
  type Analytics,
  type StationFuel,
  type Review,
  type FuelType,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// Extended FuelType for admin management
interface AdminFuelType extends FuelType {
  description?: string;
  is_active?: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const [station, setStation] = useState<AdminStation | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [fuels, setFuels] = useState<StationFuel[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fuelTypes, setFuelTypes] = useState<AdminFuelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Station editing state
  const [editingStation, setEditingStation] = useState(false);
  const [stationForm, setStationForm] = useState({
    name: "",
    address: "",
    phone: "",
    opening_hours: "",
  });
  const [savingStation, setSavingStation] = useState(false);

  // Fuel editing state
  const [editingFuelId, setEditingFuelId] = useState<number | null>(null);
  const [fuelPriceEdit, setFuelPriceEdit] = useState("");
  const [savingFuel, setSavingFuel] = useState(false);

  // Add fuel dialog state
  const [addFuelOpen, setAddFuelOpen] = useState(false);
  const [newFuelType, setNewFuelType] = useState("");
  const [newFuelPrice, setNewFuelPrice] = useState("");
  const [addingFuel, setAddingFuel] = useState(false);

  // FuelType management state
  const [editingFuelTypeId, setEditingFuelTypeId] = useState<number | null>(null);
  const [fuelTypeForm, setFuelTypeForm] = useState({
    name: "",
    color_hex: "#FF6B00",
  });
  const [savingFuelType, setSavingFuelType] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [stationData, analyticsData, fuelTypesData, reviewsData] =
        await Promise.all([
          api<AdminStation>("/api/admin/station", { requiresAuth: true }),
          api<Analytics>("/api/admin/analytics", { requiresAuth: true }),
          api<FuelType[] | { fuels: FuelType[] } | { fuelTypes: FuelType[] }>("/api/fueltypes"),
          api<Review[] | { reviews: Review[] }>("/api/admin/reviews", { requiresAuth: true }),
        ]);

      setStation(stationData);
      setAnalytics(analyticsData);
      
      // Handle different API response formats for fuel types
      const fuelTypesArray = ensureArray(fuelTypesData, 'fuels', 'fuelTypes', 'fuel_types');
      setFuelTypes(fuelTypesArray as AdminFuelType[]);
      
      // Handle different API response formats for reviews
      const reviewsArray = ensureArray(reviewsData, 'reviews');
      setReviews(reviewsArray);
      
      setStationForm({
        name: stationData.name || "",
        address: stationData.address || "",
        phone: stationData.phone || "",
        opening_hours: stationData.opening_hours || "",
      });

      // Fetch fuels for this station
      if (stationData.station_id) {
        const fuelsResponse = await api<StationFuel[] | { fuels: StationFuel[] }>(
          `/api/stations/${stationData.station_id}/fuel`,
          { requiresAuth: true }
        );
        const fuelsArray = ensureArray(fuelsResponse, 'fuels');
        setFuels(fuelsArray);
      }
    } catch (error) {
      toast.error("Failed to load admin data");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    toast.success("Data refreshed");
  };

  const handleSaveStation = async () => {
    if (!station) return;
    setSavingStation(true);
    try {
      await api(`/api/stations/${station.station_id}`, {
        method: "PUT",
        requiresAuth: true,
        body: JSON.stringify(stationForm),
      });
      toast.success("Station info updated!");
      setEditingStation(false);
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update station"
      );
    } finally {
      setSavingStation(false);
    }
  };

  const handleUpdateFuelPrice = async (fuelId: number) => {
    if (!station) return;
    const price = parseFloat(fuelPriceEdit);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setSavingFuel(true);
    try {
      await api(`/api/stations/${station.station_id}/fuel/${fuelId}`, {
        method: "PUT",
        requiresAuth: true,
        body: JSON.stringify({ price_per_liter: price }),
      });
      toast.success("Price updated!");
      setEditingFuelId(null);
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update price"
      );
    } finally {
      setSavingFuel(false);
    }
  };

  const handleToggleAvailability = async (
    fuelId: number,
    currentAvailable: boolean
  ) => {
    if (!station) return;
    try {
      if (currentAvailable) {
        await api(`/api/stations/${station.station_id}/fuel/${fuelId}`, {
          method: "DELETE",
          requiresAuth: true,
        });
      } else {
        await api(`/api/stations/${station.station_id}/fuel/${fuelId}`, {
          method: "PUT",
          requiresAuth: true,
          body: JSON.stringify({ is_available: true }),
        });
      }
      toast.success(
        currentAvailable ? "Marked as unavailable" : "Marked as available"
      );
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update availability"
      );
    }
  };

  const handleAddFuel = async () => {
    if (!station || !newFuelType) return;
    const price = parseFloat(newFuelPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setAddingFuel(true);
    try {
      await api(`/api/stations/${station.station_id}/fuel`, {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify({
          fuel_type_id: parseInt(newFuelType),
          price_per_liter: price,
        }),
      });
      toast.success("Fuel type added!");
      setAddFuelOpen(false);
      setNewFuelType("");
      setNewFuelPrice("");
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add fuel type"
      );
    } finally {
      setAddingFuel(false);
    }
  };

  const handleRemoveFuel = async (fuelId: number) => {
    if (!station) return;
    try {
      await api(`/api/stations/${station.station_id}/fuel/${fuelId}`, {
        method: "DELETE",
        requiresAuth: true,
      });
      toast.success("Fuel removed from station");
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove fuel"
      );
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  // Get available fuel types (not already added to station)
  const getAvailableFuelTypes = () => {
    if (!Array.isArray(fuelTypes)) return [];
    const existingFuelTypeIds = Array.isArray(fuels) 
      ? fuels.map(f => f.fuel_type_id) 
      : [];
    return fuelTypes.filter(ft => {
      const ftId = ft.fuel_type_id ?? ft.fuel_id;
      return ftId && !existingFuelTypeIds.includes(ftId);
    });
  };

  // Get display name for fuel type
  const getFuelTypeName = (fuel: AdminFuelType) => {
    return fuel.name || fuel.fuel_name || 'Unknown Fuel';
  };

  // Get fuel type ID
  const getFuelTypeId = (fuel: AdminFuelType) => {
    return fuel.fuel_type_id ?? fuel.fuel_id;
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <PageLoading />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <main className="min-h-screen pb-8 bg-background">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="max-w-2xl mx-auto p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#FF6B00]" />
              <h1 className="text-xl font-bold text-foreground">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4">
          <Tabs defaultValue="station" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="station">Station</TabsTrigger>
              <TabsTrigger value="fuels">Fuels</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            {/* Station Tab */}
            <TabsContent value="station" className="space-y-4">
              {/* Station Info */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Station Information</CardTitle>
                    <CardDescription>
                      Manage your station details
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingStation(!editingStation)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {editingStation ? "Cancel" : "Edit"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingStation ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Station Name</Label>
                        <Input
                          id="name"
                          value={stationForm.name}
                          onChange={(e) =>
                            setStationForm({ ...stationForm, name: e.target.value })
                          }
                          placeholder="Enter station name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={stationForm.address}
                          onChange={(e) =>
                            setStationForm({
                              ...stationForm,
                              address: e.target.value,
                            })
                          }
                          placeholder="Enter full address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={stationForm.phone}
                            onChange={(e) =>
                              setStationForm({
                                ...stationForm,
                                phone: e.target.value,
                              })
                            }
                            placeholder="+27..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="opening_hours">Opening Hours</Label>
                          <Input
                            id="opening_hours"
                            value={stationForm.opening_hours}
                            onChange={(e) =>
                              setStationForm({
                                ...stationForm,
                                opening_hours: e.target.value,
                              })
                            }
                            placeholder="24 Hours"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleSaveStation}
                        disabled={savingStation}
                        className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
                      >
                        {savingStation ? <Spinner className="mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{station?.name || "Not set"}</p>
                          <p className="text-sm text-muted-foreground">Station Name</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-5 w-5 flex items-center justify-center text-muted-foreground">
                          <span className="text-lg">📍</span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {station?.address ? (
                              `${station.address}, ${station.city || ''}, ${station.country || ''}`
                            ) : "Not set"}
                          </p>
                          <p className="text-sm text-muted-foreground">Address</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <div className="h-5 w-5 flex items-center justify-center text-muted-foreground">
                            <span className="text-lg">📞</span>
                          </div>
                          <div>
                            <p className="font-medium">{station?.phone || "-"}</p>
                            <p className="text-sm text-muted-foreground">Phone</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{station?.opening_hours || "-"}</p>
                            <p className="text-sm text-muted-foreground">Hours</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>
                    Station performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Eye className="h-6 w-6 mx-auto text-[#FF6B00] mb-2" />
                      <p className="text-2xl font-bold">
                        {analytics?.view_count || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Search className="h-6 w-6 mx-auto text-[#FF6B00] mb-2" />
                      <p className="text-2xl font-bold">
                        {analytics?.search_appearances || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Searches</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <Clock className="h-6 w-6 mx-auto text-[#FF6B00] mb-2" />
                      <p className="text-sm font-medium">
                        {analytics?.last_viewed
                          ? new Date(analytics.last_viewed).toLocaleDateString()
                          : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">Last Viewed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fuels Tab */}
            <TabsContent value="fuels" className="space-y-4">
              {/* Fuel Types Database - Shows all available fuel types */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Fuel className="h-5 w-5 text-[#FF6B00]" />
                        Fuel Types Database
                      </CardTitle>
                      <CardDescription>
                        All fuel types available in the system
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {Array.isArray(fuelTypes) && fuelTypes.length > 0 ? (
                    <div className="grid gap-2">
                      {fuelTypes.map((fuelType) => {
                        const ftId = getFuelTypeId(fuelType);
                        const ftName = getFuelTypeName(fuelType);
                        return (
                          <div
                            key={ftId || ftName}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: fuelType.color_hex }}
                              />
                              <div>
                                <p className="font-medium" style={{ color: fuelType.color_hex }}>
                                  {ftName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {ftId}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" style={{ borderColor: fuelType.color_hex, color: fuelType.color_hex }}>
                              {fuelType.color_hex}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No fuel types found in database</p>
                      <p className="text-sm">
                        Contact system administrator to add fuel types
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Station Fuels Management */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Station Fuel Prices</CardTitle>
                    <CardDescription>
                      Manage fuel prices for your station
                    </CardDescription>
                  </div>
                  <Dialog open={addFuelOpen} onOpenChange={setAddFuelOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Fuel
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Fuel to Station</DialogTitle>
                        <DialogDescription>
                          Select a fuel type and set the price per litre
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Fuel Type</Label>
                          <Select
                            value={newFuelType}
                            onValueChange={setNewFuelType}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel type" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableFuelTypes().length > 0 ? (
                                getAvailableFuelTypes().map((fuel) => {
                                  const fuelId = getFuelTypeId(fuel);
                                  return (
                                    <SelectItem
                                      key={fuelId}
                                      value={String(fuelId)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: fuel.color_hex }}
                                        />
                                        <span style={{ color: fuel.color_hex }}>
                                          {getFuelTypeName(fuel)}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                })
                              ) : (
                                <SelectItem value="none" disabled>
                                  All fuel types already added
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Price per Litre (R)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newFuelPrice}
                            onChange={(e) => setNewFuelPrice(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setAddFuelOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddFuel}
                            disabled={addingFuel || !newFuelType || !newFuelPrice}
                            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
                          >
                            {addingFuel ? <Spinner className="mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add Fuel
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {Array.isArray(fuels) && fuels.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fuel Type</TableHead>
                          <TableHead>Price/L</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fuels.map((fuel) => {
                          const fuelKey = fuel.fuel_id || fuel.fuel_type_id;
                          return (
                            <TableRow key={fuelKey}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: fuel.color_hex }}
                                  />
                                  <span style={{ color: fuel.color_hex }}>
                                    {fuel.fuel_name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {editingFuelId === fuel.fuel_id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={fuelPriceEdit}
                                      onChange={(e) =>
                                        setFuelPriceEdit(e.target.value)
                                      }
                                      className="w-24"
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleUpdateFuelPrice(fuel.fuel_id)
                                      }
                                      disabled={savingFuel}
                                    >
                                      {savingFuel ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4 text-green-500" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingFuelId(null)}
                                    >
                                      <X className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="font-mono font-medium">
                                    R{typeof fuel.price_per_liter === 'number' ? fuel.price_per_liter.toFixed(2) : '0.00'}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={fuel.is_available}
                                  onCheckedChange={() =>
                                    handleToggleAvailability(
                                      fuel.fuel_id,
                                      fuel.is_available
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingFuelId(fuel.fuel_id);
                                      setFuelPriceEdit(
                                        String(fuel.price_per_liter || '')
                                      );
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveFuel(fuel.fuel_id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No fuel types added yet</p>
                      <p className="text-sm">
                        Click &quot;Add Fuel&quot; to add fuel types to your station
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                  <CardDescription>
                    Reviews from customers who visited your station
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Array.isArray(reviews) && reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review.review_id}
                          className="p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{review.user_name}</p>
                              <StarRating
                                rating={review.rating}
                                size="sm"
                                readonly
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No reviews yet</p>
                      <p className="text-sm">
                        Reviews will appear here when customers rate your station
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </ProtectedRoute>
  );
}
