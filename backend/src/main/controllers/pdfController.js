import fs from "fs";
import path from "path";
import { getDocument } from "pdfjs-dist";
import { ChromaClient } from "chromadb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { config } from "dotenv";

config();
const chromaClient = new ChromaClient({ path: "http://127.0.0.1:8000" });
const collection = await chromaClient.getOrCreateCollection({ name: "chat_history" });

const extractTextFromPDF = async (filePath) => {
  const fileData = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await getDocument({ data: fileData }).promise;

  let extractedText = "";
  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    extractedText += pageText + "\n";
  }

  return extractedText.trim();
};

export const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File not uploaded" });
    }

    console.log("File received by multer:", req.file);
    const filePath = path.resolve(req.file.path);
    console.log("File saved at path:", filePath);

    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(400).json({ error: "File not found" });
    }

    const pdfText = await extractTextFromPDF(filePath);

    if (!pdfText) {
      return res.status(400).json({ error: "File contains no text" });
    }

    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const chunks = await textSplitter.splitText(pdfText);

    const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    const embeddedChunks = await embeddings.embedDocuments(chunks);

    await collection.add({
      ids: chunks.map((_, i) => `pdf_${Date.now()}_${i}`),
      embeddings: embeddedChunks,
      documents: chunks,
    });

    fs.unlinkSync(filePath);
    res.json({ message: "📄 Text from PDF added to knowledge base" });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({ error: "Error saving PDF text" });
  }
};