/**
 * Seed admin ads into all 20 ad slots
 *
 * Run with:
 *   npx ts-node scripts/seed-admin-ads.ts
 */

import { Client, Databases, ID, Query } from "node-appwrite";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://nyc.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "68a49ee90023d9cb951e";
const APPWRITE_API_KEY =
  process.env.APPWRITE_API_KEY ||
  "standard_446dccc81b5e61974aeabf1d02c63022ebef3ff767d6a0e3855bebdbc787cba852e96ea32081f6ad0fc9d850f825d7852365b4aeb4678cc1d4fb7f8243535ceaef2c2ee15f23d9b8c876b929636ba9603236b169e22974f4d49b553043768ba86ad7169cd1be72cd181596511dbd70e655611221dfda5d476cfc6b818a50d0f7";
const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "68b76a75001108265f7e";

const SPONSOR_ADS_COLLECTION = "sponsor_ads";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const db = new Databases(client);

const AD_SLOTS = [1, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110];

const SAMPLE_ADS = [
  { slot: 1,   cat: "technology-development", sub: "web-development",       title: "CodeCraft Academy — Learn to Code in 12 Weeks",       desc: "Intensive coding bootcamp with job guarantee. Full-stack web development.", phone: "(415) 555-0101", website: "https://codecraft.academy", state: "California", city: "San Francisco" },
  { slot: 5,   cat: "technology-development", sub: "mobile-app-development", title: "Expo — Build Mobile Apps Faster",                      desc: "The fastest way to build and deploy React Native apps. Over-the-air updates and more.", phone: "(650) 555-0102", website: "https://expo.dev", state: "California", city: "Palo Alto" },
  { slot: 8,   cat: "creative-design",        sub: "graphic-design",        title: "Canva Pro — Design Anything, Publish Anywhere",        desc: "Create stunning graphics, presentations, videos, and more. 100M+ design elements.", phone: "(213) 555-0103", website: "https://canva.com", state: "California", city: "Los Angeles" },
  { slot: 10,  cat: "marketing-business",      sub: "digital-marketing",     title: "GrowthEngine — Automate Your Marketing",               desc: "AI-powered marketing automation. Email, social, and ads in one place. 50% off first 3 months.", phone: "(212) 555-0104", website: "https://growthengine.io", state: "New York", city: "New York" },
  { slot: 15,  cat: "marketing-business",      sub: "seo-sem",              title: "Ahrefs — SEO Tools & Resources",                       desc: "All-in-one SEO toolkit. Backlink analysis, keyword research, site audits.", phone: "(312) 555-0105", website: "https://ahrefs.com", state: "Illinois", city: "Chicago" },
  { slot: 20,  cat: "creative-design",         sub: "photography",          title: "LensCraft Studio — Premium Camera Rentals",             desc: "Rent pro cameras, lenses, and lighting gear. Daily and weekly rates.", phone: "(305) 555-0106", website: "https://lenscraft.studio", state: "Florida", city: "Miami" },
  { slot: 25,  cat: "education-learning",      sub: "online-courses",       title: "SkillForge — Master New Skills Online",                 desc: "10,000+ courses from industry experts. Business, tech, creative, and more.", phone: "(206) 555-0107", website: "https://skillforge.com", state: "Washington", city: "Seattle" },
  { slot: 30,  cat: "lifestyle-personal-services", sub: "fitness-training", title: "FitLife App — Your Personal AI Trainer",                desc: "Custom workout plans, meal tracking, and progress analytics.", phone: "(512) 555-0108", website: "https://fitlife.app", state: "Texas", city: "Austin" },
  { slot: 35,  cat: "trades-skilled-work",     sub: "construction-renovation", title: "BuildRight Supply Co. — Premium Materials",           desc: "Quality lumber, hardware, and tools at contractor prices. Free delivery on orders over $500.", phone: "(303) 555-0109", website: "https://buildright.co", state: "Colorado", city: "Denver" },
  { slot: 40,  cat: "local-opportunities",     sub: "jobs",                 title: "TalentBridge — Find Your Dream Job",                    desc: "AI-powered job matching connecting top talent with innovative companies.", phone: "(404) 555-0110", website: "https://talentbridge.io", state: "Georgia", city: "Atlanta" },
  { slot: 45,  cat: "technology-development",  sub: "ai-machine-learning",  title: "Hugging Face — The AI Community",                       desc: "Collaborate on ML models, datasets, and demos. 500K+ models available.", phone: "(415) 555-0111", website: "https://huggingface.co", state: "California", city: "San Francisco" },
  { slot: 50,  cat: "creative-design",         sub: "videography",          title: "Frame.io — Video Collaboration Platform",               desc: "Streamline your video review and approval process. Real-time collaboration.", phone: "(646) 555-0112", website: "https://frame.io", state: "New York", city: "Brooklyn" },
  { slot: 55,  cat: "marketing-business",      sub: "content-writing",      title: "Jasper AI — Write Better Content Faster",               desc: "AI writing assistant for marketing teams. Blog posts, ads, emails in seconds.", phone: "(512) 555-0113", website: "https://jasper.ai", state: "Texas", city: "Austin" },
  { slot: 60,  cat: "lifestyle-personal-services", sub: "beauty-wellness",  title: "Glossier — Skin First, Makeup Second",                  desc: "Clean beauty products that celebrate real skin. Free shipping on orders $30+.", phone: "(212) 555-0114", website: "https://glossier.com", state: "New York", city: "New York" },
  { slot: 65,  cat: "lifestyle-personal-services", sub: "pet-services",     title: "BarkBox — Monthly Surprises for Your Pup",              desc: "2 toys, 2 bags of treats, and a chew in every monthly box.", phone: "(323) 555-0115", website: "https://barkbox.com", state: "California", city: "Los Angeles" },
  { slot: 70,  cat: "education-learning",      sub: "online-courses",       title: "Coursera — Learn from Top Universities",                desc: "Courses, certificates, and degrees from Stanford, Google, IBM, and more.", phone: "(650) 555-0116", website: "https://coursera.org", state: "California", city: "Mountain View" },
  { slot: 80,  cat: "education-learning",      sub: "tutoring",             title: "Wyzant — Find the Perfect Tutor",                       desc: "1-on-1 tutoring in 300+ subjects. Read reviews, compare rates.", phone: "(312) 555-0117", website: "https://wyzant.com", state: "Illinois", city: "Chicago" },
  { slot: 90,  cat: "local-opportunities",     sub: "house-rentals",        title: "Apartments.com — Find Your Next Home",                  desc: "Search millions of apartments and houses for rent. Virtual tours and price alerts.", phone: "(404) 555-0118", website: "https://apartments.com", state: "Georgia", city: "Atlanta" },
  { slot: 100, cat: "marketing-business",      sub: "social-media-management", title: "Buffer — Social Media Management Made Easy",          desc: "Plan, schedule, and analyze your social media content. Trusted by 140,000+ businesses.", phone: "(415) 555-0119", website: "https://buffer.com", state: "California", city: "San Francisco" },
  { slot: 110, cat: "local-opportunities",     sub: "jobs",                 title: "LinkedIn Premium — Advance Your Career",                desc: "Stand out to recruiters, see who viewed your profile, and access LinkedIn Learning.", phone: "(408) 555-0120", website: "https://linkedin.com/premium", state: "California", city: "Sunnyvale" },
];

async function main() {
  console.log("🚀 Seeding admin ads into all 20 slots...\n");

  // Step 1: Find an admin userId from profiles
  let adminUserId = "admin-seed-user";
  try {
    const profiles = await db.listDocuments(DATABASE_ID, "profile", [
      Query.limit(1),
    ]);
    if (profiles.documents.length > 0) {
      adminUserId = (profiles.documents[0] as any).userId;
      console.log(`📧 Using userId: ${adminUserId}`);
    }
  } catch (e) {
    console.log("⚠️  Could not fetch profiles, using fallback userId");
  }

  // Step 2: Clean existing admin-created ads to avoid slot conflicts
  console.log("\n🧹 Cleaning existing admin-created ads...");
  try {
    let hasMore = true;
    let deleted = 0;
    while (hasMore) {
      const existing = await db.listDocuments(DATABASE_ID, SPONSOR_ADS_COLLECTION, [
        Query.equal("isAdminCreated", true),
        Query.limit(100),
      ]);
      if (existing.documents.length === 0) {
        hasMore = false;
        break;
      }
      for (const doc of existing.documents) {
        await db.deleteDocument(DATABASE_ID, SPONSOR_ADS_COLLECTION, doc.$id);
        deleted++;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`   Deleted ${deleted} existing admin ads`);
  } catch (e: any) {
    console.log(`   ⚠️  Cleanup error: ${e.message}`);
  }

  // Step 3: Create ads for each slot
  console.log("\n📢 Creating admin ads...");
  let created = 0;

  for (const ad of SAMPLE_ADS) {
    const storedSlot = ad.slot - 1; // DB stores slot - 1
    const img = `https://picsum.photos/seed/adminad${ad.slot}/800/800`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    try {
      await db.createDocument(DATABASE_ID, SPONSOR_ADS_COLLECTION, ID.unique(), {
        userId: adminUserId,
        title: ad.title,
        description: ad.desc,
        media: [img],
        state: ad.state,
        city: ad.city,
        category: ad.cat,
        subcategory: ad.sub,
        slot: storedSlot,
        externalLink: ad.website,
        phoneNumber: ad.phone,
        website: ad.website,
        status: "active",
        views: Math.floor(Math.random() * 500) + 50,
        clicks: Math.floor(Math.random() * 80) + 5,
        expiresAt: expiresAt.toISOString(),
        isBlacklisted: false,
        isAdminCreated: true,
      });
      created++;
      console.log(`   ✅ Slot ${ad.slot}: ${ad.title}`);
    } catch (err: any) {
      console.error(`   ❌ Slot ${ad.slot} failed: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n✨ Done! Created ${created}/${SAMPLE_ADS.length} admin ads.`);
}

main().catch(console.error);
