<template>
  <view class="chat-history">
    <view class="header">
      <text class="title">历史对话</text>
    </view>
    
    <view class="content">
      <view v-if="chatList.length === 0" class="empty">
        <text class="empty-text">暂无历史对话</text>
        <text class="empty-hint">开始一段新的对话吧</text>
      </view>
      
      <scroll-view v-else class="chat-list" scroll-y>
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
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const chatList = ref([])

const loadChatHistory = () => {
  // 模拟加载聊天历史
  chatList.value = [
    {
      id: '1',
      title: '情感问题咨询',
      time: '2024-01-15 14:30',
      preview: '最近和伴侣有些矛盾，不知道该如何处理...',
      messageCount: 8,
      status: 'completed'
    },
    {
      id: '2',
      title: '关系修复建议',
      time: '2024-01-14 10:20',
      preview: '想要改善和伴侣的关系，有什么好的建议吗？',
      messageCount: 12,
      status: 'completed'
    },
    {
      id: '3',
      title: '沟通技巧学习',
      time: '2024-01-13 16:45',
      preview: '如何更好地与伴侣沟通？',
      messageCount: 6,
      status: 'processing'
    }
  ]
}

const getStatusText = (status) => {
  const statusMap = {
    'processing': '进行中',
    'completed': '已完成',
    'pending': '待处理'
  }
  return statusMap[status] || '未知'
}

const viewChatDetail = (chat) => {
  uni.showModal({
    title: '查看对话详情',
    content: `是否查看"${chat.title}"的详细内容？`,
    success: (res) => {
      if (res.confirm) {
        uni.showToast({
          title: '跳转到对话详情',
          icon: 'none'
        })
        // 这里可以跳转到具体的对话详情页面
      }
    }
  })
}

onLoad(() => {
  loadChatHistory()
  console.log('历史对话页面加载')
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
</style>