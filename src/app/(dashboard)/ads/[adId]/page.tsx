"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getSponsorAdById,
  getAdLikeCount,
  blacklistSponsorAd,
  unblacklistSponsorAd,
  getUserByUserId,
  SponsorAd,
  SponsorAdStatus,
} from "@/lib/user-actions";
import { Profile } from "@/types/profile.types";
import { getImageUrl, getVideoUrl, isVideoUrl } from "@/lib/appwrite";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAllCategories, getCategoryLabel, getSubCategoryLabel, getSlotLabel, Category } from "@/lib/category-actions";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Heart,
  AlertTriangle,
  Calendar,
  Hash,
  FileText,
  Tag,
  Play,
  Image as ImageIcon,
  MapPin,
  User,
  Clock,
  Eye,
  MousePointer,
  Ban,
  CheckCircle,
  RefreshCw,
  XCircle,
  Megaphone,
  TrendingUp,
  Shield,
  Phone,
  Globe,
} from "lucide-react";

export default function AdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adId = params.adId as string;

  const [loading, setLoading] = useState(true);
  const [ad, setAd] = useState<SponsorAd | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [blacklistDialog, setBlacklistDialog] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const fetchAd = useCallback(async () => {
    setLoading(true);
    try {
      const [adData, likes] = await Promise.all([
        getSponsorAdById(adId),
        getAdLikeCount(adId),
      ]);
      setAd(adData);
      setLikeCount(likes);
      
      // Fetch user profile
      if (adData?.userId) {
        const profile = await getUserByUserId(adData.userId);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Failed to fetch ad:", error);
    } finally {
      setLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    if (adId) {
      fetchAd();
    }
    getAllCategories().then(setAllCategories);
  }, [adId, fetchAd]);

  const handleBlacklist = async () => {
    if (!ad) return;
    setActionLoading(true);
    try {
      if (ad.isBlacklisted) {
        await unblacklistSponsorAd(adId);
      } else {
        await blacklistSponsorAd(adId);
      }
      await fetchAd();
    } catch (error) {
      console.error("Failed to update blacklist status:", error);
    } finally {
      setActionLoading(false);
      setBlacklistDialog(false);
    }
  };

  // Convert stored slot to display slot (stored = display - 1)
  const getDisplaySlot = (storedSlot: number | undefined): number | undefined => {
    if (storedSlot === undefined || storedSlot === null) return undefined;
    return storedSlot + 1;
  };
  
  const displaySlot = ad ? getDisplaySlot(ad.slot) : undefined;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Ad Not Found</h2>
        <p className="text-muted-foreground mb-6">Could not find the advertisement</p>
        <Button onClick={() => router.push("/ads/user")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ads
        </Button>
      </div>
    );
  }

  // Process media array
  const rawMedia = ad.media || (ad.image ? [ad.image] : []);
  const processedMedia = rawMedia.map((item, index) => {
    const isVideo = isVideoUrl(item);
    return {
      url: isVideo ? getVideoUrl(item) : getImageUrl(item, 800, 800),
      isVideo,
      posterUrl: isVideo && index === 0 && ad.image ? getImageUrl(ad.image, 800, 800) : undefined,
    };
  });

  const videoCount = processedMedia.filter((m) => m.isVideo).length;
  const imageCount = processedMedia.filter((m) => !m.isVideo).length;

  const categoryLabel = getCategoryLabel(allCategories, ad.category);
  const subCategoryLabel = ad.subcategory
    ? getSubCategoryLabel(allCategories, ad.subcategory)
    : null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(ad.isAdminCreated ? "/ads/admin" : "/ads/user")}
            className="bg-secondary/50 border-border/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary shrink-0" />
              Ad Details
            </h1>
            <p className="text-muted-foreground">View and manage advertisement</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAd}
            className="bg-secondary/50 border-border/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant={ad.isBlacklisted ? "outline" : "destructive"}
            size="sm"
            onClick={() => setBlacklistDialog(true)}
            disabled={actionLoading}
            className={ad.isBlacklisted ? "border-green-500/50 text-green-500 hover:bg-green-500/20 hover:text-green-400" : ""}
          >
            {ad.isBlacklisted ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Unblock Ad
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Block Ad
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Blacklist warning banner */}
      {ad.isBlacklisted && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <Ban className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-500">This ad is blocked</p>
            <p className="text-sm text-muted-foreground">
              This advertisement is hidden from the public feed.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Media gallery */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            {processedMedia.length > 0 ? (
              <>
                <MediaCarousel media={processedMedia} />
                <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
                  {imageCount > 0 && (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-4 w-4" />
                      {imageCount} {imageCount === 1 ? "image" : "images"}
                    </span>
                  )}
                  {videoCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Play className="h-4 w-4" />
                      {videoCount} {videoCount === 1 ? "video" : "videos"}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="aspect-square rounded-lg bg-secondary/30 flex items-center justify-center">
                <Megaphone className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="space-y-6">
          {/* Title and description */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Info with Avatar */}
              <div className="flex items-center gap-4 pb-3 border-b border-border/30">
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  {userProfile?.avatar ? (
                    <AvatarImage src={userProfile.avatar} alt={userProfile.firstName} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {userProfile ? (
                      `${userProfile.firstName?.[0] || ""}${userProfile.lastName?.[0] || ""}`
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {userProfile 
                      ? `${userProfile.firstName} ${userProfile.lastName}`.trim() || "Unknown"
                      : "Loading..."}
                  </p>
                  <p className="text-sm text-primary truncate">
                    {userProfile?.email || "N/A"}
                  </p>
                </div>
              </div>
              {/* Admin Badge */}
              {ad.isAdminCreated && (
                <div className="flex items-center gap-2 pb-3 border-b border-border/30">
                  <div className="px-2.5 py-1 rounded-md bg-green-600/20 text-green-500 text-xs font-medium flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Admin Created Ad
                  </div>
                </div>
              )}
              {/* Slot Position */}
              {displaySlot !== undefined && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Slot Position</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                      displaySlot === 1 || displaySlot === 10 || displaySlot === 20
                        ? "bg-red-500/10 text-red-500 border border-red-500/30"
                        : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                    }`}
                  >
                    Slot #{displaySlot}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Title</p>
                <p className="font-medium">{ad.title || "Untitled"}</p>
              </div>
              {ad.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{ad.description}</p>
                </div>
              )}
              {ad.phoneNumber && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                  <a
                    href={`tel:${ad.phoneNumber}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    {ad.phoneNumber}
                  </a>
                </div>
              )}
              {ad.website && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Website</p>
                  <a
                    href={ad.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" />
                    {ad.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow icon={Eye} label="Views" value={ad.views || 0} color="text-blue-500" />
              <StatRow icon={MousePointer} label="Clicks" value={ad.clicks || 0} color="text-green-500" />
              <StatRow icon={Heart} label="Likes" value={likeCount} color="text-pink-500" />
              <ConversionRow views={ad.views || 0} clicks={ad.clicks || 0} />
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Target Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={MapPin} label="State" value={ad.state || "N/A"} />
              <InfoRow icon={MapPin} label="City" value={ad.city || "N/A"} />
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Hash} label="Ad ID" value={ad.$id} mono />
              <InfoRow icon={Hash} label="User ID" value={ad.userId} mono />
              <InfoRow icon={Tag} label="Category" value={categoryLabel} />
              {subCategoryLabel && (
                <InfoRow icon={Tag} label="Sub Category" value={subCategoryLabel} />
              )}
              <InfoRow icon={Calendar} label="Created At" value={formatDate(ad.$createdAt)} />
              <InfoRow icon={Clock} label="Expires At" value={formatDate(ad.expiresAt)} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Blacklist Confirmation Dialog */}
      <AlertDialog open={blacklistDialog} onOpenChange={setBlacklistDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ad.isBlacklisted ? "Unblock this ad?" : "Block this ad?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ad.isBlacklisted
                ? "This will make the ad visible in the public feed again."
                : "This will hide the ad from the public feed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary/50 border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlacklist}
              className={
                ad.isBlacklisted
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-destructive hover:bg-destructive/90"
              }
            >
              {ad.isBlacklisted ? "Unblock" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}

interface StatRowProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color?: string;
}

function StatRow({ icon: Icon, label, value, color = "text-muted-foreground" }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Icon className={`h-4 w-4 ${color}`} />
        <span>{label}</span>
      </div>
      <span className={`text-lg font-semibold ${color}`}>{value.toLocaleString()}</span>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}

function InfoRow({ icon: Icon, label, value, mono }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className={mono ? "font-mono text-sm" : ""}>{value}</span>
    </div>
  );
}

interface ConversionRowProps {
  views: number;
  clicks: number;
}

function ConversionRow({ views, clicks }: ConversionRowProps) {
  const rate = views > 0 ? (clicks / views) * 100 : 0;
  const formattedRate = rate.toFixed(2);

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-3 text-muted-foreground">
        <TrendingUp className="h-4 w-4 text-orange-500" />
        <span>Conversion Rate</span>
      </div>
      <span className="text-lg font-semibold text-orange-500">{formattedRate}%</span>
    </div>
  );
}
