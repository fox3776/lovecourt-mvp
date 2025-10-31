import { ref } from 'vue';
import type { Verdict } from '@/types';
import { judge } from '@/utils/apiClient';
import { ensureUserId } from '@/utils/user';
import { loadCloudSessionId } from '@/utils/storage';
import { markSessionCompleted } from '@/utils/cloudDb';

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
      const uid = userId || (await ensureUserId());
      const response = await judge(summary, uid);
      if (!response || !response.verdict) {
        throw new Error('未返回有效判决结构');
      }
      caseId.value = response.case_id || '';
      data.value = response.verdict;
      state.value = 'success';
      // 云端：标记会话已完成
      try { const sid = loadCloudSessionId(); if (sid) await markSessionCompleted(sid) } catch (_) {}
    } catch (error: any) {
      console.error('judge error', error);
      errorMessage.value = error?.message || '召唤失败，请稍后再试';
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
