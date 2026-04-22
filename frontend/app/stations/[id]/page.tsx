"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  BadgeCheck,
  Heart,
  HeartOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { StarRating } from "@/components/star-rating";
import { Spinner } from "@/components/ui/spinner";
import {
  api,
  type Station,
  type Favourite,
  isAuthenticated,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function StationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();

  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteLoading, setFavouriteLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stationData = await api<Station>(`/api/stations/${id}`);
        setStation(stationData);

        // Check if this station is in user's favourites
        if (isAuthenticated()) {
          try {
            const response = await api<{ favourites: Favourite[] } | Favourite[]>("/api/favourites", {
              requiresAuth: true,
            });
            const favouritesArray = Array.isArray(response) ? response : (response.favourites || []);
            setIsFavourite(
              favouritesArray.some((f) => f.station_id === parseInt(id))
            );
          } catch {
            // User might not be logged in or favourites failed
          }
        }
      } catch (error) {
        toast.error("Failed to load station");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const toggleFavourite = async () => {
    if (!isAuthenticated()) {
      toast.error("Please login to add favourites");
      return;
    }

    setFavouriteLoading(true);
    try {
      if (isFavourite) {
        await api(`/api/favourites/${id}`, {
          method: "DELETE",
          requiresAuth: true,
        });
        setIsFavourite(false);
        toast.success("Removed from favourites");
      } else {
        await api("/api/favourites", {
          method: "POST",
          requiresAuth: true,
          body: JSON.stringify({ station_id: parseInt(id) }),
        });
        setIsFavourite(true);
        toast.success("Added to favourites");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update favourites"
      );
    } finally {
      setFavouriteLoading(false);
    }
  };

  const submitReview = async () => {
    if (!isAuthenticated()) {
      toast.error("Please login to submit a review");
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Please select a rating between 1 and 5");
      return;
    }

    setReviewError("");
    setReviewSubmitting(true);

    try {
      await api("/api/reviews", {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify({
          station_id: parseInt(id),
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      toast.success("Review submitted!");
      setReviewRating(0);
      setReviewComment("");

      // Refresh station data to show new review
      const stationData = await api<Station>(`/api/stations/${id}`);
      setStation(stationData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit review"
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const deleteReview = async (reviewId: number) => {
    try {
      await api(`/api/reviews/${reviewId}`, {
        method: "DELETE",
        requiresAuth: true,
      });
      toast.success("Review deleted");

      // Refresh station data
      const stationData = await api<Station>(`/api/stations/${id}`);
      setStation(stationData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete review"
      );
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  if (!station) {
    return (
      <main className="min-h-screen pb-20 bg-background">
        <div className="max-w-lg mx-auto p-4">
          <p className="text-center text-muted-foreground">Station not found</p>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 bg-background">
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-lg mx-auto p-4 flex items-center gap-3">
          <Link
            href="/search"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-foreground truncate flex-1">
            {station.name}
          </h1>
          {station.is_verified && (
            <BadgeCheck className="h-5 w-5 text-[#FF6B00] flex-shrink-0" />
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Station Info */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>
                {station.address}, {station.city}, {station.country}
              </span>
            </div>

            {station.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{station.phone}</span>
              </div>
            )}

            {station.opening_hours && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{station.opening_hours}</span>
              </div>
            )}

            {station.avg_rating !== undefined && station.avg_rating > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(station.avg_rating)} size="md" />
                <span className="text-muted-foreground">
                  {station.avg_rating.toFixed(1)} rating
                </span>
              </div>
            )}

            {isAuthenticated() && (
              <Button
                onClick={toggleFavourite}
                disabled={favouriteLoading}
                variant={isFavourite ? "destructive" : "default"}
                className={
                  !isFavourite
                    ? "bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
                    : ""
                }
              >
                {favouriteLoading ? (
                  <Spinner className="mr-2" />
                ) : isFavourite ? (
                  <HeartOff className="mr-2 h-4 w-4" />
                ) : (
                  <Heart className="mr-2 h-4 w-4" />
                )}
                {isFavourite ? "Remove from Favourites" : "Add to Favourites"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Fuel Prices */}
        {station.fuels && Array.isArray(station.fuels) && station.fuels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fuel Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Price/L</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(station.fuels) && station.fuels.map((fuel) => (
                    <TableRow key={fuel.fuel_id || fuel.fuel_type_id}>
                      <TableCell>
                        <span style={{ color: fuel.color_hex }}>
                          {fuel.fuel_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        R{parseFloat(String(fuel.price_per_liter)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={fuel.is_available ? "default" : "secondary"}
                          className={
                            fuel.is_available
                              ? "bg-green-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {fuel.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated() && (
              <div className="space-y-3 pb-4 border-b border-border">
                <p className="text-sm font-medium">Write a Review</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rating:</span>
                  <StarRating
                    rating={reviewRating}
                    interactive
                    onRatingChange={setReviewRating}
                  />
                </div>
                <Textarea
                  placeholder="Share your experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
                {reviewError && (
                  <p className="text-sm text-destructive">{reviewError}</p>
                )}
                <Button
                  onClick={submitReview}
                  disabled={reviewSubmitting}
                  className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white"
                >
                  {reviewSubmitting ? <Spinner className="mr-2" /> : null}
                  Submit Review
                </Button>
              </div>
            )}

            {station.reviews && Array.isArray(station.reviews) && station.reviews.length > 0 ? (
              <div className="space-y-4">
                {Array.isArray(station.reviews) && station.reviews.map((review) => (
                  <div
                    key={review.review_id}
                    className="border-b border-border pb-4 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.user_name}</span>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                      {user?.user_id === review.user_id && (
                        <button
                          onClick={() => deleteReview(review.review_id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {review.comment}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No reviews yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </main>
  );
}
