/**
 * Utility functions for image processing and conversion
 */

/**
 * Converts a canvas data URL to a File object
 * @param dataUrl - The data URL string from canvas.toDataURL()
 * @param filename - The desired filename for the File object
 * @returns File object ready for upload
 */
//mask related like inpainting/outpainting
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

//reference, rerendering
export const dataUrlToFileSimple = async (dataUrl: string, filename = "combined-image.png"): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: "image/png" });
}

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


  
export const  combineTwoImagesToDataURL = async (url1: string, url2: string): Promise<string> => {
    // load images
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const img1 = await load(url1);
    const img2 = await load(url2);

    const isPortrait1 = img1.height >= img1.width;
    const isPortrait2 = img2.height >= img2.width;

    let combinedWidth = 0, combinedHeight = 0;
    let img1X = 0, img1Y = 0, img1W = img1.width, img1H = img1.height;
    let img2X = 0, img2Y = 0, img2W = img2.width, img2H = img2.height;

    if (isPortrait1 && isPortrait2) {
      const maxH = Math.max(img1.height, img2.height);
      const s1 = maxH / img1.height;
      const s2 = maxH / img2.height;
      img1W = img1.width * s1; img1H = maxH;
      img2W = img2.width * s2; img2H = maxH;
      combinedWidth = img1W + img2W; combinedHeight = maxH;
      img1X = 0; img1Y = 0; img2X = img1W; img2Y = 0;
    } else if (!isPortrait1 && !isPortrait2) {
      const maxW = Math.max(img1.width, img2.width);
      const s1 = maxW / img1.width;
      const s2 = maxW / img2.width;
      img1W = maxW; img1H = img1.height * s1;
      img2W = maxW; img2H = img2.height * s2;
      combinedWidth = maxW; combinedHeight = img1H + img2H;
      img1X = 0; img1Y = 0; img2X = 0; img2Y = img1H;
    } else {
      const targetH = Math.min(img1.height, img2.height);
      const s1 = targetH / img1.height;
      const s2 = targetH / img2.height;
      img1W = img1.width * s1; img1H = targetH;
      img2W = img2.width * s2; img2H = targetH;
      combinedWidth = img1W + img2W; combinedHeight = targetH;
      img1X = 0; img1Y = 0; img2X = img1W; img2Y = 0;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(combinedWidth);
    canvas.height = Math.round(combinedHeight);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img1, img1X, img1Y, img1W, img1H);
    ctx.drawImage(img2, img2X, img2Y, img2W, img2H);
    return canvas.toDataURL("image/png");
  }