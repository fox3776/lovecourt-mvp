<template>
  <view class="page">
    <view v-if="state === 'loading'" class="skeleton">
      <view class="skeleton-block" v-for="index in 4" :key="index" />
      <text class="loading-text">大法官正在翻阅星际法典……</text>
    </view>

    <view v-else-if="state === 'error'" class="error">
      <text>{{ errorMessage || '召唤失败，请稍后再试' }}</text>
      <button class="ghost" @click="retry">重新召唤</button>
    </view>

    <verdict-card v-else-if="verdict" :verdict="verdict" :case-id="caseId" />

    <view v-if="state === 'success'" class="actions">
      <button class="primary" open-type="share">分享给 TA</button>
      <button class="ghost" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import VerdictCard from '@/components/VerdictCard.vue';
import { useVerdict } from '@/composables/useVerdict';
import { loadSummary } from '@/utils/storage';

const summaryText = ref('');
const { state, data, caseId, errorMessage, fetch } = useVerdict();

const verdict = computed(() => data.value);

function retry() {
  if (!summaryText.value) {
    summaryText.value = loadSummary()?.text || '';
  }
  if (summaryText.value) {
    fetch(summaryText.value);
  }
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' });
}

onLoad((options) => {
  summaryText.value = options.summary ? decodeURIComponent(options.summary as string) : '';
  if (!summaryText.value) {
    summaryText.value = loadSummary()?.text || '';
  }
  if (!summaryText.value) {
    errorMessage.value = '请返回检举流程重新生成案情摘要';
    state.value = 'error';
    return;
  }
  fetch(summaryText.value);
});

onShareAppMessage(() => ({
  title: verdict.value?.title || '爱情宇宙法庭·判决书',
  path: `/pages/verdict/verdict?case=${caseId.value}`,
}));

onShareTimeline(() => ({
  title: '我们在爱情宇宙法庭完成了和解之旅',
}));
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  color: var(--text-primary);
}

.skeleton {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.skeleton-block {
  height: 120rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.08);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.4;
  }
}

.loading-text {
  text-align: center;
  color: var(--text-secondary);
}

.error {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  color: var(--danger-color);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.primary {
  width: 100%;
  padding: 28rpx 0;
  border-radius: 999rpx;
  border: none;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.95), rgba(255, 155, 210, 0.9));
  color: #0b0f1c;
  font-size: 32rpx;
}

.ghost {
  width: 100%;
  padding: 24rpx 0;
  border-radius: 999rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.4);
  background: transparent;
  color: var(--text-primary);
  font-size: 30rpx;
}
</style>
