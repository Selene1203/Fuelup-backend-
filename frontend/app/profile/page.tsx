"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import { PageLoading } from "@/components/loading-spinner";
import { ProtectedRoute } from "@/components/protected-route";
import { Spinner } from "@/components/ui/spinner";
import { api, type User, type FuelType } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const THEME_OPTIONS = ["dark", "light", "neon", "sunset"];
const DISTANCE_OPTIONS = ["km", "miles"];

export default function ProfilePage() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    preferred_fuel: "",
    preferred_theme: "dark",
    distance_unit: "km",
    gps_enabled: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, fuelData] = await Promise.all([
          api<User>("/api/users/profile", { requiresAuth: true }),
          api<{ fuels: FuelType[] }>("/api/fueltypes"),
        ]);

        setUser(userData);
        // Deduplicate by fuel_name
        if (fuelData.fuels && Array.isArray(fuelData.fuels)) {
          const uniqueFuels = fuelData.fuels.reduce((acc: FuelType[], fuel) => {
            if (!acc.find(f => f.fuel_name === fuel.fuel_name)) {
              acc.push(fuel);
            }
            return acc;
          }, []);
          setFuelTypes(uniqueFuels);
        }
        setFormData({
          name: userData.name || "",
          preferred_fuel: userData.preferred_fuel?.toString() || "",
          preferred_theme: userData.preferred_theme || "dark",
          distance_unit: userData.distance_unit || "km",
          gps_enabled: userData.gps_enabled || false,
        });
      } catch (error) {
        toast.error("Failed to load profile");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/api/users/profile", {
        method: "PUT",
        requiresAuth: true,
        body: JSON.stringify({
          name: formData.name,
          preferred_fuel: formData.preferred_fuel
            ? parseInt(formData.preferred_fuel)
            : null,
          preferred_theme: formData.preferred_theme,
          distance_unit: formData.distance_unit,
          gps_enabled: formData.gps_enabled,
        }),
      });
      toast.success("Profile updated!");
      refreshUser();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
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
          <div className="max-w-lg mx-auto p-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Profile</h1>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_fuel">Preferred Fuel</Label>
                <Select
                  value={formData.preferred_fuel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preferred_fuel: value })
                  }
                >
                  <SelectTrigger id="preferred_fuel">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(fuelTypes) && fuelTypes.map((fuel) => (
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_theme">Preferred Theme</Label>
                <Select
                  value={formData.preferred_theme}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preferred_theme: value })
                  }
                >
                  <SelectTrigger id="preferred_theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map((theme) => (
                      <SelectItem key={theme} value={theme}>
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distance_unit">Distance Unit</Label>
                <Select
                  value={formData.distance_unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, distance_unit: value })
                  }
                >
                  <SelectTrigger id="distance_unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTANCE_OPTIONS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="gps_enabled">GPS Enabled</Label>
                <Switch
                  id="gps_enabled"
                  checked={formData.gps_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, gps_enabled: checked })
                  }
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
              >
                {saving ? <Spinner className="mr-2" /> : null}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <Link href="/history">
            <Card className="hover:border-[#FF6B00]/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <History className="h-5 w-5 text-[#FF6B00]" />
                <span className="font-medium">Search History</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        <BottomNav />
      </main>
    </ProtectedRoute>
  );
}
