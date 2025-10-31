// 微信云函数：Dify Chat 代理（专用于聊天 App）
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function buildClient() {
  const raw = (process.env.DIFY_CHAT_BASE_URL || '').trim()
  const baseURL = raw.replace(/\/+$/, '').replace(/\/v1$/, '')
  const apiKey = process.env.DIFY_CHAT_API_KEY || ''
  if (!baseURL || !apiKey) {
    throw new Error('Cloud env missing DIFY_CHAT_BASE_URL or DIFY_CHAT_API_KEY')
  }
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  })
}

async function proxyChatMessages(payload) {
  const client = buildClient()
  const { data } = await client.post('/v1/chat-messages', payload)
  return data
}

function diagnoseConfig() {
  const raw = (process.env.DIFY_CHAT_BASE_URL || '').trim()
  const baseURL = raw.replace(/\/+$/, '').replace(/\/v1$/, '')
  const apiKey = process.env.DIFY_CHAT_API_KEY || ''
  return {
    base_present: !!baseURL,
    api_present: !!apiKey,
    base: baseURL,
  }
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
      case 'diagnoseChat': {
        return { ok: true, data: diagnoseConfig() }
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
    console.error('[difyChat] error status:', status, 'message:', message, 'resp:', respData)
    return { ok: false, status, error: message, detail: respData }
  }
}
