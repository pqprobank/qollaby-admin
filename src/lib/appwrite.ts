import { Account, Client, Databases, ID, Query, Storage } from "appwrite";

// Appwrite configuration - shared with mobile app
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Bucket ID for post images (adjust if different)
export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "posts";

// Sponsor Ads Bucket ID (same as app)
export const SPONSOR_ADS_BUCKET_ID = "68be1b43002b9e939b2e";

/**
 * Upload files directly to Appwrite Storage from the browser.
 * Bypasses the Vercel API route to avoid its 4.5 MB request body limit.
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  const urls: string[] = [];

  for (const file of files) {
    const uploaded = await storage.createFile(
      SPONSOR_ADS_BUCKET_ID,
      ID.unique(),
      file
    );

    const isVideo = file.type.startsWith("video/");
    const baseUrl = `${endpoint}/storage/buckets/${SPONSOR_ADS_BUCKET_ID}/files/${uploaded.$id}/view?project=${projectId}`;
    urls.push(isVideo ? `${baseUrl}&type=video` : baseUrl);
  }

  return urls;
}

/**
 * Check if the URL represents a video file
 * Detects by:
 * 1. type=video query parameter (new Appwrite URLs)
 * 2. File extension
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  
  // Check for type=video query parameter (Appwrite URLs)
  if (url.includes("type=video")) {
    return true;
  }
  
  // Check file extensions
  const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];
  const urlWithoutQuery = url.split("?")[0];
  const extension = urlWithoutQuery.split(".").pop()?.toLowerCase();
  if (videoExtensions.includes(extension || "")) {
    return true;
  }
  
  return false;
}

/**
 * Get file preview URL from Appwrite Storage
 * If the image is already a full URL, return it as-is
 */
export function getImageUrl(fileIdOrUrl: string, width?: number, height?: number): string {
  // If it's already a full URL, return as-is
  if (fileIdOrUrl.startsWith("http://") || fileIdOrUrl.startsWith("https://")) {
    return fileIdOrUrl;
  }

  // Build Appwrite Storage preview URL
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  
  let url = `${endpoint}/storage/buckets/${BUCKET_ID}/files/${fileIdOrUrl}/preview?project=${projectId}`;
  
  if (width) url += `&width=${width}`;
  if (height) url += `&height=${height}`;
  
  return url;
}

/**
 * Get video URL from Appwrite Storage (for playback)
 * Videos need the /view endpoint, not /preview
 */
export function getVideoUrl(fileIdOrUrl: string): string {
  // If it's already a full URL, return as-is
  if (fileIdOrUrl.startsWith("http://") || fileIdOrUrl.startsWith("https://")) {
    return fileIdOrUrl;
  }

  // Build Appwrite Storage view URL for video
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  
  return `${endpoint}/storage/buckets/${BUCKET_ID}/files/${fileIdOrUrl}/view?project=${projectId}`;
}

/**
 * Get media URL (auto-detects if video or image)
 */
export function getMediaUrl(fileIdOrUrl: string, width?: number, height?: number): string {
  if (isVideoUrl(fileIdOrUrl)) {
    return getVideoUrl(fileIdOrUrl);
  }
  return getImageUrl(fileIdOrUrl, width, height);
}

export const Collections = {
  USERS: "users",
  POSTS: "posts",
  POST_LIKES: "post_likes",
  POST_STAMPS: "post_stamps",
  LINKS: "follows",
  PLANS: "plans",
  SUBSCRIPTIONS: "subscriptions",
  SUBSCRIPTION_LOGS: "subscription_logs",
  BUSINESS_PROFILE: "business_profile",
  PROFILE: "profile",
  REPORTS: "reports",
  APPEALS: "appeals",
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
  BROADCAST_USAGE: "broadcast_usage",
  SPONSOR_ADS: "sponsor_ads",
  AD_LIKES: "ad_likes",
  PUSH_TOKENS: "push_tokens",
  CATEGORIES: "category",
  LOCATIONS: "locations",
  EXCHANGE_LISTINGS: "exchange_listings",
} as const;

export { Query };
export default client;

