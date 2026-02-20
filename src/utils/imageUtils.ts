import * as FileSystem from "expo-file-system/legacy";

export const imageUriToClerkFile = async (uri: string) => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const extension = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "gif"
        ? "image/gif"
        : "image/jpeg";

  // Return a data URI string
  return `data:${mimeType};base64,${base64}`;
};
