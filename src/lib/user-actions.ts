import { Profile, UserContentStats, UserRole, UserSubscriptionInfo } from "@/types/profile.types";
import { Collections, databases, Query } from "./appwrite";

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | "all";
  planId?: string | "all" | "none"; // "none" = no subscription
}

export interface UserListResult {
  users: Profile[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Get paginated list of users with optional search, role, and subscription filter
 */
export async function getUsers(params: UserListParams = {}): Promise<UserListResult> {
  const { page = 1, limit = 10, search, role = "all", planId = "all" } = params;
  const offset = (page - 1) * limit;

  try {
    // If filtering by subscription, we need to get user IDs first
    let subscriptionUserIds: string[] | null = null;
    let noSubscriptionUserIds: string[] | null = null;

    if (planId !== "all") {
      if (planId === "none") {
        // Get all users with subscriptions
        const allSubsRes = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          Collections.SUBSCRIPTIONS,
          [Query.limit(1000)]
        );
        const usersWithSubs = new Set(allSubsRes.documents.map((d) => d.userId as string));
        
        // Get all users to find ones without subscriptions
        const allUsersRes = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          Collections.PROFILE,
          [Query.limit(1000)]
        );
        noSubscriptionUserIds = allUsersRes.documents
          .filter((u) => !usersWithSubs.has(u.userId as string))
          .map((u) => u.userId as string);
      } else {
        // Get users with specific plan subscription
        const subsRes = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          Collections.SUBSCRIPTIONS,
          [Query.equal("planId", planId), Query.limit(1000)]
        );
        subscriptionUserIds = [...new Set(subsRes.documents.map((d) => d.userId as string))];
      }
    }

    const queries: string[] = [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    const countQueries: string[] = [];

    // Add role filter
    if (role !== "all") {
      queries.push(Query.equal("role", role));
      countQueries.push(Query.equal("role", role));
    }

    // Add search filter (search by name or email)
    if (search && search.trim()) {
      queries.push(Query.contains("firstName", search.trim()));
      countQueries.push(Query.contains("firstName", search.trim()));
    }

    // Add subscription filter
    if (subscriptionUserIds !== null) {
      if (subscriptionUserIds.length === 0) {
        // No users match this subscription filter
        return { users: [], total: 0, page, totalPages: 0 };
      }
      queries.push(Query.equal("userId", subscriptionUserIds));
      countQueries.push(Query.equal("userId", subscriptionUserIds));
    }

    if (noSubscriptionUserIds !== null) {
      if (noSubscriptionUserIds.length === 0) {
        // All users have subscriptions
        return { users: [], total: 0, page, totalPages: 0 };
      }
      queries.push(Query.equal("userId", noSubscriptionUserIds));
      countQueries.push(Query.equal("userId", noSubscriptionUserIds));
    }

    const [usersRes, totalRes] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.PROFILE,
        queries
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.PROFILE,
        countQueries.length > 0 ? countQueries : [Query.limit(1)]
      ),
    ]);

    return {
      users: usersRes.documents as unknown as Profile[],
      total: totalRes.total,
      page,
      totalPages: Math.ceil(totalRes.total / limit),
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * Get single user by profile document ID
 */
export async function getUserById(profileId: string): Promise<Profile | null> {
  try {
    const doc = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      profileId
    );
    return doc as unknown as Profile;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Get user by userId field
 */
export async function getUserByUserId(userId: string): Promise<Profile | null> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      [Query.equal("userId", userId), Query.limit(1)]
    );
    return (res.documents[0] as unknown as Profile) || null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Business Profile type
 */
export interface BusinessProfile {
  $id: string;
  userId: string;
  businessName?: string;
  locationAddress?: string;
  category?: string;
  subCategory?: string;
  $createdAt: string;
  $updatedAt: string;
}

/**
 * Parsed Business Profile for display
 */
export interface ParsedBusinessProfile {
  userId: string;
  ownerName: string;
  ownerEmail: string;
  state: string;
  city: string;
  category: string;
  subcategory: string;
}

/**
 * Parse location address to extract city and state
 * Format: "Testarossa Winery, College Avenue, Los Gatos, CA, USA"
 */
function parseLocationAddress(locationAddress: string | undefined): { city: string; state: string } {
  if (!locationAddress) {
    return { city: "N/A", state: "N/A" };
  }

  const parts = locationAddress.split(",").map((p) => p.trim());
  
  // Typical format: "Business, Street, City, State, Country"
  // We want the second-to-last (State) and third-to-last (City)
  if (parts.length >= 3) {
    // State is usually the second to last part (e.g., "CA")
    const state = parts[parts.length - 2] || "N/A";
    // City is usually the third to last part (e.g., "Los Gatos")
    const city = parts[parts.length - 3] || "N/A";
    return { city, state };
  } else if (parts.length === 2) {
    return { city: parts[0], state: parts[1] };
  } else {
    return { city: locationAddress, state: "N/A" };
  }
}

/**
 * Get user's business profile
 */
export async function getUserBusinessProfile(
  userId: string,
  userProfile: Profile
): Promise<ParsedBusinessProfile | null> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.BUSINESS_PROFILE,
      [Query.equal("userId", userId), Query.limit(1)]
    );

    if (res.documents.length === 0) {
      return null;
    }

    const businessProfile = res.documents[0] as unknown as BusinessProfile;
    const { city, state } = parseLocationAddress(businessProfile.locationAddress);

    return {
      userId: businessProfile.userId,
      ownerName: `${userProfile.firstName} ${userProfile.lastName}`.trim() || "N/A",
      ownerEmail: userProfile.email || "N/A",
      state,
      city,
      category: businessProfile.category || "N/A",
      subcategory: businessProfile.subCategory || "N/A",
    };
  } catch (error) {
    console.error("Error fetching business profile:", error);
    return null;
  }
}

/**
 * Update user role (set/remove admin)
 */
export async function updateUserRole(profileId: string, role: UserRole): Promise<Profile> {
  try {
    const doc = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      profileId,
      { role }
    );
    return doc as unknown as Profile;
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}

/**
 * Delete user profile
 * Note: This only deletes the profile document, not the Appwrite Auth user
 * Full user deletion requires Appwrite server-side SDK with admin privileges
 */
export async function deleteUserProfile(profileId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      profileId
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<{
  totalUsers: number;
  totalAdmins: number;
  recentUsers: number;
}> {
  try {
    // Get date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalRes, adminRes, recentRes] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.PROFILE,
        [Query.limit(1)]
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.PROFILE,
        [Query.equal("role", "admin"), Query.limit(1)]
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.PROFILE,
        [Query.greaterThan("$createdAt", sevenDaysAgo.toISOString()), Query.limit(1)]
      ),
    ]);

    return {
      totalUsers: totalRes.total,
      totalAdmins: adminRes.total,
      recentUsers: recentRes.total,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return { totalUsers: 0, totalAdmins: 0, recentUsers: 0 };
  }
}

/**
 * Get user subscription info (plan name, expiry date, expired status)
 */
export async function getUserSubscriptionInfo(userId: string): Promise<UserSubscriptionInfo> {
  try {
    // Get user's latest subscription
    const subscriptionRes = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SUBSCRIPTIONS,
      [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ]
    );

    if (subscriptionRes.documents.length === 0) {
      return {
        hasSubscription: false,
        planName: null,
        expiresAt: null,
        isExpired: false,
      };
    }

    const subscription = subscriptionRes.documents[0];
    const expiresAt = subscription.currentPeriodEnd as string | null;
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

    // Get plan name
    let planName: string | null = null;
    if (subscription.planId) {
      try {
        const planDoc = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          Collections.PLANS,
          subscription.planId as string
        );
        planName = (planDoc.name as string) || null;
      } catch {
        // Plan not found, keep planName as null
      }
    }

    return {
      hasSubscription: true,
      planName,
      expiresAt,
      isExpired,
    };
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return {
      hasSubscription: false,
      planName: null,
      expiresAt: null,
      isExpired: false,
    };
  }
}

/**
 * Get user content stats (post count and ad count)
 */
export async function getUserContentStats(userId: string): Promise<UserContentStats> {
  try {
    const [postsRes, adsRes] = await Promise.all([
      // Get post count (type = "post")
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.POSTS,
        [
          Query.equal("userId", userId),
          Query.equal("type", "post"),
          Query.limit(1),
        ]
      ),
      // Get ad count
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.SPONSOR_ADS,
        [
          Query.equal("userId", userId),
          Query.limit(1),
        ]
      ),
    ]);

    return {
      postCount: postsRes.total,
      adCount: adsRes.total,
    };
  } catch (error) {
    console.error("Error fetching user content stats:", error);
    return {
      postCount: 0,
      adCount: 0,
    };
  }
}

/**
 * Plan type for dropdown filter
 */
export interface Plan {
  id: string;
  name: string;
}

/**
 * Get all subscription plans (for dropdown filter)
 */
export async function getPlans(): Promise<Plan[]> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PLANS,
      [Query.orderAsc("name"), Query.limit(100)]
    );
    return res.documents.map((doc) => ({
      id: doc.$id,
      name: (doc.name as string) || "Unknown Plan",
    }));
  } catch (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
}

/**
 * Batch get subscription info for multiple users
 */
export async function getUsersSubscriptionInfo(
  userIds: string[]
): Promise<Map<string, UserSubscriptionInfo>> {
  const result = new Map<string, UserSubscriptionInfo>();

  if (userIds.length === 0) return result;

  try {
    // Get all subscriptions for these users
    const subscriptionsRes = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SUBSCRIPTIONS,
      [
        Query.equal("userId", userIds),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]
    );

    // Get unique plan IDs
    const planIds = [
      ...new Set(
        subscriptionsRes.documents
          .map((doc) => doc.planId as string)
          .filter(Boolean)
      ),
    ];

    // Fetch all plans at once
    const plansMap = new Map<string, string>();
    if (planIds.length > 0) {
      const plansRes = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.PLANS,
        [Query.equal("$id", planIds), Query.limit(100)]
      );
      plansRes.documents.forEach((doc) => {
        plansMap.set(doc.$id, (doc.name as string) || "Unknown Plan");
      });
    }

    // Group subscriptions by userId (take the latest one)
    const userSubscriptions = new Map<string, typeof subscriptionsRes.documents[0]>();
    subscriptionsRes.documents.forEach((sub) => {
      const uid = sub.userId as string;
      if (!userSubscriptions.has(uid)) {
        userSubscriptions.set(uid, sub);
      }
    });

    // Build result
    userIds.forEach((userId) => {
      const sub = userSubscriptions.get(userId);
      if (!sub) {
        result.set(userId, {
          hasSubscription: false,
          planName: null,
          expiresAt: null,
          isExpired: false,
        });
      } else {
        const expiresAt = sub.currentPeriodEnd as string | null;
        const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
        const planName = sub.planId ? plansMap.get(sub.planId as string) || null : null;
        result.set(userId, {
          hasSubscription: true,
          planName,
          expiresAt,
          isExpired,
        });
      }
    });

    return result;
  } catch (error) {
    console.error("Error fetching users subscription info:", error);
    // Return empty info for all users
    userIds.forEach((userId) => {
      result.set(userId, {
        hasSubscription: false,
        planName: null,
        expiresAt: null,
        isExpired: false,
      });
    });
    return result;
  }
}

/**
 * Post type for listing (matching actual database schema)
 */
export interface Post {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  type: string;
  title: string;
  smallDescription: string;
  description: string;
  media: string[];
  category: string;
  subCategory: string;
  // Location info - stored as [longitude, latitude] array
  location?: [number, number] | null;
  locationAddress?: string;
  locationPlaceId?: string;
  // User's actual location when posting - stored as [longitude, latitude] array
  userLocation?: [number, number] | null;
  userLocationAddress?: string;
  // Event date (optional)
  eventDate?: string | null;
  // Blacklist status (admin moderation)
  isBlacklisted?: boolean;
}

// Report interface
export interface Report {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  postId: string;
  reporterId: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
}

// Appeal interface for blacklisted posts
export interface Appeal {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  postId: string;
  userId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

export interface PostListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: "all" | "post" | "event";
}

export interface PostListResult {
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Get paginated list of posts
 */
export async function getPosts(params: PostListParams = {}): Promise<PostListResult> {
  const { page = 1, limit = 20, search, type = "all" } = params;
  const offset = (page - 1) * limit;

  try {
    const queries: string[] = [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    // Count query (same filters but without pagination)
    const countQueries: string[] = [Query.limit(1)];

    // Filter by type (post, event, or all)
    if (type === "post") {
      queries.push(Query.equal("type", "post"));
      countQueries.push(Query.equal("type", "post"));
    } else if (type === "event") {
      queries.push(Query.equal("type", "event"));
      countQueries.push(Query.equal("type", "event"));
    } else {
      // "all" - include both post and event types
      queries.push(Query.contains("type", ["post", "event"]));
      countQueries.push(Query.contains("type", ["post", "event"]));
    }

    if (search && search.trim()) {
      queries.push(Query.contains("title", search.trim()));
      countQueries.push(Query.contains("title", search.trim()));
    }

    const [postsRes, totalRes] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.POSTS,
        queries
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.POSTS,
        countQueries
      ),
    ]);

    return {
      posts: postsRes.documents as unknown as Post[],
      total: totalRes.total,
      page,
      totalPages: Math.ceil(totalRes.total / limit),
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
}

/**
 * Get single post by ID
 */
export async function getPostById(postId: string): Promise<Post | null> {
  try {
    const doc = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.POSTS,
      postId
    );
    return doc as unknown as Post;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

/**
 * Get post statistics
 */
export async function getPostStats(): Promise<{
  totalPosts: number;
  recentPosts: number;
}> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalRes, recentRes] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.POSTS,
        [Query.contains("type", ["post", "event"]), Query.limit(1)]
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.POSTS,
        [
          Query.contains("type", ["post", "event"]),
          Query.greaterThan("$createdAt", sevenDaysAgo.toISOString()),
          Query.limit(1),
        ]
      ),
    ]);

    return {
      totalPosts: totalRes.total,
      recentPosts: recentRes.total,
    };
  } catch (error) {
    console.error("Error fetching post stats:", error);
    return { totalPosts: 0, recentPosts: 0 };
  }
}

/**
 * Get like count for a post
 */
export async function getPostLikeCount(postId: string): Promise<number> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.POST_LIKES,
      [Query.equal("postId", postId), Query.limit(1)]
    );
    return res.total;
  } catch (error) {
    console.error("Error fetching post like count:", error);
    return 0;
  }
}

/**
 * Get report count for a post
 */
export async function getPostReportCount(postId: string): Promise<number> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.REPORTS,
      [Query.equal("postId", postId), Query.limit(1)]
    );
    return res.total;
  } catch (error) {
    console.error("Error fetching post report count:", error);
    return 0;
  }
}

/**
 * Batch get like counts for multiple posts
 */
export async function getPostsLikeCounts(postIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (postIds.length === 0) return result;

  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.POST_LIKES,
      [Query.equal("postId", postIds), Query.limit(5000)]
    );

    // Count likes per post
    postIds.forEach((id) => result.set(id, 0));
    res.documents.forEach((doc) => {
      const postId = doc.postId as string;
      result.set(postId, (result.get(postId) || 0) + 1);
    });

    return result;
  } catch (error) {
    console.error("Error fetching posts like counts:", error);
    postIds.forEach((id) => result.set(id, 0));
    return result;
  }
}

/**
 * Batch get report counts for multiple posts
 */
export async function getPostsReportCounts(postIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (postIds.length === 0) return result;

  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.REPORTS,
      [Query.equal("postId", postIds), Query.limit(5000)]
    );

    // Count reports per post
    postIds.forEach((id) => result.set(id, 0));
    res.documents.forEach((doc) => {
      const postId = doc.postId as string;
      result.set(postId, (result.get(postId) || 0) + 1);
    });

    return result;
  } catch (error) {
    console.error("Error fetching posts report counts:", error);
    postIds.forEach((id) => result.set(id, 0));
    return result;
  }
}

/**
 * Get stamp count for a post
 */
export async function getPostStampCount(postId: string): Promise<number> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.POST_STAMPS,
      [Query.equal("postId", postId), Query.limit(1)]
    );
    return res.total;
  } catch (error) {
    console.error("Error fetching post stamp count:", error);
    return 0;
  }
}

/**
 * Batch get stamp counts for multiple posts
 */
export async function getPostsStampCounts(postIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (postIds.length === 0) return result;

  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.POST_STAMPS,
      [Query.equal("postId", postIds), Query.limit(5000)]
    );

    // Count stamps per post
    postIds.forEach((id) => result.set(id, 0));
    res.documents.forEach((doc) => {
      const postId = doc.postId as string;
      result.set(postId, (result.get(postId) || 0) + 1);
    });

    return result;
  } catch (error) {
    console.error("Error fetching posts stamp counts:", error);
    postIds.forEach((id) => result.set(id, 0));
    return result;
  }
}

// ==================== REPORT MANAGEMENT ====================

/**
 * Get all reports for a specific post
 */
export async function getPostReports(postId: string): Promise<Report[]> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.REPORTS,
      [Query.equal("postId", postId), Query.orderDesc("$createdAt"), Query.limit(100)]
    );
    return res.documents as unknown as Report[];
  } catch (error) {
    console.error("Error fetching post reports:", error);
    return [];
  }
}

/**
 * Get all reports (paginated)
 */
export interface ReportListParams {
  page?: number;
  limit?: number;
  status?: "all" | "pending" | "reviewed" | "dismissed";
}

export interface ReportListResult {
  reports: Report[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getReports(params: ReportListParams = {}): Promise<ReportListResult> {
  const { page = 1, limit = 20, status = "all" } = params;
  const offset = (page - 1) * limit;

  try {
    const queries: string[] = [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    const countQueries: string[] = [Query.limit(1)];

    if (status !== "all") {
      queries.push(Query.equal("status", status));
      countQueries.push(Query.equal("status", status));
    }

    const [reportsRes, totalRes] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.REPORTS,
        queries
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.REPORTS,
        countQueries
      ),
    ]);

    return {
      reports: reportsRes.documents as unknown as Report[],
      total: totalRes.total,
      page,
      totalPages: Math.ceil(totalRes.total / limit),
    };
  } catch (error) {
    console.error("Error fetching reports:", error);
    return { reports: [], total: 0, page: 1, totalPages: 0 };
  }
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: "pending" | "reviewed" | "dismissed"
): Promise<Report | null> {
  try {
    const doc = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.REPORTS,
      reportId,
      { status }
    );
    return doc as unknown as Report;
  } catch (error) {
    console.error("Error updating report status:", error);
    return null;
  }
}

// ==================== POST BLACKLIST MANAGEMENT ====================

/**
 * Blacklist a post (hide from public feed)
 */
export async function blacklistPost(postId: string): Promise<Post | null> {
  try {
    console.log(`[Blacklist] Blacklisting post: ${postId}`);
    
    const doc = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.POSTS,
      postId,
      { isBlacklisted: true }
    );
    
    console.log(`[Blacklist] Post blacklisted successfully`);
    
    return doc as unknown as Post;
  } catch (error) {
    console.error("[Blacklist] Error blacklisting post:", error);
    // If 'isBlacklisted' attribute doesn't exist, this error will occur
    // User needs to add 'isBlacklisted' (Boolean) attribute to Posts collection
    return null;
  }
}

/**
 * Remove post from blacklist
 */
export async function unblacklistPost(postId: string): Promise<Post | null> {
  try {
    console.log(`[Unblacklist] Unblacklisting post: ${postId}`);
    
    const doc = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.POSTS,
      postId,
      { isBlacklisted: false }
    );
    
    console.log(`[Unblacklist] Post unblacklisted successfully`);
    
    return doc as unknown as Post;
  } catch (error) {
    console.error("[Unblacklist] Error removing post from blacklist:", error);
    return null;
  }
}

/**
 * Get blacklisted posts count
 */
export async function getBlacklistedPostsCount(): Promise<number> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.POSTS,
      [Query.equal("isBlacklisted", true), Query.limit(1)]
    );
    return res.total;
  } catch (error) {
    console.error("Error fetching blacklisted posts count:", error);
    return 0;
  }
}

// ==================== APPEAL MANAGEMENT ====================

/**
 * Get all appeals (paginated)
 */
export interface AppealListParams {
  page?: number;
  limit?: number;
  status?: "all" | "pending" | "approved" | "rejected";
}

export interface AppealListResult {
  appeals: Appeal[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getAppeals(params: AppealListParams = {}): Promise<AppealListResult> {
  const { page = 1, limit = 20, status = "all" } = params;
  const offset = (page - 1) * limit;

  try {
    const queries: string[] = [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    const countQueries: string[] = [Query.limit(1)];

    if (status !== "all") {
      queries.push(Query.equal("status", status));
      countQueries.push(Query.equal("status", status));
    }

    const [appealsRes, totalRes] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.APPEALS,
        queries
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.APPEALS,
        countQueries
      ),
    ]);

    return {
      appeals: appealsRes.documents as unknown as Appeal[],
      total: totalRes.total,
      page,
      totalPages: Math.ceil(totalRes.total / limit),
    };
  } catch (error) {
    console.error("Error fetching appeals:", error);
    return { appeals: [], total: 0, page: 1, totalPages: 0 };
  }
}

/**
 * Get appeal by ID
 */
export async function getAppealById(appealId: string): Promise<Appeal | null> {
  try {
    const doc = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.APPEALS,
      appealId
    );
    return doc as unknown as Appeal;
  } catch (error) {
    console.error("Error fetching appeal:", error);
    return null;
  }
}

/**
 * Approve appeal (unblacklist post)
 */
export async function approveAppeal(appealId: string): Promise<boolean> {
  try {
    // Get the appeal to find the postId
    const appeal = await getAppealById(appealId);
    if (!appeal) return false;

    // Update appeal status
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.APPEALS,
      appealId,
      { status: "approved" }
    );

    // Unblacklist the post
    await unblacklistPost(appeal.postId);

    return true;
  } catch (error) {
    console.error("Error approving appeal:", error);
    return false;
  }
}

/**
 * Reject appeal
 */
export async function rejectAppeal(appealId: string): Promise<boolean> {
  try {
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.APPEALS,
      appealId,
      { status: "rejected" }
    );
    return true;
  } catch (error) {
    console.error("Error rejecting appeal:", error);
    return false;
  }
}

/**
 * Get pending appeals count
 */
export async function getPendingAppealsCount(): Promise<number> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.APPEALS,
      [Query.equal("status", "pending"), Query.limit(1)]
    );
    return res.total;
  } catch (error) {
    console.error("Error fetching pending appeals count:", error);
    return 0;
  }
}

/**
 * Get pending reports count
 */
export async function getPendingReportsCount(): Promise<number> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.REPORTS,
      [Query.equal("status", "pending"), Query.limit(1)]
    );
    return res.total;
  } catch (error) {
    console.error("Error fetching pending reports count:", error);
    return 0;
  }
}

// ==================== SPONSOR ADS MANAGEMENT ====================

export type SponsorAdStatus = "active" | "pending" | "expired" | "rejected";

export interface SponsorAd {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  userId: string;
  title: string;
  description?: string;
  media: string[];
  image?: string; // Legacy field
  state: string;
  city: string;
  category: string;
  subcategory?: string;
  status: SponsorAdStatus;
  views: number;
  clicks: number;
  expiresAt: string;
  // Blacklist status (admin moderation)
  isBlacklisted?: boolean;
  slot?: number;
}

export interface SponsorAdListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "all" | SponsorAdStatus;
}

export interface SponsorAdListResult {
  ads: SponsorAd[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Get paginated list of sponsor ads
 */
export async function getSponsorAds(params: SponsorAdListParams = {}): Promise<SponsorAdListResult> {
  const { page = 1, limit = 20, search, status = "all" } = params;
  const offset = (page - 1) * limit;

  try {
    const queries: string[] = [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    const countQueries: string[] = [Query.limit(1)];

    if (status !== "all") {
      queries.push(Query.equal("status", status));
      countQueries.push(Query.equal("status", status));
    }

    if (search && search.trim()) {
      queries.push(Query.contains("title", search.trim()));
      countQueries.push(Query.contains("title", search.trim()));
    }

    const [adsRes, totalRes] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.SPONSOR_ADS,
        queries
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.SPONSOR_ADS,
        countQueries
      ),
    ]);

    return {
      ads: adsRes.documents as unknown as SponsorAd[],
      total: totalRes.total,
      page,
      totalPages: Math.ceil(totalRes.total / limit),
    };
  } catch (error) {
    console.error("Error fetching sponsor ads:", error);
    return { ads: [], total: 0, page: 1, totalPages: 0 };
  }
}

/**
 * Get sponsor ad by ID
 */
export async function getSponsorAdById(adId: string): Promise<SponsorAd | null> {
  try {
    const doc = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SPONSOR_ADS,
      adId
    );
    return doc as unknown as SponsorAd;
  } catch (error) {
    console.error("Error fetching sponsor ad:", error);
    return null;
  }
}

/**
 * Get sponsor ads stats
 */
export async function getSponsorAdStats(): Promise<{
  totalAds: number;
  activeAds: number;
  pendingAds: number;
}> {
  try {
    const [totalRes, activeRes, pendingRes] = await Promise.all([
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.SPONSOR_ADS,
        [Query.limit(1)]
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.SPONSOR_ADS,
        [Query.equal("status", "active"), Query.limit(1)]
      ),
      databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.SPONSOR_ADS,
        [Query.equal("status", "pending"), Query.limit(1)]
      ),
    ]);

    return {
      totalAds: totalRes.total,
      activeAds: activeRes.total,
      pendingAds: pendingRes.total,
    };
  } catch (error) {
    console.error("Error fetching sponsor ad stats:", error);
    return { totalAds: 0, activeAds: 0, pendingAds: 0 };
  }
}

/**
 * Blacklist a sponsor ad
 */
export async function blacklistSponsorAd(adId: string): Promise<SponsorAd | null> {
  try {
    const doc = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SPONSOR_ADS,
      adId,
      { isBlacklisted: true }
    );
    
    return doc as unknown as SponsorAd;
  } catch (error) {
    console.error("Error blacklisting sponsor ad:", error);
    return null;
  }
}

/**
 * Remove sponsor ad from blacklist
 */
export async function unblacklistSponsorAd(adId: string): Promise<SponsorAd | null> {
  try {
    const doc = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SPONSOR_ADS,
      adId,
      { isBlacklisted: false }
    );
    
    return doc as unknown as SponsorAd;
  } catch (error) {
    console.error("Error removing sponsor ad from blacklist:", error);
    return null;
  }
}

/**
 * Update sponsor ad status
 */
export async function updateSponsorAdStatus(
  adId: string,
  status: SponsorAdStatus
): Promise<SponsorAd | null> {
  try {
    const doc = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SPONSOR_ADS,
      adId,
      { status }
    );
    return doc as unknown as SponsorAd;
  } catch (error) {
    console.error("Error updating sponsor ad status:", error);
    return null;
  }
}

/**
 * Get ad likes count
 */
export async function getAdLikeCount(adId: string): Promise<number> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.AD_LIKES,
      [Query.equal("adId", adId), Query.limit(1)]
    );
    return res.total;
  } catch (error) {
    console.error("Error fetching ad like count:", error);
    return 0;
  }
}

/**
 * Batch get likes counts for multiple ads
 */
export async function getAdsLikeCounts(adIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (adIds.length === 0) return result;

  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.AD_LIKES,
      [Query.equal("adId", adIds), Query.limit(5000)]
    );

    adIds.forEach((id) => result.set(id, 0));
    res.documents.forEach((doc) => {
      const adId = doc.adId as string;
      result.set(adId, (result.get(adId) || 0) + 1);
    });

    return result;
  } catch (error) {
    console.error("Error fetching ads like counts:", error);
    adIds.forEach((id) => result.set(id, 0));
    return result;
  }
}

// ==================== User Registration Stats ====================

export interface RegistrationStats {
  totalUsers: number;
  dailyRegistrations: number; // Daily registrations
  monthlyRegistrations: number; // Monthly registrations
  yearlyRegistrations: number; // Yearly registrations
}

export interface DailyRegistrationTrend {
  day: number;
  count: number;
}

export interface MonthlyRegistrationTrend {
  month: number;
  count: number;
}

// Helper to format date as YYYY-MM-DD in local timezone
const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Get user registration statistics for a specific date
 */
export async function getRegistrationStats(
  year: number,
  month: number,
  day: number
): Promise<RegistrationStats> {
  try {
    // Get total users
    const totalRes = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      [Query.limit(1)]
    );
    const totalUsers = totalRes.total;

    // Get all profiles to analyze registration dates
    const allProfiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      [Query.limit(10000)]
    );

    // Calculate daily, monthly, yearly registrations
    let dailyRegistrations = 0;
    let monthlyRegistrations = 0;
    let yearlyRegistrations = 0;

    // Use local timezone for date comparison
    const targetDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    allProfiles.documents.forEach((doc) => {
      const createdAt = new Date(doc.$createdAt);
      // Use local timezone
      const createdDateStr = formatLocalDate(createdAt);
      const createdYear = createdAt.getFullYear();
      const createdMonth = createdAt.getMonth() + 1;

      // Same day (local timezone)
      if (createdDateStr === targetDateStr) {
        dailyRegistrations++;
      }

      // Same month and year (local timezone)
      if (createdYear === year && createdMonth === month) {
        monthlyRegistrations++;
      }

      // Same year (local timezone)
      if (createdYear === year) {
        yearlyRegistrations++;
      }
    });

    return {
      totalUsers,
      dailyRegistrations,
      monthlyRegistrations,
      yearlyRegistrations,
    };
  } catch (error) {
    console.error("Error fetching registration stats:", error);
    return {
      totalUsers: 0,
      dailyRegistrations: 0,
      monthlyRegistrations: 0,
      yearlyRegistrations: 0,
    };
  }
}

/**
 * Get daily registration trend for a specific month
 */
export async function getDailyRegistrationTrend(
  year: number,
  month: number
): Promise<DailyRegistrationTrend[]> {
  try {
    const allProfiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      [Query.limit(10000)]
    );

    // Get days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyCounts: DailyRegistrationTrend[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      // Use local timezone for date comparison
      const targetDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const count = allProfiles.documents.filter((doc) => {
        const createdAt = new Date(doc.$createdAt);
        return formatLocalDate(createdAt) === targetDateStr;
      }).length;

      dailyCounts.push({ day, count });
    }

    return dailyCounts;
  } catch (error) {
    console.error("Error fetching daily registration trend:", error);
    return [];
  }
}

/**
 * Get monthly registration trend for a specific year
 */
export async function getMonthlyRegistrationTrend(
  year: number
): Promise<MonthlyRegistrationTrend[]> {
  try {
    const allProfiles = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      [Query.limit(10000)]
    );

    const monthlyCounts: MonthlyRegistrationTrend[] = [];

    for (let month = 1; month <= 12; month++) {
      const count = allProfiles.documents.filter((doc) => {
        const createdAt = new Date(doc.$createdAt);
        return (
          createdAt.getFullYear() === year && createdAt.getMonth() + 1 === month
        );
      }).length;

      monthlyCounts.push({ month, count });
    }

    return monthlyCounts;
  } catch (error) {
    console.error("Error fetching monthly registration trend:", error);
    return [];
  }
}
