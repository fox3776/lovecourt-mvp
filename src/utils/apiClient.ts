import type { CaseSummary, Verdict } from '@/types';
import chatMock from '@/mocks/chat.json';
import chatSummaryMock from '@/mocks/chat-summary.json';
import verdictMock from '@/mocks/verdict.json';

type ChatResponse = {
  answer: string;
  conversation_id?: string;
  metadata?: {
    round?: number;
    summary_ready?: boolean;
    summary?: CaseSummary;
  };
};

type JudgeResponse = {
  case_id: string;
  verdict: Verdict;
};

const importMetaEnv = typeof import.meta !== 'undefined' ? ((import.meta as any).env || {}) : {};
const BASE_URL = (process.env.DIFY_BASE_URL || importMetaEnv.DIFY_BASE_URL || '').replace(/\/$/, '');
const API_KEY = process.env.DIFY_API_KEY || importMetaEnv.DIFY_API_KEY || '';
const USE_MOCK = String(process.env.USE_MOCK || importMetaEnv.USE_MOCK || '').toLowerCase() === 'true';

let mockRound = 0;

function showToast(message: string) {
  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2000,
  });
}

function ensureBaseUrl() {
  if (!BASE_URL) {
    console.warn('DIFY_BASE_URL 未配置');
  }
}

export function resetMock() {
  mockRound = 0;
}

export function request<T>(path: string, method: UniNamespace.HttpMethod = 'POST', data?: any) {
  ensureBaseUrl();

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      success(res) {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          const message = (res.data as Record<string, any>)?.message || '服务暂时不可用';
          showToast(message);
          reject(new Error(message));
        }
      },
      fail(err) {
        showToast('网络不稳定，请稍后再试');
        reject(err);
      },
    });
  });
}

export async function chat(
  query: string,
  userId?: string,
  conversationId?: string,
): Promise<ChatResponse> {
  if (USE_MOCK) {
    mockRound += 1;
    if (mockRound >= 3) {
      return chatSummaryMock as ChatResponse;
    }
    return {
      ...(chatMock as ChatResponse),
      metadata: {
        ...(chatMock.metadata || {}),
        round: mockRound,
      },
    };
  }

  const payload = {
    inputs: {},
    query,
    response_mode: 'blocking',
    user: userId,
    conversation_id: conversationId,
  };

  return request<ChatResponse>('/v1/chat-messages', 'POST', payload);
}

export async function judge(summary: string, userId?: string): Promise<JudgeResponse> {
  if (USE_MOCK) {
    return verdictMock as JudgeResponse;
  }

  const payload = {
    summary,
    user: userId,
  };

  return request<JudgeResponse>('/v1/judge', 'POST', payload);
}
