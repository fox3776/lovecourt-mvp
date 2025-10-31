// 微信云函数：Dify 代理
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function buildClient() {
  // 兼容：若把 /v1 写进了 BASE_URL，移除，避免 /v1/v1
  const raw = (process.env.DIFY_BASE_URL || '').trim()
  const baseURL = raw.replace(/\/+$/, '').replace(/\/v1$/, '')
  const apiKey = process.env.DIFY_API_KEY || ''
  if (!baseURL || !apiKey) {
    throw new Error('Cloud env missing DIFY_BASE_URL or DIFY_API_KEY')
  }
  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })
  return client
}

async function proxyChatMessages(payload) {
  const client = buildClient()
  console.log('[difyProxy] chatMessages payload keys:', Object.keys(payload||{}))
  const { data } = await client.post('/v1/chat-messages', payload)
  return data
}

async function proxyJudge(payload) {
  const client = buildClient()
  const { data } = await client.post('/v1/judge', payload)
  return data
}

exports.main = async (event, context) => {
  const action = event?.action
  try {
    switch (action) {
      case 'chatMessages': {
        const payload = event?.payload || {}
        const result = await proxyChatMessages(payload)
        return { ok: true, data: result }
      }
      case 'judge': {
        const payload = event?.payload || {}
        const result = await proxyJudge(payload)
        return { ok: true, data: result }
      }
      case 'ping': {
        return { ok: true, data: { pong: true } }
      }
      default:
        return { ok: false, error: `Unknown action: ${action}` }
    }
  } catch (err) {
    const status = err?.response?.status
    const respData = err?.response?.data
    const message = (respData && (respData.error || respData.message)) || err?.message || 'Proxy error'
    console.error('[difyProxy] error status:', status, 'message:', message, 'resp:', respData)
    return { ok: false, status, error: message, detail: respData }
  }
}
