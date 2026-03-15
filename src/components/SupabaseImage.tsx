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
    if (!path) {
      setLoading(false);
      setError(true);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const uri = await downloadImage(path);
        setImageUri(uri);
      } catch (err) {
        console.error("Failed to load image:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [path]);

  if (loading) {
    return (
      <View style={[style, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (error || !imageUri) {
    return <Image source={{ uri: fallbackUri }} style={style} />;
  }

  return <Image source={{ uri: imageUri }} style={style} />;
}
