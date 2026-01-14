import { databases, Collections, Query } from "./appwrite";
import { Profile, UserRole, UserSubscriptionInfo, UserContentStats } from "@/types/profile.types";

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
