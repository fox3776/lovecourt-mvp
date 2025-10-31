<template>
  <view class="page">
    <view class="header">
      <text class="app-name">爱情宇宙法庭</text>
      <text class="slogan">爱情宇宙大法庭，准备开庭！</text>
    </view>

    <view class="content">
      <text class="description">
        3 分钟完成情感检举，邀请银河大法官判案，让关系重新对齐。
      </text>
      <button class="primary" @click="goReport">我要检举</button>
    </view>

    <view class="footer">
      <text class="tips">* 登录非必需，所有对话均已量子加密</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';

function goReport() {
  // report 是 tabBar 页面，必须使用 switchTab 跳转
  uni.switchTab({ url: '/pages/report' });
}

onShareAppMessage(() => ({
  title: '爱情宇宙法庭 - 情感纠纷检举站',
  path: '/pages/index',
}));

onShareTimeline(() => ({
  title: '我在爱情宇宙法庭发起了情感检举',
}));
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 80rpx 48rpx 120rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--text-primary);
}

.header {
  text-align: center;
}

.app-name {
  font-size: 60rpx;
  font-weight: 700;
}

.slogan {
  margin-top: 16rpx;
  font-size: 32rpx;
  color: var(--text-secondary);
}

.content {
  margin-top: 120rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
}

.description {
  font-size: 30rpx;
  text-align: center;
  line-height: 1.6;
  max-width: 520rpx;
}

.primary {
  width: 320rpx;
  padding: 28rpx 0;
  border-radius: 999rpx;
  border: none;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.95), rgba(255, 155, 210, 0.9));
  color: #0b0f1c;
  font-size: 32rpx;
}

.footer {
  text-align: center;
  color: var(--text-secondary);
  font-size: 24rpx;
}
</style>
