import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { PublicProfile } from '@perspective/contracts';

export const useProfile = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.getMe(),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<PublicProfile>) => apiClient.updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (confirmationPhrase: 'DELETE MY ACCOUNT') =>
      apiClient.deleteAccount({
        confirmationPhrase,
        idempotencyKey: `del_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      }),
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return {
    ...query,
    updateProfile: updateMutation.mutateAsync,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
