<template>
  <view class="verdict-card">
    <view class="header">
      <text class="title">{{ vVerdict.title || '爱情宇宙法庭·判决书' }}</text>
      <text v-if="caseId" class="case">案号：{{ caseId }}</text>
    </view>

    <view class="section" v-if="vVerdict.charges?.length">
      <text class="section-title">指控列表</text>
      <view v-for="charge in vVerdict.charges" :key="charge.name" class="charge">
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

    <!-- 按四段结构化展示：案件回顾 / 情感剖析 / 温柔裁定 / 最终判决 -->
    <view class="section" v-if="sections.review">
      <text class="section-title">案件回顾</text>
      <text class="content">{{ sections.review }}</text>
    </view>

    <view class="section" v-if="sections.analysis">
      <text class="section-title">情感剖析</text>
      <text class="content">{{ sections.analysis }}</text>
    </view>

    <view class="section" v-if="sections.ruling">
      <text class="section-title">温柔裁定</text>
      <text class="content">{{ sections.ruling }}</text>
    </view>

    <view class="section" v-if="sections.judgement">
      <text class="section-title">最终判决</text>
      <text class="content">{{ sections.judgement }}</text>
    </view>

    <!-- 其余未归类内容 -->
    <view class="section" v-if="sections.others.length">
      <text class="section-title">更多内容</text>
      <view v-for="(o, idx) in sections.others" :key="`${o.type}-${idx}`" class="order">
        <text class="order-type">{{ o.type }}</text>
        <text class="order-content">{{ o.content }}</text>
      </view>
    </view>

    <view v-if="vVerdict.humor_penalty" class="section">
      <text class="section-title">幽默惩罚</text>
      <text class="content">{{ vVerdict.humor_penalty }}</text>
    </view>

    <view v-if="vVerdict.tips?.length" class="section">
      <text class="section-title">和解小贴士</text>
      <view class="tips">
        <text v-for="tip in vVerdict.tips" :key="tip" class="tip">{{ tip }}</text>
      </view>
    </view>

    <button v-if="vVerdict.share_summary" class="copy-btn" @click="copyShare">
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

import { computed } from 'vue';
// 兼容传入的是 Ref/ComputedRef 的情况
const vVerdict = computed(() => {
  const anyV: any = props.verdict as any;
  return anyV && typeof anyV === 'object' && 'value' in anyV ? anyV.value : props.verdict;
});

// 从 orders 中提取四段内容（避免使用 Map/Object.values 以兼容低版本运行时）
const sections = computed(() => {
  const orders = (vVerdict.value?.orders as any[]) || []
  const bucket: Record<string, string[]> = {}
  for (let i = 0; i < orders.length; i++) {
    const item = orders[i] || {}
    const t = (item.type || '').toString()
    const c = (item.content || '').toString()
    if (!t || !c) continue
    if (!bucket[t]) bucket[t] = []
    bucket[t].push(c)
  }
  const pick = (key: string) => (bucket[key] ? bucket[key].join('\n\n') : '')
  const known = ['案件回顾', '情感剖析', '温柔裁定', '最终判决']
  const others: { type: string; content: string }[] = []
  for (const k in bucket) {
    if (Object.prototype.hasOwnProperty.call(bucket, k)) {
      if (!known.includes(k)) others.push({ type: k, content: bucket[k].join('\n\n') })
    }
  }
  return {
    review: pick('案件回顾'),
    analysis: pick('情感剖析'),
    ruling: pick('温柔裁定'),
    judgement: pick('最终判决'),
    others,
  }
})

function severityClass(s: Verdict['charges'][number]['severity']) {
  const map: Record<string, string> = {
    '轻': 'severity-light',
    '中': 'severity-medium',
    '重': 'severity-heavy',
  };
  return map[s] || 'severity-medium';
}

function copyShare() {
  const v: any = vVerdict.value as any;
  if (!v?.share_summary) {
    return;
  }
  uni.setClipboardData({
    data: v.share_summary,
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
