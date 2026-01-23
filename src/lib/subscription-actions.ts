import { Collections, databases, Query } from "./appwrite";
import { Models } from "appwrite";

export interface Plan extends Models.Document {
  name: string;
  priceMonthly: number;
  priceYearly: number;
}

export interface Subscription extends Models.Document {
  userId: string;
  planId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  currentPeriodStart: string;
}

export interface SubscriptionStats {
  activeUsers: number;           // Number of subscribers
  churnedUsers: number;          // Number of churned users
  churnRate: number;             // Churn rate
  monthlyRevenue: number;        // Monthly revenue
  revenueByTier: {               // Revenue by plan tier
    planId: string;
    planName: string;
    revenue: number;
    count: number;
    color: string;
  }[];
}

// Plan color mapping - match by keyword
const PLAN_COLOR_KEYWORDS: { keyword: string; color: string }[] = [
  { keyword: "essential", color: "#22c55e" },      // Green
  { keyword: "professional", color: "#3b82f6" },   // Blue
  { keyword: "dominion", color: "#b91c1c" },       // Red
];

/**
 * Get color based on plan name
 */
function getPlanColor(planName: string): string {
  const lowerName = planName.toLowerCase();
  for (const { keyword, color } of PLAN_COLOR_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      return color;
    }
  }
  return "#666666"; // Default gray
}

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  try {
    // 1. Get all subscription records
    const subscriptionsRes = await databases.listDocuments<Subscription>(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SUBSCRIPTIONS,
      [Query.limit(1000)]
    );
    const subscriptions = subscriptionsRes.documents;

    // 2. Get all plans
    const plansRes = await databases.listDocuments<Plan>(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PLANS,
      [Query.limit(100)]
    );
    const plans = plansRes.documents;
    const planMap = new Map<string, Plan>();
    plans.forEach((p) => planMap.set(p.$id, p));

    // 3. Calculate statistics
    const totalUsers = subscriptions.length;
    const churnedUsers = subscriptions.filter((s) => s.cancelAtPeriodEnd === true).length;
    const churnRate = totalUsers > 0 ? (churnedUsers / totalUsers) * 100 : 0;

    // 4. Calculate monthly revenue and distribution by plan
    const revenueByPlan = new Map<string, { revenue: number; count: number }>();
    let monthlyRevenue = 0;

    subscriptions.forEach((sub) => {
      const plan = planMap.get(sub.planId);
      if (plan) {
        const price = plan.priceMonthly || 0;
        monthlyRevenue += price;

        const existing = revenueByPlan.get(sub.planId) || { revenue: 0, count: 0 };
        revenueByPlan.set(sub.planId, {
          revenue: existing.revenue + price,
          count: existing.count + 1,
        });
      }
    });

    // 5. Build revenue by tier data
    const revenueByTier = Array.from(revenueByPlan.entries()).map(([planId, data]) => {
      const plan = planMap.get(planId);
      const planName = plan?.name || "Unknown";
      const color = getPlanColor(planName);

      return {
        planId,
        planName,
        revenue: data.revenue,
        count: data.count,
        color,
      };
    });

    // Sort by revenue descending
    revenueByTier.sort((a, b) => b.revenue - a.revenue);

    return {
      activeUsers: totalUsers,
      churnedUsers,
      churnRate,
      monthlyRevenue,
      revenueByTier,
    };
  } catch (error) {
    console.error("Failed to fetch subscription stats:", error);
    return {
      activeUsers: 0,
      churnedUsers: 0,
      churnRate: 0,
      monthlyRevenue: 0,
      revenueByTier: [],
    };
  }
}

/**
 * Daily/Monthly active users statistics result
 */
export interface ActivityStats {
  dailyActive: number;      // Daily active users
  monthlyActive: number;    // Monthly active users
  date: string;             // Statistics date YYYY-MM-DD
  year: number;
  month: number;
}

/**
 * Daily trend data point
 */
export interface DailyTrendPoint {
  day: number;
  date: string;
  count: number;
}

/**
 * Monthly trend data point
 */
export interface MonthlyTrendPoint {
  year: number;
  month: number;
  label: string;
  count: number;
}

/**
 * Activity trend data
 */
export interface ActivityTrend {
  dailyTrend: DailyTrendPoint[];    // Daily active for each day of the month
  monthlyTrend: MonthlyTrendPoint[]; // Monthly active for last 6 months
  totalDailyActive: number;          // Today's daily active
  totalMonthlyActive: number;        // This month's monthly active
}

/**
 * Get activity trend data
 * @param year Year
 * @param month Month (1-12)
 * @param day Day (1-31)
 */
export async function getActivityTrend(
  year: number,
  month: number,
  day: number
): Promise<ActivityTrend> {
  try {
    // Get all subscription records
    const subscriptionsRes = await databases.listDocuments<Subscription>(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SUBSCRIPTIONS,
      [Query.limit(5000)]
    );
    const subscriptions = subscriptionsRes.documents;

    // Calculate days in month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Build daily active data for the month
    const dailyTrend: DailyTrendPoint[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const count = subscriptions.filter((sub) => {
        if (!sub.currentPeriodStart) return false;
        return sub.currentPeriodStart.split("T")[0] === dateStr;
      }).length;
      dailyTrend.push({ day: d, date: dateStr, count });
    }

    // Build monthly active data for last 6 months
    const monthlyTrend: MonthlyTrendPoint[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    for (let i = 5; i >= 0; i--) {
      let targetYear = year;
      let targetMonth = month - i;
      
      // Handle year crossover
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }

      const monthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      const count = subscriptions.filter((sub) => {
        if (!sub.currentPeriodStart) return false;
        return sub.currentPeriodStart.split("T")[0].startsWith(monthPrefix);
      }).length;

      monthlyTrend.push({
        year: targetYear,
        month: targetMonth,
        label: `${monthNames[targetMonth - 1]} ${targetYear}`,
        count,
      });
    }

    // Today's daily active
    const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const totalDailyActive = subscriptions.filter((sub) => {
      if (!sub.currentPeriodStart) return false;
      return sub.currentPeriodStart.split("T")[0] === todayStr;
    }).length;

    // This month's monthly active
    const currentMonthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const totalMonthlyActive = subscriptions.filter((sub) => {
      if (!sub.currentPeriodStart) return false;
      return sub.currentPeriodStart.split("T")[0].startsWith(currentMonthPrefix);
    }).length;

    return {
      dailyTrend,
      monthlyTrend,
      totalDailyActive,
      totalMonthlyActive,
    };
  } catch (error) {
    console.error("Failed to fetch activity trend:", error);
    return {
      dailyTrend: [],
      monthlyTrend: [],
      totalDailyActive: 0,
      totalMonthlyActive: 0,
    };
  }
}

/**
 * Get daily/monthly active statistics
 * @param year Year
 * @param month Month (1-12)
 * @param day Day (1-31), used for calculating daily active
 */
export async function getActivityStats(
  year: number,
  month: number,
  day?: number
): Promise<ActivityStats> {
  try {
    // Get all subscription records
    const subscriptionsRes = await databases.listDocuments<Subscription>(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.SUBSCRIPTIONS,
      [Query.limit(5000)]
    );
    const subscriptions = subscriptionsRes.documents;

    // Calculate daily active: currentPeriodStart matches the target date
    const targetDate = day
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : `${year}-${String(month).padStart(2, "0")}-01`;

    const dailyActive = subscriptions.filter((sub) => {
      if (!sub.currentPeriodStart) return false;
      const startDate = sub.currentPeriodStart.split("T")[0]; // Extract YYYY-MM-DD
      return startDate === targetDate;
    }).length;

    // Calculate monthly active: currentPeriodStart within the target month
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const monthlyActive = subscriptions.filter((sub) => {
      if (!sub.currentPeriodStart) return false;
      const startDate = sub.currentPeriodStart.split("T")[0];
      return startDate.startsWith(monthPrefix);
    }).length;

    return {
      dailyActive,
      monthlyActive,
      date: targetDate,
      year,
      month,
    };
  } catch (error) {
    console.error("Failed to fetch activity stats:", error);
    return {
      dailyActive: 0,
      monthlyActive: 0,
      date: "",
      year,
      month,
    };
  }
}

/**
 * Get all plans
 */
export async function getAllPlans(): Promise<Plan[]> {
  try {
    const res = await databases.listDocuments<Plan>(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PLANS,
      [Query.orderAsc("priceMonthly")]
    );
    return res.documents;
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    return [];
  }
}

/**
 * Get subscription list (with pagination)
 */
export interface SubscriptionListParams {
  page?: number;
  limit?: number;
  planId?: string;
}

export interface SubscriptionListResult {
  subscriptions: (Subscription & { plan?: Plan })[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getSubscriptions(
  params: SubscriptionListParams = {}
): Promise<SubscriptionListResult> {
  const { page = 1, limit = 20, planId } = params;
  const offset = (page - 1) * limit;

  try {
    const queries: string[] = [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    if (planId && planId !== "all") {
      queries.push(Query.equal("planId", planId));
    }

    const [subsRes, plansRes] = await Promise.all([
      databases.listDocuments<Subscription>(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.SUBSCRIPTIONS,
        queries
      ),
      databases.listDocuments<Plan>(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        Collections.PLANS,
        [Query.limit(100)]
      ),
    ]);

    const planMap = new Map<string, Plan>();
    plansRes.documents.forEach((p) => planMap.set(p.$id, p));

    const subscriptions = subsRes.documents.map((sub) => ({
      ...sub,
      plan: planMap.get(sub.planId),
    }));

    return {
      subscriptions,
      total: subsRes.total,
      page,
      totalPages: Math.ceil(subsRes.total / limit),
    };
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return {
      subscriptions: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }
}
