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
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LocationPicker, { PlaceValue } from "@/components/ui/location-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getImageUrl, getVideoUrl, isVideoUrl, uploadFiles } from "@/lib/appwrite";
import { ImageThumbnail } from "@/components/ui/image-thumbnail";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { MediaUpload } from "@/components/ui/media-upload";
import { Category, getCategories, getSubcategories } from "@/lib/category-actions";
import {
    AD_SLOTS,
    MULTI_USE_SLOTS,
    AdSlot,
    createSponsorAd,
    deleteSponsorAd,
    getAdminAdsBySlot,
    getSlotUsageCounts,
    getSlotMaxUsage,
    isSlotAvailable,
    getSlotRemainingUsage,
    getSponsorAdStats,
    SlotUsageInfo,
    SponsorAd,
    updateSponsorAd
} from "@/lib/user-actions";
import { getStateFullName } from "@/lib/utils";
import {
    CheckCircle,
    Clock,
    Edit2,
    Eye,
    Loader2,
    Megaphone,
    MousePointer,
    Play,
    Plus,
    RefreshCw,
    Shield,
    TrendingUp,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
interface CreateAdForm {
  title: string;
  description: string;
  location: PlaceValue | null;
  state: string;
  city: string;
  category: string;
  subcategory: string;
  slot: AdSlot | null;
  mediaFiles: File[];
  mediaPreviews: string[];
  posterFiles: Array<File | null>;
  phoneNumber: string;
  website: string;
}

const initialFormState: CreateAdForm = {
  title: "",
  description: "",
  location: null,
  state: "",
  city: "",
  category: "",
  subcategory: "",
  slot: null,
  mediaFiles: [],
  mediaPreviews: [],
  posterFiles: [],
  phoneNumber: "",
  website: "",
};

interface EditAdForm {
  title: string;
  description: string;
  location: PlaceValue | null;
  state: string;
  city: string;
  category: string;
  subcategory: string;
  slot: AdSlot | null;
  phoneNumber: string;
  website: string;
  existingMedia: string[];
  newMediaFiles: File[];
  newMediaPreviews: string[];
  newPosterFiles: Array<File | null>;
}

export default function AdminAdsPage() {
  const router = useRouter();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [adminAdsBySlot, setAdminAdsBySlot] = useState<Map<number, SponsorAd[]>>(new Map());
  const [stats, setStats] = useState({ totalAds: 0, activeAds: 0, pendingAds: 0 });

  // Create Ad Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdForm>(initialFormState);
  const [creating, setCreating] = useState(false);
  const [slotUsageCounts, setSlotUsageCounts] = useState<SlotUsageInfo>({});

  // Edit Ad Dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<SponsorAd | null>(null);
  const [editForm, setEditForm] = useState<EditAdForm>({
    title: "",
    description: "",
    location: null,
    state: "",
    city: "",
    category: "",
    subcategory: "",
    slot: null,
    phoneNumber: "",
    website: "",
    existingMedia: [],
    newMediaFiles: [],
    newMediaPreviews: [],
    newPosterFiles: [],
  });
  const [updating, setUpdating] = useState(false);
  const [editSlotUsageCounts, setEditSlotUsageCounts] = useState<SlotUsageInfo>({});

  // Delete Ad state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAd, setDeletingAd] = useState<SponsorAd | null>(null);
  const [deleting, setDeleting] = useState(false);


  // Dynamic categories
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  const [createSubcategories, setCreateSubcategories] = useState<Category[]>([]);
  const [editSubcategoriesList, setEditSubcategoriesList] = useState<Category[]>([]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, adminAdsMap] = await Promise.all([
        getSponsorAdStats(true), // Only admin-created ads stats
        getAdminAdsBySlot(),
      ]);
      setAdminAdsBySlot(adminAdsMap);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch ads:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Load slot usage counts and categories when create dialog opens
  useEffect(() => {
    if (showCreateDialog) {
      getSlotUsageCounts().then(setSlotUsageCounts);
      getCategories().then(setDynamicCategories);
    }
  }, [showCreateDialog]);

  // Handle create form location change
  const handleCreateLocationChange = (location: PlaceValue | null) => {
    if (location?.state) {
      const stateFullName = getStateFullName(location.state);
      setCreateForm((prev) => ({
        ...prev,
        location,
        state: stateFullName,
        city: location.city || "",
      }));
    } else {
      setCreateForm((prev) => ({
        ...prev,
        location,
        state: "",
        city: "",
      }));
    }
  };

  // Fetch subcategories when create form category changes
  useEffect(() => {
    if (createForm.category) {
      getSubcategories(createForm.category).then(setCreateSubcategories);
    } else {
      setCreateSubcategories([]);
    }
  }, [createForm.category]);

  const handleCreateAd = async () => {
    if (!admin?.profile?.userId) {
      alert("Authentication error. Please log in again.");
      return;
    }
    if (!createForm.title || !createForm.state || !createForm.city || !createForm.category || !createForm.slot) {
      alert("Please fill in all required fields");
      return;
    }
    if (createForm.mediaFiles.length === 0) {
      alert("Please upload at least one photo or video");
      return;
    }

    setCreating(true);
    try {
      let mediaUrls = await uploadFiles(createForm.mediaFiles);
      const firstMediaUrl = mediaUrls[0] || "";

      let coverImageUrl = "";
      if (firstMediaUrl) {
        if (!isVideoUrl(firstMediaUrl)) {
          coverImageUrl = firstMediaUrl;
        } else {
          const firstPoster = createForm.posterFiles[0];
          if (firstPoster) {
            const [posterUrl] = await uploadFiles([firstPoster]);
            coverImageUrl = posterUrl || "";

            const thumbId = posterUrl?.match(/\/files\/([^/]+)\//)?.[1];
            if (thumbId) {
              mediaUrls = mediaUrls.map((url) =>
                isVideoUrl(url) ? `${url}&thumb=${thumbId}` : url
              );
            }
          }
        }
      }
      
      await createSponsorAd({
        userId: admin.profile.userId,
        title: createForm.title,
        description: createForm.description || undefined,
        media: mediaUrls,
        image: coverImageUrl || undefined,
        state: createForm.state,
        city: createForm.city,
        category: createForm.category,
        subcategory: createForm.subcategory || undefined,
        slot: createForm.slot,
        phoneNumber: createForm.phoneNumber || undefined,
        website: createForm.website || undefined,
      });
      
      createForm.mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
      setShowCreateDialog(false);
      setCreateForm(initialFormState);
      fetchAds();
    } catch (error: unknown) {
      console.error("Failed to create ad:", error);
      const message = error instanceof Error ? error.message : "Failed to create ad. Please try again.";
      alert(message);
    } finally {
      setCreating(false);
    }
  };

  // Click empty slot to create ad
  const handleClickEmptySlot = async (displaySlot: AdSlot) => {
    const usage = await getSlotUsageCounts();
    setSlotUsageCounts(usage);
    
    setCreateForm({
      ...initialFormState,
      slot: displaySlot,
    });
    setShowCreateDialog(true);
  };

  // Open edit dialog for admin-created ads
  const handleOpenEditDialog = async (ad: SponsorAd) => {
    if (!ad.isAdminCreated) return;

    const [usage, cats] = await Promise.all([
      getSlotUsageCounts(),
      getCategories(),
    ]);
    setDynamicCategories(cats);

    setEditSlotUsageCounts(usage);

    setEditingAd(ad);
    setEditForm({
      title: ad.title,
      description: ad.description || "",
      location: ad.state && ad.city ? {
        placeId: "",
        address: `${ad.city}, ${ad.state}`,
        latitude: 0,
        longitude: 0,
        city: ad.city,
        state: ad.state,
      } : null,
      state: ad.state,
      city: ad.city,
      category: ad.category,
      subcategory: ad.subcategory || "",
      slot: ad.slot !== undefined ? (ad.slot + 1) as AdSlot : null,
      phoneNumber: ad.phoneNumber || "",
      website: ad.website || "",
      existingMedia: ad.media || [],
      newMediaFiles: [],
      newMediaPreviews: [],
      newPosterFiles: [],
    });
    setShowEditDialog(true);
  };

  // Handle edit form location change
  const handleEditLocationChange = (location: PlaceValue | null) => {
    if (location?.state) {
      const stateFullName = getStateFullName(location.state);
      setEditForm((prev) => ({
        ...prev,
        location,
        state: stateFullName,
        city: location.city || "",
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        location,
        state: "",
        city: "",
      }));
    }
  };

  // Fetch subcategories when edit form category changes
  useEffect(() => {
    if (editForm.category) {
      getSubcategories(editForm.category).then(setEditSubcategoriesList);
    } else {
      setEditSubcategoriesList([]);
    }
  }, [editForm.category]);

  const handleUpdateAd = async () => {
    if (!editingAd || !editForm.title || !editForm.state || !editForm.city || !editForm.category || !editForm.slot) {
      alert("Please fill in all required fields");
      return;
    }

    if (editForm.existingMedia.length === 0 && editForm.newMediaFiles.length === 0) {
      alert("Please include at least one photo or video");
      return;
    }

    setUpdating(true);
    try {
      let finalMedia = [...editForm.existingMedia];
      let newMediaUrls: string[] = [];

      if (editForm.newMediaFiles.length > 0) {
        newMediaUrls = await uploadFiles(editForm.newMediaFiles);
        finalMedia = [...finalMedia, ...newMediaUrls];
      }

      const firstMediaUrl = finalMedia[0] || "";
      const originalFirstMediaUrl = editingAd.media?.[0] || "";
      let nextCoverImage = "";

      if (firstMediaUrl) {
        if (!isVideoUrl(firstMediaUrl)) {
          nextCoverImage = firstMediaUrl;
        } else {
          const firstMediaFromNewUpload = editForm.existingMedia.length === 0;

          if (firstMediaFromNewUpload) {
            const firstPoster = editForm.newPosterFiles[0];
            if (firstPoster) {
              const [posterUrl] = await uploadFiles([firstPoster]);
              nextCoverImage = posterUrl || "";

              const thumbId = posterUrl?.match(/\/files\/([^/]+)\//)?.[1];
              if (thumbId) {
                finalMedia = finalMedia.map((url) =>
                  isVideoUrl(url) && !url.includes("thumb=") ? `${url}&thumb=${thumbId}` : url
                );
              }
            } else {
              nextCoverImage = editingAd.image || "";
            }
          } else if (firstMediaUrl === originalFirstMediaUrl) {
            nextCoverImage = editingAd.image || "";
          }
        }
      }

      await updateSponsorAd(editingAd.$id, {
        title: editForm.title,
        description: editForm.description || undefined,
        media: finalMedia,
        image: nextCoverImage,
        state: editForm.state,
        city: editForm.city,
        category: editForm.category,
        subcategory: editForm.subcategory || undefined,
        slot: editForm.slot,
        phoneNumber: editForm.phoneNumber || undefined,
        website: editForm.website || undefined,
      });
      editForm.newMediaPreviews.forEach((url) => URL.revokeObjectURL(url));
      setShowEditDialog(false);
      setEditingAd(null);
      fetchAds();
    } catch (error) {
      console.error("Failed to update ad:", error);
      alert("Failed to update ad. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Open delete dialog
  const handleOpenDeleteDialog = (ad: SponsorAd) => {
    setDeletingAd(ad);
    setShowDeleteDialog(true);
  };

  // Delete ad
  const handleDeleteAd = async () => {
    if (!deletingAd) return;

    setDeleting(true);
    try {
      await deleteSponsorAd(deletingAd.$id);
      setShowDeleteDialog(false);
      setDeletingAd(null);
      fetchAds();
    } catch (error) {
      console.error("Failed to delete ad:", error);
      alert("Failed to delete ad. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const adMetrics = (() => {
    let totalViews = 0;
    let totalClicks = 0;
    adminAdsBySlot.forEach((ads) => {
      for (const ad of ads) {
        totalViews += ad.views || 0;
        totalClicks += ad.clicks || 0;
      }
    });
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    return { totalViews, totalClicks, ctr };
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Admin Ads"
        description="Manage admin-created sponsor advertisements"
        icon={Shield}
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
                <p className="text-sm text-muted-foreground">Total Ads</p>
                <p className="text-2xl font-bold">{stats.totalAds}</p>
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
                <p className="text-2xl font-bold">{adMetrics.totalViews.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{adMetrics.totalClicks.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{adMetrics.ctr.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Ads by Slot - Poker Table Style */}
      <Card className="bg-gradient-to-br from-emerald-950/50 to-emerald-900/30 border-emerald-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-emerald-100">
            <Shield className="h-5 w-5 text-emerald-400" />
            Ad Slots
          </CardTitle>
          <p className="text-sm text-emerald-300/70">
            Click a slot to edit. Click empty slot to add ad.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(36)].map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {(() => {
                const cells: { key: string; displaySlot: AdSlot; subIndex: number; ad: SponsorAd | null; canAdd: boolean }[] = [];
                for (const displaySlot of AD_SLOTS) {
                  const storedSlot = displaySlot - 1;
                  const ads = (adminAdsBySlot.get(storedSlot) || [])
                    .slice()
                    .sort((a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());
                  const maxUsage = getSlotMaxUsage(displaySlot);
                  const isMultiUse = (MULTI_USE_SLOTS as readonly number[]).includes(displaySlot);

                  if (isMultiUse) {
                    for (let i = 0; i < 3; i++) {
                      cells.push({
                        key: `${displaySlot}-${i}`,
                        displaySlot,
                        subIndex: i,
                        ad: ads[i] || null,
                        canAdd: ads.length < maxUsage,
                      });
                    }
                  } else {
                    cells.push({
                      key: `${displaySlot}`,
                      displaySlot,
                      subIndex: 0,
                      ad: ads[0] || null,
                      canAdd: ads.length < maxUsage,
                    });
                  }
                }
                return cells.map(({ key, displaySlot, subIndex, ad, canAdd }) => {
                  const label = (MULTI_USE_SLOTS as readonly number[]).includes(displaySlot)
                    ? `${displaySlot}-${subIndex + 1}`
                    : `${displaySlot}`;
                  return (
                    <div
                      key={key}
                      role={ad || canAdd ? "button" : undefined}
                      tabIndex={ad || canAdd ? 0 : -1}
                      aria-disabled={!ad && !canAdd}
                      onClick={() => {
                        if (ad) {
                          handleOpenEditDialog(ad);
                        } else if (canAdd) {
                          handleClickEmptySlot(displaySlot);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (!ad && !canAdd) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (ad) {
                            handleOpenEditDialog(ad);
                          } else {
                            handleClickEmptySlot(displaySlot);
                          }
                        }
                      }}
                      className={`relative aspect-[3/4] transition-all transform rounded-xl overflow-hidden group ${
                        ad || canAdd
                          ? "cursor-pointer hover:scale-[1.02] hover:z-10"
                          : "opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {ad ? (
                        <>
                          {(() => {
                            const mediaItems = ad.media || [];
                            const firstVideoMedia = mediaItems.find((item) => isVideoUrl(item)) || "";
                            const firstImageMedia = mediaItems.find((item) => !isVideoUrl(item)) || "";
                            const coverImage = ad.image || firstImageMedia;
                            const hasVideo = mediaItems.some((item) => isVideoUrl(item));
                            return (
                              <>
                                {coverImage ? (
                                  <ImageThumbnail
                                    src={getImageUrl(coverImage, 300, 400)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : firstVideoMedia ? (
                                  <VideoThumbnail src={getVideoUrl(firstVideoMedia)} />
                                ) : (
                                  <div className="w-full h-full bg-secondary/40" />
                                )}
                                {!coverImage && firstVideoMedia && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                    <Play className="h-8 w-8 text-white/80" />
                                  </div>
                                )}
                                {hasVideo && (
                                  <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium flex items-center gap-1 z-10">
                                    <Play className="h-3 w-3" />
                                    Video
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-black/70 text-white text-sm font-bold shadow">
                            {label}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-2 pt-6">
                            <div className="flex items-center justify-between text-[11px] text-white/90">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {(ad.views || 0).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointer className="h-3 w-3" />
                                {(ad.clicks || 0).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {(ad.views || 0) > 0 ? (((ad.clicks || 0) / (ad.views || 1)) * 100).toFixed(1) : "0.0"}%
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div
                          className={`w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                            canAdd
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:border-amber-400 hover:bg-amber-500/20"
                              : "border-slate-500/30 bg-slate-500/5 text-slate-500"
                          }`}
                        >
                          <span className="text-2xl sm:text-3xl font-bold">{label}</span>
                          <span className="text-[10px] opacity-70">{canAdd ? "Empty" : "Full"}</span>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ad Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden top-[5vh] translate-y-0 left-[50%] -translate-x-1/2 bg-card border-border"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2 border-b border-border/50">
            <DialogTitle className="text-xl">Create Ad</DialogTitle>
            <DialogDescription>
              Create a new sponsor advertisement with a specific ad slot.
            </DialogDescription>
          </DialogHeader>

          <div 
            className="flex-1 min-h-0 overflow-y-scroll overflow-x-hidden overscroll-contain px-6 py-4 pb-8 touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
          <div className="space-y-5 pb-4">
            {/* Photo/Video Upload */}
            <MediaUpload
              value={{
                files: createForm.mediaFiles,
                previews: createForm.mediaPreviews,
                posters: createForm.posterFiles,
              }}
              onChange={({ files, previews, posters }) =>
                setCreateForm((prev) => ({
                  ...prev,
                  mediaFiles: files,
                  mediaPreviews: previews,
                  posterFiles: posters,
                }))
              }
              label="Photo/Video"
              placeholder="Tap to upload photos or videos"
              addMoreLabel="Add more photos or videos"
            />

            {/* Ad Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Ad Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter a catchy title for your ad"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                className="bg-input/50 border-border/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <textarea
                id="description"
                placeholder="Describe your product or service (optional)"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full min-h-[100px] px-3 py-2 rounded-md bg-input/50 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Phone Number & Website */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="(optional)"
                  value={createForm.phoneNumber}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  className="bg-input/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://... (optional)"
                  value={createForm.website}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, website: e.target.value }))}
                  className="bg-input/50 border-border/50"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Location <span className="text-red-500">*</span>
              </Label>
              <LocationPicker
                value={createForm.location}
                onChange={handleCreateLocationChange}
                placeholder="Search city or address..."
                showCurrentLocation={true}
                countryRestriction="us"
              />
              {createForm.state && createForm.city && (
                <p className="text-xs text-muted-foreground">
                  {createForm.city}, {createForm.state}
                </p>
              )}
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <select
                  id="category"
                  value={createForm.category}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))}
                  className="w-full h-9 px-3 rounded-md bg-input/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select category</option>
                  {dynamicCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategory" className="text-sm font-medium">
                  Subcategory
                </Label>
                <select
                  id="subcategory"
                  value={createForm.subcategory}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                  disabled={!createForm.category}
                  className="w-full h-9 px-3 rounded-md bg-input/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                >
                  <option value="">Select subcategory</option>
                  {createSubcategories.map((sub) => (
                    <option key={sub.value} value={sub.value}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ad Slot */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Ad Slot <span className="text-red-500">*</span>
              </Label>
              {createForm.slot ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    {createForm.slot}
                  </div>
                  <div>
                    <p className="font-medium">Slot #{createForm.slot}</p>
                    <p className="text-sm text-muted-foreground">
                      {(MULTI_USE_SLOTS as readonly number[]).includes(createForm.slot) 
                        ? `Multi-use slot (up to 3 ads)`
                        : `Single-use slot`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Please select a slot from the slot table first.
                </p>
              )}
            </div>
          </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-border/50 px-6 py-4 bg-card">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
              className="bg-secondary/50 border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAd}
              disabled={creating || !createForm.title || !createForm.state || !createForm.city || !createForm.category || !createForm.slot || createForm.mediaFiles.length === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ad
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ad Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent
          className="sm:max-w-[500px] max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden top-[5vh] translate-y-0 left-[50%] -translate-x-1/2 bg-card border-border"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2 border-b border-border/50">
            <DialogTitle className="text-xl">Edit Ad</DialogTitle>
            <DialogDescription>
              Update the ad details.
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex-1 min-h-0 overflow-y-scroll overflow-x-hidden overscroll-contain px-6 py-4 touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
          <div className="space-y-4 pb-4">
            {/* Existing Media */}
            {editForm.existingMedia.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current Media</Label>
                <div className="grid grid-cols-3 gap-2">
                  {editForm.existingMedia.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group">
                      {isVideoUrl(url) ? (
                        <>
                          {idx === 0 && editingAd?.image ? (
                            <ImageThumbnail
                              src={getImageUrl(editingAd.image, 200, 200)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <VideoThumbnail src={getVideoUrl(url)} />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                            <Play className="h-6 w-6 text-white/80" />
                          </div>
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs pointer-events-none z-10">
                            Video
                          </div>
                        </>
                      ) : (
                        <ImageThumbnail src={getImageUrl(url, 200, 200)} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => setEditForm((prev) => ({
                          ...prev,
                          existingMedia: prev.existingMedia.filter((_, i) => i !== idx),
                        }))}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Media */}
            <MediaUpload
              value={{
                files: editForm.newMediaFiles,
                previews: editForm.newMediaPreviews,
                posters: editForm.newPosterFiles,
              }}
              onChange={({ files, previews, posters }) =>
                setEditForm((prev) => ({
                  ...prev,
                  newMediaFiles: files,
                  newMediaPreviews: previews,
                  newPosterFiles: posters,
                }))
              }
              label="Add New Media"
              placeholder="Tap to upload new photos or videos"
              addMoreLabel="Add more"
            />

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                className="bg-input/50 border-border/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full min-h-[80px] px-3 py-2 rounded-md bg-input/50 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Phone Number & Website */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber">Phone Number</Label>
                <Input
                  id="edit-phoneNumber"
                  type="tel"
                  placeholder="(optional)"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  className="bg-input/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  type="url"
                  placeholder="https://..."
                  value={editForm.website}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                  className="bg-input/50 border-border/50"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <LocationPicker
                value={editForm.location}
                onChange={handleEditLocationChange}
                placeholder="Search city or address..."
                showCurrentLocation={false}
                countryRestriction="us"
              />
              {editForm.state && editForm.city && (
                <p className="text-xs text-muted-foreground">
                  {editForm.city}, {editForm.state}
                </p>
              )}
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <select
                  id="edit-category"
                  value={editForm.category}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))}
                  className="w-full h-9 px-3 rounded-md bg-input/50 border border-border/50 text-sm"
                >
                  <option value="">Select category</option>
                  {dynamicCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-subcategory">Subcategory</Label>
                <select
                  id="edit-subcategory"
                  value={editForm.subcategory}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                  disabled={!editForm.category}
                  className="w-full h-9 px-3 rounded-md bg-input/50 border border-border/50 text-sm disabled:opacity-50"
                >
                  <option value="">Select subcategory</option>
                  {editSubcategoriesList.map((sub) => (
                    <option key={sub.value} value={sub.value}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slot */}
            <div className="space-y-2">
              <Label>Ad Slot</Label>
              <div className="grid grid-cols-5 gap-2">
                {AD_SLOTS.map((slot) => {
                  const currentUsage = editSlotUsageCounts[slot] || 0;
                  const maxUsage = getSlotMaxUsage(slot);
                  const isCurrentSlot = editForm.slot === slot;
                  const canSelect = currentUsage < maxUsage || isCurrentSlot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => canSelect && setEditForm((prev) => ({ ...prev, slot }))}
                      disabled={!canSelect}
                      className={`
                        p-2 rounded-lg border text-center transition-all
                        ${isCurrentSlot 
                          ? "border-primary bg-primary/10 text-primary" 
                          : canSelect 
                            ? "border-border/50 hover:border-primary/50 hover:bg-secondary/50" 
                            : "border-border/30 bg-secondary/20 text-muted-foreground opacity-50 cursor-not-allowed"
                        }
                      `}
                    >
                      <span className="font-bold">{slot}</span>
                      <span className="block text-[10px] opacity-70">{currentUsage}/{maxUsage}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t border-border/50 px-6 py-4 bg-card">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={updating}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (editingAd) {
                  setShowEditDialog(false);
                  handleOpenDeleteDialog(editingAd);
                }
              }}
              disabled={updating}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleUpdateAd} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAd?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAd}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
