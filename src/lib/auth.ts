import { Profile } from "@/types/profile.types";
import { Models, OAuthProvider } from "appwrite";
import { account, Collections, databases, Query } from "./appwrite";

export type AuthUser = Models.User<Models.Preferences>;

export interface AdminUser {
  user: AuthUser;
  profile: Profile;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function logAuthDebug(
  step: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/debug/auth-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        step,
        details,
        href: window.location.href,
        origin: window.location.origin,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("[auth-debug] failed to send log:", error);
  }
}

/**
 * Get current logged in user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

/**
 * Get profile by user ID
 */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      [Query.equal("userId", userId), Query.limit(1)]
    );
    return (res.documents[0] as unknown as Profile) || null;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

/**
 * Check if user has admin role
 * Note: role can be null for existing users, treat null as "user"
 */
export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === "admin";
}

/**
 * Get normalized role (null -> "user")
 */
export function getNormalizedRole(role: string | null | undefined): "user" | "admin" {
  return role === "admin" ? "admin" : "user";
}

/**
 * Get current admin user (user + profile with admin check)
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.$id);
  if (!profile || !isAdmin(profile)) {
    // User exists but is not an admin - logout
    await logout();
    return null;
  }

  return { user, profile };
}

/**
 * Login with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<AdminUser> {
  const formattedEmail = email.trim().toLowerCase();
  
  // Create session
  await account.createEmailPasswordSession(formattedEmail, password);
  
  // Get user
  const user = await account.get();
  
  // Check profile and admin role
  const profile = await getProfileByUserId(user.$id);
  
  if (!profile) {
    await logout();
    throw new Error("User profile not found");
  }
  
  if (!isAdmin(profile)) {
    await logout();
    throw new Error("You don't have admin privileges");
  }
  
  return { user, profile };
}

/**
 * Start Google OAuth flow
 */
export function loginWithGoogle(): void {
  const successUrl = `${window.location.origin}/auth/callback`;
  const failureUrl = `${window.location.origin}/login?error=oauth_failed`;

  void logAuthDebug("oauth_start", {
    successUrl,
    failureUrl,
  });

  try {
    account.createOAuth2Session(
      OAuthProvider.Google,
      successUrl,
      failureUrl
    );
  } catch (error) {
    void logAuthDebug("oauth_start_error", {
      error: getErrorMessage(error),
    });
    throw error;
  }
}

/**
 * Handle OAuth callback - verify user is admin
 */
export async function handleOAuthCallback(): Promise<AdminUser> {
  await logAuthDebug("oauth_callback_started");

  let user: AuthUser | null = null;
  try {
    user = await getCurrentUser();
    await logAuthDebug("oauth_account_get_result", {
      hasUser: !!user,
      userId: user?.$id ?? null,
      email: user?.email ?? null,
    });
  } catch (error) {
    await logAuthDebug("oauth_account_get_error", {
      error: getErrorMessage(error),
    });
    throw error;
  }

  if (!user) {
    await logAuthDebug("oauth_authentication_failed", {
      reason: "account_get_returned_null",
    });
    throw new Error("Authentication failed");
  }

  const profile = await getProfileByUserId(user.$id);
  await logAuthDebug("oauth_profile_result", {
    hasProfile: !!profile,
    profileUserId: profile?.userId ?? null,
    role: profile?.role ?? null,
  });

  if (!profile) {
    await logAuthDebug("oauth_profile_missing", {
      userId: user.$id,
    });
    await logout();
    throw new Error("User profile not found");
  }

  if (!isAdmin(profile)) {
    await logAuthDebug("oauth_not_admin", {
      userId: user.$id,
      role: profile.role ?? null,
    });
    await logout();
    throw new Error("You don't have admin privileges");
  }

  await logAuthDebug("oauth_success", {
    userId: user.$id,
    role: profile.role,
  });

  return { user, profile };
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    await account.deleteSession("current");
  } catch (error) {
    // Ignore errors when logging out
    console.error("Logout error:", error);
  }
}

