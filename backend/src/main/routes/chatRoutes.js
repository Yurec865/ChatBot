import express from "express";
import { chatWithAI, clearChatContext } from "../controllers/chatController.js";

const router = express.Router();
router.post("/", chatWithAI);
router.post("/clear", clearChatContext);

export default router;
