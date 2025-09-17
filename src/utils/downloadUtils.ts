import JSZip from 'jszip';

interface AssetImage {
  id: string;
  url: string;
  type: 'uploaded' | 'generated';
  projectName?: string;
  projectId?: string;
  nodeId?: string;
  createdAt: string;
}

export const downloadAllAssets = async (images: AssetImage[], filename: string = 'assets') => {
  if (images.length === 0) {
    console.warn('No images to download');
    return;
  }

  try {
    const zip = new JSZip();
    
    // Download all images and add to zip
    const downloadPromises = images.map(async (image, index) => {
      try {
        const response = await fetch(image.url);
        const blob = await response.blob();
        
        // Create a unique filename for each image
        const extension = getFileExtension(image.url) || 'jpg';
        const safeProjectName = image.projectName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
        const fileName = `${safeProjectName}_${image.type}_${image.id.slice(0, 8)}.${extension}`;
        
        zip.file(fileName, blob);
      } catch (error) {
        console.error(`Error downloading image ${image.id}:`, error);
      }
    });

    await Promise.all(downloadPromises);

    // Generate and download the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = window.URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${filename}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log(`Successfully downloaded ${images.length} images as ${filename}.zip`);
  } catch (error) {
    console.error('Error creating zip file:', error);
  }
};

const getFileExtension = (url: string): string => {
  const pathname = new URL(url).pathname;
  const extension = pathname.split('.').pop();
  return extension || 'jpg';
};