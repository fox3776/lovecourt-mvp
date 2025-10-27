import { ref } from 'vue';
import type { Verdict } from '@/types';
import { judge } from '@/utils/apiClient';

type VerdictState = 'idle' | 'loading' | 'success' | 'error';

export function useVerdict(userId?: string) {
  const state = ref<VerdictState>('idle');
  const data = ref<Verdict | null>(null);
  const caseId = ref<string>('');
  const errorMessage = ref('');

  async function fetch(summary: string) {
    if (!summary) {
      errorMessage.value = '缺少案情摘要';
      state.value = 'error';
      return;
    }

    state.value = 'loading';
    errorMessage.value = '';

    try {
      const response = await judge(summary, userId);
      caseId.value = response.case_id;
      data.value = response.verdict;
      state.value = 'success';
    } catch (error) {
      console.error('judge error', error);
      errorMessage.value = '召唤失败，请稍后再试';
      state.value = 'error';
    }
  }

  return {
    state,
    data,
    caseId,
    errorMessage,
    fetch,
  };
}
