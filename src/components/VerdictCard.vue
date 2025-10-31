<template>
  <view class="verdict-card">
    <view class="header">
      <text class="title">{{ verdict.title }}</text>
      <text v-if="caseId" class="case">案号：{{ caseId }}</text>
    </view>

    <view class="section" v-if="verdict.charges?.length">
      <text class="section-title">指控列表</text>
      <view v-for="charge in verdict.charges" :key="charge.name" class="charge">
        <view class="charge-header">
          <text class="charge-name">{{ charge.name }}</text>
          <text :class="['severity', severityClass(charge.severity)]">{{ charge.severity }}</text>
        </view>
        <view v-if="charge.evidence?.length" class="evidence">
          <text v-for="item in charge.evidence" :key="item">• {{ item }}</text>
        </view>
        <view v-if="charge.keywords?.length" class="keywords">
          <text v-for="word in charge.keywords" :key="word" class="tag">#{{ word }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="verdict.orders?.length">
      <text class="section-title">大法官行为处方</text>
      <view v-for="(order, index) in verdict.orders" :key="`${order.type}-${index}`" class="order">
        <text class="order-type">{{ order.type }}</text>
        <text class="order-content">{{ order.content }}</text>
        <text v-if="order.deadline" class="order-deadline">截止：{{ order.deadline }}</text>
      </view>
    </view>

    <view v-if="verdict.humor_penalty" class="section">
      <text class="section-title">幽默惩罚</text>
      <text class="content">{{ verdict.humor_penalty }}</text>
    </view>

    <view v-if="verdict.tips?.length" class="section">
      <text class="section-title">和解小贴士</text>
      <view class="tips">
        <text v-for="tip in verdict.tips" :key="tip" class="tip">{{ tip }}</text>
      </view>
    </view>

    <button v-if="verdict.share_summary" class="copy-btn" @click="copyShare">
      复制判决摘要
    </button>
  </view>
</template>

<script setup lang="ts">
import type { Verdict } from '@/types';

const props = defineProps<{
  verdict: Verdict;
  caseId?: string;
}>();

function severityClass(s: Verdict['charges'][number]['severity']) {
  const map: Record<string, string> = {
    '轻': 'severity-light',
    '中': 'severity-medium',
    '重': 'severity-heavy',
  };
  return map[s] || 'severity-medium';
}

function copyShare() {
  if (!props.verdict.share_summary) {
    return;
  }
  uni.setClipboardData({
    data: props.verdict.share_summary,
    success: () => {
      uni.showToast({ title: '已复制', icon: 'success' });
    },
  });
}
</script>

<style scoped lang="scss">
.verdict-card {
  background: var(--card-bg);
  border-radius: 24rpx;
  border: 1rpx solid var(--card-border);
  padding: 32rpx;
  color: var(--text-primary);
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.26);
}

.header {
  margin-bottom: 32rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
}

.case {
  display: block;
  margin-top: 12rpx;
  color: var(--text-secondary);
}

.section {
  margin-top: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.charge {
  padding: 24rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 16rpx;
}

.charge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.charge-name {
  font-size: 30rpx;
}

.severity {
  font-size: 26rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  border: 1rpx solid currentColor;
}

.severity-light {
  color: #4ade80;
}

.severity-medium {
  color: #fbbf24;
}

.severity-heavy {
  color: #f87171;
}

.evidence {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  color: var(--text-secondary);
}

.keywords {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  background: rgba(124, 92, 255, 0.2);
  color: #cbd5ff;
  padding: 6rpx 14rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.order {
  padding: 24rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 16rpx;
}

.order-type {
  font-weight: 600;
  margin-bottom: 8rpx;
}

.order-content {
  line-height: 1.6;
}

.order-deadline {
  display: block;
  margin-top: 8rpx;
  color: var(--text-secondary);
}

.content {
  line-height: 1.6;
}

.tips {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.tip {
  background: rgba(255, 255, 255, 0.05);
  padding: 16rpx;
  border-radius: 16rpx;
  line-height: 1.6;
}

.copy-btn {
  margin-top: 40rpx;
  width: 100%;
  padding: 24rpx 0;
  border-radius: 999rpx;
  border: none;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.9), rgba(255, 155, 210, 0.9));
  color: #0b0f1c;
  font-size: 30rpx;
}
</style>
