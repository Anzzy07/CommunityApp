import { supabase } from "@/src/lib/supabase";

// Upload a local image file to the Supabase Storage "images" bucket.
// The file is fetched from its local URI, converted to an ArrayBuffer,
// and stored under a timestamp-based filename to avoid name collisions.

// Returns the storage path, which is saved to the database for later retrieval.
export const uploadImage = async (localUri: string): Promise<string> => {
  try {
    console.log("📤 Uploading image:", localUri);

    const fileRes = await fetch(localUri);
    const arrayBuffer = await fileRes.arrayBuffer();

    // Use a Unix timestamp as the filename so concurrent uploads never clash
    const fileExt = localUri.split(".").pop()?.toLowerCase() ?? "jpeg";
    const path = `${Date.now()}.${fileExt}`;

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

// Download an image from Supabase Storage and return it as a base64 data URL.

// The SupabaseImage component uses this function to display images whose paths
// are stored in the database rather than as public URLs.
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

      // FileReader converts the raw binary Blob into a base64 data URL
      // that React Native's Image component can display directly
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

// Generate the public URL for an image in a public Supabase Storage bucket.

// This is faster than downloading when the bucket's access policy allows public reads,
// as it avoids an extra network request to fetch the file contents.
export const getImageUrl = (imagePath: string): string => {
  const { data } = supabase.storage.from("images").getPublicUrl(imagePath);
  return data.publicUrl;
};
