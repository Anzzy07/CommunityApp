import * as FileSystem from "expo-file-system/legacy";

// Convert a local image URI to a base64 data URI string that Clerk's API accepts.
// Clerk's setProfileImage expects a data URI rather than a raw file path,
// so the file bytes are read and encoded here before being passed to the upload call.
export const imageUriToClerkFile = async (uri: string) => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Derive the MIME type from the file extension so the data URI is correctly typed
  const extension = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "gif"
        ? "image/gif"
        : "image/jpeg";

  return `data:${mimeType};base64,${base64}`;
};
