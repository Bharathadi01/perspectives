import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export const useConnections = () => {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => apiClient.getConnections(),
  });
};
