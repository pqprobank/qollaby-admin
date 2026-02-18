/**
 * Clean test data and seed realistic mock data
 *
 * Run with:
 *   npx ts-node scripts/clean-and-seed.ts
 */

import { Client, Databases, ID, Query } from "node-appwrite";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "https://nyc.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "68a49ee90023d9cb951e";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "standard_446dccc81b5e61974aeabf1d02c63022ebef3ff767d6a0e3855bebdbc787cba852e96ea32081f6ad0fc9d850f825d7852365b4aeb4678cc1d4fb7f8243535ceaef2c2ee15f23d9b8c876b929636ba9603236b169e22974f4d49b553043768ba86ad7169cd1be72cd181596511dbd70e655611221dfda5d476cfc6b818a50d0f7";
const DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "68a49f3800269765480e";

const Col = {
  PROFILE: "profile",
  POSTS: "posts",
  POST_LIKES: "post_likes",
  POST_STAMPS: "post_stamps",
  SPONSOR_ADS: "sponsor_ads",
  AD_LIKES: "ad_likes",
  EXCHANGE_LISTINGS: "exchange_listings",
  REPORTS: "reports",
  APPEALS: "appeals",
};

let db: Databases;

// ─── Helpers ──────────────────────────────────────────────

async function deleteAllMatching(
  collection: string,
  queries: string[],
  label: string
) {
  let deleted = 0;
  let hasMore = true;
  while (hasMore) {
    const res = await db.listDocuments(DATABASE_ID, collection, [
      ...queries,
      Query.limit(100),
    ]);
    if (res.documents.length === 0) break;
    for (const doc of res.documents) {
      await db.deleteDocument(DATABASE_ID, collection, doc.$id);
      deleted++;
    }
    hasMore = res.documents.length === 100;
  }
  if (deleted > 0) console.log(`   🗑  Deleted ${deleted} ${label}`);
  return deleted;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function futureDate(daysMin: number, daysMax: number): string {
  const d = new Date();
  d.setDate(d.getDate() + randomInt(daysMin, daysMax));
  return d.toISOString();
}

function pastDate(daysMin: number, daysMax: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(daysMin, daysMax));
  return d.toISOString();
}

// ─── Location Data ────────────────────────────────────────

const LOCATIONS = [
  {
    state: "California",
    city: "Los Angeles",
    coords: [-118.2437, 34.0522] as [number, number],
    address: "Los Angeles, CA",
  },
  {
    state: "California",
    city: "San Francisco",
    coords: [-122.4194, 37.7749] as [number, number],
    address: "San Francisco, CA",
  },
  {
    state: "California",
    city: "San Diego",
    coords: [-117.1611, 32.7157] as [number, number],
    address: "San Diego, CA",
  },
  {
    state: "New York",
    city: "New York City",
    coords: [-74.006, 40.7128] as [number, number],
    address: "New York, NY",
  },
  {
    state: "New York",
    city: "Brooklyn",
    coords: [-73.9442, 40.6782] as [number, number],
    address: "Brooklyn, NY",
  },
  {
    state: "Texas",
    city: "Austin",
    coords: [-97.7431, 30.2672] as [number, number],
    address: "Austin, TX",
  },
  {
    state: "Texas",
    city: "Houston",
    coords: [-95.3698, 29.7604] as [number, number],
    address: "Houston, TX",
  },
  {
    state: "Texas",
    city: "Dallas",
    coords: [-96.797, 32.7767] as [number, number],
    address: "Dallas, TX",
  },
  {
    state: "Florida",
    city: "Miami",
    coords: [-80.1918, 25.7617] as [number, number],
    address: "Miami, FL",
  },
  {
    state: "Florida",
    city: "Orlando",
    coords: [-81.3789, 28.5383] as [number, number],
    address: "Orlando, FL",
  },
  {
    state: "Illinois",
    city: "Chicago",
    coords: [-87.6298, 41.8781] as [number, number],
    address: "Chicago, IL",
  },
  {
    state: "Washington",
    city: "Seattle",
    coords: [-122.3321, 47.6062] as [number, number],
    address: "Seattle, WA",
  },
  {
    state: "Colorado",
    city: "Denver",
    coords: [-104.9903, 39.7392] as [number, number],
    address: "Denver, CO",
  },
  {
    state: "Arizona",
    city: "Phoenix",
    coords: [-112.074, 33.4484] as [number, number],
    address: "Phoenix, AZ",
  },
  {
    state: "Georgia",
    city: "Atlanta",
    coords: [-84.388, 33.749] as [number, number],
    address: "Atlanta, GA",
  },
  {
    state: "Massachusetts",
    city: "Boston",
    coords: [-71.0589, 42.3601] as [number, number],
    address: "Boston, MA",
  },
];

// ─── Category Definitions ─────────────────────────────────

const CATEGORIES = [
  {
    value: "creative-design",
    subs: [
      "graphic-design",
      "ui-ux-design",
      "illustration",
      "photography",
      "videography",
      "animation-motion-graphics",
      "fashion-design",
      "interior-design",
    ],
  },
  {
    value: "technology-development",
    subs: [
      "web-development",
      "mobile-app-development",
      "software-engineering",
      "game-development",
      "ai-machine-learning",
      "blockchain-web3",
      "it-support",
      "cybersecurity",
    ],
  },
  {
    value: "marketing-business",
    subs: [
      "digital-marketing",
      "seo-sem",
      "social-media-management",
      "branding-strategy",
      "content-writing",
      "market-research",
      "business-consulting",
      "sales",
    ],
  },
  {
    value: "trades-skilled-work",
    subs: [
      "carpentry",
      "plumbing",
      "electrical-work",
      "welding-fabrication",
      "painting-decorating",
      "construction-renovation",
      "landscaping-gardening",
      "cleaning-services",
    ],
  },
  {
    value: "lifestyle-personal-services",
    subs: [
      "fitness-training",
      "personal-coaching",
      "beauty-wellness",
      "pet-services",
      "event-planning",
      "travel-services",
    ],
  },
  {
    value: "education-learning",
    subs: [
      "tutoring",
      "online-courses",
      "language-learning",
      "test-prep",
      "music-lessons",
      "art-classes",
    ],
  },
  {
    value: "local-opportunities",
    subs: [
      "jobs",
      "house-rentals",
      "car-rentals",
      "garage-sales",
      "community-events",
      "volunteering",
    ],
  },
];

function pickCategory() {
  const cat = pick(CATEGORIES);
  return { category: cat.value, subCategory: pick(cat.subs) };
}

// ─── Realistic Mock Data Templates ───────────────────────
// Large dataset for realistic feel

const POSTS_DATA: { type: string; cat: string; sub: string; title: string; small: string; desc: string }[] = [
  // ── Creative & Design ──────────────────────────
  { type:"post", cat:"creative-design", sub:"graphic-design", title:"Logo & Brand Identity Design — 5+ Years Experience", small:"Professional designer offering custom logo and brand identity packages. Fast turnaround, unlimited revisions.", desc:"I'm a professional graphic designer with over 5 years of experience creating logos, brand guidelines, business cards, and full brand identity systems.\n\nWhat's included:\n- Custom logo design (3 concepts)\n- Brand color palette & typography\n- Business card design\n- Brand guidelines PDF\n- All source files (AI, EPS, PDF, PNG)" },
  { type:"post", cat:"creative-design", sub:"graphic-design", title:"Minimalist Poster & Print Design", small:"Clean, modern poster designs for events, products, and promotions. Quick delivery.", desc:"Graphic designer specializing in minimalist poster and print design. Perfect for event promotions, product launches, and art prints.\n\n- Custom poster design\n- Social media adaptations\n- Print-ready files (300 DPI)\n- 2 revision rounds included\n\nTurnaround: 3-5 business days. Rush orders available." },
  { type:"post", cat:"creative-design", sub:"photography", title:"Professional Headshots & Portrait Photography", small:"Need updated headshots? I offer professional portrait sessions with quick editing turnaround.", desc:"Professional headshot and portrait photographer available for individual or group sessions. Perfect for LinkedIn profiles, corporate websites, acting portfolios.\n\nPackages start at $150 and include:\n- 30-minute session\n- 2 outfit changes\n- Professional lighting setup\n- 10 fully edited digital images" },
  { type:"post", cat:"creative-design", sub:"photography", title:"Real Estate Photography & Virtual Tours", small:"High-quality property photography with drone shots and 3D virtual tours. Same-day delivery.", desc:"Specialized real estate photographer helping agents and property managers showcase listings.\n\nServices:\n- HDR interior & exterior photography\n- Drone aerial photography\n- 3D Matterport virtual tours\n- Video walkthroughs\n- Floor plan creation\n\nSame-day delivery available. Serving the tri-state area." },
  { type:"post", cat:"creative-design", sub:"photography", title:"Food & Product Photography for Restaurants", small:"Make your menu items look irresistible. Professional food photography for menus, websites, and social media.", desc:"Experienced food photographer working with restaurants, cafes, and food brands.\n\nPackages include:\n- Menu item photography (up to 30 dishes)\n- Styled flat lays\n- Ingredient & prep shots\n- Social media content bundle\n- Edited and color-graded images\n\nI bring my own lighting and styling props. Let's make your food look as good as it tastes!" },
  { type:"post", cat:"creative-design", sub:"ui-ux-design", title:"UI/UX Designer — Mobile Apps & Web Platforms", small:"Experienced product designer specializing in mobile-first design. Figma expert.", desc:"UI/UX designer with a focus on mobile app design and responsive web platforms.\n\nServices:\n- User research & persona development\n- Wireframing & prototyping in Figma\n- High-fidelity UI design\n- Design system creation\n- Usability testing" },
  { type:"post", cat:"creative-design", sub:"ui-ux-design", title:"SaaS Dashboard & Admin Panel Design", small:"Designing clean, data-rich dashboards for B2B products. Figma & React component handoff.", desc:"Specialized in designing complex SaaS dashboards, admin panels, and data visualization interfaces.\n\n- Information architecture\n- Dashboard wireframes & mockups\n- Data visualization design\n- Figma component library\n- Developer-ready handoff with specs\n\nI've designed dashboards for fintech, healthcare analytics, and logistics platforms." },
  { type:"post", cat:"creative-design", sub:"videography", title:"Cinematic Wedding & Event Videography", small:"Capturing your special moments with cinematic storytelling. Drone footage included.", desc:"Full-service videography for weddings, corporate events, and special occasions.\n\nPackages include:\n- Full ceremony and reception coverage\n- Drone aerial footage\n- 3-5 minute highlight reel\n- Full-length edited video\n- Color grading and sound design\n\nBooking for 2026 season. Early bird rates available!" },
  { type:"post", cat:"creative-design", sub:"videography", title:"YouTube & Social Media Video Production", small:"End-to-end video production for content creators. Filming, editing, thumbnails, and more.", desc:"Helping YouTubers and content creators produce professional-quality videos.\n\nServices:\n- Multi-camera filming\n- Professional editing (Premiere Pro / DaVinci)\n- Motion graphics & lower thirds\n- Thumbnail design\n- Color grading\n- Sound mixing & music licensing\n\nI've worked with channels from 10K to 2M+ subscribers. Let's level up your content!" },
  { type:"post", cat:"creative-design", sub:"animation-motion-graphics", title:"Motion Graphics for Explainer Videos", small:"Engaging animated explainer videos for your product or service. Script to final delivery.", desc:"Motion graphics designer creating compelling explainer videos, product demos, and social media animations.\n\n- 2D animation & motion graphics\n- Explainer video production (60-90 sec)\n- Logo animation & intros\n- Social media animated content\n- After Effects & Cinema 4D\n\nPricing starts at $500 for a 60-second video. Script assistance available." },
  { type:"post", cat:"creative-design", sub:"illustration", title:"Custom Digital Illustration & Character Design", small:"Unique illustrations for books, games, branding, and personal projects. Various styles available.", desc:"Freelance illustrator offering custom digital artwork.\n\nStyles:\n- Flat vector illustration\n- Semi-realistic digital painting\n- Cartoon & character design\n- Editorial illustration\n- Pattern design\n\nDeliverables include high-res files, vector source, and commercial license. Perfect for children's books, game assets, or brand mascots." },
  { type:"post", cat:"creative-design", sub:"fashion-design", title:"Custom Clothing & Streetwear Design", small:"Original streetwear designs from concept to production. Small batch manufacturing available.", desc:"Fashion designer specializing in streetwear and custom apparel.\n\n- Original graphic tee designs\n- Custom embroidery artwork\n- Tech pack creation\n- Pattern making & grading\n- Small batch production management\n\nI work with independent brands and artists to bring their vision to life. From single pieces to full collections." },
  { type:"post", cat:"creative-design", sub:"interior-design", title:"Interior Design Consultation — Residential", small:"Transform your living space with expert design advice. Virtual and in-person consultations available.", desc:"Certified interior designer offering consultation services for homeowners.\n\nServices:\n- Room layout & space planning\n- Color scheme development\n- Furniture selection & sourcing\n- Lighting design\n- Mood boards & 3D renderings\n\nI offer both full-service design and hourly consultation packages. Specializing in modern, Scandinavian, and mid-century styles." },

  // ── Technology & Development ───────────────────
  { type:"post", cat:"technology-development", sub:"web-development", title:"Full-Stack Web Developer — React, Next.js & Node", small:"Available for freelance projects. Specializing in modern web applications with React and Next.js.", desc:"Full-stack developer with 6+ years of experience building production-ready web applications.\n\nTech stack:\n- Frontend: React, Next.js, TypeScript, Tailwind CSS\n- Backend: Node.js, Express, PostgreSQL, MongoDB\n- Cloud: AWS, Vercel, Docker\n\nI deliver clean, well-tested code with documentation." },
  { type:"post", cat:"technology-development", sub:"web-development", title:"WordPress & Shopify Expert — E-Commerce Specialist", small:"Build or redesign your online store. WordPress, Shopify, and WooCommerce solutions.", desc:"E-commerce developer with 200+ successful store launches.\n\nServices:\n- Shopify store setup & customization\n- WordPress / WooCommerce development\n- Payment gateway integration\n- SEO optimization\n- Speed & performance tuning\n- Migration from other platforms\n\nI help businesses go from zero to selling online in as little as 2 weeks." },
  { type:"post", cat:"technology-development", sub:"web-development", title:"Custom API Development & Backend Systems", small:"Building robust REST and GraphQL APIs for web and mobile applications. Scalable architecture.", desc:"Backend engineer specializing in API development and system architecture.\n\n- REST & GraphQL API design\n- Microservices architecture\n- Database design (PostgreSQL, MongoDB, Redis)\n- Authentication & authorization systems\n- Third-party API integrations\n- Performance optimization\n\nI write well-documented, tested APIs that scale." },
  { type:"post", cat:"technology-development", sub:"mobile-app-development", title:"Cross-Platform Mobile App Development", small:"Building native-quality apps for iOS and Android using React Native and Flutter.", desc:"Mobile app developer offering cross-platform development services.\n\nRecent projects include:\n- E-commerce marketplace app (50k+ downloads)\n- Fitness tracking app with wearable integration\n- Real-time messaging platform\n- Food delivery logistics app\n\nI handle the full lifecycle from design to App Store submission." },
  { type:"post", cat:"technology-development", sub:"mobile-app-development", title:"iOS Native Development — Swift & SwiftUI", small:"Native iOS apps built with Swift and SwiftUI. Apple ecosystem integration specialist.", desc:"Senior iOS developer with 7 years of experience building native Apple apps.\n\n- SwiftUI & UIKit\n- Core Data & CloudKit\n- HealthKit & WatchKit integration\n- Push notifications & background tasks\n- App Store optimization\n- TestFlight beta management\n\nSpecializing in health, finance, and productivity apps." },
  { type:"post", cat:"technology-development", sub:"ai-machine-learning", title:"AI/ML Solutions for Business — Custom Models", small:"Custom AI solutions including chatbots, recommendation engines, and predictive analytics.", desc:"ML engineer helping businesses leverage AI.\n\nServices:\n- Custom chatbot development (GPT-based)\n- Recommendation engine implementation\n- Predictive analytics models\n- Computer vision solutions\n- NLP and text analysis\n\nI work with Python, TensorFlow, PyTorch, and cloud ML services." },
  { type:"post", cat:"technology-development", sub:"ai-machine-learning", title:"AI-Powered Document Processing & Automation", small:"Automate your document workflows with custom AI. Invoice processing, data extraction, and more.", desc:"Building AI solutions for document processing and business automation.\n\n- Invoice & receipt OCR extraction\n- Contract analysis & summarization\n- Automated data entry from PDFs\n- Custom LLM fine-tuning\n- RAG (Retrieval Augmented Generation) systems\n\nReduce manual processing time by 90%. Enterprise clients welcome." },
  { type:"post", cat:"technology-development", sub:"cybersecurity", title:"Cybersecurity Consulting & Penetration Testing", small:"Protect your business with professional security audits and vulnerability assessments.", desc:"Certified cybersecurity consultant for SMBs.\n\nServices:\n- Penetration testing (web, mobile, network)\n- Security audit and compliance review\n- Vulnerability assessment\n- Incident response planning\n- Employee security awareness training\n\nCertifications: CISSP, CEH, OSCP." },
  { type:"post", cat:"technology-development", sub:"software-engineering", title:"DevOps & Cloud Infrastructure Setup", small:"Streamline your deployment pipeline. AWS, GCP, Docker, Kubernetes, and CI/CD setup.", desc:"DevOps engineer helping teams ship faster and more reliably.\n\n- AWS / GCP / Azure setup & management\n- Docker & Kubernetes orchestration\n- CI/CD pipeline (GitHub Actions, GitLab CI)\n- Infrastructure as Code (Terraform, Pulumi)\n- Monitoring & alerting (Datadog, Grafana)\n- Cost optimization\n\nI turn manual deployments into automated, scalable systems." },
  { type:"post", cat:"technology-development", sub:"game-development", title:"Indie Game Developer — Unity & Unreal Engine", small:"Game development services from prototyping to launch. 2D and 3D games for all platforms.", desc:"Game developer with 5 years of experience in Unity and Unreal Engine.\n\n- 2D & 3D game development\n- Multiplayer networking\n- Game UI/UX design\n- VR/AR experiences\n- Mobile game optimization\n- Steam & console publishing\n\nPublished 3 indie titles on Steam. Available for contract work or game jams." },
  { type:"post", cat:"technology-development", sub:"blockchain-web3", title:"Smart Contract Development — Solidity & Rust", small:"Building secure smart contracts and dApps for Ethereum and Solana ecosystems.", desc:"Blockchain developer specializing in DeFi and NFT projects.\n\n- Solidity smart contracts (ERC-20, ERC-721, ERC-1155)\n- Rust smart contracts (Solana, Anchor)\n- Security auditing\n- Frontend dApp integration (ethers.js, wagmi)\n- Token launch & liquidity management\n\nAudited by Trail of Bits standards. Security-first approach." },
  { type:"post", cat:"technology-development", sub:"it-support", title:"Remote IT Support & Helpdesk Services", small:"Fast, reliable IT support for small businesses. Remote and on-site options available.", desc:"Providing IT support services for small to medium businesses.\n\n- Remote helpdesk support\n- Network setup & troubleshooting\n- Microsoft 365 / Google Workspace admin\n- Backup & disaster recovery\n- Hardware procurement & setup\n- VPN & security configuration\n\nFlexible plans: per-incident, monthly retainer, or dedicated support hours." },

  // ── Marketing & Business ───────────────────────
  { type:"post", cat:"marketing-business", sub:"digital-marketing", title:"Results-Driven Digital Marketing Strategy", small:"Helping brands grow with data-backed digital marketing campaigns across all channels.", desc:"Digital marketing strategist with measurable results.\n\n- Google Ads & Meta Ads management\n- Email marketing automation\n- Content marketing & SEO\n- Analytics setup & reporting\n- Conversion rate optimization\n\nRecent result: 340% revenue increase in 6 months for a DTC brand." },
  { type:"post", cat:"marketing-business", sub:"digital-marketing", title:"Google Ads Specialist — eCommerce Focus", small:"Maximize your ROAS with expert Google Ads management. Shopping, Search, and Performance Max.", desc:"Google Ads certified specialist focusing on eCommerce businesses.\n\n- Google Shopping & Merchant Center\n- Search & Display campaigns\n- Performance Max optimization\n- Conversion tracking setup\n- Competitor analysis\n\nManaging $50K-$500K/month in ad spend. Average ROAS: 6.8x across accounts." },
  { type:"post", cat:"marketing-business", sub:"seo-sem", title:"SEO Consultant — Technical & Content Strategy", small:"Improve your search rankings with proven SEO strategies. Technical audits and content planning.", desc:"SEO consultant helping businesses rank higher on Google.\n\n- Technical SEO audit & fixes\n- Keyword research & content strategy\n- On-page optimization\n- Link building outreach\n- Local SEO (Google Business Profile)\n- Monthly reporting & analysis\n\nI've helped 40+ clients achieve page 1 rankings for competitive keywords." },
  { type:"post", cat:"marketing-business", sub:"social-media-management", title:"Social Media Management — Content & Growth", small:"Done-for-you social media management. Content creation, engagement, and growth.", desc:"Full-service social media manager.\n\nPlatforms: Instagram, TikTok, LinkedIn, Twitter/X, Facebook\n\nMonthly packages include:\n- Content calendar planning\n- 20-30 posts per month\n- Short-form video content\n- Hashtag research\n- Monthly analytics report" },
  { type:"post", cat:"marketing-business", sub:"social-media-management", title:"TikTok & Instagram Reels Strategy", small:"Short-form video strategy and content creation to grow your brand on TikTok and Instagram.", desc:"Social media strategist specializing in short-form video content.\n\n- TikTok content strategy\n- Instagram Reels creation\n- Trend identification & adaptation\n- Hashtag & sound strategy\n- Creator collaboration management\n- Analytics & performance tracking\n\nGrown 5 accounts from 0 to 100K+ followers in under 6 months." },
  { type:"post", cat:"marketing-business", sub:"content-writing", title:"Professional Copywriting & Content Creation", small:"SEO-optimized blog posts, website copy, and email sequences that convert.", desc:"Professional copywriter for tech companies and SaaS brands.\n\n- Blog posts & articles (SEO-optimized)\n- Website copy & landing pages\n- Email marketing sequences\n- Case studies & whitepapers\n- Social media copy\n\nContent that ranks AND converts." },
  { type:"post", cat:"marketing-business", sub:"branding-strategy", title:"Brand Strategy & Positioning Workshop", small:"Define your brand's unique value proposition. Half-day workshops for startups and growing businesses.", desc:"Brand strategist helping businesses find their voice and position in the market.\n\nWorkshop includes:\n- Brand audit & competitive analysis\n- Mission, vision, values alignment\n- Target audience definition\n- Unique value proposition development\n- Brand messaging framework\n- Brand voice & tone guidelines\n\nDeliverable: Comprehensive brand strategy document." },
  { type:"post", cat:"marketing-business", sub:"business-consulting", title:"Startup Growth Consulting — Series A Ready", small:"Helping startups prepare for funding rounds. Go-to-market strategy, metrics, and pitch deck review.", desc:"Former VC analyst turned startup consultant.\n\n- Go-to-market strategy\n- Unit economics & financial modeling\n- Pitch deck review & coaching\n- Investor intro network\n- Product-market fit analysis\n- Growth metrics dashboard setup\n\nHelped 15+ startups raise $50M+ combined in seed and Series A rounds." },
  { type:"post", cat:"marketing-business", sub:"market-research", title:"Market Research & Competitive Analysis", small:"Data-driven market insights to inform your business strategy. Surveys, analysis, and reports.", desc:"Market research professional providing actionable business intelligence.\n\n- Industry analysis & trends\n- Competitor benchmarking\n- Customer survey design & analysis\n- Focus group facilitation\n- Market sizing & TAM/SAM/SOM\n- Custom research reports\n\nClients include Fortune 500 companies and funded startups." },
  { type:"post", cat:"marketing-business", sub:"sales", title:"B2B Sales Development & Lead Generation", small:"Outsource your SDR function. Cold email, LinkedIn outreach, and appointment setting.", desc:"Sales development agency specializing in B2B SaaS and tech companies.\n\n- Ideal Customer Profile (ICP) development\n- Lead list building (ZoomInfo, Apollo)\n- Cold email copywriting & sequences\n- LinkedIn Sales Navigator outreach\n- CRM setup (HubSpot, Salesforce)\n- Appointment setting & qualification\n\nAverage: 15-25 qualified meetings per month for our clients." },

  // ── Trades & Skilled Work ──────────────────────
  { type:"post", cat:"trades-skilled-work", sub:"construction-renovation", title:"Home Renovation & Remodeling — Licensed Contractor", small:"Full-service home renovation. Kitchens, bathrooms, basements, and more. Free estimates.", desc:"Licensed general contractor with 12+ years of experience.\n\n- Kitchen remodeling\n- Bathroom renovation\n- Basement finishing\n- Room additions\n- Flooring installation\n- Custom cabinetry\n\nAll work backed by a 2-year warranty. Free estimates." },
  { type:"post", cat:"trades-skilled-work", sub:"construction-renovation", title:"Deck & Patio Construction — Custom Outdoor Living", small:"Custom decks, pergolas, and outdoor kitchens. Composite and natural wood options.", desc:"Outdoor living specialist building custom decks and patios.\n\n- Composite & hardwood decking\n- Covered pergolas & gazebos\n- Outdoor kitchen construction\n- Fire pit installations\n- Railings & stairs\n- Permit handling\n\n15+ years experience. Licensed, bonded, insured. Free design consultation." },
  { type:"post", cat:"trades-skilled-work", sub:"electrical-work", title:"Licensed Electrician — Residential & Commercial", small:"Certified electrician for all your electrical needs. Same-day service available.", desc:"Licensed master electrician for homes and businesses.\n\n- Panel upgrades & rewiring\n- Lighting installation\n- EV charger installation\n- Generator installation\n- Code compliance\n\nEmergency 24/7 service. Fully licensed, bonded, insured." },
  { type:"post", cat:"trades-skilled-work", sub:"plumbing", title:"Professional Plumber — Emergency & Scheduled Service", small:"Licensed plumber for repairs, installations, and emergencies. Fast response times.", desc:"Licensed plumber with 10+ years of experience.\n\n- Leak detection & repair\n- Drain cleaning & unclogging\n- Water heater installation\n- Bathroom & kitchen plumbing\n- Sewer line repair\n- Fixture installation\n\n24/7 emergency service. No call-out fees for scheduled work." },
  { type:"post", cat:"trades-skilled-work", sub:"landscaping-gardening", title:"Professional Landscaping & Garden Design", small:"Transform your outdoor space. Custom landscape design, installation, and maintenance.", desc:"Professional landscaping company.\n\n- Landscape design & planning\n- Lawn installation (sod & seed)\n- Hardscaping (patios, walkways)\n- Irrigation system installation\n- Seasonal maintenance programs\n- Outdoor lighting design" },
  { type:"post", cat:"trades-skilled-work", sub:"painting-decorating", title:"Interior & Exterior Painting — Premium Finishes", small:"Professional painting services using top-quality Benjamin Moore and Sherwin-Williams paints.", desc:"Professional painting company serving residential and commercial clients.\n\n- Interior & exterior painting\n- Cabinet refinishing\n- Wallpaper installation & removal\n- Color consultation\n- Drywall repair\n- Pressure washing\n\nUsing only premium paints. Clean, efficient, and detail-oriented. Free color consultation included." },
  { type:"post", cat:"trades-skilled-work", sub:"welding-fabrication", title:"Custom Metal Fabrication & Welding", small:"Custom metalwork: gates, railings, furniture, and artistic pieces. MIG, TIG, and stick welding.", desc:"Custom metal fabrication shop offering:\n\n- Ornamental gates & fences\n- Staircase railings\n- Custom furniture (tables, shelving)\n- Structural steel work\n- Repair & restoration\n- Artistic metalwork\n\nMIG, TIG, and stick welding. Working with steel, aluminum, and stainless. Shop or on-site work available." },
  { type:"post", cat:"trades-skilled-work", sub:"carpentry", title:"Custom Woodworking & Furniture Making", small:"Handcrafted furniture and custom woodworking. Tables, shelves, cabinets, and more.", desc:"Custom woodworker creating one-of-a-kind furniture and built-ins.\n\n- Dining tables & desks\n- Built-in bookshelves & entertainment centers\n- Kitchen cabinetry\n- Floating shelves\n- Bathroom vanities\n- Restoration of antique furniture\n\nEach piece is made to order using locally sourced hardwoods. Visit my workshop to see samples." },
  { type:"post", cat:"trades-skilled-work", sub:"cleaning-services", title:"Professional Deep Cleaning Services", small:"Residential and commercial deep cleaning. Move-in/out cleaning, regular maintenance available.", desc:"Professional cleaning service offering:\n\n- Deep cleaning (one-time)\n- Regular maintenance cleaning (weekly/biweekly)\n- Move-in/move-out cleaning\n- Post-construction cleanup\n- Office & commercial cleaning\n- Carpet & upholstery cleaning\n\nEco-friendly products used. All cleaners are background-checked and insured. Online booking available." },

  // ── Lifestyle & Personal Services ──────────────
  { type:"post", cat:"lifestyle-personal-services", sub:"fitness-training", title:"Certified Personal Trainer — In-Home & Online", small:"Customized workout plans and nutrition guidance. First session free!", desc:"NASM-certified personal trainer.\n\n- Custom workout programming\n- Nutrition guidance & meal planning\n- Weekly check-ins and progress tracking\n- Form correction\n\nAll fitness levels welcome. In-home and virtual sessions." },
  { type:"post", cat:"lifestyle-personal-services", sub:"fitness-training", title:"Yoga Instructor — Private & Group Classes", small:"Vinyasa, Hatha, and Restorative yoga. Bring mindfulness to your daily routine.", desc:"Certified yoga instructor (RYT-500) offering private and group classes.\n\n- Vinyasa flow\n- Hatha yoga\n- Restorative & yin yoga\n- Prenatal yoga\n- Corporate wellness sessions\n- Meditation & breathwork\n\nPrivate sessions at your home, office, or outdoors. Group classes also available at local studios." },
  { type:"post", cat:"lifestyle-personal-services", sub:"personal-coaching", title:"Life & Career Coach — Unlock Your Potential", small:"ICF-certified coach helping professionals navigate career transitions and personal growth.", desc:"Certified life and career coach (ICF PCC) with 500+ coaching hours.\n\n- Career transition planning\n- Leadership development\n- Work-life balance\n- Goal setting & accountability\n- Confidence building\n- Interview preparation\n\nI help professionals get unstuck and create meaningful change. Free 30-minute discovery call." },
  { type:"post", cat:"lifestyle-personal-services", sub:"beauty-wellness", title:"Mobile Hair Stylist & Makeup Artist", small:"Bridal, editorial, and everyday glam. I come to you!", desc:"Licensed cosmetologist offering mobile hair and makeup services.\n\n- Bridal hair & makeup\n- Special event styling\n- Hair coloring & highlights\n- Keratin treatments\n- Extensions installation\n\nUsing professional, cruelty-free products. Bridal packages with group rates available." },
  { type:"post", cat:"lifestyle-personal-services", sub:"beauty-wellness", title:"Licensed Massage Therapist — Therapeutic & Relaxation", small:"Relaxation, deep tissue, and sports massage. Mobile service to your home or office.", desc:"Licensed massage therapist with 8 years of experience.\n\n- Swedish/relaxation massage\n- Deep tissue massage\n- Sports massage\n- Prenatal massage\n- Hot stone therapy\n- Cupping therapy\n\nMobile service — I bring the spa to you. Portable table, linens, oils, and music all included." },
  { type:"post", cat:"lifestyle-personal-services", sub:"pet-services", title:"Reliable Pet Sitting & Dog Walking Services", small:"Loving care for your pets while you're away. Insured and background-checked.", desc:"Professional pet sitter and dog walker.\n\n- Daily dog walking (30min or 1hr)\n- Overnight pet sitting\n- Drop-in visits (feeding, medication)\n- Puppy care & socialization\n- Cat sitting\n- Pet taxi (vet appointments)\n\nFully insured. Photo & GPS updates during every walk." },
  { type:"post", cat:"lifestyle-personal-services", sub:"pet-services", title:"Professional Dog Grooming — Mobile Service", small:"Full-service dog grooming at your doorstep. Bathing, haircuts, nail trimming, and more.", desc:"Mobile dog grooming service bringing the salon to your driveway.\n\n- Full bath & blow dry\n- Breed-specific haircuts\n- Nail trimming & grinding\n- Ear cleaning\n- Teeth brushing\n- De-shedding treatments\n\nStress-free grooming in a climate-controlled van. One dog at a time for personalized attention." },
  { type:"post", cat:"lifestyle-personal-services", sub:"event-planning", title:"Event Planning & Coordination Services", small:"From intimate gatherings to large celebrations. Full-service event planning and day-of coordination.", desc:"Professional event planner specializing in weddings, corporate events, and milestone celebrations.\n\n- Full-service event planning\n- Day-of coordination\n- Vendor management\n- Budget planning\n- Venue selection\n- Decor & theme design\n\n150+ events successfully planned. Let me handle the stress so you can enjoy the moment." },
  { type:"post", cat:"lifestyle-personal-services", sub:"travel-services", title:"Custom Travel Itineraries & Trip Planning", small:"Personalized travel planning for your dream vacation. Local insights and hidden gems.", desc:"Travel consultant creating custom itineraries for unforgettable trips.\n\n- Personalized day-by-day itineraries\n- Hotel & restaurant recommendations\n- Activity & tour booking\n- Budget optimization\n- Travel insurance guidance\n- 24/7 support during your trip\n\nSpecializing in Europe, Southeast Asia, and Latin America. I plan the trip, you make the memories." },

  // ── Education & Learning ───────────────────────
  { type:"post", cat:"education-learning", sub:"tutoring", title:"Math & Science Tutoring — All Levels", small:"Experienced tutor for middle school through college-level math and science.", desc:"Tutor specializing in mathematics and sciences.\n\n- Algebra, Geometry, Calculus\n- AP Math & Physics\n- SAT/ACT Math Prep\n\nMaster's in Applied Math. Average 1.5 letter grade improvement." },
  { type:"post", cat:"education-learning", sub:"tutoring", title:"SAT/ACT Test Prep — Guaranteed Score Improvement", small:"Structured test prep with proven methods. 200+ point SAT improvement average.", desc:"Test prep tutor with 6 years of experience and hundreds of successful students.\n\n- SAT Math & Reading/Writing\n- ACT all sections\n- Custom study plans\n- Practice test analysis\n- Test-taking strategies\n\nAverage improvement: 210 points on SAT, 4 points on ACT. Money-back guarantee if no improvement." },
  { type:"post", cat:"education-learning", sub:"music-lessons", title:"Guitar Lessons — Beginner to Advanced", small:"Learn guitar at your own pace. Acoustic, electric, and classical. All ages welcome.", desc:"Professional guitar instructor with 15 years of experience.\n\n- Acoustic, electric, classical guitar\n- Music theory & songwriting\n- All ages (7 to 70)\n\nIn-person and online lessons available." },
  { type:"post", cat:"education-learning", sub:"music-lessons", title:"Piano Lessons for All Ages — Classical & Contemporary", small:"Patient piano teacher offering lessons in classical, jazz, and pop styles. Recital opportunities.", desc:"Classically trained pianist offering lessons for students of all ages and levels.\n\n- Classical piano technique\n- Jazz & contemporary styles\n- Music theory & ear training\n- Performance preparation\n- ABRSM & RCM exam prep\n\nStudents perform in biannual recitals. Lessons at my studio or your home." },
  { type:"post", cat:"education-learning", sub:"language-learning", title:"Spanish Language Tutor — Native Speaker", small:"Conversational and academic Spanish lessons. Certified teacher with 6 years experience.", desc:"Native Spanish speaker offering personalized lessons.\n\n- Conversational Spanish\n- Business Spanish\n- DELE exam preparation\n- Cultural immersion activities\n\nOnline and in-person. Group discounts for 2+." },
  { type:"post", cat:"education-learning", sub:"language-learning", title:"Mandarin Chinese Lessons — HSK Exam Prep", small:"Native Mandarin teacher for beginners to advanced. Business Chinese and HSK exam preparation.", desc:"Native Mandarin speaker with a teaching certification and 5 years of experience.\n\n- Beginner to advanced levels\n- Conversational Mandarin\n- Business Chinese\n- HSK exam preparation (all levels)\n- Chinese calligraphy introduction\n\nI make learning Mandarin fun and practical with real-world dialogues and cultural context." },
  { type:"post", cat:"education-learning", sub:"online-courses", title:"Data Science Bootcamp — Python & SQL", small:"12-week online bootcamp covering Python, SQL, pandas, and machine learning fundamentals.", desc:"Comprehensive data science bootcamp for career changers and upskilling professionals.\n\nCurriculum:\n- Weeks 1-3: Python programming fundamentals\n- Weeks 4-6: SQL & database management\n- Weeks 7-9: Data analysis with pandas & visualization\n- Weeks 10-12: Machine learning with scikit-learn\n\nIncludes: Live sessions, recorded lectures, hands-on projects, career coaching, and certificate." },
  { type:"post", cat:"education-learning", sub:"art-classes", title:"Pottery & Ceramics Workshop — Beginner Friendly", small:"Learn to throw on the wheel and hand-build with clay. All materials and firing included.", desc:"Ceramics studio offering beginner-friendly pottery classes.\n\n- Wheel throwing basics\n- Hand-building techniques\n- Glazing & finishing\n- 6-week course or single workshops\n- All materials & kiln firing included\n- Take home 4-6 finished pieces\n\nSmall class sizes (max 8). Therapeutic, creative, and fun!" },
  { type:"post", cat:"education-learning", sub:"test-prep", title:"GMAT/GRE Prep — Score in the 90th Percentile", small:"Structured prep for graduate school admissions tests. Verbal, quant, and analytical writing.", desc:"Experienced test prep instructor specializing in GMAT and GRE.\n\n- Diagnostic assessment\n- Custom study plan\n- Quantitative & verbal strategies\n- Analytical writing coaching\n- 8 full-length practice tests\n- Weekly 1-on-1 sessions\n\nAverage student scores: GMAT 720+, GRE 325+. 90% of students exceed their target score." },

  // ── Local Opportunities ────────────────────────
  { type:"post", cat:"local-opportunities", sub:"jobs", title:"Hiring: Junior Web Developer — Remote Friendly", small:"Growing startup looking for a motivated junior developer. Competitive salary + equity.", desc:"Series A startup looking for a junior web developer.\n\n- 1+ years React/Vue experience\n- TypeScript familiarity\n- $70K-$90K salary + equity\n- Remote-first culture\n- Health, dental, vision insurance" },
  { type:"post", cat:"local-opportunities", sub:"jobs", title:"Barista Wanted — Specialty Coffee Shop", small:"Looking for a passionate barista to join our team. Latte art skills a plus!", desc:"Independent specialty coffee shop hiring a full-time barista.\n\nRequirements:\n- 1+ year barista experience preferred\n- Passion for specialty coffee\n- Friendly & customer-oriented\n- Available weekends\n\nPerks:\n- $18-$22/hr + tips\n- Free coffee & food discount\n- Flexible scheduling\n- Barista training & SCA certification\n\nApply in person or send your resume!" },
  { type:"post", cat:"local-opportunities", sub:"jobs", title:"Hiring: Marketing Manager — SaaS Startup", small:"B2B SaaS company seeking an experienced marketing manager. Hybrid role, competitive comp.", desc:"Fast-growing B2B SaaS company ($5M ARR) hiring a Marketing Manager.\n\nRole:\n- Own demand generation strategy\n- Manage $200K/quarter ad budget\n- Content marketing oversight\n- Team of 3 direct reports\n\nRequirements:\n- 4+ years B2B marketing experience\n- SaaS background preferred\n- Data-driven mindset\n\nComp: $110K-$140K + bonus + equity. Hybrid (3 days/week in office)." },
  { type:"post", cat:"local-opportunities", sub:"house-rentals", title:"Spacious 2BR Apartment — Downtown, Pet Friendly", small:"Newly renovated 2-bedroom apartment. In-unit laundry, parking included.", desc:"2BR/1BA apartment in downtown.\n\n- 950 sq ft open floor plan\n- In-unit washer/dryer\n- Modern kitchen\n- Hardwood floors\n- One parking spot\n- Pet-friendly\n\nRent: $1,850/month. Available March 1, 2026." },
  { type:"post", cat:"local-opportunities", sub:"house-rentals", title:"Cozy Studio Apartment Near University", small:"Furnished studio perfect for students or young professionals. All utilities included.", desc:"Furnished studio apartment walking distance to campus.\n\n- 400 sq ft\n- Fully furnished (bed, desk, couch)\n- Kitchenette with microwave & mini fridge\n- WiFi & all utilities included\n- Laundry in building\n- Secure entry\n\nRent: $950/month (all inclusive). 6 or 12-month lease available." },
  { type:"post", cat:"local-opportunities", sub:"house-rentals", title:"3BR House with Backyard — Family Friendly", small:"Charming 3-bedroom house in quiet neighborhood. Large fenced yard, 2-car garage.", desc:"Single-family home available for rent in a family-friendly neighborhood.\n\n- 3 bedrooms, 2 bathrooms\n- 1,400 sq ft\n- Large fenced backyard\n- 2-car garage\n- Updated kitchen & bathrooms\n- Central AC/heating\n- Washer/dryer hookups\n\nRent: $2,400/month. Pets negotiable. Available immediately." },
  { type:"post", cat:"local-opportunities", sub:"car-rentals", title:"Rent My Tesla Model Y — Weekly/Monthly Rates", small:"2024 Tesla Model Y for rent. Autopilot included, home charging setup provided.", desc:"Renting my Tesla Model Y Long Range while I work overseas.\n\n- 2024 Model Y Long Range\n- Pearl White / Black interior\n- Autopilot included\n- ~310 mile range\n- Home charger available\n\nRates: $300/week or $1,100/month. Insurance through Turo or personal coverage. Minimum 1 week rental." },
  { type:"post", cat:"local-opportunities", sub:"garage-sales", title:"Moving Sale — Furniture, Electronics & More", small:"Everything must go! Quality furniture, kitchen appliances, and electronics.", desc:"Moving out of state! All items in excellent condition.\n\n- Leather sectional sofa — $400\n- 55\" Samsung 4K TV — $250\n- Dining table + 6 chairs — $350\n- Queen mattress — $200\n- KitchenAid mixer — $150\n\nSaturday & Sunday, 9AM-4PM. Cash and Venmo accepted." },
  { type:"post", cat:"local-opportunities", sub:"garage-sales", title:"Estate Sale — Antiques, Art & Collectibles", small:"50+ years of collected treasures. Antique furniture, vintage art, rare books, and more.", desc:"Estate sale featuring decades of carefully collected items.\n\n- Antique oak furniture (1890s-1930s)\n- Original oil paintings & prints\n- Vintage jewelry collection\n- First edition books\n- Vinyl records (60s-80s rock & jazz)\n- China sets & crystal\n- Tools & garden equipment\n\nThree-day sale: Friday-Sunday, 8AM-5PM. Everything priced to sell." },
  { type:"post", cat:"local-opportunities", sub:"community-events", title:"Weekly Board Game Night — All Welcome!", small:"Every Wednesday at 7 PM at the community center. Bring your favorites or try something new.", desc:"Join our friendly weekly board game night!\n\n- Every Wednesday, 7 PM - 10 PM\n- Community Center, Room 204\n- Games provided (200+ game library)\n- Bring your own welcome too\n- Snacks available, BYOB\n- All skill levels welcome\n\nRegulars include Catan, Wingspan, Ticket to Ride, and many more. New faces always welcome!" },
  { type:"post", cat:"local-opportunities", sub:"volunteering", title:"Beach Cleanup Volunteers Needed — Saturday Mornings", small:"Help keep our coastline clean! Monthly beach cleanup events. Supplies and coffee provided.", desc:"Volunteer for our monthly beach cleanup initiative!\n\n- First Saturday of each month\n- 8 AM - 11 AM\n- Meet at the main beach parking lot\n- Gloves, bags, and grabbers provided\n- Free coffee & donuts\n- Community service hours available for students\n\nAll ages welcome (under 16 with parent). Let's protect our ocean together!" },
];

const EVENTS_DATA: { cat: string; sub: string; title: string; small: string; desc: string }[] = [
  { cat:"creative-design", sub:"photography", title:"Street Photography Walk — Downtown District", small:"Guided photo walk through the city's most photogenic streets. All skill levels.", desc:"Explore the city through your lens!\n\n- 3-hour guided walk\n- Tips on composition & lighting\n- Small group (max 12)\n- Post-walk photo review at a local cafe\n\nBring your camera and comfortable shoes." },
  { cat:"creative-design", sub:"photography", title:"Golden Hour Portrait Meetup", small:"Join fellow photographers for a sunset portrait session at the waterfront. Models provided.", desc:"Monthly portrait photography meetup during golden hour.\n\n- 2 professional models\n- Reflectors & portable lighting available\n- 5 PM - 7:30 PM at the waterfront park\n- Bring your own camera gear\n- Image sharing group for post-processing tips\n\nFree for all skill levels. Great networking opportunity!" },
  { cat:"creative-design", sub:"illustration", title:"Live Figure Drawing Session — Open Studio Night", small:"Guided figure drawing with live model. Bring your own supplies. All skill levels.", desc:"Monthly open studio figure drawing session!\n\n- 6:30 PM — Warm-up gestures (2-min poses)\n- 7:00 PM — Short poses (5-10 min)\n- 8:00 PM — Long poses (20-30 min)\n- 9:00 PM — Group critique (optional)\n\n$15 per session. Limited to 20 artists." },
  { cat:"creative-design", sub:"graphic-design", title:"Design Systems Workshop — From Tokens to Components", small:"Full-day workshop on building scalable design systems in Figma. Hands-on exercises.", desc:"Learn to build a production-ready design system from scratch.\n\n- Design tokens & variables\n- Component architecture\n- Auto-layout best practices\n- Documentation strategies\n- Developer handoff workflow\n\n9 AM - 5 PM. Lunch included. Bring your laptop with Figma installed." },
  { cat:"technology-development", sub:"web-development", title:"React + Next.js Workshop — Build a Full-Stack App", small:"Hands-on workshop: Build and deploy a full-stack app with React, Next.js, and PostgreSQL.", desc:"Full-day workshop building a complete web application.\n\n- Next.js 15 with TypeScript\n- Server Components and Server Actions\n- Database integration with Drizzle ORM\n- Authentication with Auth.js\n- Deploying to Vercel\n\nPrereqs: Basic JS/TS knowledge. Limited to 30 seats." },
  { cat:"technology-development", sub:"web-development", title:"Frontend Performance Optimization Talk", small:"Learn how to make your web apps blazing fast. Core Web Vitals, lazy loading, and caching strategies.", desc:"Evening tech talk on frontend performance.\n\n- Understanding Core Web Vitals\n- Image & font optimization\n- Code splitting & lazy loading\n- Caching strategies\n- Real-world case studies\n\n6:30 PM - 8:30 PM. Free pizza and drinks. Q&A session included." },
  { cat:"technology-development", sub:"ai-machine-learning", title:"AI Hackathon — Build with LLMs in 24 Hours", small:"24-hour hackathon building real products with LLMs. Prizes worth $5K.", desc:"Build the next big AI product in 24 hours!\n\n- Teams: 2-4 people\n- Theme: Practical AI tools\n- 1st Place: $2,500 + mentorship\n- 2nd: $1,500 / 3rd: $1,000\n\nAPI credits from OpenAI, Anthropic, Google. Food provided. Free entry!" },
  { cat:"technology-development", sub:"mobile-app-development", title:"Flutter Meetup — State Management Deep Dive", small:"Monthly Flutter developer meetup. This month: comparing Riverpod, Bloc, and Provider.", desc:"Join our monthly Flutter developer meetup!\n\nThis month's topic: State Management\n- Riverpod vs Bloc vs Provider\n- Live coding comparisons\n- Performance benchmarks\n- Q&A with experienced Flutter devs\n\n7 PM - 9 PM. Snacks and drinks provided. Remote attendance via Zoom also available." },
  { cat:"technology-development", sub:"cybersecurity", title:"Capture The Flag (CTF) Competition", small:"Test your hacking skills in a beginner-friendly CTF competition. Prizes and free swag.", desc:"Annual cybersecurity CTF competition!\n\n- Categories: Web, Crypto, Forensics, Reverse Engineering\n- Beginner, Intermediate, and Advanced tracks\n- Solo or teams of up to 3\n- 10 AM - 6 PM\n\nPrizes:\n- 1st: $500 + mechanical keyboard\n- 2nd: $300\n- 3rd: $150\n- All participants get a t-shirt\n\nLaptop required. VPN setup instructions provided." },
  { cat:"marketing-business", sub:"digital-marketing", title:"Digital Marketing Masterclass — From Zero to ROI", small:"Proven strategies for Google Ads, Meta Ads, and email marketing. Live case studies.", desc:"Full-day masterclass on digital marketing for 2026.\n\n- Google Ads: Search, Display & Performance Max\n- Meta Ads: Creative strategy & targeting\n- Email marketing automation\n- Analytics & attribution\n\nIncludes actionable templates and frameworks." },
  { cat:"marketing-business", sub:"social-media-management", title:"Content Creator Economy Panel Discussion", small:"Hear from successful creators about building an audience and monetizing content in 2026.", desc:"Panel discussion with 5 successful content creators (100K-2M followers).\n\nTopics:\n- Platform selection strategy\n- Content creation workflows\n- Monetization beyond sponsorships\n- Building a personal brand\n- Dealing with algorithm changes\n\n7 PM - 9 PM. Networking reception afterward. Limited to 100 attendees." },
  { cat:"marketing-business", sub:"branding-strategy", title:"Brand Storytelling Workshop", small:"Learn to craft compelling brand narratives that connect with your audience emotionally.", desc:"Interactive workshop on brand storytelling.\n\n- The science of storytelling\n- Finding your brand's origin story\n- Customer journey narratives\n- Content frameworks for storytelling\n- Hands-on exercises with your own brand\n\n10 AM - 2 PM. Lunch included. Bring your brand materials for live feedback." },
  { cat:"lifestyle-personal-services", sub:"fitness-training", title:"Community Fitness Bootcamp — Free Saturday Sessions", small:"Free outdoor bootcamp every Saturday at 8 AM. All fitness levels welcome.", desc:"Free community bootcamp every Saturday!\n\n- 8:00 AM - 9:00 AM\n- Central Park, south entrance\n- Bring water bottle & towel\n- All levels welcome\n\nLed by certified trainers. No registration needed!" },
  { cat:"lifestyle-personal-services", sub:"fitness-training", title:"5K Fun Run — Charity Event for Local Shelters", small:"Annual charity 5K run/walk supporting local animal shelters. Medals for all finishers.", desc:"Annual charity 5K run/walk!\n\n- Date: Last Saturday of the month\n- Start: 9 AM at City Park\n- Registration: $30 (all proceeds to animal shelters)\n- Finisher medals for everyone\n- Post-race party with food trucks\n- Pet-friendly (leashed dogs welcome!)\n\nWalkers welcome. Strollers OK. Register online or day-of." },
  { cat:"lifestyle-personal-services", sub:"event-planning", title:"Outdoor Movie Night — Free Community Event", small:"Bring blankets and snacks for a free outdoor movie screening under the stars.", desc:"Monthly outdoor movie night in the park!\n\n- Free admission\n- Movie starts at sunset (~8 PM)\n- Bring blankets, chairs, and snacks\n- Popcorn and hot chocolate for sale\n- Different movie each month (voted by community)\n\nThis month: The Grand Budapest Hotel\n\nRain date: Following Saturday." },
  { cat:"education-learning", sub:"art-classes", title:"Watercolor Painting for Beginners — 4-Week Course", small:"Learn watercolor fundamentals in this relaxing evening course. All materials provided.", desc:"4-week beginner watercolor course!\n\n- Week 1: Color theory and basic washes\n- Week 2: Wet-on-wet technique\n- Week 3: Painting botanicals\n- Week 4: Complete a landscape\n\nThursdays, 6:30-8:30 PM. All materials included. Max 10 students." },
  { cat:"education-learning", sub:"online-courses", title:"Python for Data Science — Free Intro Workshop", small:"2-hour intro to Python for aspiring data scientists. No coding experience needed.", desc:"Free introductory workshop on Python for data science.\n\n- Setting up your environment\n- Python basics (variables, loops, functions)\n- Introduction to pandas\n- Your first data visualization\n- Next steps for continued learning\n\nSaturday, 10 AM - 12 PM. Bring your laptop. All software is free." },
  { cat:"education-learning", sub:"language-learning", title:"Spanish Conversation Circle — Weekly Meetup", small:"Practice your Spanish in a relaxed setting. All levels welcome. Native speakers lead discussions.", desc:"Weekly Spanish conversation practice!\n\n- Every Tuesday, 6:30 PM - 8 PM\n- Tables grouped by level (beginner/intermediate/advanced)\n- Led by native Spanish speakers\n- Free at the public library\n- Coffee and snacks provided\n\nNo registration needed. Come practice and make friends!" },
  { cat:"local-opportunities", sub:"community-events", title:"Neighborhood Farmers Market — Opening Day!", small:"Fresh produce, artisan goods, live music, and food trucks. Every Sunday.", desc:"Weekly neighborhood farmers market!\n\n- 30+ local vendors\n- Fresh fruits, vegetables, herbs\n- Artisan bread, cheese, honey\n- Live music & food trucks\n- Kids activities\n\nEvery Sunday, 9 AM - 2 PM. Dogs on leash welcome." },
  { cat:"local-opportunities", sub:"community-events", title:"Local Small Business Expo & Networking", small:"Meet 50+ local small businesses. Free tastings, demos, and exclusive discounts.", desc:"Annual small business expo showcasing the best of our local community!\n\n- 50+ local businesses exhibiting\n- Live product demos\n- Free food tastings\n- Exclusive show discounts\n- Networking lounge\n- Kids craft corner\n\nSaturday, 10 AM - 4 PM at the Convention Center. Free admission." },
  { cat:"local-opportunities", sub:"community-events", title:"Open Mic Night — Comedy, Music & Poetry", small:"Share your talent or just enjoy the show. Every first Friday at The Loft Café.", desc:"Monthly open mic night celebrating local talent!\n\n- Comedy, music, poetry, spoken word\n- 10-minute slots available\n- Sign up at the door or in advance\n- Full coffee & bar menu\n- 7 PM - 10 PM\n\nFirst Friday of every month at The Loft Café. No cover charge." },
  { cat:"trades-skilled-work", sub:"construction-renovation", title:"Home Improvement Workshop — DIY Basics", small:"Learn essential home repair skills. Drywall, basic plumbing, electrical safety, and more.", desc:"Hands-on DIY home improvement workshop!\n\n- Drywall patching & painting\n- Basic plumbing (fixing leaks, unclogging)\n- Electrical safety & outlet replacement\n- Tool basics & what to buy first\n- When to call a pro vs. DIY\n\nSaturday, 9 AM - 1 PM. All tools and materials provided. $25 per person." },
  { cat:"trades-skilled-work", sub:"landscaping-gardening", title:"Spring Garden Planning Workshop", small:"Plan your spring garden with master gardeners. Seed starting, companion planting, and soil prep.", desc:"Get ready for spring planting season!\n\n- Seed starting indoors\n- Garden bed preparation\n- Companion planting guide\n- Organic pest management\n- Seasonal planting calendar for our zone\n\nSunday, 10 AM - 12 PM at the Community Garden. Free event. Take home seed packets!" },
];

// transactionType: straight_price | seller_auction | buyer_auction
interface ExchangeItem {
  cat: string; sub: string; title: string; desc: string;
  transactionType: "straight_price" | "seller_auction" | "buyer_auction";
  listPrice?: number;       // for straight_price
  startingPrice?: number;   // for seller_auction (starting bid) or buyer_auction (max budget)
  maxPrice?: number;        // for seller_auction (buy-now / reserve)
  minPrice?: number;        // optional floor
  currentBid?: number;      // simulate existing bids
  status: string;
  address: string;          // detailed street address
}

const EXCHANGE_DATA: ExchangeItem[] = [
  // ── straight_price — fixed price listings ──
  { cat:"technology-development", sub:"software-engineering", title:"MacBook Pro 16\" M3 Max — Like New", desc:"MacBook Pro 16\" M3 Max, 36GB RAM, 1TB SSD. 4 months old, barely used. AppleCare+ until 2028. Battery cycle count under 30. Comes with original box and 96W charger.", transactionType:"straight_price", listPrice:2600, status:"active", address:"1423 Wilshire Blvd, Los Angeles, CA 90017" },
  { cat:"technology-development", sub:"software-engineering", title:"Dell XPS 15 — Excellent for Development", desc:"Dell XPS 15 (2024), i7-13700H, 32GB RAM, 1TB SSD, OLED display. Perfect for development work. Includes USB-C dock and carrying case.", transactionType:"straight_price", listPrice:1050, status:"active", address:"782 Congress Ave, Austin, TX 78701" },
  { cat:"creative-design", sub:"graphic-design", title:"iPad Pro 12.9\" + Apple Pencil 2 — Artist Setup", desc:"iPad Pro 12.9\" M2, 256GB + Apple Pencil 2 + Paperlike screen protector. Procreate installed. Battery health 96%. Includes keyboard case.", transactionType:"straight_price", listPrice:950, status:"active", address:"540 N State St, Chicago, IL 60654" },
  { cat:"trades-skilled-work", sub:"carpentry", title:"DeWalt Power Tool Set — 12 Pieces", desc:"Complete DeWalt 20V MAX power tool combo: drill, impact driver, circular saw, reciprocating saw, oscillating tool, LED work light, 2x batteries, charger, bag. All tools working perfectly.", transactionType:"straight_price", listPrice:420, status:"active", address:"3150 E Camelback Rd, Phoenix, AZ 85016" },
  { cat:"lifestyle-personal-services", sub:"fitness-training", title:"Peloton Bike+ with Accessories", desc:"Peloton Bike+ (2024). Includes cycling shoes (Size 10), heart rate monitor, resistance bands, yoga mat. Screen rotates for floor workouts. Subscription transferable.", transactionType:"straight_price", listPrice:1100, status:"active", address:"9801 NW 17th St, Miami, FL 33172" },
  { cat:"education-learning", sub:"music-lessons", title:"Fender American Professional II Stratocaster", desc:"Fender American Professional II Strat in Olympic White with rosewood fretboard. Includes Fender hard case, strap, and cable. Minimal play wear. Sounds incredible.", transactionType:"straight_price", listPrice:1350, status:"active", address:"188 Boylston St, Boston, MA 02116" },
  { cat:"technology-development", sub:"game-development", title:"Meta Quest 3 — 512GB + Accessories", desc:"Meta Quest 3 512GB with elite strap, carrying case, link cable, and prescription lens inserts (-3.5). Perfect for VR gaming and development testing.", transactionType:"straight_price", listPrice:420, status:"active", address:"2420 17th St NW, Washington, DC 20009" },
  { cat:"local-opportunities", sub:"garage-sales", title:"Complete Kitchen Appliance Set — Moving Sale", desc:"Selling as a set: KitchenAid stand mixer (red), Breville espresso machine, Vitamix blender, Instant Pot Duo, air fryer, toaster oven. All in excellent condition.", transactionType:"straight_price", listPrice:550, status:"active", address:"671 Lincoln Rd, Miami Beach, FL 33139" },
  { cat:"creative-design", sub:"interior-design", title:"Mid-Century Modern Furniture Set", desc:"Curated mid-century modern set: Eames-style lounge chair & ottoman, walnut credenza (60\"), Noguchi-style coffee table, arc floor lamp. Excellent condition.", transactionType:"straight_price", listPrice:2200, status:"active", address:"411 NW 14th Ave, Portland, OR 97209" },
  { cat:"trades-skilled-work", sub:"welding-fabrication", title:"Lincoln Electric MIG Welder — 210 MP", desc:"Lincoln Electric Power MIG 210 MP multi-process welder. MIG, flux-cored, stick, and TIG capable. Barely used, still has original consumables.", transactionType:"straight_price", listPrice:820, status:"active", address:"5901 S Mingo Rd, Tulsa, OK 74146" },

  // ── seller_auction — sellers set starting price, buyers bid up ──
  { cat:"creative-design", sub:"photography", title:"Sony A7IV + 24-70mm f/2.8 GM Lens Bundle", desc:"Sony A7 IV with 24-70mm f/2.8 GM II. Shutter count ~8,000. Includes extra battery, SD card, camera bag, and lens filters. 4K 60fps capable. Perfect kit for pros.", transactionType:"seller_auction", startingPrice:2500, maxPrice:3500, currentBid:2850, status:"active", address:"6235 Sunset Blvd, Hollywood, CA 90028" },
  { cat:"creative-design", sub:"photography", title:"DJI Mavic 3 Pro Fly More Combo", desc:"DJI Mavic 3 Pro with Fly More combo. 3 batteries, ND filter set, charging hub, shoulder bag. Only 12 flight hours. FAA registered. All firmware updated.", transactionType:"seller_auction", startingPrice:1400, maxPrice:2000, currentBid:1650, status:"active", address:"402 S Lamar Blvd, Austin, TX 78704" },
  { cat:"creative-design", sub:"videography", title:"Sony FX3 Cinema Camera Kit", desc:"Sony FX3 full-frame cinema camera with FE 24-105mm f/4 G lens, 2x batteries, SmallRig cage, Rode VideoMic Pro+, 256GB CFexpress card. Low shutter count.", transactionType:"seller_auction", startingPrice:3000, maxPrice:4200, currentBid:3400, status:"active", address:"1500 Broadway, New York, NY 10036" },
  { cat:"education-learning", sub:"music-lessons", title:"Yamaha C3X Grand Piano — Pristine Condition", desc:"Yamaha C3X conservatory grand piano in polished ebony. Purchased 2020, climate-controlled room. 6'1\" length. Includes matching bench and humidity control. Buyer arranges moving.", transactionType:"seller_auction", startingPrice:16000, maxPrice:25000, currentBid:19500, status:"active", address:"1200 Peachtree St NE, Atlanta, GA 30309" },
  { cat:"technology-development", sub:"game-development", title:"Gaming PC Build — RTX 4080 Super", desc:"Custom gaming PC: Ryzen 9 7900X, RTX 4080 Super 16GB, 32GB DDR5, 2TB NVMe SSD, Lian Li O11 Dynamic case. 6 months old. Runs every game at 4K 60fps+. All original boxes and warranties.", transactionType:"seller_auction", startingPrice:1200, maxPrice:1800, currentBid:1450, status:"active", address:"2300 S Lamar Blvd, Austin, TX 78704" },
  { cat:"local-opportunities", sub:"garage-sales", title:"Vintage Vinyl Record Collection — 500+ Records", desc:"500+ vinyl records spanning 60s-90s rock, jazz, soul, and funk. Many first pressings. Beatles, Coltrane, Stevie Wonder, Led Zeppelin, Miles Davis, Marvin Gaye, and more.", transactionType:"seller_auction", startingPrice:1500, maxPrice:5000, currentBid:2200, status:"active", address:"3847 N Southport Ave, Chicago, IL 60613" },
  { cat:"trades-skilled-work", sub:"carpentry", title:"SawStop Professional Cabinet Table Saw", desc:"SawStop PCS175 professional cabinet table saw. 1.75 HP motor, 36\" T-Glide fence. Blade stops instantly on skin contact. Includes dado insert and dust collection hose.", transactionType:"seller_auction", startingPrice:1800, maxPrice:2800, currentBid:2100, status:"active", address:"7421 Greenville Ave, Dallas, TX 75231" },
  { cat:"creative-design", sub:"graphic-design", title:"Wacom Cintiq Pro 24 — Pen Display", desc:"Wacom Cintiq Pro 24\" pen display tablet. 4K resolution, 99% Adobe RGB. Includes adjustable stand, spare nibs, and Wacom Pro Pen 2. Professional-grade tool for illustrators and designers.", transactionType:"seller_auction", startingPrice:1000, maxPrice:1600, currentBid:1150, status:"active", address:"815 Pike St, Seattle, WA 98101" },

  // ── buyer_auction — buyers post what they want, sellers offer prices ──
  { cat:"creative-design", sub:"photography", title:"Looking for Canon RF 70-200mm f/2.8L Lens", desc:"Looking to buy a Canon RF 70-200mm f/2.8L IS USM in good condition. Prefer low usage, original box. Will pay fair market price. Budget up to $2,000.", transactionType:"buyer_auction", startingPrice:2000, minPrice:1500, status:"active", address:"290 Congress St, Boston, MA 02210" },
  { cat:"technology-development", sub:"software-engineering", title:"Want: LG 34\" UltraWide Monitor — 5K2K", desc:"Looking for LG 34WK95U or similar 5K2K UltraWide monitor. Must be in excellent condition with no dead pixels. Thunderbolt connection preferred.", transactionType:"buyer_auction", startingPrice:750, minPrice:500, status:"active", address:"1355 Market St, San Francisco, CA 94103" },
  { cat:"lifestyle-personal-services", sub:"fitness-training", title:"Wanted: Rogue Fitness Home Gym Equipment", desc:"Looking to buy a complete home gym setup. Need: squat rack, barbell, bumper plates (200lb+), bench. Rogue or Rep Fitness preferred. Can pick up anywhere in the metro area.", transactionType:"buyer_auction", startingPrice:2000, minPrice:1200, status:"active", address:"4501 W Colfax Ave, Denver, CO 80204" },
  { cat:"education-learning", sub:"music-lessons", title:"Wanted: Roland Electronic Drum Kit", desc:"Looking for a Roland TD-17 or TD-27 electronic drum kit. Must include all pads, hi-hat stand, and kick pedal. Throne not needed. Prefer mesh heads.", transactionType:"buyer_auction", startingPrice:1200, minPrice:800, status:"active", address:"5055 Wilshire Blvd, Los Angeles, CA 90036" },
  { cat:"lifestyle-personal-services", sub:"fitness-training", title:"Looking for Road Bike — Size 54-56", desc:"Looking to buy a quality road bike, size 54-56. Carbon or aluminum frame. Shimano 105 or better groupset. Budget flexible for the right bike. Located downtown, can meet anywhere.", transactionType:"buyer_auction", startingPrice:2500, minPrice:1500, status:"active", address:"700 S Flower St, Los Angeles, CA 90017" },
  { cat:"local-opportunities", sub:"car-rentals", title:"Need: Monthly Car Rental — 3 Month Lease", desc:"Looking to rent a reliable car for 3 months while my car is in the shop. Prefer hybrid or EV. Budget around $800-1000/month. Insurance covered.", transactionType:"buyer_auction", startingPrice:1000, minPrice:700, status:"active", address:"123 S 6th St, Minneapolis, MN 55402" },
  { cat:"local-opportunities", sub:"car-rentals", title:"Renting My 2023 Tesla Model 3 Long Range", desc:"Renting Tesla Model 3 Long Range for 3 months while abroad. Pearl White, Autopilot, FSD, 15K miles. Home charger available. Insurance required.", transactionType:"straight_price", listPrice:1200, status:"active", address:"445 5th Ave S, Seattle, WA 98104" },
];

const SPONSOR_ADS_DATA: { cat: string; sub: string; title: string; desc: string }[] = [
  { cat:"technology-development", sub:"web-development", title:"CodeCraft Academy — Learn to Code in 12 Weeks", desc:"Intensive coding bootcamp with job guarantee. Full-stack web development. Apply now for spring cohort." },
  { cat:"technology-development", sub:"web-development", title:"Vercel — Deploy with Confidence", desc:"The platform for frontend developers. Instant deployments, edge functions, and analytics. Start free." },
  { cat:"technology-development", sub:"mobile-app-development", title:"Expo — Build Mobile Apps Faster", desc:"The fastest way to build and deploy React Native apps. Over-the-air updates, push notifications, and more." },
  { cat:"technology-development", sub:"ai-machine-learning", title:"Hugging Face — The AI Community", desc:"Collaborate on ML models, datasets, and demos. 500K+ models available. Join the AI community." },
  { cat:"creative-design", sub:"graphic-design", title:"DesignHub Pro — All-in-One Design Platform", desc:"Professional design tools for teams. Templates, brand kits, and collaboration. Try free for 30 days." },
  { cat:"creative-design", sub:"graphic-design", title:"Canva Pro — Design Anything, Publish Anywhere", desc:"Create stunning graphics, presentations, videos, and more. 100M+ design elements. Free trial available." },
  { cat:"creative-design", sub:"photography", title:"LensCraft Studio — Premium Camera Rentals", desc:"Rent pro cameras, lenses, and lighting gear. Daily and weekly rates. Free shipping both ways." },
  { cat:"creative-design", sub:"photography", title:"Adobe Lightroom — Edit Photos Like a Pro", desc:"Professional photo editing on any device. AI-powered tools, presets, and cloud storage. $9.99/month." },
  { cat:"creative-design", sub:"videography", title:"Frame.io — Video Collaboration Platform", desc:"Streamline your video review and approval process. Real-time collaboration for video teams. Free tier available." },
  { cat:"marketing-business", sub:"digital-marketing", title:"GrowthEngine — Automate Your Marketing", desc:"AI-powered marketing automation. Email, social, and ads in one place. 50% off first 3 months." },
  { cat:"marketing-business", sub:"seo-sem", title:"Ahrefs — SEO Tools & Resources", desc:"All-in-one SEO toolkit. Backlink analysis, keyword research, site audits, and rank tracking. Start your free trial." },
  { cat:"marketing-business", sub:"social-media-management", title:"Buffer — Social Media Management Made Easy", desc:"Plan, schedule, and analyze your social media content. Trusted by 140,000+ businesses. Free plan available." },
  { cat:"marketing-business", sub:"content-writing", title:"Jasper AI — Write Better Content Faster", desc:"AI writing assistant for marketing teams. Blog posts, ads, emails in seconds. 7-day free trial." },
  { cat:"trades-skilled-work", sub:"construction-renovation", title:"BuildRight Supply Co. — Premium Materials", desc:"Quality lumber, hardware, and tools at contractor prices. Free delivery on orders over $500." },
  { cat:"trades-skilled-work", sub:"construction-renovation", title:"HomeAdvisor — Find Trusted Contractors", desc:"Connect with pre-screened, local contractors. Read reviews, compare quotes, and book online. Free for homeowners." },
  { cat:"lifestyle-personal-services", sub:"fitness-training", title:"FitLife App — Your Personal AI Trainer", desc:"Custom workout plans, meal tracking, and progress analytics. Download free on iOS and Android." },
  { cat:"lifestyle-personal-services", sub:"beauty-wellness", title:"Glossier — Skin First, Makeup Second", desc:"Clean beauty products that celebrate real skin. Shop our best sellers. Free shipping on orders $30+." },
  { cat:"lifestyle-personal-services", sub:"pet-services", title:"BarkBox — Monthly Surprises for Your Pup", desc:"2 toys, 2 bags of treats, and a chew in every monthly box. Themed collections your dog will love. First box $5." },
  { cat:"education-learning", sub:"online-courses", title:"SkillForge — Master New Skills Online", desc:"10,000+ courses from industry experts. Business, tech, creative, and more. Annual plan just $99." },
  { cat:"education-learning", sub:"online-courses", title:"Coursera — Learn from Top Universities", desc:"Courses, certificates, and degrees from Stanford, Google, IBM, and more. Financial aid available." },
  { cat:"education-learning", sub:"tutoring", title:"Wyzant — Find the Perfect Tutor", desc:"1-on-1 tutoring in 300+ subjects. Read reviews, compare rates, and book online. First lesson guarantee." },
  { cat:"local-opportunities", sub:"jobs", title:"TalentBridge — Find Your Dream Job", desc:"AI-powered job matching connecting top talent with innovative companies. Sign up free today." },
  { cat:"local-opportunities", sub:"jobs", title:"LinkedIn Premium — Advance Your Career", desc:"Stand out to recruiters, see who viewed your profile, and access LinkedIn Learning. 1-month free trial." },
  { cat:"local-opportunities", sub:"house-rentals", title:"Apartments.com — Find Your Next Home", desc:"Search millions of apartments and houses for rent. Virtual tours, price alerts, and neighborhood insights." },
];

// ─── PHASE 1: CLEANUP ────────────────────────────────────

async function cleanup() {
  console.log("\n" + "=".repeat(60));
  console.log("🧹 PHASE 1: CLEANING UP TEST DATA");
  console.log("=".repeat(60));

  // Target emails
  const TARGET_EMAILS = [
    "yeequn.xu@gmail.com",
    "yeekun12@gmail.com",
    "yiqunxu35@gmail.com",
    "yeekunhui@gmail.com",
    "admin@eatifydash.com",
  ];

  // Step 1: Find userIds from profile collection
  console.log("\n📧 Looking up user profiles...");
  const userIds: string[] = [];

  // Query for specific emails
  for (const email of TARGET_EMAILS) {
    try {
      const res = await db.listDocuments(DATABASE_ID, Col.PROFILE, [
        Query.equal("email", email),
        Query.limit(10),
      ]);
      for (const doc of res.documents) {
        const userId = (doc as any).userId;
        if (userId && !userIds.includes(userId)) {
          userIds.push(userId);
          console.log(`   Found: ${email} → userId: ${userId}`);
        }
      }
    } catch (err: any) {
      console.log(`   ⚠️  Could not query email ${email}: ${err.message}`);
    }
  }

  // Query for guest_ emails
  console.log("\n📧 Looking up guest_ accounts...");
  try {
    const res = await db.listDocuments(DATABASE_ID, Col.PROFILE, [
      Query.startsWith("email", "guest_"),
      Query.limit(100),
    ]);
    for (const doc of res.documents) {
      const userId = (doc as any).userId;
      const email = (doc as any).email;
      if (userId && !userIds.includes(userId)) {
        userIds.push(userId);
        console.log(`   Found: ${email} → userId: ${userId}`);
      }
    }
  } catch (err: any) {
    console.log(`   ⚠️  Could not query guest_ accounts: ${err.message}`);
  }

  if (userIds.length === 0) {
    console.log("\n⚠️  No matching users found. Skipping cleanup.");
    return userIds;
  }

  console.log(`\n🎯 Found ${userIds.length} user(s) to clean up.`);

  // Step 2: Delete data for each user
  for (const userId of userIds) {
    console.log(`\n🗑  Cleaning data for userId: ${userId}`);

    // Posts
    await deleteAllMatching(
      Col.POSTS,
      [Query.equal("userId", userId)],
      "posts"
    );

    // Exchange Listings
    await deleteAllMatching(
      Col.EXCHANGE_LISTINGS,
      [Query.equal("userId", userId)],
      "exchange listings"
    );

    // Sponsor Ads
    await deleteAllMatching(
      Col.SPONSOR_ADS,
      [Query.equal("userId", userId)],
      "sponsor ads"
    );

    // Post Likes
    await deleteAllMatching(
      Col.POST_LIKES,
      [Query.equal("userId", userId)],
      "post likes"
    );

    // Post Stamps
    await deleteAllMatching(
      Col.POST_STAMPS,
      [Query.equal("userId", userId)],
      "post stamps"
    );

    // Ad Likes
    await deleteAllMatching(
      Col.AD_LIKES,
      [Query.equal("userId", userId)],
      "ad likes"
    );

    // Reports (as reporter)
    await deleteAllMatching(
      Col.REPORTS,
      [Query.equal("reporterId", userId)],
      "reports"
    );

    // Appeals
    await deleteAllMatching(
      Col.APPEALS,
      [Query.equal("userId", userId)],
      "appeals"
    );
  }

  // Also delete admin-batch-import ads
  console.log(`\n🗑  Cleaning admin-batch-import ads...`);
  await deleteAllMatching(
    Col.SPONSOR_ADS,
    [Query.equal("userId", "admin-batch-import")],
    "admin-batch-import ads"
  );

  console.log("\n✅ Cleanup complete!");
  return userIds;
}

// ─── PHASE 2: SEED ───────────────────────────────────────

async function seed(cleanedUserIds: string[]) {
  console.log("\n" + "=".repeat(60));
  console.log("🌱 PHASE 2: SEEDING REALISTIC MOCK DATA");
  console.log("=".repeat(60));

  // Use first cleaned userId if available, otherwise use a placeholder
  const seedUserId =
    cleanedUserIds.length > 0 ? cleanedUserIds[0] : "seed-mock-user";

  // Use multiple userIds if available for variety
  const getUserId = () =>
    cleanedUserIds.length > 0 ? pick(cleanedUserIds) : seedUserId;

  let created = { posts: 0, events: 0, exchanges: 0, ads: 0 };

  // ── Posts ──
  console.log("\n📝 Creating posts...");
  for (const post of POSTS_DATA) {
    const loc = pick(LOCATIONS);
    const img = `https://picsum.photos/seed/post${created.posts}/800/600`;
    try {
      await db.createDocument(DATABASE_ID, Col.POSTS, ID.unique(), {
        userId: getUserId(),
        type: post.type,
        title: post.title,
        smallDescription: post.small,
        description: post.desc,
        media: [img],
        category: post.cat,
        subCategory: post.sub,
        location: loc.coords,
        locationAddress: loc.address,
        locationPlaceId: "",
        locationState: loc.state,
        locationCity: loc.city,
        userLocation: loc.coords,
        userLocationAddress: loc.address,
        isBlacklisted: false,
      });
      created.posts++;
      console.log(`   ✅ Post: ${post.title.substring(0, 50)}...`);
    } catch (err: any) {
      console.error(`   ❌ Failed: ${post.title} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  // ── Events ──
  console.log("\n📅 Creating events...");
  for (const event of EVENTS_DATA) {
    const loc = pick(LOCATIONS);
    const img = `https://picsum.photos/seed/event${created.events}/800/600`;
    try {
      await db.createDocument(DATABASE_ID, Col.POSTS, ID.unique(), {
        userId: getUserId(),
        type: "event",
        title: event.title,
        smallDescription: event.small,
        description: event.desc,
        media: [img],
        category: event.cat,
        subCategory: event.sub,
        location: loc.coords,
        locationAddress: loc.address,
        locationPlaceId: "",
        locationState: loc.state,
        locationCity: loc.city,
        userLocation: loc.coords,
        userLocationAddress: loc.address,
        eventDate: futureDate(7, 60),
        isBlacklisted: false,
      });
      created.events++;
      console.log(`   ✅ Event: ${event.title.substring(0, 50)}...`);
    } catch (err: any) {
      console.error(`   ❌ Failed: ${event.title} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  // ── Exchange Listings ──
  console.log("\n🔄 Creating exchange listings...");
  for (const item of EXCHANGE_DATA) {
    const loc = pick(LOCATIONS);
    const img = `https://picsum.photos/seed/exch${created.exchanges}/800/600`;
    try {
      const data: Record<string, unknown> = {
        userId: getUserId(),
        title: item.title,
        description: item.desc,
        media: [img],
        category: item.cat,
        subCategory: item.sub,
        locationState: loc.state,
        locationCity: loc.city,
        locationAddress: item.address,
        status: item.status,
        transactionType: item.transactionType,
        isBlacklisted: false,
      };

      // Set price fields based on transaction type
      if (item.transactionType === "straight_price") {
        data.listPrice = item.listPrice;
      } else if (item.transactionType === "seller_auction") {
        data.startingPrice = item.startingPrice;
        if (item.maxPrice) data.maxPrice = item.maxPrice;
        if (item.currentBid) data.currentBid = item.currentBid;
        data.auctionEndDate = futureDate(2, 21);
      } else if (item.transactionType === "buyer_auction") {
        data.startingPrice = item.startingPrice; // max budget
        if (item.minPrice) data.minPrice = item.minPrice;
        data.auctionEndDate = futureDate(5, 30);
      }

      await db.createDocument(
        DATABASE_ID,
        Col.EXCHANGE_LISTINGS,
        ID.unique(),
        data
      );
      created.exchanges++;
      const typeLabel = item.transactionType === "straight_price" ? "💰" : item.transactionType === "seller_auction" ? "🔨" : "🛒";
      console.log(`   ✅ ${typeLabel} Exchange: ${item.title.substring(0, 50)}...`);
    } catch (err: any) {
      console.error(`   ❌ Failed: ${item.title} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  // ── Sponsor Ads ──
  console.log("\n📢 Creating sponsor ads...");
  const AD_SLOTS = [5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110];
  for (let i = 0; i < SPONSOR_ADS_DATA.length; i++) {
    const ad = SPONSOR_ADS_DATA[i];
    const loc = pick(LOCATIONS);
    const slot = AD_SLOTS[i % AD_SLOTS.length];
    const img = `https://picsum.photos/seed/ad${created.ads + 200}/800/800`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    try {
      await db.createDocument(DATABASE_ID, Col.SPONSOR_ADS, ID.unique(), {
        userId: getUserId(),
        title: ad.title,
        description: ad.desc,
        media: [img],
        state: loc.state,
        city: loc.city,
        category: ad.cat,
        subcategory: ad.sub,
        slot: slot - 1,
        externalLink: "",
        status: "active",
        views: randomInt(50, 500),
        clicks: randomInt(5, 80),
        expiresAt: expiresAt.toISOString(),
        isBlacklisted: false,
        isAdminCreated: true,
      });
      created.ads++;
      console.log(`   ✅ Ad [slot ${slot}]: ${ad.title.substring(0, 50)}...`);
    } catch (err: any) {
      console.error(`   ❌ Failed: ${ad.title} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SEED COMPLETE!");
  console.log(`   📝 Posts:     ${created.posts}`);
  console.log(`   📅 Events:    ${created.events}`);
  console.log(`   🔄 Exchanges: ${created.exchanges}`);
  console.log(`   📢 Ads:       ${created.ads}`);
  console.log(
    `   📦 Total:     ${created.posts + created.events + created.exchanges + created.ads}`
  );
  console.log("=".repeat(60));
}

// ─── MAIN ─────────────────────────────────────────────────

async function main() {
  console.log("🚀 Clean & Seed Script");
  console.log(`   Endpoint:  ${APPWRITE_ENDPOINT}`);
  console.log(`   Project:   ${APPWRITE_PROJECT_ID}`);
  console.log(`   Database:  ${DATABASE_ID}`);

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  db = new Databases(client);

  const mode = process.argv[2];
  if (mode === "--seed-only") {
    // Gather userIds without deleting
    console.log("\n⏩ Skipping cleanup (--seed-only mode)");
    console.log("📧 Looking up user profiles for seed...");
    const userIds: string[] = [];
    const emails = [
      "yeequn.xu@gmail.com", "yeekun12@gmail.com", "yiqunxu35@gmail.com",
      "yeekunhui@gmail.com", "admin@eatifydash.com",
    ];
    for (const email of emails) {
      try {
        const res = await db.listDocuments(DATABASE_ID, Col.PROFILE, [
          Query.equal("email", email), Query.limit(5),
        ]);
        for (const doc of res.documents) {
          const uid = (doc as any).userId;
          if (uid && !userIds.includes(uid)) userIds.push(uid);
        }
      } catch {}
    }
    console.log(`   Found ${userIds.length} userIds`);
    await seed(userIds);
  } else {
    const cleanedUserIds = await cleanup();
    await seed(cleanedUserIds);
  }
}

main().catch(console.error);
