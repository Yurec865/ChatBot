import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./src/main/routes/chatRoutes.js";
import pdfRoutes from "./src/main/routes/pdfRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRoutes);
app.use("/api/pdf", pdfRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));