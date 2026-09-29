import { MAX_FILE_BYTES, MAX_TEXT_LENGTH, MIN_TEXT_LENGTH } from "./review";

export async function importResume(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES)
    throw new Error(
      "That file is too big. Choose a PDF or TXT file smaller than 5 MB.",
    );
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text: string;
  if (extension === "txt") {
    text = await file.text();
  } else if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    // The bundled worker is copied from the exact installed version at build time.
    pdfjs.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      useSystemFonts: true,
    });
    try {
      const document = await task.promise;
      if (document.numPages > 15)
        throw new Error("Please use a resume PDF with 15 pages or fewer.");
      const pages: string[] = [];
      for (let i = 1; i <= document.numPages; i++) {
        const page = await document.getPage(i);
        const content = await page.getTextContent();
        pages.push(
          content.items
            .map((item) =>
              "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
            )
            .join(""),
        );
        page.cleanup();
      }
      text = pages.join("\n\n");
    } catch (error) {
      if (error instanceof Error && error.name === "PasswordException") {
        throw new Error(
          "This PDF is password-protected. Upload an unlocked copy or paste the text.",
        );
      }
      if (error instanceof Error && error.message.includes("15 pages"))
        throw error;
      throw new Error(
        "We couldn't read that PDF. Try an unlocked, text-based PDF or paste the text.",
      );
    } finally {
      await task.destroy();
    }
  } else {
    throw new Error(
      "Choose a PDF or TXT file. For Word documents, export to PDF first.",
    );
  }
  text = text.replace(/\r\n/g, "\n").replace(/\0/g, "").trim();
  if (text.length < MIN_TEXT_LENGTH)
    throw new Error(
      "Not enough text was found. Scanned PDFs need OCR first; you can paste the text instead.",
    );
  if (text.length > MAX_TEXT_LENGTH)
    throw new Error(
      "This file has more than 20,000 characters. Paste a shorter version instead.",
    );
  return text;
}
