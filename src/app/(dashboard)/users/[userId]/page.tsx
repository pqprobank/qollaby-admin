"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUserById, updateUserRole, deleteUserProfile, getUserSubscriptionInfo, getUserContentStats, getUserBusinessProfile, ParsedBusinessProfile } from "@/lib/user-actions";
import { Profile, UserRole, UserSubscriptionInfo, UserContentStats } from "@/types/profile.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
  Mail,
  Phone,
  Calendar,
  Hash,
  Briefcase,
  Loader2,
  AlertTriangle,
  CreditCard,
  FileText,
  Megaphone,
  MapPin,
  Tag,
  Building2,
} from "lucide-react";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Profile | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);
  const [contentStats, setContentStats] = useState<UserContentStats | null>(null);
  const [businessProfile, setBusinessProfile] = useState<ParsedBusinessProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await getUserById(userId);
      setUser(userData);
      
      // Fetch subscription info, content stats, and business profile in parallel
      if (userData) {
        const [subInfo, stats, bizProfile] = await Promise.all([
          getUserSubscriptionInfo(userData.userId),
          getUserContentStats(userData.userId),
          userData.hasBusinessProfile ? getUserBusinessProfile(userData.userId, userData) : Promise.resolve(null),
        ]);
        setSubscriptionInfo(subInfo);
        setContentStats(stats);
        setBusinessProfile(bizProfile);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  const handleToggleAdmin = async () => {
    if (!user) return;
    const newRole: UserRole = user.role === "admin" ? "user" : "admin";
    setActionLoading(true);
    try {
      await updateUserRole(user.$id, newRole);
      await fetchUser();
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await deleteUserProfile(user.$id);
      router.push("/users");
    } catch (error) {
      console.error("Failed to delete user:", error);
      setActionLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6 flex flex-col items-center">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-6 w-32 mt-4" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-6">Could not find the user information</p>
        <Button onClick={() => router.push("/users")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/users")}
            className="bg-secondary/50 border-border/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Details</h1>
            <p className="text-muted-foreground">View and manage user information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleToggleAdmin}
            disabled={actionLoading}
            className="bg-secondary/50 border-border/50"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : user.role === "admin" ? (
              <ShieldOff className="h-4 w-4 mr-2" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            {user.role === "admin" ? "Remove Admin" : "Make Admin"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteDialog(true)}
            className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile card */}
        <div className="md:col-span-1">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold mt-4">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <div className="mt-4">
                {user.role === "admin" ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border/50 text-muted-foreground">
                    <User className="h-3 w-3 mr-1" />
                    User {!user.role && <span className="text-xs opacity-50">(default)</span>}
                  </Badge>
                )}
              </div>
              {user.hasBusinessProfile && (
                <Badge className="mt-2 bg-accent/10 text-accent border-accent/20">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Business Account
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="md:col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="bg-secondary/50 border border-border/50 mb-4">
              <TabsTrigger value="info">Basic Info</TabsTrigger>
              {user.hasBusinessProfile && (
                <TabsTrigger value="business">Business Profile</TabsTrigger>
              )}
              <TabsTrigger value="meta">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow
                    icon={User}
                    label="Name"
                    value={`${user.firstName} ${user.lastName}`}
                  />
                  <InfoRow icon={Mail} label="Email" value={user.email} />
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={user.phoneNumber || "Not set"}
                    muted={!user.phoneNumber}
                  />
                  <InfoRow
                    icon={Shield}
                    label="Role"
                    value={user.role === "admin" ? "Admin" : user.role ? "User" : "User (default)"}
                    highlight={user.role === "admin"}
                  />
                  <InfoRow
                    icon={Briefcase}
                    label="Business Profile"
                    value={user.hasBusinessProfile ? "Created" : "Not created"}
                    muted={!user.hasBusinessProfile}
                  />
                  {/* Subscription Info */}
                  <SubscriptionRow subscriptionInfo={subscriptionInfo} />
                  {/* Content Stats */}
                  <InfoRow
                    icon={FileText}
                    label="Posts"
                    value={contentStats?.postCount?.toString() || "0"}
                  />
                  <InfoRow
                    icon={Megaphone}
                    label="Ads"
                    value={contentStats?.adCount?.toString() || "0"}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Profile Tab */}
            {user.hasBusinessProfile && (
              <TabsContent value="business">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-accent" />
                      Business Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {businessProfile ? (
                      <>
                        <InfoRow
                          icon={Hash}
                          label="ID"
                          value={businessProfile.userId}
                          mono
                        />
                        <InfoRow
                          icon={User}
                          label="Owner Name"
                          value={businessProfile.ownerName}
                        />
                        <InfoRow
                          icon={Mail}
                          label="Owner Email"
                          value={businessProfile.ownerEmail}
                        />
                        <InfoRow
                          icon={MapPin}
                          label="State"
                          value={businessProfile.state}
                        />
                        <InfoRow
                          icon={MapPin}
                          label="City"
                          value={businessProfile.city}
                        />
                        <InfoRow
                          icon={Tag}
                          label="Category"
                          value={businessProfile.category}
                        />
                        <InfoRow
                          icon={Tag}
                          label="Subcategory"
                          value={businessProfile.subcategory}
                        />
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Loading business profile...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="meta">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow
                    icon={Hash}
                    label="Profile ID"
                    value={user.$id}
                    mono
                  />
                  <InfoRow
                    icon={Hash}
                    label="User ID"
                    value={user.userId}
                    mono
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Created At"
                    value={new Date(user.$createdAt).toLocaleString("en-US")}
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Updated At"
                    value={new Date(user.$updatedAt).toLocaleString("en-US")}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{user.firstName} {user.lastName}</strong>?
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

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
  highlight?: boolean;
}

function InfoRow({ icon: Icon, label, value, mono, muted, highlight }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span
        className={`
          ${mono ? "font-mono text-sm" : ""}
          ${muted ? "text-muted-foreground" : ""}
          ${highlight ? "text-destructive font-medium" : ""}
        `}
      >
        {value}
      </span>
    </div>
  );
}

interface SubscriptionRowProps {
  subscriptionInfo: UserSubscriptionInfo | null;
}

function SubscriptionRow({ subscriptionInfo }: SubscriptionRowProps) {
  if (!subscriptionInfo) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
        <div className="flex items-center gap-3 text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span>Subscription</span>
        </div>
        <Skeleton className="h-5 w-32" />
      </div>
    );
  }

  if (!subscriptionInfo.hasSubscription) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
        <div className="flex items-center gap-3 text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span>Subscription</span>
        </div>
        <span className="text-muted-foreground">No Subscription</span>
      </div>
    );
  }

  const formatExpiresAt = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-3 text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        <span>Subscription</span>
      </div>
      <div className="flex items-center gap-3">
        {/* Plan Name */}
        <span className="font-medium">{subscriptionInfo.planName || "Unknown Plan"}</span>
        {/* Expires At */}
        {subscriptionInfo.expiresAt && (
          <span className={subscriptionInfo.isExpired ? "text-destructive" : "text-muted-foreground"}>
            {subscriptionInfo.isExpired ? "Expired: " : "Expires: "}
            {formatExpiresAt(subscriptionInfo.expiresAt)}
          </span>
        )}
        {/* Status Badge */}
        {subscriptionInfo.isExpired ? (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            Expired
          </Badge>
        ) : (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}
