
export const MAX_PDF_PAGES = 10;

export interface PdfConversionOptions {
  dpi?: number;
  format?: 'jpeg' | 'png';
  quality?: number;
  password?: string;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Thrown when a PDF exceeds the supported page limit (`MAX_PDF_PAGES`).
 * Carries the actual page count so the UI can show a specific message.
 */
export class PdfTooManyPagesError extends Error {
  readonly name = 'PdfTooManyPagesError';
  readonly code = 'PDF_TOO_MANY_PAGES';
  readonly pageCount: number;
  readonly maxPages: number;

  constructor(pageCount: number, maxPages: number = MAX_PDF_PAGES) {
    super(`PDF has ${pageCount} pages; the maximum is ${maxPages}.`);
    this.pageCount = pageCount;
    this.maxPages = maxPages;
  }
}

/**
 * Classification of a thrown error so callers (the UI) can pick a precise,
 * user-facing message instead of a generic "failed".
 */
export type PdfErrorKind =
  | 'too-many-pages'
  | 'password-required'
  | 'incorrect-password'
  | 'unknown';

/**
 * pdf.js raises a `PasswordException` for encrypted PDFs with:
 *   code 1 (NEED_PASSWORD)      -> no/empty password supplied
 *   code 2 (INCORRECT_PASSWORD) -> a wrong password was supplied
 */
const PDF_NEED_PASSWORD = 1;
const PDF_INCORRECT_PASSWORD = 2;

export function isPasswordException(error: unknown): boolean {
  const err = error as { name?: string } | null;
  return !!err && err.name === 'PasswordException';
}

export function isIncorrectPasswordError(error: unknown): boolean {
  const err = error as { name?: string; code?: number } | null;
  return !!err && err.name === 'PasswordException' && err.code === PDF_INCORRECT_PASSWORD;
}

export function isNeedPasswordError(error: unknown): boolean {
  const err = error as { name?: string; code?: number } | null;
  return (
    !!err &&
    err.name === 'PasswordException' &&
    (err.code === PDF_NEED_PASSWORD || err.code === undefined)
  );
}

/**
 * Classify an error thrown by `convertPdfToImages` (or page-count probing) so
 * the UI can map it to a specific localized message.
 */
export function classifyPdfError(error: unknown): PdfErrorKind {
  const err = error as { name?: string } | null;
  if (err && err.name === 'PdfTooManyPagesError') {
    return 'too-many-pages';
  }
  if (isIncorrectPasswordError(error)) {
    return 'incorrect-password';
  }
  if (isPasswordException(error)) {
    return 'password-required';
  }
  return 'unknown';
}

export async function convertPdfToImages(
  pdfFile: File,
  options: PdfConversionOptions = {}
): Promise<File[]> {
  const { dpi = 150, format = 'jpeg', quality = 0.85, password, onProgress } = options;

  // Lazy load pdfjs-dist to avoid initial bundle size impact
  const pdfjsLib = await import('pdfjs-dist');

  // Import worker using Vite's ?url suffix for proper module resolution
  const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  const workerSrc = workerModule.default;

  // Set worker source
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }

  const arrayBuffer = await pdfFile.arrayBuffer();

  // Note: we intentionally do NOT wrap document loading in the generic
  // try/catch below so that typed errors (PasswordException,
  // PdfTooManyPagesError) propagate unchanged to the caller for precise
  // user-facing messaging.
  const documentParams: Record<string, unknown> = { data: arrayBuffer };
  if (password) {
    documentParams.password = password;
  }
  const pdf = await pdfjsLib.getDocument(documentParams).promise;

  // Guard against oversized PDFs before doing any (expensive) rendering.
  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new PdfTooManyPagesError(pdf.numPages, MAX_PDF_PAGES);
  }

  try {
    const images: File[] = [];

    // Calculate scale based on DPI (PDF points are 72 DPI)
    const scale = dpi / 72; // 150/72 = ~2.08 for 150 DPI

    for (let i = 1; i <= pdf.numPages; i++) {
      if (onProgress) {
        onProgress(i, pdf.numPages);
      }

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      // Create canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page to canvas
      await page.render({
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas
      }).promise;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          `image/${format}`,
          quality
        );
      });

      // Create File object with descriptive name
      const baseName = pdfFile.name.replace(/\.pdf$/i, '');
      const pageNum = pdf.numPages > 1 ? `_page_${i}` : '';
      const extension = format === 'jpeg' ? 'jpg' : 'png';
      const filename = `${baseName}${pageNum}.${extension}`;

      images.push(new File([blob], filename, {
        type: `image/${format}`,
        lastModified: pdfFile.lastModified
      }));
    }

    return images;
  } catch (error) {
    console.error('PDF conversion failed:', error);
    throw new Error('Failed to convert PDF to images');
  }
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function getEstimatedImageSize(pageCount: number, dpi: number = 150): string {
  // Rough estimate: A4 page at 150 DPI is ~250KB as JPEG
  const sizePerPageKB = (dpi / 150) * (dpi / 150) * 250; // Scale quadratically with DPI
  const totalSizeKB = pageCount * sizePerPageKB;

  if (totalSizeKB < 1024) {
    return `~${Math.round(totalSizeKB)} KB`;
  } else {
    return `~${Math.round(totalSizeKB / 1024 * 10) / 10} MB`;
  }
}
