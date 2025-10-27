import { computed, ref } from 'vue';
import type { CaseSummary, ChatMessage } from '@/types';
import { chat, resetMock } from '@/utils/apiClient';
import {
  clearAll,
  loadChatHistory,
  loadConversationId,
  loadSummary,
  saveChatHistory,
  saveConversationId,
  saveSummary,
} from '@/utils/storage';

type ReportState = 'idle' | 'chatting' | 'readyToJudge' | 'judging' | 'done' | 'error';

const SUMMARY_TRIGGER = '【我已整理完毕，以下是你的情感陈述摘要】';

function buildMessage(text: string, role: ChatMessage['role']): ChatMessage {
  return {
    id: `${role}_${Date.now()}`,
    role,
    text,
    ts: Date.now(),
  };
}

function extractSummary(answer: string, metadata?: ChatResponseMetadata): CaseSummary | null {
  if (metadata?.summary) {
    return metadata.summary;
  }

  if (!answer.includes(SUMMARY_TRIGGER)) {
    return null;
  }

  const lines = answer
    .slice(answer.indexOf(SUMMARY_TRIGGER))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const keywords: string[] = [];
  lines.forEach((line) => {
    if (line.includes('关键字') || line.includes('关键词')) {
      const match = line.split('：')[1];
      if (match) {
        match
          .split(/[,，\s]+/)
          .map((k) => k.trim())
          .filter(Boolean)
          .forEach((k) => keywords.push(k));
      }
    }
  });

  return {
    id: `local_${Date.now()}`,
    text: lines.join('\n'),
    keywords: keywords.length ? keywords : undefined,
  };
}

type ChatResponseMetadata = {
  round?: number;
  summary_ready?: boolean;
  summary?: CaseSummary;
};

type ChatResponse = {
  answer: string;
  conversation_id?: string;
  metadata?: ChatResponseMetadata;
};

export function useChat(userId?: string) {
  const history = ref<ChatMessage[]>(loadChatHistory());
  const conversationId = ref<string | null>(loadConversationId());
  const summary = ref<CaseSummary | null>(loadSummary());
  const state = ref<ReportState>(summary.value ? 'readyToJudge' : history.value.length ? 'chatting' : 'idle');
  const loading = ref(false);

  const isInputDisabled = computed(() =>
    ['readyToJudge', 'judging', 'done'].includes(state.value) || loading.value,
  );

  function start() {
    if (state.value === 'idle') {
      state.value = 'chatting';
    }
  }

  async function sendMessage(text: string) {
    if (!text || !text.trim() || loading.value || isInputDisabled.value) {
      return;
    }

    start();
    loading.value = true;

    const userMessage = buildMessage(text.trim(), 'user');
    history.value = [...history.value, userMessage];
    saveChatHistory(history.value);

    try {
      const response = await chat(text.trim(), userId, conversationId.value || undefined);
      if (response.conversation_id) {
        conversationId.value = response.conversation_id;
        saveConversationId(response.conversation_id);
      }

      const aiMessage = buildMessage(response.answer, 'ai');
      history.value = [...history.value, aiMessage];
      saveChatHistory(history.value);

      const extracted = extractSummary(response.answer, response.metadata);
      if (extracted) {
        summary.value = extracted;
        saveSummary(extracted);
        state.value = 'readyToJudge';
      } else if (response.metadata?.summary_ready) {
        state.value = 'readyToJudge';
      }
    } catch (error) {
      console.error('chat error', error);
      state.value = 'error';
    } finally {
      loading.value = false;
    }
  }

  function setSummary(newSummary: CaseSummary | null) {
    summary.value = newSummary;
    saveSummary(newSummary);
  }

  function reset() {
    history.value = [];
    summary.value = null;
    conversationId.value = null;
    state.value = 'idle';
    loading.value = false;
    clearAll();
    resetMock();
  }

  return {
    state,
    history,
    loading,
    isInputDisabled,
    summary,
    conversationId,
    sendMessage,
    start,
    setSummary,
    reset,
  };
}
