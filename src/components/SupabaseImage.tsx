import { downloadImage } from "@/src/utils/supabaseImages";
import React, { useEffect, useState } from "react";
import { Image, ImageStyle, StyleProp, View } from "react-native";

type Props = {
  path: string | null;
  bucket?: string;
  style?: StyleProp<ImageStyle>;
  fallbackUri?: string;
};

// Renders an image from Supabase Storage or a plain URL.
export default function SupabaseImage({
  path,
  style,
  fallbackUri = "https://via.placeholder.com/400",
}: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      setError(true);
      return;
    }

    // Already a remote URL
    if (path.startsWith("http://") || path.startsWith("https://")) {
      setImageUri(path);
      setLoading(false);
      return;
    }

    // Local file:// URI should never reach the DB — log and fall back
    if (path.startsWith("file://")) {
      console.warn("⚠️ Local file path in database:", path);
      setError(true);
      setLoading(false);
      return;
    }

    // Supabase Storage path — download and resolve to a usable URI
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const uri = await downloadImage(path);
        setImageUri(uri);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [path]);

  // Grey skeleton
  if (loading) {
    return <View style={[style, { backgroundColor: "#E5E7EB" }]} />;
  }

  if (error || !imageUri) {
    return <Image source={{ uri: fallbackUri }} style={style} />;
  }

  return <Image source={{ uri: imageUri }} style={style} resizeMode="cover" />;
}
