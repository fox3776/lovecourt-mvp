<template>
  <view class="page">
    <view class="progress">
      <view v-for="(step, index) in steps" :key="step.key" class="step">
        <view :class="['dot', { active: index <= activeStep }]" />
        <text :class="['label', { active: index <= activeStep }]">{{ step.label }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="chat-area">
      <chat-bubble v-for="msg in history" :key="msg.id" :message="msg" />
      <view v-if="summary && state === 'readyToJudge'" class="summary-wrapper">
        <summary-card :summary="summary" />
      </view>
      <view v-if="state === 'error'" class="error">
        <text>连接断线啦，稍后再试一次。</text>
        <button class="ghost" @click="retry">重新召唤</button>
      </view>
    </scroll-view>

    <view v-if="summary && state === 'readyToJudge'" class="action">
      <button class="primary" @click="goJudge">开始审判</button>
    </view>

    <view v-else class="input-bar">
      <textarea
        v-model="draft"
        class="textarea"
        :disabled="isInputDisabled"
        placeholder="说说发生了什么……"
        maxlength="300"
        auto-height
      />
      <button class="send" :disabled="isInputDisabled || !draft.trim()" @click="handleSend">
        {{ loading ? '发送中…' : '发送' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import ChatBubble from '@/components/ChatBubble.vue';
import SummaryCard from '@/components/SummaryCard.vue';
import { useChat } from '@/composables/useChat';

const { history, state, summary, sendMessage, isInputDisabled, loading, start, reset } = useChat();
const draft = ref('');

const steps = [
  { key: 'chat', label: '检举问答' },
  { key: 'summary', label: '生成案情总结' },
  { key: 'judge', label: '开始审判' },
];

const activeStep = computed(() => {
  if (state.value === 'readyToJudge') return 2;
  if (state.value === 'chatting') return 1;
  return 0;
});

function handleSend() {
  if (!draft.value.trim()) return;
  const text = draft.value;
  draft.value = '';
  sendMessage(text);
}

function goJudge() {
  if (!summary.value) return;
  const sid = summary.value.id ? `?sid=${summary.value.id}` : '';
  const summaryParam = encodeURIComponent(summary.value.text);
  const url = `/pages/verdict${sid ? `${sid}&` : '?'}summary=${summaryParam}`;
  uni.navigateTo({ url });
}

function retry() {
  reset();
  start();
}

onMounted(() => {
  start();
});

onShareAppMessage(() => ({
  title: '我正在爱情宇宙法庭检举恋爱案件',
  path: '/pages/report',
}));

onShareTimeline(() => ({
  title: '围观爱情宇宙法庭的检举现场',
}));
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 32rpx;
  gap: 24rpx;
  color: var(--text-primary);
}

.progress {
  display: flex;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  border: 1rpx solid var(--card-border);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.dot.active {
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.95), rgba(255, 155, 210, 0.9));
}

.label {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.label.active {
  color: var(--text-primary);
}

.chat-area {
  flex: 1;
  min-height: 600rpx;
  max-height: 1000rpx;
}

.summary-wrapper {
  margin: 24rpx 0;
}

.action {
  display: flex;
  justify-content: center;
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

.input-bar {
  display: flex;
  gap: 16rpx;
  align-items: flex-end;
}

.textarea {
  flex: 1;
  min-height: 160rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  padding: 24rpx;
  color: var(--text-primary);
}

.send {
  min-width: 140rpx;
  padding: 20rpx 0;
  border-radius: 20rpx;
  border: none;
  background: rgba(124, 92, 255, 0.9);
  color: #0b0f1c;
  font-size: 28rpx;
}

.send:disabled {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
}

.error {
  margin-top: 40rpx;
  text-align: center;
  color: var(--danger-color);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.ghost {
  align-self: center;
  padding: 18rpx 48rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.4);
  background: transparent;
  color: var(--text-primary);
}
</style>
