import { Profile } from "@/types/profile.types";
import { Models, OAuthProvider } from "appwrite";
import { account, Collections, databases, Query } from "./appwrite";

export type AuthUser = Models.User<Models.Preferences>;

export interface AdminUser {
  user: AuthUser;
  profile: Profile;
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
 * Get profile by username (for username-based login)
 */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  try {
    const res = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      Collections.PROFILE,
      [Query.equal("username", username.trim().toLowerCase()), Query.limit(1)]
    );
    return (res.documents[0] as unknown as Profile) || null;
  } catch (error) {
    console.error("Error fetching profile by username:", error);
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
 * Login with email or username + password
 */
export async function loginWithEmail(identifier: string, password: string): Promise<AdminUser> {
  let email = identifier.trim().toLowerCase();

  if (!email.includes("@")) {
    const profile = await getProfileByUsername(email);
    if (!profile?.email) {
      throw new Error("No account found with that username");
    }
    email = profile.email;
  }

  await account.createEmailPasswordSession(email, password);

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
 * Start Google OAuth flow using token-based approach.
 * Uses createOAuth2Token instead of createOAuth2Session to support
 * mobile browsers where third-party cookies are blocked (Safari ITP).
 */
export function loginWithGoogle(): void {
  const successUrl = `${window.location.origin}/auth/callback`;
  const failureUrl = `${window.location.origin}/login?error=oauth_failed`;
  
  account.createOAuth2Token(
    OAuthProvider.Google,
    successUrl,
    failureUrl
  );
}

/**
 * Handle OAuth callback - extract token from URL params and create session.
 * createOAuth2Token redirects back with ?userId=xxx&secret=xxx in the URL.
 */
export async function handleOAuthCallback(): Promise<AdminUser> {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const secret = params.get("secret");

  if (userId && secret) {
    await account.createSession(userId, secret);
  }

  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Authentication failed");
  }

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

