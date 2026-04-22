import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.join(__dirname, "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// For simplicity in this demo environment, we'll initialize with the project ID.
// In production, you'd use a service account or application default credentials.
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.projectId,
  });
}

const db = admin.firestore(config.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health Check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Test Firestore connection by attempting to list collection or get a dummy doc
      // We'll just try to access the database object
      const testDoc = await db.collection("health-checks").doc("status").get();
      
      res.json({
        status: "ok",
        message: "Backend is healthy and connected to Firestore",
        firestore: {
          projectId: config.projectId,
          databaseId: config.firestoreDatabaseId,
          connected: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to connect to Firestore",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
