import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { SubmitFeedbackInput } from '@perspective/contracts';

export const useInbox = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['inbox'],
    queryFn: () => apiClient.getInbox(),
  });

  const feedbackMutation = useMutation({
    mutationFn: (input: SubmitFeedbackInput) => apiClient.submitFeedback(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  return {
    ...query,
    submitFeedback: feedbackMutation.mutateAsync,
    isSubmitting: feedbackMutation.isPending,
  };
};
