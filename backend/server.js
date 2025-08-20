import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";

dotenv.config({ path: "./.env" });

const app = express();

app.use(express.json());

app.use(cors({
    origin: "*",
    credentials: true
}));

app.use("/uploads", express.static("uploads"));

app.use("/chat", chatRoutes);

app.get("/", (req, res) => res.send("✅ KnowChain LLM Backend running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
