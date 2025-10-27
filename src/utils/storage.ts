import type { CaseSummary, ChatMessage } from '@/types';

const CHAT_KEY = 'lovecourt_chat_history';
const SUMMARY_KEY = 'lovecourt_case_summary';
const CONVERSATION_KEY = 'lovecourt_conversation_id';

export function saveChatHistory(messages: ChatMessage[]) {
  try {
    uni.setStorageSync(CHAT_KEY, messages);
  } catch (error) {
    console.warn('保存聊天记录失败', error);
  }
}

export function loadChatHistory(): ChatMessage[] {
  try {
    return (uni.getStorageSync(CHAT_KEY) as ChatMessage[]) || [];
  } catch (error) {
    console.warn('读取聊天记录失败', error);
    return [];
  }
}

export function saveSummary(summary: CaseSummary | null) {
  try {
    if (summary) {
      uni.setStorageSync(SUMMARY_KEY, summary);
    } else {
      uni.removeStorageSync(SUMMARY_KEY);
    }
  } catch (error) {
    console.warn('保存案情摘要失败', error);
  }
}

export function loadSummary(): CaseSummary | null {
  try {
    return (uni.getStorageSync(SUMMARY_KEY) as CaseSummary) || null;
  } catch (error) {
    console.warn('读取案情摘要失败', error);
    return null;
  }
}

export function saveConversationId(id: string | null) {
  try {
    if (id) {
      uni.setStorageSync(CONVERSATION_KEY, id);
    } else {
      uni.removeStorageSync(CONVERSATION_KEY);
    }
  } catch (error) {
    console.warn('保存会话ID失败', error);
  }
}

export function loadConversationId(): string | null {
  try {
    return (uni.getStorageSync(CONVERSATION_KEY) as string) || null;
  } catch (error) {
    console.warn('读取会话ID失败', error);
    return null;
  }
}

export function clearAll() {
  saveChatHistory([]);
  saveSummary(null);
  saveConversationId(null);
}
