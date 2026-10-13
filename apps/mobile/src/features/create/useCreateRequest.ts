import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { CreateRequestInput } from '@perspective/contracts';

export const useCreateRequest = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateRequestInput) => apiClient.createRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      queryClient.invalidateQueries({ queryKey: ['exploreBatch'] });
    },
  });

  return {
    createRequest: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
  };
};
