import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listApiKeys,
  createApiKey,
  renameApiKey,
  revokeApiKey,
  deleteApiKey,
  type ApiKey,
  type ApiKeyCreateInput,
  type ApiKeyCreateResponse,
} from "../services/apiKeys.service";

const QUERY_KEY = ["apiKeys"] as const;

export function useApiKeysQuery() {
  return useQuery<ApiKey[]>({
    queryKey: QUERY_KEY,
    queryFn: listApiKeys,
  });
}

export function useCreateApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation<ApiKeyCreateResponse, Error, ApiKeyCreateInput>({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useRenameApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameApiKey(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useRevokeApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
