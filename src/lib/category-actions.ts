import { databases, Collections, Query } from "./appwrite";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

// Category type definition
export interface Category {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  categoryId: string;
  type: "category" | "subcategory";
  parentId?: string;      // Parent category value
  value: string;          // Code value
  name: string;
  icon: string;           // Ionicons icon name
  colorStart?: string;    // Gradient start color
  colorEnd?: string;      // Gradient end color
  active?: boolean;
  order: number;
}

/**
 * Get all categories (main categories only)
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      Collections.CATEGORIES,
      [
        Query.equal("type", "category"),
        Query.orderAsc("order"),
        Query.limit(100),
      ]
    );
    return response.documents as unknown as Category[];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};

/**
 * Get all subcategories for a parent category
 * @param parentValue - Parent category value field
 */
export const getSubcategories = async (parentValue: string): Promise<Category[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      Collections.CATEGORIES,
      [
        Query.equal("type", "subcategory"),
        Query.equal("parentId", parentValue),
        Query.orderAsc("order"),
        Query.limit(100),
      ]
    );
    return response.documents as unknown as Category[];
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    return [];
  }
};

/**
 * Get all categories and subcategories
 */
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      Collections.CATEGORIES,
      [
        Query.orderAsc("order"),
        Query.limit(500),
      ]
    );
    return response.documents as unknown as Category[];
  } catch (error) {
    console.error("Error fetching all categories:", error);
    return [];
  }
};

/**
 * Update a category
 */
export const updateCategory = async (
  documentId: string,
  data: Partial<Omit<Category, "$id" | "$createdAt" | "$updatedAt">>
): Promise<Category | null> => {
  try {
    const response = await databases.updateDocument(
      DATABASE_ID,
      Collections.CATEGORIES,
      documentId,
      data
    );
    return response as unknown as Category;
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

/**
 * Delete posts by category
 */
const deletePostsByCategory = async (
  category: string,
  subCategory?: string
): Promise<number> => {
  try {
    const queries = [Query.equal("category", category), Query.limit(100)];
    if (subCategory) {
      queries.push(Query.equal("subCategory", subCategory));
    }

    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
      const postsRes = await databases.listDocuments(
        DATABASE_ID,
        Collections.POSTS,
        queries
      );

      if (postsRes.documents.length === 0) {
        hasMore = false;
        break;
      }

      for (const post of postsRes.documents) {
        await databases.deleteDocument(DATABASE_ID, Collections.POSTS, post.$id);
        deletedCount++;
      }

      // Continue if there might be more
      hasMore = postsRes.documents.length === 100;
    }

    return deletedCount;
  } catch (error) {
    console.error("Error deleting posts by category:", error);
    return 0;
  }
};

/**
 * Delete ads by category
 */
const deleteAdsByCategory = async (
  category: string,
  subCategory?: string
): Promise<number> => {
  try {
    const queries = [Query.equal("category", category), Query.limit(100)];
    if (subCategory) {
      queries.push(Query.equal("subcategory", subCategory));
    }

    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
      const adsRes = await databases.listDocuments(
        DATABASE_ID,
        Collections.SPONSOR_ADS,
        queries
      );

      if (adsRes.documents.length === 0) {
        hasMore = false;
        break;
      }

      for (const ad of adsRes.documents) {
        await databases.deleteDocument(DATABASE_ID, Collections.SPONSOR_ADS, ad.$id);
        deletedCount++;
      }

      // Continue if there might be more
      hasMore = adsRes.documents.length === 100;
    }

    return deletedCount;
  } catch (error) {
    console.error("Error deleting ads by category:", error);
    return 0;
  }
};

/**
 * Delete a category and its associated posts/ads
 * Note: This will also delete all subcategories if it's a main category
 * @param documentId - Document ID
 * @param value - Category value field (used for deleting subcategories)
 * @param parentValue - Parent category value (for subcategories)
 * @param deleteRelatedContent - Whether to delete related posts and ads
 */
export const deleteCategory = async (
  documentId: string,
  value?: string,
  parentValue?: string,
  deleteRelatedContent: boolean = false
): Promise<boolean> => {
  try {
    // If it's a main category, delete all its subcategories first
    if (value) {
      const subcategories = await getSubcategories(value);
      
      // Delete related content for each subcategory
      if (deleteRelatedContent) {
        for (const sub of subcategories) {
          await deletePostsByCategory(value, sub.value);
          await deleteAdsByCategory(value, sub.value);
        }
        // Also delete posts/ads that only have the main category (no subcategory)
        await deletePostsByCategory(value);
        await deleteAdsByCategory(value);
      }
      
      // Delete subcategory documents
      for (const sub of subcategories) {
        await databases.deleteDocument(
          DATABASE_ID,
          Collections.CATEGORIES,
          sub.$id
        );
      }
    } else if (parentValue && deleteRelatedContent) {
      // It's a subcategory - delete its related content
      await deletePostsByCategory(parentValue, value);
      await deleteAdsByCategory(parentValue, value);
    }
    
    // Delete the category itself
    await databases.deleteDocument(
      DATABASE_ID,
      Collections.CATEGORIES,
      documentId
    );
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    return false;
  }
};

/**
 * Create a new category
 */
export const createCategory = async (
  data: Omit<Category, "$id" | "$createdAt" | "$updatedAt">
): Promise<Category | null> => {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      Collections.CATEGORIES,
      "unique()",
      data
    );
    return response as unknown as Category;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};

/**
 * Get category label from a pre-fetched categories list
 */
export function getCategoryLabel(allCategories: Category[], value: string | null | undefined): string {
  if (!value) return "N/A";
  const category = allCategories.find((c) => c.value === value && c.type === "category");
  return category?.name || value;
}

/**
 * Get subcategory label from a pre-fetched categories list
 */
export function getSubCategoryLabel(allCategories: Category[], subCategoryValue: string | null | undefined): string {
  if (!subCategoryValue) return "N/A";
  const subcategory = allCategories.find((c) => c.value === subCategoryValue && c.type === "subcategory");
  return subcategory?.name || subCategoryValue;
}

// ============ Sponsor Ads Related ============

export interface SponsorAd {
  $id: string;
  userId: string;
  category: string;
  subcategory: string;
  slot: number;
  $createdAt: string;
}

export interface AdSlotUser {
  ad: SponsorAd;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  } | null;
  plan: {
    name: string;
  } | null;
  slotLabel: string;
}

// Slot position rules mapping
const SLOT_RULES: Record<number, { plan: string; label: string }> = {
  0: { plan: "Dominion", label: "Feed #1" },
  1: { plan: "Essential/Professional", label: "Preference #1" },
  2: { plan: "Essential/Professional", label: "Preference #2" },
  3: { plan: "Essential/Professional", label: "Preference #3" },
  9: { plan: "Dominion", label: "Feed #10" },
  19: { plan: "Dominion", label: "Feed #20" },
};

/**
 * Get slot label based on slot number
 */
export const getSlotLabel = (slot: number): string => {
  const rule = SLOT_RULES[slot];
  if (rule) {
    return `${rule.label} (${rule.plan})`;
  }
  return `Slot #${slot}`;
};

/**
 * Get sponsor ads for a specific subcategory
 */
export const getSubcategorySponsorAds = async (
  categoryValue: string,
  subcategoryValue: string
): Promise<AdSlotUser[]> => {
  try {
    // 1. Query sponsor_ads by category and subcategory
    const adsRes = await databases.listDocuments(
      DATABASE_ID,
      Collections.SPONSOR_ADS,
      [
        Query.equal("category", categoryValue),
        Query.equal("subcategory", subcategoryValue),
        Query.limit(100),
      ]
    );
    const ads = adsRes.documents as unknown as SponsorAd[];

    if (ads.length === 0) return [];

    // 2. Get unique userIds
    const userIds = [...new Set(ads.map((ad) => ad.userId))];

    // 3. Batch query profiles
    const profilePromises = userIds.map((userId) =>
      databases.listDocuments(DATABASE_ID, Collections.PROFILE, [
        Query.equal("userId", userId),
        Query.limit(1),
      ])
    );
    const profileResults = await Promise.all(profilePromises);
    const profileMap = new Map<string, { firstName: string; lastName: string; email: string; avatar?: string }>();
    
    profileResults.forEach((res, idx) => {
      if (res.documents.length > 0) {
        const doc = res.documents[0] as unknown as {
          userId: string;
          firstName: string;
          lastName: string;
          email: string;
          avatar?: string;
        };
        profileMap.set(userIds[idx], {
          firstName: doc.firstName || "",
          lastName: doc.lastName || "",
          email: doc.email || "",
          avatar: doc.avatar,
        });
      }
    });

    // 4. Batch query subscriptions to get planId
    const subPromises = userIds.map((userId) =>
      databases.listDocuments(DATABASE_ID, Collections.SUBSCRIPTIONS, [
        Query.equal("userId", userId),
        Query.limit(1),
      ])
    );
    const subResults = await Promise.all(subPromises);
    const userPlanIdMap = new Map<string, string>();
    
    subResults.forEach((res, idx) => {
      if (res.documents.length > 0) {
        const doc = res.documents[0] as unknown as { userId: string; planId: string };
        userPlanIdMap.set(userIds[idx], doc.planId);
      }
    });

    // 5. Get unique planIds and query Plans
    const planIds = [...new Set(Array.from(userPlanIdMap.values()))];
    const planMap = new Map<string, { name: string }>();
    
    if (planIds.length > 0) {
      const plansRes = await databases.listDocuments(DATABASE_ID, Collections.PLANS, [
        Query.limit(100),
      ]);
      (plansRes.documents as unknown as { $id: string; name: string }[]).forEach((plan) => {
        planMap.set(plan.$id, { name: plan.name });
      });
    }

    // 6. Combine all data
    const result: AdSlotUser[] = ads.map((ad) => {
      const user = profileMap.get(ad.userId) || null;
      const planId = userPlanIdMap.get(ad.userId);
      const plan = planId ? planMap.get(planId) || null : null;
      const slotLabel = getSlotLabel(ad.slot);

      return {
        ad,
        user,
        plan,
        slotLabel,
      };
    });

    // Sort by slot number
    result.sort((a, b) => a.ad.slot - b.ad.slot);

    return result;
  } catch (error) {
    console.error("Error fetching subcategory sponsor ads:", error);
    return [];
  }
};

/**
 * Get count of posts and ads using a category or subcategory
 */
export interface CategoryUsageStats {
  postCount: number;
  adCount: number;
}

export const getCategoryUsageStats = async (
  category: string,
  subCategory?: string
): Promise<CategoryUsageStats> => {
  try {
    // Build queries for posts
    const postQueries = [Query.equal("category", category), Query.limit(1)];
    if (subCategory) {
      postQueries[0] = Query.equal("category", category);
      postQueries.push(Query.equal("subCategory", subCategory));
    }

    // Build queries for ads
    const adQueries = [Query.equal("category", category), Query.limit(1)];
    if (subCategory) {
      adQueries[0] = Query.equal("category", category);
      adQueries.push(Query.equal("subcategory", subCategory));
    }

    // Fetch counts in parallel
    const [postsRes, adsRes] = await Promise.all([
      databases.listDocuments(DATABASE_ID, Collections.POSTS, postQueries),
      databases.listDocuments(DATABASE_ID, Collections.SPONSOR_ADS, adQueries),
    ]);

    return {
      postCount: postsRes.total,
      adCount: adsRes.total,
    };
  } catch (error) {
    console.error("Error fetching category usage stats:", error);
    return { postCount: 0, adCount: 0 };
  }
};

/**
 * Get total usage stats for a main category (including all subcategories)
 */
export const getMainCategoryUsageStats = async (
  categoryValue: string
): Promise<CategoryUsageStats> => {
  try {
    // Build queries - search by category value
    const postQueries = [Query.equal("category", categoryValue), Query.limit(1)];
    const adQueries = [Query.equal("category", categoryValue), Query.limit(1)];

    // Fetch main category counts
    const [mainPostsRes, mainAdsRes] = await Promise.all([
      databases.listDocuments(DATABASE_ID, Collections.POSTS, postQueries),
      databases.listDocuments(DATABASE_ID, Collections.SPONSOR_ADS, adQueries),
    ]);

    return {
      // The category query already includes records that also have a subcategory.
      postCount: mainPostsRes.total,
      adCount: mainAdsRes.total,
    };
  } catch (error) {
    console.error("Error fetching main category usage stats:", error);
    return { postCount: 0, adCount: 0 };
  }
};
