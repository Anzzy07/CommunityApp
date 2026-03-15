import { supabase } from "@/src/lib/supabase";

/**
 * Upload an image to Supabase Storage
 * @param localUri - Local file URI from device
 * @returns The storage path of the uploaded image
 */
export const uploadImage = async (localUri: string): Promise<string> => {
  try {
    console.log("📤 Uploading image:", localUri);

    // Fetch the file from local URI
    const fileRes = await fetch(localUri);
    const arrayBuffer = await fileRes.arrayBuffer();

    // Extract file extension and create unique filename
    const fileExt = localUri.split(".").pop()?.toLowerCase() ?? "jpeg";
    const path = `${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error, data } = await supabase.storage
      .from("images")
      .upload(path, arrayBuffer, {
        contentType: `image/${fileExt}`,
      });

    if (error) {
      console.error("❌ Upload error:", error);
      throw error;
    }

    console.log("✅ Image uploaded:", data.path);
    return data.path;
  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
};

/**
 * Download an image from Supabase Storage
 * @param imagePath - Storage path of the image
 * @returns Base64 data URL of the image
 */
export const downloadImage = async (imagePath: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("📥 Downloading image:", imagePath);

      const { error, data } = await supabase.storage
        .from("images")
        .download(imagePath);

      if (error) {
        console.error("❌ Download error:", error);
        return reject(error);
      }

      // Convert binary data to Base64 Data URL
      const fr = new FileReader();
      fr.readAsDataURL(data);
      fr.onload = () => {
        console.log("✅ Image downloaded");
        resolve(fr.result as string);
      };
      fr.onerror = () => {
        reject(new Error("Failed to read image data"));
      };
    } catch (error) {
      console.error("❌ Download failed:", error);
      reject(error);
    }
  });
};

/**
 * Get public URL for an image (if bucket is public)
 * @param imagePath - Storage path of the image
 * @returns Public URL
 */
export const getImageUrl = (imagePath: string): string => {
  const { data } = supabase.storage.from("images").getPublicUrl(imagePath);
  return data.publicUrl;
};
