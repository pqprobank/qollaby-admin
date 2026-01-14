"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getUsers,
  getUserStats,
  updateUserRole,
  deleteUserProfile,
  getPlans,
  getUsersSubscriptionInfo,
  UserListResult,
  Plan,
} from "@/lib/user-actions";
import { Profile, UserRole, UserSubscriptionInfo } from "@/types/profile.types";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Shield,
  UserPlus,
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
} from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalAdmins: 0, recentUsers: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usersSubscription, setUsersSubscription] = useState<Map<string, UserSubscriptionInfo>>(new Map());
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
      });
      setUsers(result.users);
      setTotalPages(result.totalPages);
      setTotal(result.total);

      // Fetch subscription info for all users
      if (result.users.length > 0) {
        const userIds = result.users.map((u) => u.userId);
        const subscriptionInfo = await getUsersSubscriptionInfo(userIds);
        setUsersSubscription(subscriptionInfo);
      } else {
        setUsersSubscription(new Map());
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, subscriptionFilter]);

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
    fetchPlans();
  }, [fetchStats, fetchPlans]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, subscriptionFilter]);

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
    if (!deleteDialog.user) return;
    setActionLoading(deleteDialog.user.$id);
    try {
      await deleteUserProfile(deleteDialog.user.$id);
      setDeleteDialog({ open: false, user: null });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage all registered users and admin privileges</p>
        </div>
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
      </div>

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
            <UserPlus className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.recentUsers}</div>
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
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-input/50 border-border/50"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">User</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 -ml-3 hover:bg-secondary/50">
                        Role
                        <ChevronDown className="ml-1 h-3 w-3" />
                        {roleFilter !== "all" && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                            {roleFilter === "admin" ? "Admin" : "User"}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card border-border/50">
                      <DropdownMenuItem
                        onClick={() => setRoleFilter("all")}
                        className="cursor-pointer"
                      >
                        {roleFilter === "all" && <Check className="h-4 w-4 mr-2" />}
                        <span className={roleFilter !== "all" ? "ml-6" : ""}>All</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setRoleFilter("admin")}
                        className="cursor-pointer"
                      >
                        {roleFilter === "admin" && <Check className="h-4 w-4 mr-2" />}
                        <span className={roleFilter !== "admin" ? "ml-6" : ""}>Admin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setRoleFilter("user")}
                        className="cursor-pointer"
                      >
                        {roleFilter === "user" && <Check className="h-4 w-4 mr-2" />}
                        <span className={roleFilter !== "user" ? "ml-6" : ""}>User</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="text-muted-foreground">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 -ml-3 hover:bg-secondary/50">
                        Subscription
                        <ChevronDown className="ml-1 h-3 w-3" />
                        {subscriptionFilter !== "all" && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                            {subscriptionFilter === "none"
                              ? "None"
                              : plans.find((p) => p.id === subscriptionFilter)?.name || "..."}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card border-border/50">
                      <DropdownMenuItem
                        onClick={() => setSubscriptionFilter("all")}
                        className="cursor-pointer"
                      >
                        {subscriptionFilter === "all" && <Check className="h-4 w-4 mr-2" />}
                        <span className={subscriptionFilter !== "all" ? "ml-6" : ""}>All</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSubscriptionFilter("none")}
                        className="cursor-pointer"
                      >
                        {subscriptionFilter === "none" && <Check className="h-4 w-4 mr-2" />}
                        <span className={subscriptionFilter !== "none" ? "ml-6" : ""}>No Subscription</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
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
                </TableHead>
                <TableHead className="text-muted-foreground">Business Profile</TableHead>
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
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={7} className="h-48">
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
                    <TableCell>
                      {user.hasBusinessProfile ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <Check className="h-3 w-3 mr-1" />
                          Created
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not Created</span>
                      )}
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
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: null })}>
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
