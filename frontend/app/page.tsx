"use client";

import Link from "next/link";
import { Fuel, Search, LogIn, Navigation, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="text-center max-w-md mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-4 rounded-full bg-[#FF6B00]/10">
            <Fuel className="h-14 w-14 text-[#FF6B00]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-foreground mb-2">FuelUp</h1>
        <p className="text-lg text-muted-foreground mb-2">
          Find fuel near you, fast
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          South Africa &amp; Lesotho
        </p>

        {/* Main Actions */}
        <div className="flex flex-col gap-3 w-full">
          {/* Primary: Find Nearby with GPS */}
          <Button
            asChild
            size="lg"
            className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white h-14 text-lg"
          >
            <Link href="/search">
              <Navigation className="mr-2 h-6 w-6" />
              Find Nearest Station
            </Link>
          </Button>

          {/* Secondary: Search stations */}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00]/10 h-12"
          >
            <Link href="/search">
              <Search className="mr-2 h-5 w-5" />
              Search All Stations
            </Link>
          </Button>

          {/* Login */}
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="w-full text-muted-foreground hover:text-foreground h-12"
          >
            <Link href="/login">
              <LogIn className="mr-2 h-5 w-5" />
              Login / Register
            </Link>
          </Button>
        </div>

        {/* Features */}
        <div className="mt-10 grid grid-cols-3 gap-4 text-center">
          <div className="p-3">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">GPS Tracking</p>
          </div>
          <div className="p-3">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Fuel className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground">Fuel Availability</p>
          </div>
          <div className="p-3">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Search className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground">Real-time Prices</p>
          </div>
        </div>
      </div>
    </main>
  );
}
