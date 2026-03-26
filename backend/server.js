import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/chat", chatRoutes);

const swaggerPath = path.join(__dirname, "swagger.json");
const swaggerDocument = fs.existsSync(swaggerPath) 
  ? JSON.parse(fs.readFileSync(swaggerPath, "utf8"))
  : null;

if (swaggerDocument) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.get("/", (req, res) => res.send("✅ KnowChain LLM Backend running"));

// Session timeout tracking (the actual session creation is in chatRoutes.js)
const sessionTimeout = new Map();
const SESSION_DURATION = 10 * 60 * 1000; // 10 minutes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} [VERSION 2.0]`));
