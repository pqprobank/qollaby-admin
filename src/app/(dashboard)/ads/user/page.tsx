"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSponsorAds,
  getSponsorAdStats,
  getAdMetrics,
  getAdsLikeCounts,
  SponsorAd,
  SponsorAdStatus,
} from "@/lib/user-actions";
import { getImageUrl, getVideoUrl, isVideoUrl } from "@/lib/appwrite";
import { ImageThumbnail } from "@/components/ui/image-thumbnail";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { getCategories, getSubcategories, Category } from "@/lib/category-actions";
import { getStateFullName } from "@/lib/utils";
import LocationPicker, { PlaceValue } from "@/components/ui/location-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Megaphone,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Heart,
  Eye,
  MousePointer,
  TrendingUp,
  Ban,
  Play,
  CheckCircle,
  Clock,
  XCircle,
  X,
} from "lucide-react";

interface AdWithStats extends SponsorAd {
  computedLikeCount: number;
}

export default function UserAdsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<AdWithStats[]>([]);
  const [stats, setStats] = useState({ totalAds: 0, activeAds: 0, pendingAds: 0 });
  const [metrics, setMetrics] = useState({ totalViews: 0, totalClicks: 0, ctr: 0 });
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<"all" | SponsorAdStatus>(() => (searchParams.get("status") as "all" | SponsorAdStatus) || "all");

  // Filter state
  const [stateFilter, setStateFilter] = useState(() => searchParams.get("state") || "");
  const [cityFilter, setCityFilter] = useState(() => searchParams.get("city") || "");
  const [selectedLocation, setSelectedLocation] = useState<PlaceValue | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category") || "");
  const [subcategoryFilter, setSubcategoryFilter] = useState(() => searchParams.get("subcategory") || "");

  // Dynamic categories
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  const [filterSubcategoriesList, setFilterSubcategoriesList] = useState<Category[]>([]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const [result, statsData, metricsData] = await Promise.all([
        getSponsorAds({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter,
          state: stateFilter || undefined,
          city: cityFilter || undefined,
          category: categoryFilter || undefined,
          subcategory: subcategoryFilter || undefined,
          isAdminCreated: false, // Only user ads
        }),
        getSponsorAdStats(false), // Only user-created ads stats
        getAdMetrics(false), // Only user-created ads metrics
      ]);

      const adIds = result.ads.map((ad) => ad.$id);
      const likeCounts = await getAdsLikeCounts(adIds);

      const adsWithStats: AdWithStats[] = result.ads.map((ad) => ({
        ...ad,
        computedLikeCount: likeCounts.get(ad.$id) || 0,
      }));

      setAds(adsWithStats);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setStats(statsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Failed to fetch ads:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, stateFilter, cityFilter, categoryFilter, subcategoryFilter]);

  useEffect(() => {
    fetchAds();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchAds]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, stateFilter, cityFilter, categoryFilter, subcategoryFilter]);

  // Sync filter state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (stateFilter) params.set("state", stateFilter);
    if (cityFilter) params.set("city", cityFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (subcategoryFilter) params.set("subcategory", subcategoryFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/ads/user", { scroll: false });
  }, [search, statusFilter, stateFilter, cityFilter, categoryFilter, subcategoryFilter, page, router]);

  // Load categories on mount
  useEffect(() => {
    getCategories().then(setDynamicCategories);
  }, []);

  // Handle location change
  const handleLocationChange = (location: PlaceValue | null) => {
    setSelectedLocation(location);
    if (location?.state) {
      const stateFullName = getStateFullName(location.state);
      setStateFilter(stateFullName);
      setCityFilter(location.city || "");
    } else {
      setStateFilter("");
      setCityFilter("");
    }
  };

  // Reset subcategory filter and fetch subcategories when category filter changes
  useEffect(() => {
    setSubcategoryFilter("");
    if (categoryFilter) {
      getSubcategories(categoryFilter).then(setFilterSubcategoriesList);
    } else {
      setFilterSubcategoriesList([]);
    }
  }, [categoryFilter]);

  // Count active filters
  const activeFilterCount = [stateFilter, cityFilter, categoryFilter, subcategoryFilter].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSelectedLocation(null);
    setStateFilter("");
    setCityFilter("");
    setCategoryFilter("");
    setSubcategoryFilter("");
  };

  const getStatusColor = (status: SponsorAdStatus) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-500";
      case "expired":
        return "bg-gray-500/20 text-gray-400";
      case "rejected":
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getStatusIcon = (status: SponsorAdStatus) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-3 h-3" />;
      case "pending":
        return <Clock className="w-3 h-3" />;
      case "expired":
        return <XCircle className="w-3 h-3" />;
      case "rejected":
        return <Ban className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="User Ads"
        description="Ads created by premium users (members)"
        icon={Megaphone}
        children={
          <Button
            variant="outline"
            onClick={fetchAds}
            className="bg-secondary/50 border-border/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Stats Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total User Ads</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Ads</p>
                <p className="text-2xl font-bold">{stats.activeAds}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Row 2: Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{metrics.totalViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <MousePointer className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{metrics.totalClicks.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CTR</p>
                <p className="text-2xl font-bold">{metrics.ctr.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ads List */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" />
            User Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <form onSubmit={(e) => { e.preventDefault(); fetchAds(); }} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ads by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-input/50 border-border/50"
              />
            </form>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | SponsorAdStatus)}
                className="h-9 px-3 rounded-md border border-border/50 bg-input/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Filters - always visible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 rounded-lg bg-secondary/20 border border-border/30">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <LocationPicker
                  value={selectedLocation}
                  onChange={handleLocationChange}
                  placeholder="Search city or address..."
                  countryRestriction="us"
                  showCurrentLocation={false}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border/50 bg-input/50 text-sm"
                >
                  <option value="">All Categories</option>
                  {dynamicCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Subcategory</label>
                <select
                  value={subcategoryFilter}
                  onChange={(e) => setSubcategoryFilter(e.target.value)}
                  disabled={!categoryFilter}
                  className="w-full h-9 px-3 rounded-md border border-border/50 bg-input/50 text-sm disabled:opacity-50"
                >
                  <option value="">All Subcategories</option>
                  {filterSubcategoriesList.map((sub) => (
                    <option key={sub.value} value={sub.value}>{sub.name}</option>
                  ))}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
          </div>

          {/* Ads Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
              ))}
            </div>
          ) : ads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Megaphone className="h-12 w-12 mb-4 opacity-50" />
              <p>No user ads found</p>
              {(search || activeFilterCount > 0) && (
                <p className="text-sm mt-2">Try adjusting your search or filters</p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {ads.map((ad) => {
                  const mediaItems = ad.media || [];
                  const firstVideoMedia = mediaItems.find((item) => isVideoUrl(item)) || "";
                  const firstImageMedia = mediaItems.find((item) => !isVideoUrl(item)) || "";
                  const coverImage = ad.image || firstImageMedia;
                  const hasVideo = mediaItems.some((item) => isVideoUrl(item));

                  return (
                    <div
                      key={ad.$id}
                      onClick={() => router.push(`/ads/${ad.$id}`)}
                      className="group relative bg-card/50 rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg"
                    >
                      {/* Media */}
                      <div className="relative aspect-[4/3]">
                        {coverImage ? (
                          <ImageThumbnail
                            src={getImageUrl(coverImage, 400, 400)}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                          />
                        ) : firstVideoMedia ? (
                          <VideoThumbnail src={getVideoUrl(firstVideoMedia)} />
                        ) : (
                          <div className="w-full h-full bg-secondary/40" />
                        )}
                        {!coverImage && firstVideoMedia && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                            <Play className="h-10 w-10 text-white/80" />
                          </div>
                        )}
                        {hasVideo && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-medium flex items-center gap-1 z-10">
                            <Play className="h-3 w-3" />
                            Video
                          </div>
                        )}
                        {/* Status badge */}
                        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(ad.status)}`}>
                          {getStatusIcon(ad.status)}
                          {ad.status}
                        </div>
                        {/* Slot badge */}
                        {ad.slot !== undefined && ad.slot !== null && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500/90 text-white text-xs font-bold">
                            Slot {ad.slot + 1}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        <h3 className="font-medium text-sm truncate">{ad.title}</h3>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {ad.city}, {ad.state}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {ad.computedLikeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {ad.views || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3" />
                            {ad.clicks || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-secondary/50 border-border/50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} ads)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="bg-secondary/50 border-border/50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
