// 轻量封装微信云数据库操作，所有方法都在失败时静默降级

type SessionDoc = {
  _id?: string
  title?: string
  preview?: string
  updateTime?: any
  messageCount?: number
  status?: 'processing' | 'ready' | 'completed'
  conversationId?: string
  summaryText?: string
}

function canUseCloudDB(): boolean {
  try {
    // @ts-ignore
    return typeof wx !== 'undefined' && !!wx.cloud && !!wx.cloud.database
  } catch (_) {
    return false
  }
}

function getDB() {
  // @ts-ignore
  return wx.cloud.database()
}

function trimPreview(text: string, n = 40) {
  const s = String(text || '')
  return s.length > n ? `${s.slice(0, n)}…` : s
}

export async function ensureSession(sessionId: string | null, firstText?: string): Promise<string | null> {
  if (!canUseCloudDB()) return null
  const db = getDB()
  try {
    if (sessionId) {
      // 尝试读取，存在则返回
      const one = await db.collection('chat_list').doc(sessionId).get()
      if (one?.data?._id) return sessionId
    }
  } catch (_) {
    // doc 不存在则创建
  }

  try {
    const res = await db.collection('chat_list').add({
      data: {
        title: '情感检举',
        preview: trimPreview(firstText || ''),
        updateTime: db.serverDate(),
        messageCount: 0,
        status: 'processing',
      } as SessionDoc,
    })
    return res?._id || null
  } catch (_) {
    return null
  }
}

export async function appendDetail(sessionId: string, msg: { role: 'user' | 'ai' | 'system'; text: string; ts: number }) {
  if (!canUseCloudDB() || !sessionId) return
  const db = getDB()
  try {
    await db.collection('chat_details').add({
      data: {
        chatId: sessionId,
        role: msg.role,
        text: msg.text,
        ts: msg.ts,
      },
    })
  } catch (_) {}
}

export async function updateSessionAfterMessage(sessionId: string, latestText: string, inc = 1, conversationId?: string) {
  if (!canUseCloudDB() || !sessionId) return
  const db = getDB()
  const _ = db.command
  try {
    const patch: any = {
      preview: trimPreview(latestText),
      updateTime: db.serverDate(),
      messageCount: _.inc(Math.max(inc, 1)),
    }
    if (conversationId) patch.conversationId = conversationId
    await db.collection('chat_list').doc(sessionId).update({ data: patch })
  } catch (_) {}
}

export async function updateSessionSummary(sessionId: string, summaryText: string) {
  if (!canUseCloudDB() || !sessionId) return
  const db = getDB()
  try {
    await db.collection('chat_list').doc(sessionId).update({
      data: { summaryText, status: 'ready', updateTime: db.serverDate() },
    })
  } catch (_) {}
}

export async function markSessionCompleted(sessionId: string) {
  if (!canUseCloudDB() || !sessionId) return
  const db = getDB()
  try {
    await db.collection('chat_list').doc(sessionId).update({
      data: { status: 'completed', updateTime: db.serverDate() },
    })
  } catch (_) {}
}

export function isCloudDBAvailable() {
  return canUseCloudDB()
}

