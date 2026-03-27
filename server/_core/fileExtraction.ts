import { PDFParse } from "pdf-parse";
import { createWorker, type Worker } from "tesseract.js";

type FileKind = "image" | "pdf" | "text";

type ExtractionInput = {
  fileType?: string;
  mimeType?: string;
  fileContent?: string;
  textContent?: string;
};

let ocrWorkerPromise: Promise<Worker> | null = null;

function normalizeFileType(fileType?: string): FileKind {
  if (fileType === "image" || fileType === "pdf" || fileType === "text") {
    return fileType;
  }
  return "text";
}

function decodeBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

function decodeText(base64: string): string {
  try {
    return decodeBase64(base64).toString("utf-8").trim();
  } catch {
    return "";
  }
}

async function getOcrWorker(): Promise<Worker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = createWorker("eng+chi_sim");
  }
  return ocrWorkerPromise;
}

async function extractImageText(base64: string): Promise<string> {
  const worker = await getOcrWorker();
  const imageBuffer = decodeBase64(base64);
  const result = await worker.recognize(imageBuffer);
  return result.data.text?.trim() ?? "";
}

async function extractPdfText(base64: string): Promise<string> {
  const pdfBuffer = decodeBase64(base64);
  const parser = new PDFParse({ data: pdfBuffer });
  try {
    const result = await parser.getText();
    return result.text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }
}

export async function extractTextForRecognition(input: ExtractionInput): Promise<string> {
  const fileType = normalizeFileType(input.fileType);
  const textFromInput = (input.textContent || "").trim();

  if (fileType === "text") {
    if (textFromInput) return textFromInput;
    if (input.fileContent) {
      return decodeText(input.fileContent);
    }
    return "";
  }

  if (!input.fileContent) {
    return textFromInput;
  }

  if (fileType === "image") {
    const ocrText = await extractImageText(input.fileContent);
    return ocrText || textFromInput;
  }

  if (fileType === "pdf") {
    const extractedText = await extractPdfText(input.fileContent);
    return extractedText || textFromInput;
  }

  return textFromInput;
}
