"use client";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { getImageUrl, getVideoUrl, isVideoUrl } from "@/lib/appwrite";
import { getAllCategories, getCategoryLabel, getSubCategoryLabel, Category } from "@/lib/category-actions";
import {
  blacklistPost,
  deletePost,
  deleteExchangeListing,
  getPostById,
  getExchangeListingById,
  getPostLikeCount,
  getPostReportCount,
  getPostReports,
  getPostStampCount,
  getUserByUserId,
  Post,
  ExchangeListing,
  Report,
  unblacklistPost,
} from "@/lib/user-actions";
import { Profile } from "@/types/profile.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  Heart,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Tag,
  Trash2,
  User,
  Users
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = params.postId as string;
  const isExchange = searchParams.get("type") === "exchange";

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | ExchangeListing | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [stampCount, setStampCount] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [blacklistDialog, setBlacklistDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const fetchPost = useCallback(async () => {
    setLoading(true);
    try {
      let postData: Post | ExchangeListing | null;

      if (isExchange) {
        postData = await getExchangeListingById(postId);
      } else {
        const [data, likes, reportCnt, stamps, reportsList] = await Promise.all([
          getPostById(postId),
          getPostLikeCount(postId),
          getPostReportCount(postId),
          getPostStampCount(postId),
          getPostReports(postId),
        ]);
        postData = data;
        setLikeCount(likes);
        setReportCount(reportCnt);
        setStampCount(stamps);
        setReports(reportsList);
      }

      setPost(postData);
      
      if (postData?.userId) {
        const profile = await getUserByUserId(postData.userId);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
    } finally {
      setLoading(false);
    }
  }, [postId, isExchange]);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
    getAllCategories().then(setAllCategories);
  }, [postId, fetchPost]);

  const handleBlacklist = async () => {
    if (!post || isExchange) return;
    setActionLoading(true);
    try {
      if (post.isBlacklisted) {
        await unblacklistPost(postId);
      } else {
        await blacklistPost(postId);
      }
      await fetchPost();
    } catch (error) {
      console.error("Failed to update blacklist status:", error);
    } finally {
      setActionLoading(false);
      setBlacklistDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    setActionLoading(true);
    try {
      const success = isExchange
        ? await deleteExchangeListing(postId)
        : await deletePost(postId);
      if (success) {
        router.push("/posts");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setActionLoading(false);
      setDeleteDialog(false);
    }
  };

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

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Post Not Found</h2>
        <p className="text-muted-foreground mb-6">Could not find the post</p>
        <Button onClick={() => router.push("/posts")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Posts
        </Button>
      </div>
    );
  }

  // Process media array - detect videos and get appropriate URLs
  const rawMedia = post.media || [];
  const processedMedia = rawMedia.map((item) => {
    const isVideo = isVideoUrl(item);
    return {
      url: isVideo ? getVideoUrl(item) : getImageUrl(item, 800, 800),
      isVideo,
    };
  });

  // Count videos and images
  const videoCount = processedMedia.filter((m) => m.isVideo).length;
  const imageCount = processedMedia.filter((m) => !m.isVideo).length;

  // Format category labels
  const categoryLabel = getCategoryLabel(allCategories, post.category);
  const subCategoryLabel = getSubCategoryLabel(allCategories, post.subCategory || (post as ExchangeListing).subCategory);

  // Format event date
  const formatEventDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Google Maps link - location is [longitude, latitude] array
  const getGoogleMapsLink = (location: [number, number] | null | undefined) => {
    if (!location || location.length !== 2) return null;
    const [lng, lat] = location;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/posts")}
          className="bg-secondary/50 border-border/50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary shrink-0" />
            {isExchange ? "Exchange Listing Details" : "Post Details"}
          </h1>
          <p className="text-muted-foreground">
            {isExchange ? "View exchange listing information" : "View post information and manage reports"}
          </p>
        </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPost}
            className="bg-secondary/50 border-border/50 hover:bg-secondary/80"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {!isExchange && (
            <Button
              variant={post.isBlacklisted ? "outline" : "destructive"}
              size="sm"
              onClick={() => setBlacklistDialog(true)}
              disabled={actionLoading}
              className={post.isBlacklisted ? "border-green-500/50 text-green-500 hover:bg-green-500/20 hover:text-green-400" : ""}
            >
              {post.isBlacklisted ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Unblock Post
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Block Post
                </>
              )}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialog(true)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Blacklist warning banner */}
      {post.isBlacklisted && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <Ban className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-500">This post is blocked</p>
            <p className="text-sm text-muted-foreground">
              This post is hidden from the public feed but visible to the owner.
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
                {/* Media summary */}
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
                  <FileText className="h-16 w-16 text-muted-foreground/50" />
                </div>
            )}
          </CardContent>
        </Card>

        {/* Stats and info */}
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
              <div>
                <p className="text-sm text-muted-foreground mb-1">Title</p>
                <p className="font-medium">{post.title || "Untitled"}</p>
              </div>
              {!isExchange && (post as Post).smallDescription && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm">{(post as Post).smallDescription}</p>
                </div>
              )}
              {post.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{post.description}</p>
                </div>
              )}
              {isExchange && (post as ExchangeListing).startingPrice != null && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Starting Price</p>
                  <p className="font-medium">${(post as ExchangeListing).startingPrice}</p>
                </div>
              )}
              {isExchange && (post as ExchangeListing).transactionType && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transaction Type</p>
                  <p className="text-sm capitalize">{(post as ExchangeListing).transactionType}</p>
                </div>
              )}
              {!isExchange && (post as Post).externalLink && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">External Link</p>
                  <a
                    href={(post as Post).externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {(post as Post).externalLink}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics (posts only) */}
          {!isExchange && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                icon={Heart}
                label="Like Count"
                value={likeCount}
                color="text-pink-500"
              />
              <StatRow
                icon={Users}
                label="Community Count"
                value={stampCount}
                color="text-blue-500"
              />
              <StatRow
                icon={AlertTriangle}
                label="Report Count"
                value={reportCount}
                color={reportCount > 0 ? "text-destructive" : "text-muted-foreground"}
                highlight={reportCount > 0}
              />
            </CardContent>
          </Card>
          )}

          {/* Reports Section - Collapsible (posts only) */}
          {!isExchange && reports.length > 0 && (
            <Card className="bg-card/50 border-red-500/30 border">
              <CardHeader 
                className="cursor-pointer select-none"
                onClick={() => setReportsExpanded(!reportsExpanded)}
              >
                <CardTitle className="text-lg flex items-center justify-between text-red-500">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Reports ({reports.length})
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${reportsExpanded ? "rotate-180" : ""}`} />
                </CardTitle>
              </CardHeader>
              {reportsExpanded && (
                <CardContent className="space-y-3 pt-0">
                  {reports.map((report) => (
                    <div
                      key={report.$id}
                      className={`p-3 rounded-lg border ${
                        report.status === "pending"
                          ? "bg-red-500/5 border-red-500/30"
                          : report.status === "reviewed"
                          ? "bg-yellow-500/5 border-yellow-500/30"
                          : "bg-secondary/30 border-border/30"
                      }`}
                    >
                      <p className="text-sm font-medium mb-2">{report.reason}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {new Date(report.$createdAt).toLocaleString("en-US")}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            report.status === "pending"
                              ? "bg-red-500/20 text-red-500"
                              : report.status === "reviewed"
                              ? "bg-yellow-500/20 text-yellow-600"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Location Info */}
          {(isExchange ? ((post as ExchangeListing).locationCity || (post as ExchangeListing).locationState) : ((post as Post).locationAddress || (post as Post).userLocationAddress)) && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isExchange ? (
                  <div className="flex items-start gap-3 text-muted-foreground py-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-green-500" />
                    <div>
                      <span className="block text-foreground">Listing Location</span>
                      <span className="text-sm">
                        {[(post as ExchangeListing).locationCity, (post as ExchangeListing).locationState].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {(post as Post).locationAddress && (
                      <div className="flex items-start justify-between py-3 border-b border-border/30 last:border-0">
                        <div className="flex items-start gap-3 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 text-green-500" />
                          <div>
                            <span className="block text-foreground">Post Location</span>
                            <span className="text-sm">{(post as Post).locationAddress}</span>
                          </div>
                        </div>
                        {(post as Post).location && (
                          <a
                            href={getGoogleMapsLink((post as Post).location) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-sm cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Map
                          </a>
                        )}
                      </div>
                    )}
                    {(post as Post).userLocationAddress && (
                      <div className="flex items-start justify-between py-3 border-b border-border/30 last:border-0">
                        <div className="flex items-start gap-3 text-muted-foreground">
                          <User className="h-4 w-4 mt-0.5 text-blue-500" />
                          <div>
                            <span className="block text-foreground">User Location</span>
                            <span className="text-sm">{(post as Post).userLocationAddress}</span>
                          </div>
                        </div>
                        {(post as Post).userLocation && (
                          <a
                            href={getGoogleMapsLink((post as Post).userLocation) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-sm cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Map
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Event Date (if exists - posts only) */}
          {!isExchange && (post as Post).eventDate && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <span className="block text-foreground font-medium">Event Date</span>
                    <span className="text-sm">{formatEventDate((post as Post).eventDate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Hash} label="Post ID" value={post.$id} mono />
              <InfoRow icon={Hash} label="User ID" value={post.userId} mono />
              <InfoRow icon={Tag} label="Category" value={categoryLabel} />
              <InfoRow icon={Tag} label="Sub Category" value={subCategoryLabel} />
              <InfoRow icon={FileText} label="Type" value={post.type || "post"} />
              <InfoRow
                icon={Calendar}
                label="Created At"
                value={new Date(post.$createdAt).toLocaleString("en-US")}
              />
              <InfoRow
                icon={Calendar}
                label="Updated At"
                value={new Date(post.$updatedAt).toLocaleString("en-US")}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Blacklist Confirmation Dialog */}
      <AlertDialog open={blacklistDialog} onOpenChange={setBlacklistDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {post.isBlacklisted ? "Unblock this post?" : "Block this post?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {post.isBlacklisted
                ? "This will make the post visible in the public feed again."
                : "This will hide the post from the public feed. The owner can still see it on their profile and can submit an appeal."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary/50 border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlacklist}
              className={
                post.isBlacklisted
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-destructive hover:bg-destructive/90"
              }
            >
              {post.isBlacklisted ? "Unblock" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {isExchange ? "exchange listing" : "post"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{post.title || "Untitled"}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary/50 border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
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
  highlight?: boolean;
}

function StatRow({
  icon: Icon,
  label,
  value,
  color = "text-muted-foreground",
  highlight,
}: StatRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-border/30 last:border-0 ${
        highlight ? "bg-destructive/5 -mx-4 px-4 rounded-lg" : ""
      }`}
    >
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
