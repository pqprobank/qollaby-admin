/**
 * Script to batch create admin ads
 * 
 * First install node-appwrite:
 *   npm install node-appwrite
 * 
 * Then run with:
 *   npx ts-node scripts/import-admin-ads.ts
 * 
 * Or with custom admin userId:
 *   ADMIN_USER_ID=your-user-id npx ts-node scripts/import-admin-ads.ts
 */

import { Client, Databases, ID } from "node-appwrite";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "68a49ee90023d9cb951e";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "standard_446dccc81b5e61974aeabf1d02c63022ebef3ff767d6a0e3855bebdbc787cba852e96ea32081f6ad0fc9d850f825d7852365b4aeb4678cc1d4fb7f8243535ceaef2c2ee15f23d9b8c876b929636ba9603236b169e22974f4d49b553043768ba86ad7169cd1be72cd181596511dbd70e655611221dfda5d476cfc6b818a50d0f7";
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "68a49f3800269765480e";
const SPONSOR_ADS_COLLECTION = "sponsor_ads";
const STORAGE_BUCKET_ID = "68be1b43002b9e939b2e";

// Admin user ID - can be set via env variable or defaults to a placeholder
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "admin-batch-import";

// Sample data
const STATES_CITIES = [
  { state: "California", city: "Los Angeles" },
  { state: "California", city: "San Francisco" },
  { state: "New York", city: "New York City" },
  { state: "Texas", city: "Houston" },
  { state: "Texas", city: "Austin" },
  { state: "Florida", city: "Miami" },
  { state: "Florida", city: "Orlando" },
  { state: "Illinois", city: "Chicago" },
  { state: "Washington", city: "Seattle" },
  { state: "Arizona", city: "Phoenix" },
];

const CATEGORIES = [
  { category: "creative-design", subcategory: "graphic-design" },
  { category: "creative-design", subcategory: "photography" },
  { category: "technology-development", subcategory: "web-development" },
  { category: "technology-development", subcategory: "mobile-app-development" },
  { category: "marketing-business", subcategory: "digital-marketing" },
  { category: "marketing-business", subcategory: "social-media-management" },
  { category: "trades-skilled-work", subcategory: "construction-renovation" },
  { category: "lifestyle-personal-services", subcategory: "fitness-training" },
  { category: "education-learning", subcategory: "tutoring" },
  { category: "local-opportunities", subcategory: "jobs" },
];

// Placeholder image URLs (using picsum.photos for random images)
const getRandomImageUrl = (seed: number) => 
  `https://picsum.photos/seed/ad${seed}/800/800`;

// Slots to create
const SLOTS_CONFIG: { slot: number; count: number }[] = [
  { slot: 5, count: 2 },
  { slot: 8, count: 3 },
  { slot: 15, count: 3 },
  { slot: 25, count: 3 },
  { slot: 35, count: 3 },
  { slot: 45, count: 3 },
  { slot: 55, count: 3 },
  { slot: 65, count: 3 },
  { slot: 10, count: 1 },
  { slot: 20, count: 1 },
  { slot: 30, count: 1 },
  { slot: 40, count: 1 },
  { slot: 50, count: 1 },
  { slot: 60, count: 1 },
  { slot: 70, count: 1 },
  { slot: 80, count: 1 },
  { slot: 90, count: 1 },
  { slot: 100, count: 1 },
  { slot: 110, count: 1 },
];

interface AdData {
  title: string;
  description: string;
  state: string;
  city: string;
  category: string;
  subcategory: string;
  slot: number; // Display slot (will be stored as slot - 1)
  media: string[];
}

// Generate ad data for all slots
function generateAdsData(): AdData[] {
  const ads: AdData[] = [];
  let adIndex = 0;

  for (const { slot, count } of SLOTS_CONFIG) {
    for (let i = 0; i < count; i++) {
      const location = STATES_CITIES[adIndex % STATES_CITIES.length];
      const categoryData = CATEGORIES[adIndex % CATEGORIES.length];
      
      ads.push({
        title: `Admin Ad - Slot #${slot}${count > 1 ? ` (${i + 1}/${count})` : ""}`,
        description: `This is an admin-created advertisement for slot position ${slot}. Created for testing and demonstration purposes.`,
        state: location.state,
        city: location.city,
        category: categoryData.category,
        subcategory: categoryData.subcategory,
        slot: slot,
        media: [getRandomImageUrl(adIndex + 100)],
      });
      
      adIndex++;
    }
  }

  return ads;
}

async function main() {
  console.log("🚀 Starting admin ads import...\n");

  // Initialize Appwrite client with API key
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  // Generate ads data
  const adsData = generateAdsData();
  console.log(`📋 Generated ${adsData.length} ads to create:\n`);

  // Group by slot for display
  const slotGroups = new Map<number, number>();
  for (const ad of adsData) {
    slotGroups.set(ad.slot, (slotGroups.get(ad.slot) || 0) + 1);
  }
  for (const [slot, count] of Array.from(slotGroups.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`  Slot ${slot}: ${count} ad(s)`);
  }
  console.log("");

  // Create ads
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < adsData.length; i++) {
    const ad = adsData[i];
    
    try {
      // Set expiry to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await databases.createDocument(
        DATABASE_ID,
        SPONSOR_ADS_COLLECTION,
        ID.unique(),
        {
          userId: ADMIN_USER_ID,
          title: ad.title,
          description: ad.description,
          media: ad.media,
          state: ad.state,
          city: ad.city,
          category: ad.category,
          subcategory: ad.subcategory,
          slot: ad.slot - 1, // Store as slot - 1
          externalLink: "",
          status: "active",
          views: 0,
          clicks: 0,
          expiresAt: expiresAt.toISOString(),
          isBlacklisted: false,
          isAdminCreated: true,
        }
      );

      successCount++;
      console.log(`✅ [${i + 1}/${adsData.length}] Created: ${ad.title}`);
    } catch (error: any) {
      errorCount++;
      console.error(`❌ [${i + 1}/${adsData.length}] Failed: ${ad.title}`);
      console.error(`   Error: ${error.message || error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Import completed!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
