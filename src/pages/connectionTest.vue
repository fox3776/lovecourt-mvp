<template>
  <view class="connection-test">
    <view class="header">
      <text class="title">数据库连接测试</text>
      <view class="meta">
        <text class="mode-chip">{{ modeLabel }}</text>
        <text v-if="envId" class="env">env: {{ envId }}</text>
      </view>
    </view>
    
    <view class="content">
      <button @click="testConnection" class="test-btn" :disabled="testing">
        {{ testing ? '测试中...' : '测试数据库连接' }}
      </button>
      
      <view v-if="testResult" class="result">
        <text class="result-title">测试结果：</text>
        <text :class="['result-text', testResult.success ? 'success' : 'error']">
          {{ testResult.message }}
        </text>
        <text v-if="testResult.details" class="result-details">
          {{ testResult.details }}
        </text>
      </view>
      
      <view v-if="testHistory.length > 0" class="history">
        <text class="history-title">测试历史：</text>
        <scroll-view class="history-list" scroll-y>
          <view v-for="(item, index) in testHistory" :key="index" class="history-item">
            <text class="history-time">{{ item.time }}</text>
            <text :class="['history-status', item.success ? 'success' : 'error']">
              {{ item.success ? '成功' : '失败' }}
            </text>
            <text class="history-message">{{ item.message }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { connectivityTest, runtimeConfig } from '@/utils/apiClient'

const testing = ref(false)
const testResult = ref<any>(null)
const testHistory = ref<any[]>([])

// 顶部模式与环境信息（无需点击测试即可看到）
const modeLabel = computed(() => runtimeConfig.USE_MOCK ? 'Mock' : (runtimeConfig.FORCE_CLOUD_ONLY ? 'CloudOnly' : 'CloudPrefer'))
// 从注入的环境变量读取云环境ID（若未配置则不显示）
// @ts-ignore
const envId = (process?.env?.WX_CLOUD_ENV_ID as string) || ''

const testConnection = async () => {
  testing.value = true
  testResult.value = null

  try {
    // 先做配置自检（CloudOnly 模式下不强制需要 BASE_URL）
    if (!runtimeConfig.USE_MOCK && !runtimeConfig.FORCE_CLOUD_ONLY) {
      if (!runtimeConfig.BASE_URL) {
        throw new Error('未配置 DIFY_BASE_URL')
      }
      if (!runtimeConfig.API_KEY_PRESENT) {
        throw new Error('未配置 DIFY_API_KEY')
      }
    }

    const start = Date.now()
    const res = await connectivityTest()
    const cost = Date.now() - start

    if (res.ok) {
      testResult.value = {
        success: true,
        message: runtimeConfig.USE_MOCK ? 'Mock 模式下跳过真实连接' : `连通成功 (${cost}ms)`,
        details: runtimeConfig.USE_MOCK
          ? 'USE_MOCK=true'
          : `Mode: ${runtimeConfig.FORCE_CLOUD_ONLY ? 'CloudOnly' : 'CloudPrefer'} | BASE: ${runtimeConfig.BASE_URL || '-'}`
      }
    } else {
      throw new Error(res.error || '未知错误')
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: error?.message || '连通性测试失败'
    }
  } finally {
    testing.value = false

    // 添加到测试历史
    testHistory.value.unshift({
      time: new Date().toLocaleTimeString(),
      success: !!testResult.value?.success,
      message: testResult.value?.message || '测试异常'
    })

    // 限制历史记录数量
    if (testHistory.value.length > 5) {
      testHistory.value = testHistory.value.slice(0, 5)
    }
  }
}

onLoad(() => {
  console.log('连通性测试页面加载')
})
</script>

<style scoped>
.connection-test {
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

.meta {
  margin-top: 12rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16rpx;
}

.mode-chip {
  display: inline-block;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  font-size: 24rpx;
  border: 1rpx solid rgba(52, 211, 153, 0.4);
}

.env {
  color: rgba(255,255,255,0.6);
  font-size: 22rpx;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.test-btn {
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 10rpx;
  padding: 30rpx;
  font-size: 32rpx;
  font-weight: bold;
}

.test-btn:disabled {
  background: #666;
  opacity: 0.6;
}

.result {
  background: rgba(255, 255, 255, 0.1);
  padding: 30rpx;
  border-radius: 10rpx;
  backdrop-filter: blur(10px);
}

.result-title {
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 20rpx;
}

.result-text {
  font-size: 28rpx;
  display: block;
  margin-bottom: 10rpx;
}

.result-text.success {
  color: #4CAF50;
}

.result-text.error {
  color: #f44336;
}

.result-details {
  color: rgba(255, 255, 255, 0.7);
  font-size: 24rpx;
  display: block;
}

.history {
  background: rgba(255, 255, 255, 0.1);
  padding: 30rpx;
  border-radius: 10rpx;
  backdrop-filter: blur(10px);
}

.history-title {
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 20rpx;
}

.history-list {
  max-height: 400rpx;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 15rpx 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.history-item:last-child {
  border-bottom: none;
}

.history-time {
  color: rgba(255, 255, 255, 0.7);
  font-size: 24rpx;
  min-width: 120rpx;
}

.history-status {
  font-size: 24rpx;
  font-weight: bold;
  min-width: 80rpx;
}

.history-status.success {
  color: #4CAF50;
}

.history-status.error {
  color: #f44336;
}

.history-message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 24rpx;
  flex: 1;
}
</style>
