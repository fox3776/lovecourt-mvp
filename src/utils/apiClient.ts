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

// 仅使用 Vite 注入的 process.env，避免 import.meta 在小程序端触发对 url 模块的引用
const RAW_BASE_URL = (process.env.DIFY_BASE_URL || '').trim();
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '').replace(/\/v1$/, '');
const API_KEY = process.env.DIFY_API_KEY || '';
const USE_MOCK = String(process.env.USE_MOCK || '').toLowerCase() === 'true';
const FORCE_CLOUD_ONLY = String(process.env.FORCE_CLOUD_ONLY || '').toLowerCase() === 'true';

// 导出配置给诊断/测试页使用
export const runtimeConfig = {
  BASE_URL,
  API_KEY_PRESENT: !!API_KEY,
  USE_MOCK,
  FORCE_CLOUD_ONLY,
};

let mockRound = 0;

function showToast(message: string) {
  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2000,
  });
}

function ensureBaseUrl() {
  if (!BASE_URL && !USE_MOCK) {
    console.warn('DIFY_BASE_URL 未配置');
    showToast('服务地址未配置，请联系管理员');
    return false;
  }
  return true;
}

export function resetMock() {
  mockRound = 0;
}

function canUseCloud() {
  try {
    return !USE_MOCK && typeof wx !== 'undefined' && wx?.cloud;
  } catch (_) {
    return false;
  }
}

async function callCloud<T>(action: 'chatMessages' | 'judge', payload: any): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    wx.cloud
      .callFunction({ name: 'difyProxy', data: { action, payload } })
      .then((res: any) => {
        const result = res?.result || {};
        if (result.ok) {
          resolve(result.data as T);
        } else {
          const status = result.status ? `(${result.status}) ` : '';
          const msg = `${status}${result.error || '云函数请求失败'}`.trim();
          showToast(msg);
          reject(new Error(msg));
        }
      })
      .catch((err: any) => {
        // 透传错误，交由上层决定是否回退直连
        reject(err);
      });
  });
}

export function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  data?: any,
  options?: { timeoutMs?: number; retries?: number }
) {
  if (!ensureBaseUrl()) {
    return Promise.reject(new Error('BASE_URL_MISSING'));
  }

  const timeoutMs = options?.timeoutMs ?? 15000;
  const maxRetries = options?.retries ?? 2;

  function doRequest(attempt = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      uni.request({
        url: `${BASE_URL}${path}`,
        method,
        data,
        timeout: timeoutMs,
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        success(res) {
          const status = res.statusCode || 0;
          if (status >= 200 && status < 300) {
            resolve(res.data as T);
          } else {
            const serverMessage = (res.data as Record<string, any>)?.message;
            let message = '服务暂时不可用';
            if (status === 401 || status === 403) message = '鉴权失败，请检查配置';
            else if (status === 429) message = '请求过于频繁，请稍后再试';
            else if (status >= 500) message = '服务繁忙，请稍后再试';
            else if (serverMessage) message = serverMessage;

            // 针对可重试状态码进行退避重试
            if ((status === 429 || status >= 500) && attempt < maxRetries) {
              const delay = 300 * (attempt + 1);
              setTimeout(() => {
                doRequest(attempt + 1).then(resolve).catch(reject);
              }, delay);
              return;
            }

            showToast(message);
            reject(new Error(`HTTP_${status}: ${message}`));
          }
        },
        fail(err) {
          if (attempt < maxRetries) {
            const delay = 300 * (attempt + 1);
            setTimeout(() => {
              doRequest(attempt + 1).then(resolve).catch(reject);
            }, delay);
            return;
          }
          showToast('网络不稳定，请稍后再试');
          reject(err);
        },
      });
    });
  }

  return doRequest();
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
  if (canUseCloud()) {
    try {
      return await callCloud<ChatResponse>('chatMessages', payload);
    } catch (cloudErr: any) {
      console.warn('cloud chat failed, fallback to direct request:', cloudErr?.message || cloudErr);
      if (FORCE_CLOUD_ONLY) {
        showToast('云函数不可用，请稍后再试');
        throw cloudErr;
      }
      // 继续走直连（要求配置了 DIFY_BASE_URL 和 DIFY_API_KEY 且域名在白名单）
      return request<ChatResponse>('/v1/chat-messages', 'POST', payload);
    }
  } else {
    if (FORCE_CLOUD_ONLY) {
      showToast('云函数不可用，请稍后再试');
      throw new Error('Cloud unavailable');
    }
    return request<ChatResponse>('/v1/chat-messages', 'POST', payload);
  }
}

export async function judge(summary: string, userId?: string): Promise<JudgeResponse> {
  if (USE_MOCK) {
    return verdictMock as JudgeResponse;
  }

  const payload = {
    summary,
    user: userId,
  };
  if (canUseCloud()) {
    try {
      return await callCloud<JudgeResponse>('judge', payload);
    } catch (cloudErr: any) {
      console.warn('cloud judge failed, fallback to direct request:', cloudErr?.message || cloudErr);
      if (FORCE_CLOUD_ONLY) {
        showToast('云函数不可用，请稍后再试');
        throw cloudErr;
      }
      return request<JudgeResponse>('/v1/judge', 'POST', payload);
    }
  } else {
    if (FORCE_CLOUD_ONLY) {
      showToast('云函数不可用，请稍后再试');
      throw new Error('Cloud unavailable');
    }
    return request<JudgeResponse>('/v1/judge', 'POST', payload);
  }
}

// 连接性测试：发起一条轻量请求以验证连通与鉴权
export async function connectivityTest() {
  if (USE_MOCK) {
    return { ok: true, mock: true } as const;
  }
  try {
    const payload = { inputs: {}, query: '[PING]', response_mode: 'blocking', user: 'connectivity-test' };
    if (canUseCloud()) {
      try {
        await callCloud<ChatResponse>('chatMessages', payload);
      } catch {
        if (FORCE_CLOUD_ONLY) throw new Error('Cloud unavailable');
        await request<ChatResponse>('/v1/chat-messages', 'POST', payload, { timeoutMs: 8000, retries: 1 });
      }
    } else {
      if (FORCE_CLOUD_ONLY) throw new Error('Cloud unavailable');
      await request<ChatResponse>('/v1/chat-messages', 'POST', payload, { timeoutMs: 8000, retries: 1 });
    }
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) } as const;
  }
}
