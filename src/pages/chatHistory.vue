<template>
  <view class="chat-history">
    <view class="header">
      <text class="title">历史对话</text>
    </view>
    
    <view class="content">
      <view v-if="loading && chatList.length === 0" class="skeleton-list">
        <view class="skeleton-item" v-for="n in 4" :key="`sk-${n}`"></view>
      </view>

      <view v-else-if="chatList.length === 0" class="empty">
        <text class="empty-text">暂无历史对话</text>
        <text class="empty-hint">开始一段新的对话吧</text>
      </view>
      
      <scroll-view v-else class="chat-list" scroll-y @scrolltolower="loadMore">
        <view 
          v-for="chat in chatList" 
          :key="chat.id" 
          class="chat-item"
          @click="viewChatDetail(chat)"
        >
          <view class="chat-header">
            <text class="chat-title">{{ chat.title }}</text>
            <text class="chat-time">{{ chat.time }}</text>
          </view>
          <text class="chat-preview">{{ chat.preview }}</text>
          <view class="chat-footer">
            <text class="chat-count">{{ chat.messageCount }} 条消息</text>
            <text :class="['chat-status', chat.status]">{{ getStatusText(chat.status) }}</text>
          </view>
        </view>
        <view class="load-more" v-if="hasMore && !loading">上拉加载更多...</view>
        <view class="load-more" v-else-if="loading">加载中...</view>
        <view class="load-more" v-else>没有更多了</view>
      </scroll-view>
    </view>
  </view>
  </template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { loadChatHistory as loadLocal } from '@/utils/storage'

const chatList = ref([])
const loading = ref(false)
const hasMore = ref(true)
const pageSize = 20
const openId = ref('')

function getStatusText(status) {
  const statusMap = {
    'processing': '进行中',
    'completed': '已完成',
    'pending': '待处理'
  }
  return statusMap[status] || '未知'
}

function mapCloudDocToItem(doc) {
  return {
    id: doc._id,
    title: doc.title || '未命名会话',
    time: formatTime(doc.updateTime),
    preview: doc.preview || '',
    messageCount: doc.messageCount || 0,
    status: doc.status || 'completed'
  }
}

function formatTime(val) {
  try {
    const date = new Date(val?.toString ? val.toString() : val)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  } catch {
    return ''
  }
}

async function fetchOpenId() {
  try {
    // @ts-ignore
    if (typeof wx === 'undefined' || !wx.cloud) return
    // @ts-ignore
    const res = await wx.cloud.callFunction({ name: 'login' })
    const oid = res?.result?.openid
    if (oid) openId.value = oid
  } catch (_) {}
}

async function fetchFromCloud(refresh = false) {
  loading.value = true
  try {
    // @ts-ignore
    if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) throw new Error('cloud-unavailable')
    // @ts-ignore
    const db = wx.cloud.database()
    let coll = db.collection('chat_list')
    if (openId.value) coll = coll.where({ _openid: openId.value })
    const skip = refresh ? 0 : chatList.value.length
    const res = await coll.orderBy('updateTime', 'desc').skip(skip).limit(pageSize).get()
    const items = (res?.data || []).map(mapCloudDocToItem)
    if (refresh) chatList.value = items
    else chatList.value = chatList.value.concat(items)
    hasMore.value = items.length >= pageSize
  } catch (e) {
    if (refresh && chatList.value.length === 0) {
      // 本地兜底
      const local = loadLocal()
      if (local && local.length) {
        const last = local[local.length - 1]
        chatList.value = [
          {
            id: 'local_session',
            title: '本地会话',
            time: formatTime(last.ts),
            preview: last.text?.slice(0, 40) || '',
            messageCount: local.length,
            status: 'completed'
          }
        ]
        hasMore.value = false
      }
    }
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!loading.value && hasMore.value) fetchFromCloud(false)
}

function viewChatDetail(chat) {
  uni.showToast({ title: '敬请期待：会话详情', icon: 'none' })
}

onLoad(async () => {
  await fetchOpenId()
  fetchFromCloud(true)
})
</script>

<style scoped>
.chat-history {
  min-height: 100vh;
  background: linear-gradient(135deg, #1b1f3b 0%, #0b0f1c 100%);
  padding: 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  color: white;
  font-size: 48rpx;
  font-weight: bold;
}

.content {
  flex: 1;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.skeleton-item {
  height: 140rpx;
  border-radius: 10rpx;
  background: rgba(255,255,255,0.08);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400rpx;
  gap: 20rpx;
}

.empty-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 32rpx;
}

.empty-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 28rpx;
}

.chat-list {
  max-height: calc(100vh - 200rpx);
}

.chat-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 30rpx;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-item:active {
  background: rgba(255, 255, 255, 0.15);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15rpx;
}

.chat-title {
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  flex: 1;
}

.chat-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 24rpx;
}

.chat-preview {
  color: rgba(255, 255, 255, 0.8);
  font-size: 28rpx;
  line-height: 1.4;
  display: block;
  margin-bottom: 15rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.chat-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 24rpx;
}

.chat-status {
  font-size: 24rpx;
  font-weight: bold;
  padding: 8rpx 16rpx;
  border-radius: 6rpx;
}

.chat-status.processing {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.chat-status.completed {
  background: rgba(76, 175, 80, 0.2);
  color: #4CAF50;
}

.chat-status.pending {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
}

.load-more {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 24rpx;
  padding: 20rpx 0 10rpx;
}
</style>
