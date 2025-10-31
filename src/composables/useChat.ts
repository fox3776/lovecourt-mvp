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
  saveCloudSessionId,
  loadCloudSessionId,
} from '@/utils/storage';
import { ensureSession, appendDetail, updateSessionAfterMessage, updateSessionSummary } from '@/utils/cloudDb';
import { ensureUserId } from '@/utils/user';

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
  // 1) 优先使用后端提供的结构化摘要
  if (metadata?.summary) return metadata.summary;

  // 2) 文本中解析摘要片段
  const tryParseFromText = (text: string): CaseSummary | null => {
    const anchors = [
      '情感陈述摘要',
      '案情摘要',
      '摘要',
      SUMMARY_TRIGGER.replace(/[【】]/g, ''),
      SUMMARY_TRIGGER,
      '总结',
    ];
    let idx = -1;
    for (const a of anchors) {
      idx = text.indexOf(a);
      if (idx >= 0) break;
    }
    const picked = idx >= 0 ? text.slice(idx) : text;

    const lines = picked
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    // 提取关键词（可选）
    const keywords: string[] = [];
    lines.forEach((line) => {
      if (line.includes('关键字') || line.includes('关键词') || /keywords?/i.test(line)) {
        const seg = line.split(/[:：]/)[1] || '';
        seg
          .split(/[,，\s]+/)
          .map((k) => k.trim())
          .filter(Boolean)
          .forEach((k) => keywords.push(k));
      }
    });

    const body = lines.join('\n').trim();
    if (!body) return null;
    return { id: `local_${Date.now()}`, text: body, keywords: keywords.length ? keywords : undefined };
  };

  // 3) 若 metadata 标记已就绪，则直接将本轮回答作为摘要（再尝试解析片段以提升质量）
  if (metadata?.summary_ready) {
    return tryParseFromText(answer) || { id: `local_${Date.now()}`, text: answer.trim() };
  }

  // 4) 回退：若文本包含显式触发词，也尝试解析
  if (answer.includes(SUMMARY_TRIGGER) || /情感陈述摘要|案情摘要|摘要|总结/.test(answer)) {
    return tryParseFromText(answer);
  }

  return null;
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
  const cloudSessionId = ref<string | null>(loadCloudSessionId());
  const summary = ref<CaseSummary | null>(loadSummary());
  const state = ref<ReportState>(summary.value ? 'readyToJudge' : history.value.length ? 'chatting' : 'idle');
  const loading = ref(false);
  const uid = ref<string>('');

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

    // 确保拥有有效的 userId（Dify 要求）
    try { if (!uid.value) uid.value = await ensureUserId() } catch (_) {}

    start();
    loading.value = true;

    const userMessage = buildMessage(text.trim(), 'user');
    history.value = [...history.value, userMessage];
    saveChatHistory(history.value);
    // 云端：确保会话并记录明细
    try {
      const sid = await ensureSession(cloudSessionId.value, userMessage.text)
      if (sid && sid !== cloudSessionId.value) {
        cloudSessionId.value = sid
        saveCloudSessionId(sid)
      }
      if (cloudSessionId.value) {
        await appendDetail(cloudSessionId.value, { role: 'user', text: userMessage.text, ts: userMessage.ts })
        await updateSessionAfterMessage(cloudSessionId.value, userMessage.text, 1)
      }
    } catch (_) {}

    try {
      const response = await chat(text.trim(), uid.value || userId, conversationId.value || undefined);
      if (response.conversation_id) {
        conversationId.value = response.conversation_id;
        saveConversationId(response.conversation_id);
      }

      const aiMessage = buildMessage(response.answer, 'ai');
      history.value = [...history.value, aiMessage];
      saveChatHistory(history.value);
      // 云端：记录AI回复并更新会话
      try {
        if (cloudSessionId.value) {
          await appendDetail(cloudSessionId.value, { role: 'ai', text: aiMessage.text, ts: aiMessage.ts })
          await updateSessionAfterMessage(cloudSessionId.value, aiMessage.text, 1, response.conversation_id)
        }
      } catch (_) {}

      const extracted = extractSummary(response.answer, response.metadata);
      if (extracted) {
        summary.value = extracted;
        saveSummary(extracted);
        state.value = 'readyToJudge';
        // 云端：更新摘要
        try { if (cloudSessionId.value) await updateSessionSummary(cloudSessionId.value, extracted.text) } catch (_) {}
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
    cloudSessionId.value = null;
    saveCloudSessionId(null);
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
