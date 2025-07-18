import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../store/firebase"; // adjust path as needed

function dataURLtoBlob(dataURL: string): Blob {
  const byteString = atob(dataURL.split(',')[1]);
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

export async function uploadCanvasScreenshot(fileName: string, dataURL: string) {
  const blob = dataURLtoBlob(dataURL);
  const storageRef = ref(storage, `screenshots/${fileName}`);

  try {
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    console.log("✅ Uploaded to Firebase:", url);
    return url;
  } catch (error) {
    console.error("❌ Upload failed", error);
    return null;
  }
}

export async function getFileFromFirebase(path: string): Promise<string> {
  try {
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    console.log("✅ File fetched from Firebase:", url);
    return url;
  } catch (error) {
    console.error("❌ Failed to read file from Firebase:", error);
    throw error;
  }
}