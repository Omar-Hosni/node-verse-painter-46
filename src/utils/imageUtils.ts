/**
 * Utility functions for image processing and conversion
 */

/**
 * Converts a canvas data URL to a File object
 * @param dataUrl - The data URL string from canvas.toDataURL()
 * @param filename - The desired filename for the File object
 * @returns File object ready for upload
 */
export const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Generates a filename for image uploads based on node type and timestamp
 * @param nodeType - The type of node (e.g., 'pose', 'lights')
 * @param extension - File extension (default: 'png')
 * @returns Generated filename string
 */
export const generateImageFilename = (nodeType: string, extension: string = 'png'): string => {
  const timestamp = Date.now();
  return `${nodeType}-${timestamp}.${extension}`;
};


/** Pick valid width/height for Runware (128..2048, multiples of 64). 
 * If the image size is unknown, default to 1024x1024.
 */
const snap64 = (n: number) => Math.round(n / 64) * 64;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const pickDimsForEdit = async (imgUrl?: string, fallbackW = 1024, fallbackH = 1024): Promise<{ width: number; height: number }> => {
      let w = fallbackW, h = fallbackH;
      if (imgUrl) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = "anonymous";
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = imgUrl;
          });
          // Keep aspect ratio, cap the largest side at 1024, snap to 64
          const maxSide = 1024;
          if (img.width >= img.height) {
            const scale = maxSide / img.width;
            w = maxSide;
            h = Math.max(128, Math.round(img.height * scale));
          } else {
            const scale = maxSide / img.height;
            h = maxSide;
            w = Math.max(128, Math.round(img.width * scale));
          }
        } catch {
          // ignore and use fallback
        }
      }
      w = clamp(snap64(w), 128, 2048);
      h = clamp(snap64(h), 128, 2048);
      // make sure neither snapped to 0
      if (w < 128) w = 128;
      if (h < 128) h = 128;
      return { width: w, height: h };
  }