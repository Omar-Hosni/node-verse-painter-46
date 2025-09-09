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