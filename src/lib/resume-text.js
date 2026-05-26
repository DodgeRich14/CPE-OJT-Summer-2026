import mammoth from "mammoth";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    pages.push(text.trim());
  }

  return pages.join("\n").trim();
}

async function extractDocxText(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}

async function extractPlainText(file) {
  return (await file.text()).trim();
}

export async function extractResumeText(file) {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  if (lowerName.endsWith(".docx")) {
    return extractDocxText(file);
  }

  if (lowerName.endsWith(".txt") || lowerName.endsWith(".doc")) {
    return extractPlainText(file);
  }

  throw new Error("Unsupported file type. Please upload PDF, DOCX, DOC, or TXT.");
}
