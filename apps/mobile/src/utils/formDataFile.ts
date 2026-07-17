import { Platform } from "react-native";

interface UploadFile {
  uri: string;
  type: string;
  name: string;
}

/**
 * Appends a file to FormData in a cross-platform way.
 *
 * On native, React Native's FormData polyfill accepts `{ uri, type, name }` directly.
 * On web, the standard FormData API requires a real Blob/File, so we fetch the
 * blob URL returned by expo-image-picker and convert it.
 */
export async function appendFileToFormData(
  formData: FormData,
  field: string,
  file: UploadFile,
): Promise<void> {
  if (Platform.OS === "web") {
    const blob = await fetch(file.uri).then((r) => r.blob());
    formData.append(field, blob, file.name);
  } else {
    formData.append(field, file as unknown as Blob);
  }
}
