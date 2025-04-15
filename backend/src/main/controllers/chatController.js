import { ChatOpenAI } from "@langchain/openai";
import { ChromaClient } from "chromadb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { config } from "dotenv";
import { encoding_for_model } from "@dqbd/tiktoken";

config();

const chromaClient = new ChromaClient({ path: "http://127.0.0.1:8000" });
const collection = await chromaClient.getOrCreateCollection({ name: "chat_history" });

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
  
    const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    const queryEmbedding = await embeddings.embedQuery(message);
    const searchResults = await collection.query({ queryEmbeddings: [[...queryEmbedding]], nResults: 3 });

    const relevantContext = searchResults.documents?.flat().join("\n") || "Context not found.";

    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
      modelName: "gpt-4",
      maxTokens: 800,
      topP: 0.95,
      frequencyPenalty: 0.2,
      presencePenalty: 0.3,
      stop: ["\nUser:", "\nAI:"],
      streaming: false,
    });    

    const prompt = [
      {
        role: "system",
        content: "You are a helpful and knowledgeable assistant. Answer the user's question based only on the provided context. If the answer is not in the context, say you don't know.",
      },
      {
        role: "user",
        content: `Context:\n${relevantContext}\n\nQuestion:\n${message}`,
      },
    ];    

    const encoder = encoding_for_model("gpt-3.5-turbo");
    const tokenCount = encoder.encode(prompt.map(m => m.content).join("\n")).length;
    encoder.free();

    const response = await llm.invoke(prompt);
    const responseText = response.content; 

    res.json({ response: responseText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error occurred while working with OpenAI" });
  }
};

export const clearChatContext = async (req, res) => {
  try {
    await chromaClient.deleteCollection({ name: "chat_history" });
    // Recreate the collection after deletion
    await chromaClient.getOrCreateCollection({ name: "chat_history" });
    res.json({ message: "Chat context cleared successfully." });
  } catch (error) {
    console.error("Error clearing chat context:", error);
    res.status(500).json({ error: "Failed to clear chat context." });
  }
};