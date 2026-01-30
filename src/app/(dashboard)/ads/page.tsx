"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSponsorAds,
  getSponsorAdStats,
  getAdsLikeCounts,
  getAdminAdsBySlot,
  createSponsorAd,
  updateSponsorAd,
  deleteSponsorAd,
  getSlotUsageCounts,
  getSlotMaxUsage,
  isSlotAvailable,
  getSlotRemainingUsage,
  AD_SLOTS,
  MULTI_USE_SLOTS,
  AdSlot,
  SponsorAd,
  SponsorAdListResult,
  SponsorAdStatus,
  SlotUsageInfo,
} from "@/lib/user-actions";
import { getImageUrl, getVideoUrl, isVideoUrl, uploadFiles } from "@/lib/appwrite";
import { categories, getCategoryLabel, getSubCategoryLabel } from "@/lib/categories";
import { getStates, getLocationsByState, createLocation, getAllLocations, Location } from "@/lib/location-actions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import LocationPicker, { PlaceValue } from "@/components/ui/location-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Megaphone,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Heart,
  Eye,
  MousePointer,
  Ban,
  Play,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Upload,
  Loader2,
  Shield,
  X,
  Edit2,
  Trash2,
} from "lucide-react";

interface AdWithStats extends SponsorAd {
  computedLikeCount: number;
}

// US State abbreviation to full name mapping
const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

// Convert state abbreviation to full name
const getStateFullName = (stateCode: string): string => {
  return US_STATE_NAMES[stateCode.toUpperCase()] || stateCode;
};

interface CreateAdForm {
  title: string;
  description: string;
  location: PlaceValue | null;
  locationConfirmed: boolean;
  state: string;
  city: string;
  category: string;
  subcategory: string;
  slot: AdSlot | null;
  mediaFiles: File[];
  mediaPreviews: string[];
}

const initialFormState: CreateAdForm = {
  title: "",
  description: "",
  location: null,
  locationConfirmed: false,
  state: "",
  city: "",
  category: "",
  subcategory: "",
  slot: null,
  mediaFiles: [],
  mediaPreviews: [],
};

interface EditAdForm {
  title: string;
  description: string;
  state: string;
  city: string;
  category: string;
  subcategory: string;
  slot: AdSlot | null;
}

export default function AdsPage() {
  const router = useRouter();
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<AdWithStats[]>([]);
  const [adminAdsBySlot, setAdminAdsBySlot] = useState<Map<number, SponsorAd[]>>(new Map());
  const [stats, setStats] = useState({ totalAds: 0, activeAds: 0, pendingAds: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SponsorAdStatus>("all");
  
  // Filter state
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [filterStates, setFilterStates] = useState<string[]>([]);
  const [filterCities, setFilterCities] = useState<Location[]>([]);
  const [loadingFilterCities, setLoadingFilterCities] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Create Ad Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdForm>(initialFormState);
  const [creating, setCreating] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [slotUsageCounts, setSlotUsageCounts] = useState<SlotUsageInfo>({});
  const [loadingCities, setLoadingCities] = useState(false);
  const [confirmingLocation, setConfirmingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Ad Dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<AdWithStats | null>(null);
  const [editForm, setEditForm] = useState<EditAdForm>({
    title: "",
    description: "",
    state: "",
    city: "",
    category: "",
    subcategory: "",
    slot: null,
  });
  const [updating, setUpdating] = useState(false);
  const [editStates, setEditStates] = useState<string[]>([]);
  const [editCities, setEditCities] = useState<Location[]>([]);
  const [loadingEditCities, setLoadingEditCities] = useState(false);
  const [editSlotUsageCounts, setEditSlotUsageCounts] = useState<SlotUsageInfo>({});

  // Delete Ad state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAd, setDeletingAd] = useState<AdWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Slot detail dialog state
  const [showSlotDetailDialog, setShowSlotDetailDialog] = useState(false);
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<AdSlot | null>(null);

  // Handle media file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Create preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));

    setCreateForm((prev) => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...files],
      mediaPreviews: [...prev.mediaPreviews, ...newPreviews],
    }));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove media file
  const removeMediaFile = (index: number) => {
    setCreateForm((prev) => {
      // Revoke the URL to free memory
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
      const [result, statsData, adminAdsMap] = await Promise.all([
        getSponsorAds({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter,
          state: stateFilter || undefined,
          city: cityFilter || undefined,
          category: categoryFilter || undefined,
          subcategory: subcategoryFilter || undefined,
        }),
        getSponsorAdStats(),
        getAdminAdsBySlot(),
      ]);

      // Fetch like counts for all ads
      const adIds = result.ads.map((ad) => ad.$id);
      const likeCounts = await getAdsLikeCounts(adIds);

      // Merge stats into ads
      const adsWithStats: AdWithStats[] = result.ads.map((ad) => ({
        ...ad,
        computedLikeCount: likeCounts.get(ad.$id) || 0,
      }));

      setAds(adsWithStats);
      setAdminAdsBySlot(adminAdsMap);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setStats(statsData);
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

  // Load filter states on mount
  useEffect(() => {
    getStates().then(setFilterStates);
  }, []);

  // Load filter cities when state filter changes
  useEffect(() => {
    if (stateFilter) {
      setLoadingFilterCities(true);
      getLocationsByState(stateFilter)
        .then(setFilterCities)
        .finally(() => setLoadingFilterCities(false));
      setCityFilter(""); // Reset city when state changes
    } else {
      setFilterCities([]);
      setCityFilter("");
    }
  }, [stateFilter]);

  // Reset subcategory filter when category filter changes
  useEffect(() => {
    setSubcategoryFilter("");
  }, [categoryFilter]);

  // Get filter subcategories for selected category
  const filterSelectedCategory = categories.find((c) => c.value === categoryFilter);
  const filterSubcategories = filterSelectedCategory?.subCategories || [];

  // Count active filters
  const activeFilterCount = [stateFilter, cityFilter, categoryFilter, subcategoryFilter].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setStateFilter("");
    setCityFilter("");
    setCategoryFilter("");
    setSubcategoryFilter("");
  };

  // Load states, all locations and slot usage counts when dialog opens
  useEffect(() => {
    if (showCreateDialog) {
      getStates().then(setStates);
      getAllLocations().then(setAllLocations);
      getSlotUsageCounts().then(setSlotUsageCounts);
    }
  }, [showCreateDialog]);

  // Load cities when state changes (only if not from location confirmation)
  useEffect(() => {
    if (createForm.state) {
      setLoadingCities(true);
      getLocationsByState(createForm.state)
        .then(setCities)
        .finally(() => setLoadingCities(false));
      
      // Only reset city if location is not confirmed (manual state selection)
      if (!createForm.locationConfirmed) {
        setCreateForm((prev) => ({ ...prev, city: "" }));
      }
    } else {
      setCities([]);
      setCreateForm((prev) => ({ ...prev, city: "" }));
    }
  }, [createForm.state, createForm.locationConfirmed]);

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c.value === createForm.category);
  const subcategories = selectedCategory?.subCategories || [];

  // Handle confirming location - auto-fill state/city and create if not exists
  const handleConfirmLocation = async () => {
    if (!createForm.location) return;

    const { state: stateCode, city } = createForm.location;
    if (!stateCode || !city) {
      alert("Could not extract state and city from the selected location. Please try a different address.");
      return;
    }

    // Convert state abbreviation to full name (e.g., "CA" -> "California")
    const state = getStateFullName(stateCode);

    setConfirmingLocation(true);
    try {
      // Check if state exists
      const stateExists = states.includes(state);
      
      // Check if city exists in this state
      const cityExists = allLocations.some(
        (loc) => loc.state === state && loc.city === city
      );

      // If state or city doesn't exist, create new location
      if (!stateExists || !cityExists) {
        // Get max order for this state to add new city at the end
        const stateLocations = allLocations.filter((loc) => loc.state === state);
        const maxOrder = stateLocations.length > 0 
          ? Math.max(...stateLocations.map((loc) => loc.order || 0)) + 1 
          : 1;

        await createLocation({
          locationId: `${state}-${city}`.toLowerCase().replace(/\s+/g, "-"),
          state,
          city,
          order: maxOrder,
        });

        // Refresh states and locations
        const [newStates, newAllLocations] = await Promise.all([
          getStates(),
          getAllLocations(),
        ]);
        setStates(newStates);
        setAllLocations(newAllLocations);

        // Refresh cities for current state
        if (state) {
          const newCities = await getLocationsByState(state);
          setCities(newCities);
        }
      }

      // Update form with state and city (using full state name)
      setCreateForm((prev) => ({
        ...prev,
        state,
        city,
        locationConfirmed: true,
      }));
    } catch (error) {
      console.error("Failed to confirm location:", error);
      alert("Failed to confirm location. Please try again.");
    } finally {
      setConfirmingLocation(false);
    }
  };

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
      // Upload media files to Appwrite Storage
      const mediaIds = await uploadFiles(createForm.mediaFiles);
      
      await createSponsorAd({
        userId: admin.profile.userId,
        title: createForm.title,
        description: createForm.description || undefined,
        media: mediaIds,
        state: createForm.state,
        city: createForm.city,
        category: createForm.category,
        subcategory: createForm.subcategory || undefined,
        slot: createForm.slot,
      });
      
      // Clean up preview URLs
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

  const availableSlots = AD_SLOTS.filter((slot) => isSlotAvailable(slot, slotUsageCounts));

  // Click on slot to open detail dialog
  const handleClickSlot = (displaySlot: AdSlot) => {
    setSelectedSlotForDetail(displaySlot);
    setShowSlotDetailDialog(true);
  };

  // Click add button in slot detail dialog to create ad
  const handleClickEmptySlot = async (displaySlot: AdSlot) => {
    // Load states, all locations and slot usage counts
    const [statesData, locationsData, usage] = await Promise.all([
      getStates(),
      getAllLocations(),
      getSlotUsageCounts(),
    ]);
    setStates(statesData);
    setAllLocations(locationsData);
    setSlotUsageCounts(usage);
    
    // Pre-select the slot
    setCreateForm({
      ...initialFormState,
      slot: displaySlot,
    });
    setShowCreateDialog(true);
  };

  // Open edit dialog for admin-created ads
  const handleOpenEditDialog = async (ad: AdWithStats) => {
    if (!ad.isAdminCreated) return;

    // Load states and slot usage
    const [statesData, usage] = await Promise.all([
      getStates(),
      getSlotUsageCounts(),
    ]);
    setEditStates(statesData);

    // Exclude current ad's slot from usage count
    const displaySlot = ad.slot !== undefined ? ad.slot + 1 : null;
    if (displaySlot && usage[displaySlot]) {
      usage[displaySlot] = Math.max(0, usage[displaySlot] - 1);
    }
    setEditSlotUsageCounts(usage);

    // Load cities for current state
    if (ad.state) {
      setLoadingEditCities(true);
      const citiesData = await getLocationsByState(ad.state);
      setEditCities(citiesData);
      setLoadingEditCities(false);
    }

    // Set form values
    setEditForm({
      title: ad.title || "",
      description: ad.description || "",
      state: ad.state || "",
      city: ad.city || "",
      category: ad.category || "",
      subcategory: ad.subcategory || "",
      slot: displaySlot as AdSlot | null,
    });
    setEditingAd(ad);
    setShowEditDialog(true);
  };

  // Handle edit form state change
  const handleEditStateChange = async (newState: string) => {
    setEditForm((prev) => ({ ...prev, state: newState, city: "" }));
    if (newState) {
      setLoadingEditCities(true);
      const citiesData = await getLocationsByState(newState);
      setEditCities(citiesData);
      setLoadingEditCities(false);
    } else {
      setEditCities([]);
    }
  };

  // Handle update ad
  const handleUpdateAd = async () => {
    if (!editingAd || !editForm.title || !editForm.state || !editForm.city || !editForm.category || !editForm.slot) {
      alert("Please fill in all required fields");
      return;
    }

    setUpdating(true);
    try {
      await updateSponsorAd(editingAd.$id, {
        title: editForm.title,
        description: editForm.description,
        state: editForm.state,
        city: editForm.city,
        category: editForm.category,
        subcategory: editForm.subcategory,
        slot: editForm.slot,
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

  // Get edit subcategories for selected category
  const editSelectedCategory = categories.find((c) => c.value === editForm.category);
  const editSubcategories = editSelectedCategory?.subCategories || [];

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (ad: AdWithStats) => {
    if (!ad.isAdminCreated) return;
    setDeletingAd(ad);
    setShowDeleteDialog(true);
  };

  // Handle delete ad
  const handleDeleteAd = async () => {
    if (!deletingAd) return;

    setDeleting(true);
    try {
      const success = await deleteSponsorAd(deletingAd.$id);
      if (success) {
        setShowDeleteDialog(false);
        setDeletingAd(null);
        fetchAds();
      } else {
        alert("Failed to delete ad. Please try again.");
      }
    } catch (error) {
      console.error("Failed to delete ad:", error);
      alert("Failed to delete ad. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAds();
  };

  const getStatusColor = (status: SponsorAdStatus) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-600";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sponsor Ads</h1>
          <p className="text-muted-foreground mt-1">Manage all sponsor advertisements</p>
        </div>
        <div className="flex gap-2">
          {/* Create Ad button - commented out, now click on empty slot to add */}
          {/* <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Ad
          </Button> */}
          <Button
            variant="outline"
            onClick={fetchAds}
            className="bg-secondary/50 border-border/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
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
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
              {AD_SLOTS.map((slot) => (
                <Skeleton key={slot} className="aspect-[3/4] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
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
                      /* Stacked cards with thumbnails */
                      <div className="relative w-full h-full">
                        {adsInSlot.slice(0, 3).map((ad, idx) => {
                          const firstMedia = ad.media?.[0] || ad.image || "";
                          const mediaUrl = isVideoUrl(firstMedia) 
                            ? getVideoUrl(firstMedia) 
                            : getImageUrl(firstMedia, 200, 200);
                          const offset = idx * 4;
                          const rotation = (idx - 1) * 3;
                          
                          return (
                            <div
                              key={ad.$id}
                              className="absolute inset-0 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg transition-transform group-hover:shadow-xl"
                              style={{
                                transform: `translateX(${offset}px) translateY(${offset}px) rotate(${rotation}deg)`,
                                zIndex: adsInSlot.length - idx,
                              }}
                            >
                              <img
                                src={mediaUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              {/* Dark overlay for stacked cards */}
                              {idx > 0 && (
                                <div className="absolute inset-0 bg-black/20" />
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Slot number badge */}
                        <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs font-bold shadow">
                          {displaySlot}
                        </div>
                        
                        {/* Count badge */}
                        <div className="absolute bottom-1 right-1 z-10 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold shadow">
                          {adsInSlot.length}/{maxUsage}
                        </div>
                      </div>
                    ) : (
                      /* Empty slot placeholder */
                      <div className={`
                        w-full h-full rounded-lg border-2 border-dashed
                        flex flex-col items-center justify-center gap-1
                        transition-colors
                        ${isMultiUse
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:border-amber-400 hover:bg-amber-500/20"
                          : "border-slate-500/40 bg-slate-500/10 text-slate-400 hover:border-slate-400 hover:bg-slate-500/20"
                        }
                      `}>
                        <span className="text-2xl sm:text-3xl font-bold">{displaySlot}</span>
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

      {/* Search, Filters and Ads List - Commented out, using slot view instead */}
      {/* 
      <Card className="bg-card/50 border-border/50">
        ... Search and filters code ...
      </Card>
      <div>
        ... Ads grid and pagination code ...
      </div>
      */}

      {/* Create Ad Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border"
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking on pac-container (Google Places dropdown)
            const target = e.target as HTMLElement;
            if (target.closest('.pac-container')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            // Prevent closing when interacting with pac-container
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
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Media previews */}
              {createForm.mediaPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {createForm.mediaPreviews.map((preview, index) => {
                    const file = createForm.mediaFiles[index];
                    const isVideo = file?.type.startsWith("video/");
                    return (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-secondary/30">
                        {isVideo ? (
                          <video
                            src={preview}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
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

              {/* Upload button */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer bg-secondary/20"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {createForm.mediaPreviews.length > 0 ? "Add more photos or videos" : "Tap to upload photos or videos"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">Max video size: 200MB</p>
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

            {/* Location Search */}
            <div className="space-y-3">
              <LocationPicker
                value={createForm.location}
                onChange={(location) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    location,
                    locationConfirmed: false, // Reset confirmation when location changes
                  }));
                }}
                label="Location Search"
                placeholder="Search for full address..."
                showCurrentLocation={true}
              />

              {/* Location Confirm Button */}
              {createForm.location && !createForm.locationConfirmed && (
                <Button
                  type="button"
                  onClick={handleConfirmLocation}
                  disabled={confirmingLocation}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {confirmingLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Location
                    </>
                  )}
                </Button>
              )}

              {/* Location Confirmed Status */}
              {createForm.locationConfirmed && (
                <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 px-3 py-2 rounded-md">
                  <CheckCircle className="h-4 w-4" />
                  <span>Location confirmed: {createForm.city}, {createForm.state}</span>
                </div>
              )}
            </div>

            {/* State & City */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium">
                  State <span className="text-red-500">*</span>
                </Label>
                <select
                  id="state"
                  value={createForm.state}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, state: e.target.value, locationConfirmed: false }))}
                  className="w-full h-9 px-3 rounded-md bg-input/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select state</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  City <span className="text-red-500">*</span>
                </Label>
                <select
                  id="city"
                  value={createForm.city}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, city: e.target.value, locationConfirmed: false }))}
                  disabled={!createForm.state || loadingCities}
                  className="w-full h-9 px-3 rounded-md bg-input/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                >
                  <option value="">{loadingCities ? "Loading..." : "Select city"}</option>
                  {cities.map((loc) => (
                    <option key={loc.$id} value={loc.city}>
                      {loc.city}
                    </option>
                  ))}
                </select>
              </div>
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
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
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
                  {subcategories.map((sub) => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ad Slot - Pre-selected from slot table */}
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
              disabled={creating || !createForm.title || !createForm.state || !createForm.city || !createForm.category || !createForm.slot}
              className="bg-primary hover:bg-primary/90"
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
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ad</DialogTitle>
            <DialogDescription>
              Update the advertisement details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter ad title"
                className="bg-secondary/30 border-border/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter ad description"
                className="bg-secondary/30 border-border/50"
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <Label>
                State <span className="text-red-500">*</span>
              </Label>
              <select
                value={editForm.state}
                onChange={(e) => handleEditStateChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border/50 bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select state</option>
                {editStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label>
                City <span className="text-red-500">*</span>
              </Label>
              <select
                value={editForm.city}
                onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
                disabled={!editForm.state || loadingEditCities}
                className="w-full h-10 px-3 rounded-md border border-border/50 bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                <option value="">{loadingEditCities ? "Loading..." : "Select city"}</option>
                {editCities.map((city) => (
                  <option key={city.$id} value={city.city}>{city.city}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>
                Category <span className="text-red-500">*</span>
              </Label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))}
                className="w-full h-10 px-3 rounded-md border border-border/50 bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            {editSubcategories.length > 0 && (
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <select
                  value={editForm.subcategory}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-border/50 bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select subcategory</option>
                  {editSubcategories.map((sub) => (
                    <option key={sub.value} value={sub.value}>{sub.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Ad Slot Selection */}
            <div className="space-y-3">
              <Label>
                Ad Slot <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                <span className="text-amber-500">●</span> Slots 5, 8, 15, 25, 35, 45, 55, 65 can be used up to 3 times. 
                <span className="text-blue-500 ml-2">●</span> Other slots can only be used once.
              </p>
              <div className="grid grid-cols-5 gap-2">
                {AD_SLOTS.map((slot) => {
                  const slotAvailable = isSlotAvailable(slot, editSlotUsageCounts);
                  const isSelected = editForm.slot === slot;
                  const maxUsage = getSlotMaxUsage(slot);
                  const remainingUsage = getSlotRemainingUsage(slot, editSlotUsageCounts);
                  const currentUsage = editSlotUsageCounts[slot] || 0;
                  const isMultiUse = (MULTI_USE_SLOTS as readonly number[]).includes(slot);
                  
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => slotAvailable && setEditForm((prev) => ({ ...prev, slot }))}
                      disabled={!slotAvailable}
                      title={isMultiUse 
                        ? `Slot ${slot}: ${currentUsage}/${maxUsage} used, ${remainingUsage} remaining`
                        : `Slot ${slot}: ${slotAvailable ? "Available" : "Occupied"}`
                      }
                      className={`
                        py-2 px-1 rounded-md text-sm font-medium transition-all text-center relative
                        ${isSelected 
                          ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" 
                          : !slotAvailable 
                            ? "bg-secondary/30 text-muted-foreground/50 cursor-not-allowed line-through" 
                            : "bg-secondary/50 hover:bg-secondary text-foreground cursor-pointer"
                        }
                      `}
                    >
                      {slot}
                      {isMultiUse && slotAvailable && (
                        <span className="absolute -top-1 -right-1 text-[10px] bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                          {remainingUsage}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {editForm.slot && (
                <p className="text-sm text-primary">
                  Selected slot: <span className="font-semibold">{editForm.slot}</span>
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={updating}
              className="bg-secondary/50 border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAd}
              disabled={updating || !editForm.title || !editForm.state || !editForm.city || !editForm.category || !editForm.slot}
              className="bg-primary hover:bg-primary/90"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Ad"
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
              Are you sure you want to delete this ad? This action cannot be undone.
              {deletingAd && (
                <span className="block mt-2 font-medium text-foreground">
                  &quot;{deletingAd.title}&quot;
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="bg-secondary/50 border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAd}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
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

      {/* Slot Detail Dialog */}
      <Dialog open={showSlotDetailDialog} onOpenChange={setShowSlotDetailDialog}>
        <DialogContent className="bg-card border-border max-w-2xl">
          {selectedSlotForDetail && (() => {
            const storedSlot = selectedSlotForDetail - 1;
            const adsInSlot = adminAdsBySlot.get(storedSlot) || [];
            const maxUsage = getSlotMaxUsage(selectedSlotForDetail);
            const isMultiUse = (MULTI_USE_SLOTS as readonly number[]).includes(selectedSlotForDetail);
            const canAddMore = adsInSlot.length < maxUsage;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold
                      ${adsInSlot.length > 0 
                        ? "bg-emerald-600 text-white" 
                        : isMultiUse 
                          ? "bg-amber-600/20 text-amber-500 border-2 border-amber-500/50" 
                          : "bg-slate-600/20 text-slate-400 border-2 border-slate-500/50"
                      }
                    `}>
                      {selectedSlotForDetail}
                    </div>
                    <div>
                      <span>Slot #{selectedSlotForDetail}</span>
                      <p className="text-sm font-normal text-muted-foreground">
                        {adsInSlot.length}/{maxUsage} ads • {isMultiUse ? "Multi-use slot" : "Single-use slot"}
                      </p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                  {adsInSlot.length === 0 ? (
                    <div className="text-center py-8">
                      <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground mb-4">No ads in this slot yet</p>
                      <Button
                        onClick={() => {
                          setShowSlotDetailDialog(false);
                          handleClickEmptySlot(selectedSlotForDetail);
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ad to Slot {selectedSlotForDetail}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adsInSlot.map((ad, idx) => {
                        const firstMedia = ad.media?.[0] || ad.image || "";
                        const mediaUrl = isVideoUrl(firstMedia) ? getVideoUrl(firstMedia) : getImageUrl(firstMedia, 100, 100);
                        
                        return (
                          <div
                            key={ad.$id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-border transition-colors"
                          >
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                              <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{ad.title || "Untitled"}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {ad.state}, {ad.city}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getCategoryLabel(ad.category || "")}
                                {ad.subcategory && ` • ${getSubCategoryLabel(ad.category || "", ad.subcategory)}`}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/ads/${ad.$id}`)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setShowSlotDetailDialog(false);
                                  handleOpenEditDialog(ad as AdWithStats);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setShowSlotDetailDialog(false);
                                  handleOpenDeleteDialog(ad as AdWithStats);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add more button */}
                      {canAddMore && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowSlotDetailDialog(false);
                            handleClickEmptySlot(selectedSlotForDetail);
                          }}
                          className="w-full border-dashed border-2 bg-transparent hover:bg-secondary/50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Another Ad ({maxUsage - adsInSlot.length} remaining)
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdCard({ ad, onClick, onEdit, onDelete }: { ad: AdWithStats; onClick: () => void; onEdit?: () => void; onDelete?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Get the first media item
  const firstMedia = ad.media?.[0] || ad.image || "";
  const isVideo = isVideoUrl(firstMedia);
  const mediaUrl = isVideo ? getVideoUrl(firstMedia) : getImageUrl(firstMedia, 400, 400);

  // Auto-play video on hover
  useEffect(() => {
    if (videoRef.current && isVideo) {
      if (isHovering) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovering, isVideo]);

  const getStatusColor = (status: SponsorAdStatus) => {
    switch (status) {
      case "active":
        return "bg-green-500/90";
      case "pending":
        return "bg-yellow-500/90";
      case "expired":
        return "bg-gray-500/90";
      case "rejected":
        return "bg-red-500/90";
      default:
        return "bg-secondary";
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`group cursor-pointer rounded-lg overflow-hidden border bg-card/50 hover:shadow-lg transition-all ${
        ad.isBlacklisted
          ? "border-red-500/50 bg-red-950/10 hover:border-red-500/70"
          : "border-border/50 hover:border-primary/30"
      }`}
    >
      <div className="relative aspect-square">
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              src={mediaUrl}
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            {!isHovering && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={mediaUrl}
            alt={ad.title}
            className="w-full h-full object-cover"
          />
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          {/* Blacklisted badge */}
          {ad.isBlacklisted && (
            <div className="px-2 py-1 rounded bg-red-600/90 text-white text-xs font-medium flex items-center gap-1">
              <Ban className="w-3 h-3" />
              Blocked
            </div>
          )}
          {/* Status badge */}
          <div className={`px-2 py-1 rounded ${getStatusColor(ad.status)} text-white text-xs font-medium`}>
            {ad.status}
          </div>
        </div>

        {/* Left badges - Admin created & Slot & Video */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {/* Admin created badge */}
          {ad.isAdminCreated && (
            <div className="px-2 py-1 rounded bg-primary/90 text-primary-foreground text-xs font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Admin
            </div>
          )}
          {/* Slot badge - display value is stored + 1 */}
          {ad.slot !== undefined && ad.slot !== null && (
            <div className="px-2 py-1 rounded bg-amber-500/90 text-white text-xs font-medium">
              Slot {ad.slot + 1}
            </div>
          )}
          {/* Video badge */}
          {isVideo && (
            <div className="px-2 py-1 rounded bg-black/70 text-white text-xs font-medium flex items-center gap-1">
              <Play className="w-3 h-3" />
              Video
            </div>
          )}
        </div>

        {/* Overlay with stats on hover */}
        {!isVideo && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-4 text-white text-sm">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{ad.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MousePointer className="h-4 w-4" />
                <span>{ad.clicks || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{ad.computedLikeCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Title and stats bar */}
      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium truncate flex-1">{ad.title || "Untitled"}</p>
          {/* Action buttons for admin-created ads */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 ml-2">
              {onEdit && (
                <button
                  onClick={handleEditClick}
                  className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                  title="Edit Ad"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Delete Ad"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {ad.views || 0}
            </span>
            <span className="flex items-center gap-1">
              <MousePointer className="h-3 w-3" />
              {ad.clicks || 0}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {ad.computedLikeCount}
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact ad card for slot view
function SlotAdCard({ 
  ad, 
  displaySlot, 
  index, 
  total, 
  onClick, 
  onEdit, 
  onDelete 
}: { 
  ad: SponsorAd; 
  displaySlot: number;
  index: number;
  total: number;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const firstMedia = ad.media?.[0] || ad.image || "";
  const mediaUrl = isVideoUrl(firstMedia) ? getVideoUrl(firstMedia) : getImageUrl(firstMedia, 200, 200);
  const isVideo = isVideoUrl(firstMedia);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      onClick={onClick}
      className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 bg-card/50 cursor-pointer transition-all hover:shadow-md"
    >
      {/* Media */}
      {isVideo ? (
        <video
          src={mediaUrl}
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={mediaUrl}
          alt={ad.title || "Ad"}
          className="w-full h-full object-cover"
        />
      )}

      {/* Slot number badge */}
      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
        {displaySlot}
        {total > 1 && <span className="text-primary ml-0.5">#{index + 1}</span>}
      </div>

      {/* Video indicator */}
      {isVideo && (
        <div className="absolute top-1 right-1 p-1 rounded bg-black/50">
          <Play className="w-2.5 h-2.5 text-white fill-white" />
        </div>
      )}

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          onClick={handleEditClick}
          className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          title="Edit"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDeleteClick}
          className="p-1.5 rounded-full bg-red-500/50 hover:bg-red-500/70 text-white transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Title at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-[10px] text-white truncate">{ad.title || "Untitled"}</p>
      </div>
    </div>
  );
}
