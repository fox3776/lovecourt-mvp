// 微信云函数：Dify Workflow 代理（专用于判决工作流）
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

function buildClient() {
  const raw = (process.env.DIFY_WORKFLOW_BASE_URL || '').trim()
  const baseURL = raw.replace(/\/+$/, '').replace(/\/v1$/, '')
  const apiKey = process.env.DIFY_WORKFLOW_API_KEY || ''
  if (!baseURL || !apiKey) {
    throw new Error('Cloud env missing DIFY_WORKFLOW_BASE_URL or DIFY_WORKFLOW_API_KEY')
  }
  return axios.create({
    baseURL,
    timeout: 20000,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  })
}

async function proxyWorkflowJudge(payload) {
  const client = buildClient()
  const envWorkflowId = (process.env.DIFY_JUDGE_WORKFLOW_ID || process.env.DIFY_WORKFLOW_ID || '').trim()
  const payloadWorkflowId = (payload?.workflow_id || payload?.workflowId || '').toString().trim()
  const workflowId = envWorkflowId || payloadWorkflowId
  const { user, ...rest } = payload || {}
  // 输入别名填充
  const summaryValue = (rest.summary ?? rest.Summary ?? rest.case_summary ?? rest.caseSummary ?? rest.input ?? rest.text ?? rest.content) || ''
  const inputs = { ...rest }
  if (summaryValue) {
    const aliases = ['summary', 'Summary', 'case_summary', 'caseSummary', 'input', 'text', 'content']
    for (const key of aliases) if (inputs[key] === undefined) inputs[key] = summaryValue
  }
  const body = { inputs, response_mode: 'blocking' }
  if (user) body.user = user
  // 先老路径 /v1/workflows/run（优先）
  try {
    const alt = { ...body, workflow_id: workflowId }
    const { data } = await client.post('/v1/workflows/run', alt)
    return data
  } catch (e) {
    // 再尝试 RESTful 路径（当且仅当提供了 workflowId）
    if (workflowId) {
      const { data } = await client.post(`/v1/workflows/${workflowId}/run`, body)
      return data
    }
    throw e
  }
}

function diagnoseConfig() {
  const raw = (process.env.DIFY_WORKFLOW_BASE_URL || '').trim()
  const baseURL = raw.replace(/\/+$/, '').replace(/\/v1$/, '')
  const apiKey = process.env.DIFY_WORKFLOW_API_KEY || ''
  const workflowId = (process.env.DIFY_JUDGE_WORKFLOW_ID || process.env.DIFY_WORKFLOW_ID || '').trim()
  return {
    base_present: !!baseURL,
    api_present: !!apiKey,
    workflow_present: !!workflowId,
    base: baseURL,
    workflow_id_hint: workflowId ? `${workflowId.slice(0,6)}…` : ''
  }
}

exports.main = async (event, context) => {
  const action = event?.action
  try {
    switch (action) {
      case 'workflowJudge':
      case 'judge': {
        const payload = event?.payload || {}
        const result = await proxyWorkflowJudge(payload)
        return { ok: true, data: result }
      }
      case 'diagnoseJudge':
        return { ok: true, data: diagnoseConfig() }
      case 'ping':
        return { ok: true, data: { pong: true } }
      default:
        return { ok: false, error: `Unknown action: ${action}` }
    }
  } catch (err) {
    const status = err?.response?.status
    const respData = err?.response?.data
    const message = (respData && (respData.error || respData.message)) || err?.message || 'Proxy error'
    console.error('[difyJudge] error status:', status, 'message:', message, 'resp:', respData)
    return { ok: false, status, error: message, detail: respData }
  }
}
