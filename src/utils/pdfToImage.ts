
export interface PdfConversionOptions {
  dpi?: number;
  format?: 'jpeg' | 'png';
  quality?: number;
  onProgress?: (current: number, total: number) => void;
}

export async function convertPdfToImages(
  pdfFile: File,
  options: PdfConversionOptions = {}
): Promise<File[]> {
  const { dpi = 150, format = 'jpeg', quality = 0.85, onProgress } = options;

  try {
    // Lazy load pdfjs-dist to avoid initial bundle size impact
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source to use static file from public directory
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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