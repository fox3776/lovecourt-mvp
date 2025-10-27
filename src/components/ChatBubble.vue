<template>
  <view :class="['chat-bubble', roleClass]">
    <view class="bubble">
      <text>{{ message.text }}</text>
    </view>
    <view class="timestamp">{{ timeLabel }}</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '@/types';

const props = defineProps<{
  message: ChatMessage;
}>();

const roleClass = computed(() => (props.message.role === 'user' ? 'is-user' : 'is-ai'));

const timeLabel = computed(() => {
  const date = new Date(props.message.ts);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
});
</script>

<style scoped lang="scss">
.chat-bubble {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 16rpx;
  color: var(--text-primary);

  &.is-user {
    align-items: flex-end;

    .bubble {
      background: linear-gradient(135deg, rgba(124, 92, 255, 0.9), rgba(255, 155, 210, 0.9));
      color: #0b0f1c;
      border-top-right-radius: 0;
    }
  }

  &.is-ai {
    align-items: flex-start;

    .bubble {
      background: rgba(255, 255, 255, 0.08);
      border-top-left-radius: 0;
    }
  }
}

.bubble {
  max-width: 80%;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  line-height: 1.6;
  backdrop-filter: blur(10px);
  border: 1rpx solid var(--card-border);
  transition: transform 0.2s ease;
}

.timestamp {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-top: 8rpx;
}
</style>
