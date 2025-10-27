<template>
  <view class="summary-card">
    <view class="header">
      <text class="title">案情已就绪</text>
      <text class="subtitle">根据已收集信息整理的简要总结</text>
    </view>
    <view class="body">
      <text class="summary-text">{{ summary.text }}</text>
      <view v-if="summary.keywords?.length" class="keywords">
        <text v-for="word in summary.keywords" :key="word" class="tag">#{{ word }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { CaseSummary } from '@/types';

defineProps<{
  summary: CaseSummary;
}>();
</script>

<style scoped lang="scss">
.summary-card {
  background: var(--card-bg);
  border: 1rpx solid var(--card-border);
  border-radius: 24rpx;
  padding: 32rpx;
  color: var(--text-primary);
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.2);
}

.header {
  margin-bottom: 24rpx;
}

.title {
  font-size: 34rpx;
  font-weight: 600;
}

.subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.summary-text {
  line-height: 1.7;
  white-space: pre-wrap;
}

.keywords {
  margin-top: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  background: rgba(124, 92, 255, 0.2);
  color: #cbd5ff;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}
</style>
