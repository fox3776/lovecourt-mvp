const USER_KEY = 'lovecourt_user_id'

function loadLocal(): string | null {
  try {
    return (uni.getStorageSync(USER_KEY) as string) || null
  } catch (_) {
    return null
  }
}

export function setUserId(id: string) {
  try { uni.setStorageSync(USER_KEY, id) } catch (_) {}
}

function genAnonId() {
  const rand = Math.random().toString(36).slice(2, 10)
  return `anon_${Date.now().toString(36)}_${rand}`
}

async function fetchOpenId(): Promise<string | null> {
  try {
    // @ts-ignore
    if (typeof wx === 'undefined' || !wx.cloud) return null
    // @ts-ignore
    const res = await wx.cloud.callFunction({ name: 'login' })
    const oid = res?.result?.openid
    return oid || null
  } catch (_) {
    return null
  }
}

export async function ensureUserId(): Promise<string> {
  const cached = loadLocal()
  if (cached) return cached

  const oid = await fetchOpenId()
  const id = oid || genAnonId()
  setUserId(id)
  return id
}
