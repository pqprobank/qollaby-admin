"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getUsers,
  getUserStats,
  updateUserRole,
  deleteUserProfile,
  getPlans,
  getUsersSubscriptionInfo,
  getUsersBusinessProfiles,
  getUserFilterOptions,
  UserListResult,
  Plan,
  BusinessProfileListItem,
  UserFilterOptions,
} from "@/lib/user-actions";
import { getAllCategories, getCategoryLabel, Category } from "@/lib/category-actions";
import { getStateFullName } from "@/lib/utils";
import { Profile, UserRole, UserSubscriptionInfo } from "@/types/profile.types";
import { PageHeader } from "@/components/ui/page-header";
import LocationPicker, { PlaceValue } from "@/components/ui/location-picker";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FilterBadge } from "@/components/ui/filter-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Shield,
  Link2,
  Search,
  MoreHorizontal,
  Eye,
  ShieldCheck,
  ShieldOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  ChevronDown,
  Check,
  X,
  MapPin,
  Building2,
  FolderTree,
  Briefcase,
} from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalAdmins: 0, recentUsers: 0 });
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">(() => (searchParams.get("role") as UserRole | "all") || "all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>(() => searchParams.get("plan") || "all");
  const [hasBusinessProfileFilter, setHasBusinessProfileFilter] = useState<"all" | "yes" | "no">(() => (searchParams.get("bizProfile") as "all" | "yes" | "no") || "all");
  const [stateFilter, setStateFilter] = useState<string>(() => searchParams.get("state") || "");
  const [cityFilter, setCityFilter] = useState<string>(() => searchParams.get("city") || "");
  const [selectedLocation, setSelectedLocation] = useState<PlaceValue | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>(() => searchParams.get("category") || "");
  const [filterOptions, setFilterOptions] = useState<UserFilterOptions>({ states: [], cities: [], categories: [] });
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usersSubscription, setUsersSubscription] = useState<Map<string, UserSubscriptionInfo>>(new Map());
  const [usersBusinessProfiles, setUsersBusinessProfiles] = useState<Map<string, BusinessProfileListItem>>(new Map());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: Profile | null }>({
    open: false,
    user: null,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result: UserListResult = await getUsers({
        page,
        limit: 10,
        search: search || undefined,
        role: roleFilter,
        planId: subscriptionFilter,
        hasBusinessProfile: hasBusinessProfileFilter,
        state: stateFilter || undefined,
        city: cityFilter || undefined,
        category: categoryFilter || undefined,
      });
      setUsers(result.users);
      setTotalPages(result.totalPages);
      setTotal(result.total);

      // Fetch subscription info and business profiles for all users
      if (result.users.length > 0) {
        const userIds = result.users.map((u) => u.userId);
        const [subscriptionInfo, businessProfiles] = await Promise.all([
          getUsersSubscriptionInfo(userIds),
          getUsersBusinessProfiles(result.users),
        ]);
        setUsersSubscription(subscriptionInfo);
        setUsersBusinessProfiles(businessProfiles);
      } else {
        setUsersSubscription(new Map());
        setUsersBusinessProfiles(new Map());
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, subscriptionFilter, hasBusinessProfileFilter, stateFilter, cityFilter, categoryFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getUserStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const plansData = await getPlans();
      setPlans(plansData);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const options = await getUserFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
    fetchPlans();
    fetchFilterOptions();
    getAllCategories().then(setAllCategories);
  }, [fetchStats, fetchPlans, fetchFilterOptions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, subscriptionFilter, hasBusinessProfileFilter, stateFilter, cityFilter, categoryFilter]);

  // Sync filter state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (subscriptionFilter !== "all") params.set("plan", subscriptionFilter);
    if (hasBusinessProfileFilter !== "all") params.set("bizProfile", hasBusinessProfileFilter);
    if (stateFilter) params.set("state", stateFilter);
    if (cityFilter) params.set("city", cityFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/users", { scroll: false });
  }, [search, roleFilter, subscriptionFilter, hasBusinessProfileFilter, stateFilter, cityFilter, categoryFilter, page, router]);

  // Clear filters helper
  const clearAllFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setSubscriptionFilter("all");
    setHasBusinessProfileFilter("all");
    setStateFilter("");
    setCityFilter("");
    setSelectedLocation(null);
    setCategoryFilter("");
    setPage(1);
  };

  // Handle location change from LocationPicker
  const handleLocationChange = (location: PlaceValue | null) => {
    setSelectedLocation(location);
    if (location?.state) {
      // Use state abbreviation directly for search (e.g., "CA" instead of "California")
      // because the database stores abbreviations in locationAddress
      setStateFilter(location.state);
      setCityFilter(location.city || "");
    } else {
      setStateFilter("");
      setCityFilter("");
    }
  };

  const hasActiveFilters = search || roleFilter !== "all" || subscriptionFilter !== "all" || 
    hasBusinessProfileFilter !== "all" || stateFilter || cityFilter || categoryFilter;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleAdmin = async (user: Profile) => {
    const newRole: UserRole = user.role === "admin" ? "user" : "admin";
    setActionLoading(user.$id);
    try {
      await updateUserRole(user.$id, newRole);
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    const userToDelete = deleteDialog.user;
    if (!userToDelete) return;
    setActionLoading(userToDelete.$id);
    setDeleteDialog({ open: false, user: null });
    try {
      await deleteUserProfile(userToDelete.$id);
      await fetchUsers();
      await fetchStats();
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="User Management"
        description="Manage all registered users and admin privileges"
        icon={Users}
        children={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchUsers();
              fetchStats();
            }}
            className="w-fit"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admins
            </CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalAdmins}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last 7 Days
            </CardTitle>
            <Link2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.recentUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </label>
              <form onSubmit={handleSearch}>
                <Input
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-input/50 border-border/50"
                />
              </form>
            </div>

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between bg-input/50 border-border/50"
                  >
                    {roleFilter === "all" ? "All Roles" : roleFilter === "admin" ? "Admin" : "User"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[200px] bg-card border-border/50">
                  <DropdownMenuItem onClick={() => setRoleFilter("all")} className="cursor-pointer">
                    {roleFilter === "all" && <Check className="h-4 w-4 mr-2" />}
                    <span className={roleFilter !== "all" ? "ml-6" : ""}>All Roles</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("admin")} className="cursor-pointer">
                    {roleFilter === "admin" && <Check className="h-4 w-4 mr-2" />}
                    <span className={roleFilter !== "admin" ? "ml-6" : ""}>Admin</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("user")} className="cursor-pointer">
                    {roleFilter === "user" && <Check className="h-4 w-4 mr-2" />}
                    <span className={roleFilter !== "user" ? "ml-6" : ""}>User</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Subscription Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Subscription
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between bg-input/50 border-border/50"
                  >
                    {subscriptionFilter === "all" 
                      ? "All Plans" 
                      : subscriptionFilter === "none" 
                        ? "No Subscription" 
                        : plans.find(p => p.id === subscriptionFilter)?.name || "Unknown"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[200px] bg-card border-border/50">
                  <DropdownMenuItem onClick={() => setSubscriptionFilter("all")} className="cursor-pointer">
                    {subscriptionFilter === "all" && <Check className="h-4 w-4 mr-2" />}
                    <span className={subscriptionFilter !== "all" ? "ml-6" : ""}>All Plans</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSubscriptionFilter("none")} className="cursor-pointer">
                    {subscriptionFilter === "none" && <Check className="h-4 w-4 mr-2" />}
                    <span className={subscriptionFilter !== "none" ? "ml-6" : ""}>No Subscription</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {plans.map((plan) => (
                    <DropdownMenuItem 
                      key={plan.id} 
                      onClick={() => setSubscriptionFilter(plan.id)} 
                      className="cursor-pointer"
                    >
                      {subscriptionFilter === plan.id && <Check className="h-4 w-4 mr-2" />}
                      <span className={subscriptionFilter !== plan.id ? "ml-6" : ""}>{plan.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Has Business Profile */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Business Profile
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between bg-input/50 border-border/50"
                  >
                    {hasBusinessProfileFilter === "all" 
                      ? "All" 
                      : hasBusinessProfileFilter === "yes" 
                        ? "Has Profile" 
                        : "No Profile"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[200px] bg-card border-border/50">
                  <DropdownMenuItem onClick={() => setHasBusinessProfileFilter("all")} className="cursor-pointer">
                    {hasBusinessProfileFilter === "all" && <Check className="h-4 w-4 mr-2" />}
                    <span className={hasBusinessProfileFilter !== "all" ? "ml-6" : ""}>All</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHasBusinessProfileFilter("yes")} className="cursor-pointer">
                    {hasBusinessProfileFilter === "yes" && <Check className="h-4 w-4 mr-2" />}
                    <span className={hasBusinessProfileFilter !== "yes" ? "ml-6" : ""}>Has Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHasBusinessProfileFilter("no")} className="cursor-pointer">
                    {hasBusinessProfileFilter === "no" && <Check className="h-4 w-4 mr-2" />}
                    <span className={hasBusinessProfileFilter !== "no" ? "ml-6" : ""}>No Profile</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Location Filter */}
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <LocationPicker
                value={selectedLocation}
                onChange={handleLocationChange}
                placeholder="Search city or address..."
                countryRestriction="us"
                showCurrentLocation={false}
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Category
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between bg-input/50 border-border/50"
                  >
                    {categoryFilter ? getCategoryLabel(allCategories, categoryFilter) : "All Categories"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full min-w-[200px] bg-card border-border/50 max-h-[300px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => setCategoryFilter("")} className="cursor-pointer">
                    {!categoryFilter && <Check className="h-4 w-4 mr-2" />}
                    <span className={categoryFilter ? "ml-6" : ""}>All Categories</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {filterOptions.categories.map((cat) => (
                    <DropdownMenuItem 
                      key={cat} 
                      onClick={() => setCategoryFilter(cat)} 
                      className="cursor-pointer"
                    >
                      {categoryFilter === cat && <Check className="h-4 w-4 mr-2" />}
                      <span className={categoryFilter !== cat ? "ml-6" : ""}>{getCategoryLabel(allCategories, cat)}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Clear Filters Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">&nbsp;</label>
              <Button 
                variant="outline" 
                className="w-full bg-input/50 border-border/50"
                onClick={clearAllFilters}
                disabled={!hasActiveFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Active filters display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/50">
              <span className="text-sm text-muted-foreground">Active Filters:</span>
              {search && (
                <FilterBadge onRemove={() => setSearch("")}>
                  Search: {search}
                </FilterBadge>
              )}
              {roleFilter !== "all" && (
                <FilterBadge onRemove={() => setRoleFilter("all")}>
                  Role: {roleFilter === "admin" ? "Admin" : "User"}
                </FilterBadge>
              )}
              {subscriptionFilter !== "all" && (
                <FilterBadge onRemove={() => setSubscriptionFilter("all")}>
                  Plan: {subscriptionFilter === "none" ? "None" : plans.find(p => p.id === subscriptionFilter)?.name}
                </FilterBadge>
              )}
              {hasBusinessProfileFilter !== "all" && (
                <FilterBadge onRemove={() => setHasBusinessProfileFilter("all")}>
                  Profile: {hasBusinessProfileFilter === "yes" ? "Has" : "No"}
                </FilterBadge>
              )}
              {stateFilter && (
                <FilterBadge onRemove={() => { setStateFilter(""); setCityFilter(""); setSelectedLocation(null); }}>
                  State: {stateFilter}
                </FilterBadge>
              )}
              {cityFilter && (
                <FilterBadge onRemove={() => { setCityFilter(""); }}>
                  City: {cityFilter}
                </FilterBadge>
              )}
              {categoryFilter && (
                <FilterBadge onRemove={() => setCategoryFilter("")}>
                  Category: {getCategoryLabel(allCategories, categoryFilter)}
                </FilterBadge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
          <Table className="min-w-[1600px]">
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">User</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground">Subscription</TableHead>
                <TableHead className="text-muted-foreground">Biz ID</TableHead>
                <TableHead className="text-muted-foreground">Owner Name</TableHead>
                <TableHead className="text-muted-foreground">Owner Email</TableHead>
                <TableHead className="text-muted-foreground">State</TableHead>
                <TableHead className="text-muted-foreground">City</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                <TableHead className="text-muted-foreground">Subcategory</TableHead>
                <TableHead className="text-muted-foreground">Joined</TableHead>
                <TableHead className="text-muted-foreground w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton rows
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={13} className="h-48">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-12 w-12 mb-4 opacity-50" />
                      <p>No users found</p>
                      {(roleFilter !== "all" || subscriptionFilter !== "all") && (
                        <p className="text-sm mt-2">Try adjusting your filters</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // User rows
                users.map((user) => (
                  <TableRow
                    key={user.$id}
                    className="border-border/30 hover:bg-secondary/30 cursor-pointer"
                    onClick={() => router.push(`/users/${user.$id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(user.firstName, user.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {user.userId?.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border/50 text-muted-foreground">
                          User
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <SubscriptionCell subscriptionInfo={usersSubscription.get(user.userId)} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {usersBusinessProfiles.get(user.userId)?.odooId?.slice(0, 8) || "-"}
                      {usersBusinessProfiles.get(user.userId)?.odooId && "..."}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {usersBusinessProfiles.get(user.userId)?.ownerName || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {usersBusinessProfiles.get(user.userId)?.ownerEmail || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {usersBusinessProfiles.get(user.userId)?.state || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {usersBusinessProfiles.get(user.userId)?.city || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {usersBusinessProfiles.get(user.userId)?.category || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {usersBusinessProfiles.get(user.userId)?.subcategory || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.$createdAt).toLocaleDateString("en-US")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-secondary"
                            disabled={actionLoading === user.$id}
                          >
                            {actionLoading === user.$id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border/50">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-border/50" />
                          <DropdownMenuItem
                            onClick={() => router.push(`/users/${user.$id}`)}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleAdmin(user)}
                            className="cursor-pointer"
                          >
                            {user.role === "admin" ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Make Admin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/50" />
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog({ open: true, user })}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                {total} users total, page {page} of {totalPages}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => { if (!open) setDeleteDialog({ open: false, user: null }); }}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.user?.firstName} {deleteDialog.user?.lastName}</strong>?
              <br />
              This will delete the user&apos;s profile data and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary/50 border-border/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
    </div>
  );
}

interface SubscriptionCellProps {
  subscriptionInfo: UserSubscriptionInfo | undefined;
}

function SubscriptionCell({ subscriptionInfo }: SubscriptionCellProps) {
  if (!subscriptionInfo || !subscriptionInfo.hasSubscription) {
    return <span className="text-muted-foreground text-sm">No Subscription</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{subscriptionInfo.planName || "Unknown"}</span>
      {subscriptionInfo.isExpired ? (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
          Expired
        </Badge>
      ) : (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
          Active
        </Badge>
      )}
    </div>
  );
}
