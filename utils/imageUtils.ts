/**
 * Utility functions for loading, compressing, and managing photos for parts and orders.
 * Automatically resizes high-resolution photos using an HTML5 Canvas to prevent
 * exceeding browser localStorage storage quotas (~5MB limit).
 */

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function isValidImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Resizes and compresses an image File into a lightweight Base64 JPEG data URL.
 * Typical 5MB-10MB mobile camera photos compress down to ~40KB-120KB.
 */
export async function compressAndFormatImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<string> {
  const { maxWidth = 1000, maxHeight = 1000, quality = 0.82 } = options;

  if (!isValidImageFile(file)) {
    throw new Error('Please select a valid image file (JPEG, PNG, WEBP, etc.)');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Empty image data'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        reject(new Error('Failed to decode image data'));
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate new dimensions preserving aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const scalingFactor = Math.min(widthRatio, heightRatio);

            width = Math.round(width * scalingFactor);
            height = Math.round(height * scalingFactor);
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback: return raw dataUrl if canvas context isn't available
            resolve(dataUrl);
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          // If any canvas security/taint or memory issue occurs, resolve with original
          resolve(dataUrl);
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Checks if a string looks like a valid image URL or data URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return true;
  }
  return false;
}
