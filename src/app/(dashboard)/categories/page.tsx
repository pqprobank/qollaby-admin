"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getAllCategories,
  updateCategory,
  deleteCategory,
  createCategory,
  getSubcategorySponsorAds,
  getCategoryUsageStats,
  getMainCategoryUsageStats,
  Category,
  AdSlotUser,
  CategoryUsageStats,
} from "@/lib/category-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  FolderTree,
  Folder,
  FileText,
  Search,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  Plus,
  Megaphone,
  User,
  Crown,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    category: Category | null;
  }>({ open: false, category: null });
  const [editName, setEditName] = useState("");
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    category: Category | null;
  }>({ open: false, category: null });

  // Create dialog state
  const [createDialog, setCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<"category" | "subcategory">("category");
  const [createName, setCreateName] = useState("");
  const [createParentId, setCreateParentId] = useState("");  // Store parent category value
  const [createOrder, setCreateOrder] = useState(1);
  const [creating, setCreating] = useState(false);

  // Sponsor ads state
  const [sponsorAdsMap, setSponsorAdsMap] = useState<Map<string, AdSlotUser[]>>(new Map());
  const [loadingAds, setLoadingAds] = useState<Set<string>>(new Set());

  // Error state for name validation
  const [editNameError, setEditNameError] = useState("");
  const [createNameError, setCreateNameError] = useState("");

  // Delete usage stats
  const [deleteUsageStats, setDeleteUsageStats] = useState<CategoryUsageStats | null>(null);
  const [loadingUsageStats, setLoadingUsageStats] = useState(false);

  // Open delete dialog and fetch usage stats
  const openDeleteDialog = async (category: Category) => {
    setDeleteDialog({ open: true, category });
    setDeleteUsageStats(null);
    setLoadingUsageStats(true);
    
    try {
      let stats: CategoryUsageStats;
      if (category.type === "category") {
        // Main category - get stats for the category value
        stats = await getMainCategoryUsageStats(category.value);
      } else {
        // Subcategory - get stats for specific category + subcategory
        stats = await getCategoryUsageStats(category.parentId || "", category.value);
      }
      setDeleteUsageStats(stats);
    } catch (error) {
      console.error("Failed to fetch usage stats:", error);
      setDeleteUsageStats({ postCount: 0, adCount: 0 });
    } finally {
      setLoadingUsageStats(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const toggleExpand = (value: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };

  // Load sponsor ads for a subcategory
  const loadSponsorAds = async (categoryValue: string, subcategoryValue: string) => {
    const key = `${categoryValue}:${subcategoryValue}`;
    
    // Skip if already loaded or loading
    if (sponsorAdsMap.has(key) || loadingAds.has(key)) return;
    
    setLoadingAds((prev) => new Set([...prev, key]));
    try {
      const ads = await getSubcategorySponsorAds(categoryValue, subcategoryValue);
      setSponsorAdsMap((prev) => new Map(prev).set(key, ads));
    } catch (error) {
      console.error("Failed to load sponsor ads:", error);
    } finally {
      setLoadingAds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  // Load ads when a category is expanded
  useEffect(() => {
    expandedCategories.forEach((categoryValue) => {
      const subcats = getSubcategories(categoryValue);
      subcats.forEach((sub) => {
        // Find parent category
        const parentCat = mainCategories.find((c) => c.value === categoryValue);
        if (parentCat) {
          loadSponsorAds(parentCat.value, sub.value);
        }
      });
    });
  }, [expandedCategories, categories]);

  const openEditDialog = (category: Category) => {
    setEditName(category.name);
    setEditNameError("");
    setEditDialog({ open: true, category });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.category || !editName.trim()) return;
    
    // Check for duplicate name
    const trimmedName = editName.trim().toLowerCase();
    const isDuplicate = categories.some(
      (cat) => 
        cat.$id !== editDialog.category?.$id && 
        cat.name.toLowerCase() === trimmedName &&
        cat.type === editDialog.category?.type
    );
    
    if (isDuplicate) {
      setEditNameError("A category with this name already exists");
      return;
    }
    
    setEditNameError("");
    setActionLoading(editDialog.category.$id);
    try {
      await updateCategory(editDialog.category.$id, { name: editName.trim() });
      
      // Update local state
      setCategories((prev) =>
        prev.map((cat) =>
          cat.$id === editDialog.category?.$id
            ? { ...cat, name: editName.trim() }
            : cat
        )
      );
      setEditDialog({ open: false, category: null });
    } catch (error) {
      console.error("Failed to update category:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.category) return;
    
    const isMainCategory = deleteDialog.category.type === "category";
    setActionLoading(deleteDialog.category.$id);
    
    try {
      const success = await deleteCategory(
        deleteDialog.category.$id,
        isMainCategory ? deleteDialog.category.value : undefined,
        !isMainCategory ? deleteDialog.category.parentId : undefined,
        true // Delete related posts and ads
      );
      
      if (success) {
        // Remove from local state
        if (isMainCategory) {
          setCategories((prev) =>
            prev.filter(
              (c) =>
                c.$id !== deleteDialog.category?.$id &&
                c.parentId !== deleteDialog.category?.value
            )
          );
        } else {
          setCategories((prev) =>
            prev.filter((c) => c.$id !== deleteDialog.category?.$id)
          );
        }
      }
      setDeleteDialog({ open: false, category: null });
      setDeleteUsageStats(null);
    } catch (error) {
      console.error("Failed to delete category:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateDialog = (type: "category" | "subcategory" = "category", parentValue?: string) => {
    setCreateType(type);
    setCreateName("");
    setCreateParentId(parentValue || "");  // Store parent category value
    setCreateOrder(type === "category" ? mainCategories.length + 1 : 1);
    setCreateNameError("");
    setCreateDialog(true);
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    if (createType === "subcategory" && !createParentId) return;

    // Check for duplicate name
    const trimmedName = createName.trim().toLowerCase();
    const isDuplicate = categories.some(
      (cat) => 
        cat.name.toLowerCase() === trimmedName &&
        cat.type === createType
    );
    
    if (isDuplicate) {
      setCreateNameError("A category with this name already exists");
      return;
    }
    
    setCreateNameError("");
    setCreating(true);
    try {
      // Generate value from name (slug format)
      const value = createName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      
      // Generate categoryId
      const categoryId =
        createType === "category"
          ? `cat_${value.replace(/-/g, "_")}`
          : `sub_${value.replace(/-/g, "_")}`;

      const newCategory = await createCategory({
        categoryId,
        type: createType,
        parentId: createType === "subcategory" ? createParentId : undefined,
        value,
        name: createName.trim(),
        icon: createType === "category" ? "color-palette" : "-",
        order: createOrder,
      });

      if (newCategory) {
        setCategories((prev) => [...prev, newCategory]);
        // If adding subcategory, expand the parent (use parent's value)
        if (createType === "subcategory" && createParentId) {
          // Find the parent category to get its value for expanding
          const parentCat = mainCategories.find(c => c.value === createParentId);
          if (parentCat) {
            setExpandedCategories((prev) => new Set([...prev, parentCat.value]));
          }
        }
      }
      setCreateDialog(false);
    } catch (error) {
      console.error("Failed to create category:", error);
    } finally {
      setCreating(false);
    }
  };

  // Filter and organize categories
  const mainCategories = categories.filter((c) => c.type === "category");
  const filteredMainCategories = search
    ? mainCategories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : mainCategories;

  // Get subcategories by parent category value
  const getSubcategories = (parentValue: string) =>
    categories.filter((c) => c.type === "subcategory" && c.parentId === parentValue);

  // Stats
  const totalCategories = mainCategories.length;
  const totalSubcategories = categories.filter((c) => c.type === "subcategory").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Category Management</h1>
          <p className="text-muted-foreground">
            Manage categories and subcategories for posts and ads
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCategories}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Categories
            </CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">Main categories</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subcategories
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalSubcategories}</div>
            <p className="text-xs text-muted-foreground">Child categories</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
            <FolderTree className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {categories.length}
            </div>
            <p className="text-xs text-muted-foreground">All categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-input/50 border-border/50"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Categories table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Categories</CardTitle>
          <Button
            size="sm"
            onClick={() => openCreateDialog("category")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground w-[60%]">Category</TableHead>
                <TableHead className="text-muted-foreground">Order</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredMainCategories.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={3} className="h-48">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FolderTree className="h-12 w-12 mb-4 opacity-50" />
                      <p>No categories found</p>
                      {search && (
                        <p className="text-sm mt-2">Try a different search term</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // Category rows
                filteredMainCategories.map((category) => {
                  const subcategories = getSubcategories(category.value);
                  const isExpanded = expandedCategories.has(category.value);
                  
                  return (
                    <React.Fragment key={category.$id}>
                      {/* Main category row */}
                      <TableRow
                        className="border-border/30 hover:bg-secondary/30"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpand(category.value)}
                              disabled={subcategories.length === 0}
                            >
                              {subcategories.length > 0 ? (
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )
                              ) : (
                                <span className="w-4" />
                              )}
                            </Button>
                            <div
                              className="h-8 w-8 rounded flex items-center justify-center bg-primary/20"
                            >
                              <Folder className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{category.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {subcategories.length} subcategories
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {category.order}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => openCreateDialog("subcategory", category.value)}
                              title="Add subcategory"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-secondary"
                              onClick={() => openEditDialog(category)}
                              disabled={actionLoading === category.$id}
                            >
                              {actionLoading === category.$id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Pencil className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => openDeleteDialog(category)}
                              disabled={actionLoading === category.$id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Subcategory rows */}
                      {isExpanded &&
                        subcategories.map((sub) => {
                          const adsKey = `${category.value}:${sub.value}`;
                          const ads = sponsorAdsMap.get(adsKey) || [];
                          const isLoadingAds = loadingAds.has(adsKey);
                          
                          return (
                            <React.Fragment key={sub.$id}>
                              <TableRow
                                className="border-border/30 hover:bg-secondary/30 bg-secondary/10"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3 pl-10">
                                    <div className="h-7 w-7 rounded flex items-center justify-center bg-muted">
                                      <span className="text-xs font-medium">
                                        {sub.name[0]?.toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-sm">{sub.name}</p>
                                      {ads.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                          {ads.length} sponsor{ads.length > 1 ? "s" : ""}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {sub.order}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-secondary"
                                      onClick={() => openEditDialog(sub)}
                                      disabled={actionLoading === sub.$id}
                                    >
                                      {actionLoading === sub.$id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Pencil className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => openDeleteDialog(sub)}
                                      disabled={actionLoading === sub.$id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              
                              {/* Sponsor Ads for this subcategory */}
                              {isLoadingAds ? (
                                <TableRow className="border-border/20 bg-gradient-to-r from-amber-500/5 to-transparent">
                                  <TableCell colSpan={3} className="py-3">
                                    <div className="flex items-center gap-2 pl-16">
                                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                                      <span className="text-xs text-muted-foreground">Loading sponsors...</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : ads.length > 0 && (
                                ads.map((adSlot) => (
                                  <TableRow
                                    key={adSlot.ad.$id}
                                    className="border-border/20 bg-gradient-to-r from-amber-500/5 to-transparent hover:from-amber-500/10"
                                  >
                                    <TableCell colSpan={2}>
                                      <div className="flex items-center gap-3 pl-16">
                                        {/* User Avatar */}
                                        <Avatar className="h-8 w-8 border-2 border-amber-500/30">
                                          {adSlot.user?.avatar ? (
                                            <AvatarImage src={adSlot.user.avatar} alt={adSlot.user.firstName} />
                                          ) : null}
                                          <AvatarFallback className="bg-amber-500/10 text-amber-600 text-xs">
                                            {adSlot.user ? (
                                              `${adSlot.user.firstName[0] || ""}${adSlot.user.lastName[0] || ""}`
                                            ) : (
                                              <User className="h-4 w-4" />
                                            )}
                                          </AvatarFallback>
                                        </Avatar>
                                        
                                        {/* User Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium truncate">
                                                {adSlot.user 
                                                 ? `${adSlot.user.firstName} ${adSlot.user.lastName}`.trim() || "Premium Ad"
                                                 : "Premium Ad"
                                                }
                                              </span>
                                            {/* Plan Badge */}
                                            {adSlot.plan && (
                                              <Badge 
                                                variant="secondary" 
                                                className={`text-[10px] px-1.5 py-0 ${
                                                  adSlot.plan.name.toLowerCase().includes("dominion")
                                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                    : adSlot.plan.name.toLowerCase().includes("professional")
                                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                    : "bg-green-500/10 text-green-500 border-green-500/20"
                                                }`}
                                              >
                                                {adSlot.plan.name.toLowerCase().includes("dominion") && (
                                                  <Crown className="h-3 w-3 mr-0.5" />
                                                )}
                                                {adSlot.plan.name.toLowerCase().includes("professional") && (
                                                  <Sparkles className="h-3 w-3 mr-0.5" />
                                                )}
                                                {adSlot.plan.name}
                                              </Badge>
                                            )}
                                          </div>
                                            {adSlot.user?.email && (
                                              <p className="text-xs text-muted-foreground truncate">
                                                {adSlot.user.email}
                                              </p>
                                            )}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {/* Slot Position */}
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          adSlot.ad.slot === 0 || adSlot.ad.slot === 9 || adSlot.ad.slot === 19
                                            ? "bg-red-500/10 text-red-500 border-red-500/30"
                                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                        }`}
                                      >
                                        {adSlot.slotLabel}
                                      </Badge>
                                    </TableCell>
                                    {/* <TableCell>
                                      <span className="text-xs text-muted-foreground">
                                        Slot #{adSlot.ad.slot}
                                      </span>
                                    </TableCell> */}
                                  </TableRow>
                                ))
                              )}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, category: null })}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the {editDialog.category?.type === "category" ? "category" : "subcategory"} details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setEditNameError("");
                }}
                placeholder="Category name"
                className={`bg-input/50 ${editNameError ? "border-destructive" : "border-border/50"}`}
              />
              {editNameError && (
                <p className="text-xs text-destructive">{editNameError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, category: null })}
              className="bg-secondary/50 border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={actionLoading !== null || !editName.trim()}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          setDeleteDialog({ open, category: null });
          if (!open) {
            setDeleteUsageStats(null);
          }
        }}
      >
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteDialog.category?.type === "category" ? (
                  (() => {
                    const subcategoryCount = getSubcategories(deleteDialog.category?.value || "").length;
                    const totalItems = subcategoryCount + 1;
                    return (
                      <>
                        <p>
                          Are you sure you want to delete <strong>{deleteDialog.category?.name}</strong>?
                        </p>
                        <p className="text-destructive">
                          This will permanently delete all {totalItems} items in this category ({subcategoryCount} subcategories).
                        </p>
                      </>
                    );
                  })()
                ) : (
                  <p>
                    Are you sure you want to delete <strong>{deleteDialog.category?.name}</strong>?
                  </p>
                )}
                
                {/* Usage stats */}
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  {loadingUsageStats ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking usage...
                    </div>
                  ) : deleteUsageStats ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-destructive">
                        Items that will be affected:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>{deleteUsageStats.postCount}</strong> Posts
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <strong>{deleteUsageStats.adCount}</strong> Ads
                          </span>
                        </div>
                      </div>
                      {(deleteUsageStats.postCount > 0 || deleteUsageStats.adCount > 0) && (
                        <p className="text-xs text-destructive mt-2 font-medium">
                          ⚠️ Warning: These posts and ads will be permanently deleted!
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary/50 border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loadingUsageStats}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createType === "category" ? "Add Category" : "Add Subcategory"}
            </DialogTitle>
            <DialogDescription>
              {createType === "category"
                ? "Create a new main category"
                : "Create a new subcategory under an existing category"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Parent category selector (for subcategory) */}
            {createType === "subcategory" && (
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Category *</Label>
                <select
                  id="parentId"
                  value={createParentId}
                  onChange={(e) => setCreateParentId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-border/50 bg-input/50 text-sm"
                >
                  <option value="">Select a category</option>
                  {mainCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="createName">Name *</Label>
              <Input
                id="createName"
                value={createName}
                onChange={(e) => {
                  setCreateName(e.target.value);
                  setCreateNameError("");
                }}
                placeholder="Category name"
                className={`bg-input/50 ${createNameError ? "border-destructive" : "border-border/50"}`}
              />
              {createNameError && (
                <p className="text-xs text-destructive">{createNameError}</p>
              )}
            </div>

            {/* Order */}
            <div className="space-y-2">
              <Label htmlFor="createOrder">Display Order</Label>
              <Input
                id="createOrder"
                type="number"
                min={1}
                value={createOrder}
                onChange={(e) => setCreateOrder(parseInt(e.target.value) || 1)}
                className="bg-input/50 border-border/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialog(false)}
              className="bg-secondary/50 border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                !createName.trim() ||
                (createType === "subcategory" && !createParentId)
              }
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
