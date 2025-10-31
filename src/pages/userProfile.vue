<template>
  <view class="user-profile">
    <view class="header">
      <text class="title">个人信息</text>
    </view>
    
    <view class="content">
      <view class="avatar-section">
        <image src="/static/icon/user.svg" class="avatar" />
        <text class="username">{{ userInfo.username || '未登录用户' }}</text>
      </view>
      
      <view class="info-section">
        <view class="info-item">
          <text class="label">用户ID：</text>
          <text class="value">{{ userInfo.userId || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="label">注册时间：</text>
          <text class="value">{{ userInfo.registerTime || '--' }}</text>
        </view>
        <view class="info-item">
          <text class="label">对话次数：</text>
          <text class="value">{{ userInfo.chatCount || 0 }}</text>
        </view>
      </view>
      
      <view class="actions">
        <button @click="handleLogout" class="logout-btn">退出登录</button>
        <button @click="handleClearData" class="clear-btn">清除数据</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ensureUserId, setUserId } from '@/utils/user'
import { clearAll } from '@/utils/storage'

const userInfo = ref({ username: '爱情宇宙用户', userId: '', registerTime: '', chatCount: 0 })

const loadUserInfo = async () => {
  const id = await ensureUserId()
  userInfo.value.userId = id
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({
          title: '退出中...'
        })
        
        setTimeout(() => {
          uni.hideLoading()
          uni.showToast({
            title: '退出成功',
            icon: 'success'
          })
          
          // 清空用户与本地会话
          setUserId('')
          try { clearAll() } catch {}
          // 回到首页
          uni.switchTab({ url: '/pages/index' })
        }, 1000)
      }
    }
  })
}


const handleClearData = () => {
  uni.showModal({
    title: '清除数据',
    content: '确定要清除所有聊天记录和个人数据吗？此操作不可恢复。',
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({
          title: '清除中...'
        })
        
        setTimeout(() => {
          uni.hideLoading()
          uni.showToast({
            title: '数据清除成功',
            icon: 'success'
          })
        }, 1500)
      }
    }
  })
}

onLoad(() => {
  loadUserInfo()
  console.log('个人信息页面加载')
})
</script>

<style scoped>
.user-profile {
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
  display: flex;
  flex-direction: column;
  gap: 60rpx;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.2);
}

.username {
  color: white;
  font-size: 36rpx;
  font-weight: bold;
}

.info-section {
  background: rgba(255, 255, 255, 0.1);
  padding: 40rpx;
  border-radius: 10rpx;
  backdrop-filter: blur(10px);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 28rpx;
}

.value {
  color: white;
  font-size: 28rpx;
  font-weight: bold;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.test-btn {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 10rpx;
  padding: 30rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.logout-btn {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 10rpx;
  padding: 30rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10rpx;
  padding: 30rpx;
  font-size: 32rpx;
}
</style>
