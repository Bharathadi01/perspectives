import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { SubmitResponseInput, SkipRequestInput, ReportReason } from '@perspective/contracts';

export const useExplore = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['exploreBatch'],
    queryFn: () => apiClient.getExploreBatch(),
  });

  const skipMutation = useMutation({
    mutationFn: (input: SkipRequestInput) => apiClient.skipRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploreBatch'] });
    },
  });

  const submitResponseMutation = useMutation({
    mutationFn: (input: SubmitResponseInput) => apiClient.submitResponse(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploreBatch'] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: (args: { targetId: string; reason: ReportReason }) =>
      apiClient.report({
        targetType: 'request',
        targetId: args.targetId,
        reason: args.reason,
        idempotencyKey: `rep_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploreBatch'] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (blockedUserId: string) =>
      apiClient.blockUser({
        blockedUserId,
        idempotencyKey: `blk_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exploreBatch'] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  return {
    ...query,
    skip: skipMutation.mutateAsync,
    submitResponse: submitResponseMutation.mutateAsync,
    report: reportMutation.mutateAsync,
    blockUser: blockMutation.mutateAsync,
    isSubmitting: submitResponseMutation.isPending,
  };
};
