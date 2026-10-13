import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export const useChat = (connectionId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', connectionId],
    queryFn: () => apiClient.getMessages(connectionId),
    enabled: !!connectionId,
    refetchInterval: 3000, // Poll or realtime sync
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      apiClient.sendMessage({
        connectionId,
        text,
        idempotencyKey: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', connectionId] });
    },
  });

  return {
    ...query,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
  };
};
