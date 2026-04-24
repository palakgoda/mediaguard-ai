import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root is where your package.json and serviceAccountKey.json live
const rootPath = path.join(__dirname, "..");

// 1. Path to your Service Account Key (The ID Card)
const serviceAccountPath = path.join(rootPath, "serviceAccountKey.json");

// 2. Load your project config
const configPath = path.join(rootPath, "firebase-applet-config.json");
let config: any = { projectId: "mediashield-ai-494009" };

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

// 3. Initialize with Service Account Credentials
if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: config.projectId
    });
    console.log("✅ Firebase Admin initialized with Service Account.");
  } else {
    // Fallback if the file is missing (will likely trigger your previous error)
    console.error("❌ CRITICAL: serviceAccountKey.json not found at " + serviceAccountPath);
    admin.initializeApp({
      projectId: config.projectId,
    });
  }
}

const db = admin.firestore();

export { admin, db, config };