import { api } from "./api";
import { appendFileToFormData } from "../utils/formDataFile";

export async function uploadCommentImage(file: {
  uri: string;
  type: string;
  name: string;
}): Promise<{ url: string }> {
  const formData = new FormData();
  await appendFileToFormData(formData, "image", file);
  const response = await api.post<{ url: string }>("/uploads/comment-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
