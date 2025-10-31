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

async function callCloud<T>(action: 'chatMessages' | 'judge' | 'ping' | 'workflowJudge', payload: any): Promise<T> {
  const route = (act: string) => {
    if (act === 'chatMessages') return { name: 'difyChat', act }
    if (act === 'workflowJudge' || act === 'judge') return { name: 'difyJudge', act: 'workflowJudge' }
    return { name: 'difyJudge', act }
  }
  const target = route(action)
  const res: any = await wx.cloud.callFunction({ name: target.name, data: { action: target.act, payload } })
  const result = res?.result || {}
  if (result.ok) return result.data as T
  const status = result.status ? `(${result.status}) ` : ''
  const msg = `${status}${result.error || '云函数请求失败'}`.trim()
  showToast(msg)
  throw new Error(msg)
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
  if (USE_MOCK) return verdictMock as JudgeResponse;

  const payload = { summary, user: userId };
  if (!canUseCloud()) {
    showToast('云函数不可用，请稍后再试');
    throw new Error('Cloud unavailable');
  }
  // 仅走云函数工作流
  try {
    const wf = await callCloud<any>('workflowJudge', payload);
    try { console.log('[judge] workflow raw:', JSON.stringify(wf)) } catch (_) {}
    const mapped = mapWorkflowResultToJudge(wf);
    try { console.log('[judge] mapped:', JSON.stringify(mapped)) } catch (_) {}
    if (mapped) return mapped;
    throw new Error('工作流返回不可解析');
  } catch (e: any) {
    const msg = e?.message || e?.errMsg || '判决服务不可用';
    showToast(msg);
    throw e;
  }
}

// 将工作流返回结果映射为 JudgeResponse
function mapWorkflowResultToJudge(data: any): JudgeResponse | null {
  // 极简、确定性解析：只看 result.data.outputs.text
  try {
    const wf = data as any
    const outputs = wf?.data?.outputs ?? wf?.outputs
    const text = outputs?.text
    const caseId = wf?.workflow_run_id || wf?.task_id || wf?.data?.id || ''

    // 结构化对象：直接把四段渲染为 orders
    if (text && typeof text === 'object') {
      const orderKeys = ['案件回顾', '情感剖析', '温柔裁定', '最终判决']
      const orders: { type: string; content: string }[] = []
      for (let i = 0; i < orderKeys.length; i++) {
        const k = orderKeys[i]
        if ((text as any)[k]) orders.push({ type: k, content: String((text as any)[k]) })
      }
      // 追加未在白名单内但存在的其它键
      for (const k in text as any) {
        if (Object.prototype.hasOwnProperty.call(text, k)) {
          if (!orderKeys.includes(k)) orders.push({ type: k, content: String((text as any)[k]) })
        }
      }
      // 提取标题（避免使用 Object.values 以兼容低版本环境）
      let titleFromValues: string | undefined
      for (const k in text as any) {
        if (Object.prototype.hasOwnProperty.call(text, k)) {
          const v = (text as any)[k]
          if (typeof v === 'string' && /《[^》]+》/.test(v)) { titleFromValues = v; break }
        }
      }
      const title = titleFromValues ? (titleFromValues.match(/《([^》]+)》/)![0]) : '爱情宇宙法庭·判决书'
      const share = (text as any)['最终判决'] || (text as any)['温柔裁定'] || ''
      return { case_id: String(caseId || ''), verdict: { title, charges: [], orders, share_summary: share || undefined } }
    }

    // 纯文本：作为单条“判决全文”显示
    if (typeof text === 'string' && text.trim()) {
      const m = text.match(/《([^》]+)》/)
      const title = m ? `《${m[1]}》` : '爱情宇宙法庭·判决书'
      return { case_id: String(caseId || ''), verdict: { title, charges: [], orders: [{ type: '判决全文', content: text }] } }
    }
  } catch (_) {}
  return null
}

// 连接性测试：发起一条轻量请求以验证连通与鉴权
export async function connectivityTest() {
  if (USE_MOCK) {
    return { ok: true, mock: true } as const;
  }
  try {
    const payload = { inputs: {}, query: '[PING]', response_mode: 'blocking', user: 'connectivity-test' };
    if (canUseCloud()) {
      // 先快速探测云函数可用性（不会访问第三方）
      await callCloud('ping', {});
      if (FORCE_CLOUD_ONLY) {
        // CloudOnly 模式：云函数可用即可视为通过，避免 3s 超时
        return { ok: true } as const;
      }
      // 非 CloudOnly：再做一次直连 Dify 的快速探测（需前端配置域名/密钥）
      await request<ChatResponse>('/v1/chat-messages', 'POST', payload, { timeoutMs: 8000, retries: 1 });
    } else {
      if (FORCE_CLOUD_ONLY) throw new Error('云函数不可用：未检测到 wx.cloud');
      await request<ChatResponse>('/v1/chat-messages', 'POST', payload, { timeoutMs: 8000, retries: 1 });
    }
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e?.errMsg || e) } as const;
  }
}
function extractJson<T = any>(text: string): T | null {
  try {
    // 优先提取 ```json ... ``` 代码块
    const codeBlock = text.match(/```json\s*([\s\S]*?)```/i)
    if (codeBlock && codeBlock[1]) return JSON.parse(codeBlock[1])
  } catch (_) {}
  try {
    // 回退：提取第一个大括号块
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const body = text.slice(start, end + 1)
      return JSON.parse(body)
    }
  } catch (_) {}
  return null
}

function mapChatAnswerToJudge(answer: string): JudgeResponse | null {
  const obj = extractJson<any>(answer)
  if (!obj) return null
  // 接受 { case_id, verdict } 或直接作为 verdict
  const caseId = obj.case_id || obj.caseId || obj.id || ''
  const verdict = obj.verdict || obj
  if (!verdict || typeof verdict !== 'object') return null
  return { case_id: String(caseId || ''), verdict }
}
