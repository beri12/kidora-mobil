import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '@/api/learning';
import { feedback } from '@/utils/feedback';

/** Claiming is checked and granted once on the server (keyed per quest). */
export function useClaimQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentApi.claimQuest,
    onSuccess: () => {
      feedback.correct();
      qc.invalidateQueries({ queryKey: ['student'] });
    },
  });
}
