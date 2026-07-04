import { api } from "./api";

export async function uploadCommentImage(file: {
  uri: string;
  type: string;
  name: string;
}): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("image", file as unknown as Blob);
  const response = await api.post<{ url: string }>("/uploads/comment-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
