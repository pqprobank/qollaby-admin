"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import LocationPicker, { PlaceValue } from "@/components/ui/location-picker";
import { getImageUrl, getVideoUrl, isVideoUrl } from "@/lib/appwrite";
import {
  getPosts,
  getExchangeListings,
  getPostsLikeCounts,
  getPostsReportCounts,
  getPostsStampCounts,
  getPostStats,
  Post,
  ExchangeListing,
  PostListResult,
  ExchangeListingListResult,
} from "@/lib/user-actions";
import { getStates, getLocationsByState, Location } from "@/lib/location-actions";
import { categories } from "@/lib/categories";
import {
  AlertTriangle,
  Ban,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  LayoutGrid,
  MessageCircle,
  Play,
  RefreshCw,
  Repeat,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// US State abbreviation to full name mapping
const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

const getStateFullName = (stateCode: string): string => {
  return US_STATE_NAMES[stateCode.toUpperCase()] || stateCode;
};

// Combined type for Post and ExchangeListing display
type PostOrExchange = Post | ExchangeListing;

// Extended post type with computed stats
interface ItemWithStats extends PostOrExchange {
  computedLikeCount: number;
  computedReportCount: number;
  computedStampCount: number;
}

export default function PostsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemWithStats[]>([]);
  const [stats, setStats] = useState({ totalPosts: 0, recentPosts: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "event" | "exchange">("all");
  
  // Location filters
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [loadingCities, setLoadingCities] = useState(false);
  
  // Location picker
  const [selectedLocation, setSelectedLocation] = useState<PlaceValue | null>(null);
  
  // Category filters
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  
  // Show filters panel
  const [showFilters, setShowFilters] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let itemsData: PostOrExchange[] = [];
      let totalCount = 0;
      let totalPagesCount = 1;

      if (typeFilter === "exchange") {
        // Fetch from exchange_listings table
        const result: ExchangeListingListResult = await getExchangeListings({
          page,
          limit: 20,
          search: search || undefined,
          state: stateFilter || undefined,
          city: cityFilter || undefined,
          category: categoryFilter || undefined,
          subcategory: subcategoryFilter || undefined,
        });
        itemsData = result.listings;
        totalCount = result.total;
        totalPagesCount = result.totalPages;
      } else {
        // Fetch from posts table (post/event types)
        const result: PostListResult = await getPosts({
          page,
          limit: 20,
          search: search || undefined,
          type: typeFilter,
          state: stateFilter || undefined,
          city: cityFilter || undefined,
          category: categoryFilter || undefined,
          subcategory: subcategoryFilter || undefined,
        });
        itemsData = result.posts;
        totalCount = result.total;
        totalPagesCount = result.totalPages;
      }

      // Fetch like, report, and stamp counts for all items (only for posts, not exchange)
      const itemIds = itemsData.map((p) => p.$id);
      let likeCounts = new Map<string, number>();
      let reportCounts = new Map<string, number>();
      let stampCounts = new Map<string, number>();

      if (typeFilter !== "exchange" && itemIds.length > 0) {
        [likeCounts, reportCounts, stampCounts] = await Promise.all([
          getPostsLikeCounts(itemIds),
          getPostsReportCounts(itemIds),
          getPostsStampCounts(itemIds),
        ]);
      }

      // Merge stats into items
      const itemsWithStats: ItemWithStats[] = itemsData.map((item) => ({
        ...item,
        computedLikeCount: likeCounts.get(item.$id) || 0,
        computedReportCount: reportCounts.get(item.$id) || 0,
        computedStampCount: stampCounts.get(item.$id) || 0,
      }));

      setItems(itemsWithStats);
      setTotalPages(totalPagesCount);
      setTotal(totalCount);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, stateFilter, cityFilter, categoryFilter, subcategoryFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getPostStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchItems]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, stateFilter, cityFilter, categoryFilter, subcategoryFilter]);

  // Load states on mount
  useEffect(() => {
    getStates().then(setStates);
  }, []);

  // Load cities when state changes
  useEffect(() => {
    if (stateFilter) {
      setLoadingCities(true);
      getLocationsByState(stateFilter)
        .then(setCities)
        .finally(() => setLoadingCities(false));
      setCityFilter(""); // Reset city when state changes
    } else {
      setCities([]);
      setCityFilter("");
    }
  }, [stateFilter]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategoryFilter("");
  }, [categoryFilter]);

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c.value === categoryFilter);
  const subcategories = selectedCategory?.subCategories || [];

  // Count active filters
  const activeFilterCount = [stateFilter, cityFilter, categoryFilter, subcategoryFilter].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setStateFilter("");
    setCityFilter("");
    setCategoryFilter("");
    setSubcategoryFilter("");
    setSelectedLocation(null);
  };

  // Handle location change - auto apply filter
  const handleLocationChange = (location: PlaceValue | null) => {
    setSelectedLocation(location);
    if (location?.state) {
      // Use state abbreviation directly (e.g., "CA") for filtering
      // because the database stores abbreviations
      setStateFilter(location.state);
      setCityFilter(location.city || "");
    } else {
      setStateFilter("");
      setCityFilter("");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Posts</h1>
          <p className="text-muted-foreground">View all posts and their statistics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchItems();
            fetchStats();
          }}
          className="w-fit"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Posts
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last 7 Days
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.recentPosts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-input/50 border-border/50"
                />
              </div>
            </form>
            {/* Type filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("all")}
                className={typeFilter === "all" ? "bg-primary" : "bg-secondary/50 border-border/50"}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                All
              </Button>
              <Button
                variant={typeFilter === "post" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("post")}
                className={typeFilter === "post" ? "bg-primary" : "bg-secondary/50 border-border/50"}
              >
                <FileText className="h-4 w-4 mr-1" />
                Posts
              </Button>
              <Button
                variant={typeFilter === "event" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("event")}
                className={typeFilter === "event" ? "bg-primary" : "bg-secondary/50 border-border/50"}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Events
              </Button>
              <Button
                variant={typeFilter === "exchange" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("exchange")}
                className={typeFilter === "exchange" ? "bg-primary" : "bg-secondary/50 border-border/50"}
              >
                <Repeat className="h-4 w-4 mr-1" />
                Exchange
              </Button>
              {/* Filter toggle button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`bg-secondary/50 border-border/50 ${activeFilterCount > 0 ? "border-primary text-primary" : ""}`}
              >
                <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Expandable filters panel */}
          {showFilters && (
            <div className="pt-4 border-t border-border/30 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Location filter - inline picker */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Location (State required)</label>
                  <LocationPicker
                    value={selectedLocation}
                    onChange={handleLocationChange}
                    placeholder="Search city or address..."
                    countryRestriction="us"
                    showCurrentLocation={false}
                  />
                </div>

                {/* Category filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border/50 bg-input/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategory filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Subcategory</label>
                  <select
                    value={subcategoryFilter}
                    onChange={(e) => setSubcategoryFilter(e.target.value)}
                    disabled={!categoryFilter}
                    className="w-full h-9 px-3 rounded-md border border-border/50 bg-input/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Subcategories</option>
                    {subcategories.map((sub) => (
                      <option key={sub.value} value={sub.value}>{sub.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear filters button */}
              {activeFilterCount > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Posts grid */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {typeFilter === "exchange" ? "exchange listings" : "posts"} found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => (
                <PostCard
                  key={item.$id}
                  post={item}
                  onClick={() => router.push(typeFilter === "exchange" ? `/posts/${item.$id}?type=exchange` : `/posts/${item.$id}`)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                {total} posts total, page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-secondary/50 border-border/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
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
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

interface PostCardProps {
  post: ItemWithStats;
  onClick: () => void;
}

function PostCard({ post, onClick }: PostCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  // Use `media` field (correct field name from database)
  const firstMedia = post.media?.[0] || null;
  const isVideo = firstMedia ? isVideoUrl(firstMedia) : false;
  
  // Get the appropriate URL
  const mediaUrl = firstMedia 
    ? (isVideo ? getVideoUrl(firstMedia) : getImageUrl(firstMedia, 400, 400))
    : null;

  // Handle hover for video preview
  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    
    if (isHovering) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovering, isVideo]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`group cursor-pointer rounded-lg overflow-hidden border bg-card/50 hover:shadow-lg transition-all ${
        post.isBlacklisted 
          ? "border-red-500/50 bg-red-950/10 hover:border-red-500/70" 
          : "border-border/50 hover:border-primary/30"
      }`}
    >
      {/* Media */}
      <div className="aspect-square bg-secondary/30 relative overflow-hidden">
        {mediaUrl && !imgError ? (
          isVideo ? (
            <>
              <video
                ref={videoRef}
                src={mediaUrl}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
              />
              {/* Video indicator badge */}
              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium flex items-center gap-1 z-10">
                <Play className="w-3 h-3" />
                Video
              </div>
              {/* Play icon overlay when not hovering */}
              {!isHovering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <img
              src={mediaUrl}
              alt={post.title || "Post"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
          />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Badges (top right) */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {/* Blacklisted badge */}
          {post.isBlacklisted && (
            <div className="px-2 py-1 rounded bg-red-600/90 text-white text-xs font-medium flex items-center gap-1">
              <Ban className="w-3 h-3" />
              Blocked
            </div>
          )}
          {/* Event badge */}
          {post.type === "event" && !isVideo && (
            <div className="px-2 py-1 rounded bg-orange-500/90 text-white text-xs font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Event
            </div>
          )}
          {/* Exchange badge */}
          {post.type === "exchange" && !isVideo && (
            <div className="px-2 py-1 rounded bg-purple-500/90 text-white text-xs font-medium flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              Exchange
            </div>
          )}
        </div>
        
        {/* Overlay with stats on hover (for images) */}
        {!isVideo && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex gap-4 text-white text-sm">
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
                <span>{post.computedLikeCount}</span>
            </div>
            <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{post.computedStampCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Title and stats bar */}
      <div className="p-2">
        <p className="text-sm font-medium truncate mb-1">{post.title || "Untitled"}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
              {post.computedLikeCount}
          </span>
          <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {post.computedStampCount}
          </span>
        </div>
          {post.computedReportCount > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3 w-3" />
              {post.computedReportCount}
          </span>
        )}
        </div>
      </div>
    </div>
  );
}
