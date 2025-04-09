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
      return res.status(400).json({ error: "Файл не завантажено" });
    }

    console.log("Файл, переданий multer:", req.file);
    const filePath = path.resolve(req.file.path);
    console.log("Файл збережено за шляхом:", filePath);

    if (!fs.existsSync(filePath)) {
      console.error("Файл не знайдено:", filePath);
      return res.status(400).json({ error: "Файл не знайдено" });
    }

    const pdfText = await extractTextFromPDF(filePath);

    if (!pdfText) {
      return res.status(400).json({ error: "Файл не містить тексту" });
    }

    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const chunks = await textSplitter.splitText(pdfText);

    const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    const embeddedChunks = await embeddings.embedDocuments(chunks);

    // await collection.delete();

    await collection.add({
      ids: chunks.map((_, i) => `pdf_${Date.now()}_${i}`),
      embeddings: embeddedChunks,
      documents: chunks,
    });

    fs.unlinkSync(filePath);
    res.json({ message: "📄 Текст з PDF додано до бази знань" });
  } catch (error) {
    console.error("Помилка під час обробки PDF:", error);
    res.status(500).json({ error: "Помилка під час збереження тексту PDF" });
  }
};