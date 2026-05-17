import { downloadImage } from "@/src/utils/supabaseImages";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  StyleProp,
  View,
} from "react-native";

type Props = {
  path: string | null;
  bucket?: string;
  style?: StyleProp<ImageStyle>;
  fallbackUri?: string;
};

export default function SupabaseImage({
  path,
  style,
  fallbackUri = "https://via.placeholder.com/400",
}: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // No path provided — skip loading and show the fallback immediately
    if (!path) {
      setLoading(false);
      setError(true);
      return;
    }

    // Path is already a remote URL — use it directly without going through Supabase Storage
    if (path.startsWith("http://") || path.startsWith("https://")) {
      setImageUri(path);
      setLoading(false);
      return;
    }

    // A local file:// URI should never reach the database.
    // Log a warning and fall back gracefully rather than making a failed network request.
    if (path.startsWith("file://")) {
      console.warn("⚠️ Invalid local file path in database:", path);
      setError(true);
      setLoading(false);
      return;
    }

    // Path refers to a Supabase Storage object — download and convert it to a usable URI
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const uri = await downloadImage(path);
        setImageUri(uri);
      } catch (err) {
        console.error("Failed to load image from storage:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [path]);

  // Show a spinner in the same dimensions as the final image while the URI is resolving
  if (loading) {
    return (
      <View
        style={[
          style,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f0f0f0",
          },
        ]}
      >
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  // Render the fallback placeholder when the image could not be loaded
  if (error || !imageUri) {
    return <Image source={{ uri: fallbackUri }} style={style} />;
  }

  return <Image source={{ uri: imageUri }} style={style} resizeMode="cover" />;
}
