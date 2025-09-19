import * as dotenv from "dotenv"; // ✅ fixed
import { Client, Databases, ID, Models } from "node-appwrite";
import * as readline from "readline"; // ✅ fixed
import {
    agentImages,
    galleryImages,
    propertiesImages,
    reviewImages,
} from "./data";

// Load .env.local
dotenv.config({ path: ".env.local" });

// Required env variables
const requiredEnvs = [
  "EXPO_PUBLIC_APPWRITE_ENDPOINT",
  "EXPO_PUBLIC_APPWRITE_PROJECT_ID",
  "EXPO_PUBLIC_APPWRITE_DATABASE_ID",
  "EXPO_PUBLIC_APPWRITE_AGENTS_TABLE_ID",
  "EXPO_PUBLIC_APPWRITE_GALLERIES_TABLE_ID",
  "EXPO_PUBLIC_APPWRITE_REVIEWS_TABLE_ID",
  "EXPO_PUBLIC_APPWRITE_PROPERTIES_TABLE_ID",
  "APPWRITE_API_KEY",
];

for (const env of requiredEnvs) {
  if (!process.env[env]) {
    console.error(`❌ Missing required env variable: ${env}`);
    process.exit(1);
  }
}

// Init Appwrite client
const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

// Collection IDs
const COLLECTIONS = {
  AGENT: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_TABLE_ID!,
  REVIEWS: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_TABLE_ID!,
  GALLERY: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_TABLE_ID!,
  PROPERTY: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_TABLE_ID!,
};

// Random data
const propertyTypes = [
  "House",
  "Townhouse",
  "Condo",
  "Duplex",
  "Studio",
  "Villa",
  "Apartment",
  "Other",
];

const facilities = ["Laundry", "Parking", "Gym", "Wifi", "Pet-friendly"];

function getRandomSubset<T>(array: T[], minItems: number, maxItems: number): T[] {
  const subsetSize = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
  const arrayCopy = [...array];
  for (let i = arrayCopy.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [arrayCopy[i], arrayCopy[randomIndex]] = [arrayCopy[randomIndex], arrayCopy[i]];
  }
  return arrayCopy.slice(0, subsetSize);
}

async function clearCollection(collectionId: string) {
  const docs = await databases.listDocuments(
    process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
    collectionId
  );
  for (const doc of docs.documents) {
    await databases.deleteDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      collectionId,
      doc.$id
    );
  }
}

async function seed() {
  try {
    // Clear existing data
    for (const key in COLLECTIONS) {
      await clearCollection(COLLECTIONS[key as keyof typeof COLLECTIONS]);
    }
    console.log("✅ Cleared all existing data.");

    // Seed Agents
    const agents: Models.Document[] = [];
    for (let i = 1; i <= 5; i++) {
      const agent = await databases.createDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.AGENT,
        ID.unique(),
        {
          name: `Agent ${i}`,
          email: `agent${i}@example.com`,
          avatar: agentImages[Math.floor(Math.random() * agentImages.length)],
        }
      );
      agents.push(agent);
    }
    console.log(`✅ Seeded ${agents.length} agents.`);

    // Seed Reviews
    const reviews: Models.Document[] = [];
    for (let i = 1; i <= 20; i++) {
      const review = await databases.createDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        ID.unique(),
        {
          name: `Reviewer ${i}`,
          avatar: reviewImages[Math.floor(Math.random() * reviewImages.length)],
          review: `This is a review by Reviewer ${i}.`,
          rating: Math.floor(Math.random() * 5) + 1,
        }
      );
      reviews.push(review);
    }
    console.log(`✅ Seeded ${reviews.length} reviews.`);

    // Seed Galleries
    const galleries: Models.Document[] = [];
    for (const image of galleryImages) {
      const gallery = await databases.createDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.GALLERY,
        ID.unique(),
        { image }
      );
      galleries.push(gallery);
    }
    console.log(`✅ Seeded ${galleries.length} galleries.`);

    // Seed Properties
    for (let i = 1; i <= 20; i++) {
      const assignedAgent = agents[Math.floor(Math.random() * agents.length)];
      const assignedReviews = getRandomSubset(reviews, 5, 7);
      const assignedGalleries = getRandomSubset(galleries, 3, 8);

      const selectedFacilities = facilities
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * facilities.length) + 1);

      const image =
        propertiesImages.length - 1 >= i
          ? propertiesImages[i]
          : propertiesImages[Math.floor(Math.random() * propertiesImages.length)];

      const property = await databases.createDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PROPERTY,
        ID.unique(),
        {
          name: `Property ${i}`,
          type: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
          description: `This is the description for Property ${i}.`,
          address: `123 Property Street, City ${i}`,
          geolocation: `192.168.1.${i}, 192.168.1.${i}`,
          price: Math.floor(Math.random() * 9000) + 1000,
          area: Math.floor(Math.random() * 3000) + 500,
          bedrooms: Math.floor(Math.random() * 5) + 1,
          bathrooms: Math.floor(Math.random() * 5) + 1,
          rating: Math.floor(Math.random() * 5) + 1,
          facilities: selectedFacilities,
          image,
          agent: assignedAgent.$id,
          reviews: assignedReviews.map((r) => r.$id),
          gallery: assignedGalleries.map((g) => g.$id),
        }
      );

      console.log(`🏠 Seeded property: ${property.name}`);
    }

    console.log("🎉 Data seeding completed.");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
  }
}

// ========= Entry Point =========
if (!process.argv.includes("--force")) {
  console.log("⚠️  Run with --force to reseed:\n");
  console.log("   npx ts-node -P tsconfig.seed.json seed/seed.ts --force\n");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("⚠️  DELETE and reseed database? (y/N): ", async (answer) => {
  rl.close();
  if (answer.toLowerCase() === "y") {
    await seed();
  } else {
    console.log("❌ Seeding aborted.");
    process.exit(0);
  }
});
