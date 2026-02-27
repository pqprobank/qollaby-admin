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
    Loader2,
    Megaphone,
    Play,
    Plus,
    RefreshCw,
    Shield,
    Trash2,
    Upload,
    XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface CreateAdForm {
  title: string;
  description: string;
  externalLink: string;
  location: PlaceValue | null;
  state: string;
  city: string;
  category: string;
  subcategory: string;
  slot: AdSlot | null;
  mediaFiles: File[];
  mediaPreviews: string[];
  phoneNumber: string;
  website: string;
}

const initialFormState: CreateAdForm = {
  title: "",
  description: "",
  externalLink: "",
  location: null,
  state: "",
  city: "",
  category: "",
  subcategory: "",
  slot: null,
  mediaFiles: [],
  mediaPreviews: [],
  phoneNumber: "",
  website: "",
};

interface EditAdForm {
  title: string;
  description: string;
  externalLink: string;
  location: PlaceValue | null;
  state: string;
  city: string;
  category: string;
  subcategory: string;
  slot: AdSlot | null;
  phoneNumber: string;
  website: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Ad Dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<SponsorAd | null>(null);
  const [editForm, setEditForm] = useState<EditAdForm>({
    title: "",
    description: "",
    externalLink: "",
    location: null,
    state: "",
    city: "",
    category: "",
    subcategory: "",
    slot: null,
    phoneNumber: "",
    website: "",
  });
  const [updating, setUpdating] = useState(false);
  const [editSlotUsageCounts, setEditSlotUsageCounts] = useState<SlotUsageInfo>({});

  // Delete Ad state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAd, setDeletingAd] = useState<SponsorAd | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Slot detail dialog state
  const [showSlotDetailDialog, setShowSlotDetailDialog] = useState(false);
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<AdSlot | null>(null);

  // Dynamic categories
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  const [createSubcategories, setCreateSubcategories] = useState<Category[]>([]);
  const [editSubcategoriesList, setEditSubcategoriesList] = useState<Category[]>([]);

  // Handle media file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setCreateForm((prev) => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...files],
      mediaPreviews: [...prev.mediaPreviews, ...newPreviews],
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMediaFile = (index: number) => {
    setCreateForm((prev) => {
      URL.revokeObjectURL(prev.mediaPreviews[index]);
      return {
        ...prev,
        mediaFiles: prev.mediaFiles.filter((_, i) => i !== index),
        mediaPreviews: prev.mediaPreviews.filter((_, i) => i !== index),
      };
    });
  };

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
    if (!admin?.profile?.userId) return;
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
      const mediaIds = await uploadFiles(createForm.mediaFiles);
      
      await createSponsorAd({
        userId: admin.profile.userId,
        title: createForm.title,
        description: createForm.description || undefined,
        externalLink: createForm.externalLink || undefined,
        media: mediaIds,
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
    } catch (error) {
      console.error("Failed to create ad:", error);
      alert("Failed to create ad. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // Click on slot to open detail dialog
  const handleClickSlot = (displaySlot: AdSlot) => {
    setSelectedSlotForDetail(displaySlot);
    setShowSlotDetailDialog(true);
  };

  // Click add button in slot detail dialog to create ad
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

    const displaySlot = ad.slot !== undefined ? ad.slot + 1 : null;
    if (displaySlot && usage[displaySlot]) {
      usage[displaySlot] = Math.max(0, usage[displaySlot] - 1);
    }
    setEditSlotUsageCounts(usage);

    setEditingAd(ad);
    setEditForm({
      title: ad.title,
      description: ad.description || "",
      externalLink: ad.externalLink || "",
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

    setUpdating(true);
    try {
      await updateSponsorAd(editingAd.$id, {
        title: editForm.title,
        description: editForm.description || undefined,
        externalLink: editForm.externalLink || undefined,
        state: editForm.state,
        city: editForm.city,
        category: editForm.category,
        subcategory: editForm.subcategory || undefined,
        slot: editForm.slot,
        phoneNumber: editForm.phoneNumber || undefined,
        website: editForm.website || undefined,
      });
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
      setShowSlotDetailDialog(false);
      fetchAds();
    } catch (error) {
      console.error("Failed to delete ad:", error);
      alert("Failed to delete ad. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Ads</h1>
          <p className="text-muted-foreground mt-1">Manage admin-created sponsor advertisements</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchAds}
          className="bg-secondary/50 border-border/50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pendingAds}</p>
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
            Click on a slot to view/manage ads.
            <span className="text-amber-400 ml-2">●</span> Multi-use (×3)
            <span className="text-emerald-400 ml-2">●</span> Single-use (×1)
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {AD_SLOTS.map((slot) => (
                <Skeleton key={slot} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {AD_SLOTS.map((displaySlot) => {
                const storedSlot = displaySlot - 1;
                const adsInSlot = adminAdsBySlot.get(storedSlot) || [];
                const maxUsage = getSlotMaxUsage(displaySlot);
                const isMultiUse = (MULTI_USE_SLOTS as readonly number[]).includes(displaySlot);
                const hasAds = adsInSlot.length > 0;

                return (
                  <button
                    key={displaySlot}
                    onClick={() => handleClickSlot(displaySlot)}
                    className="relative aspect-[3/4] transition-all transform hover:scale-105 hover:z-10 group"
                  >
                    {hasAds ? (
                      <div className="relative w-full h-full">
                        {(() => {
                          const firstAd = adsInSlot[0];
                          const firstMedia = firstAd.media?.[0] || firstAd.image || "";
                          const mediaUrl = isVideoUrl(firstMedia) 
                            ? getVideoUrl(firstMedia) 
                            : getImageUrl(firstMedia, 300, 400);
                          
                          return (
                            <div className="absolute inset-0 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg transition-transform group-hover:shadow-xl">
                              <img
                                src={mediaUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        })()}
                        
                        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-black/70 text-white text-sm font-bold shadow">
                          {displaySlot}
                        </div>
                        
                        <div className="absolute bottom-1 right-1 z-10 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold shadow">
                          {adsInSlot.length}/{maxUsage}
                        </div>
                      </div>
                    ) : (
                      <div className={`
                        w-full h-full rounded-xl border-2 border-dashed
                        flex flex-col items-center justify-center gap-1
                        transition-colors
                        ${isMultiUse
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:border-amber-400 hover:bg-amber-500/20"
                          : "border-slate-500/40 bg-slate-500/10 text-slate-400 hover:border-slate-400 hover:bg-slate-500/20"
                        }
                      `}>
                        <span className="text-3xl sm:text-4xl font-bold">{displaySlot}</span>
                        <span className="text-[10px] opacity-70">×{maxUsage}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slot Detail Dialog */}
      <Dialog open={showSlotDetailDialog} onOpenChange={setShowSlotDetailDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              Slot #{selectedSlotForDetail}
            </DialogTitle>
            <DialogDescription>
              {selectedSlotForDetail && (MULTI_USE_SLOTS as readonly number[]).includes(selectedSlotForDetail)
                ? `Multi-use slot (up to 3 ads)`
                : `Single-use slot`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
          {selectedSlotForDetail && (() => {
            const storedSlot = selectedSlotForDetail - 1;
            const adsInSlot = adminAdsBySlot.get(storedSlot) || [];
            const maxUsage = getSlotMaxUsage(selectedSlotForDetail);
            const canAddMore = adsInSlot.length < maxUsage;

            return (
              <div className="space-y-4">
                {adsInSlot.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No ads in this slot</p>
                  </div>
                ) : (
                  adsInSlot.map((ad) => {
                    const firstMedia = ad.media?.[0] || ad.image || "";
                    const mediaUrl = isVideoUrl(firstMedia)
                      ? getVideoUrl(firstMedia)
                      : getImageUrl(firstMedia, 100, 100);

                    return (
                      <div key={ad.$id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                          {isVideoUrl(firstMedia) ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/50">
                              <Play className="h-6 w-6 text-white/70" />
                            </div>
                          ) : (
                            <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="font-medium truncate">{ad.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{ad.city}, {ad.state}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditDialog(ad)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleOpenDeleteDialog(ad)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}

                {canAddMore && (
                  <Button
                    onClick={() => {
                      setShowSlotDetailDialog(false);
                      handleClickEmptySlot(selectedSlotForDetail);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ad ({maxUsage - adsInSlot.length} remaining)
                  </Button>
                )}
              </div>
            );
          })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Ad Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border"
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
          <DialogHeader>
            <DialogTitle className="text-xl">Create Ad</DialogTitle>
            <DialogDescription>
              Create a new sponsor advertisement with a specific ad slot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Photo/Video Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Photo/Video <span className="text-red-500">*</span>
              </Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {createForm.mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {createForm.mediaPreviews.map((preview, index) => {
                    const file = createForm.mediaFiles[index];
                    const isVideo = file?.type.startsWith("video/");
                    return (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-secondary/30">
                        {isVideo ? (
                          <video src={preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        )}
                        {isVideo && (
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
                            Video
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMediaFile(index)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-secondary/20"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {createForm.mediaPreviews.length > 0 ? "Add more photos or videos" : "Tap to upload photos or videos"}
                </p>
              </div>
            </div>

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

            {/* External Link */}
            <div className="space-y-2">
              <Label htmlFor="externalLink" className="text-sm font-medium">
                External Link
              </Label>
              <Input
                id="externalLink"
                type="url"
                placeholder="https://example.com (optional)"
                value={createForm.externalLink}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, externalLink: e.target.value }))}
                className="bg-input/50 border-border/50"
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

          <DialogFooter>
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
          className="sm:max-w-[500px] bg-card border-border"
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
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Ad</DialogTitle>
            <DialogDescription>
              Update the ad details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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

            {/* External Link */}
            <div className="space-y-2">
              <Label htmlFor="edit-externalLink">External Link</Label>
              <Input
                id="edit-externalLink"
                type="url"
                placeholder="https://example.com"
                value={editForm.externalLink}
                onChange={(e) => setEditForm((prev) => ({ ...prev, externalLink: e.target.value }))}
                className="bg-input/50 border-border/50"
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={updating}>
              Cancel
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
