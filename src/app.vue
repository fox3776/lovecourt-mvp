<template>
  <slot />
</template>

<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('爱情宇宙法庭：应用启动');
});

onShow(() => {
  console.log('爱情宇宙法庭：应用显示');
});
</script>

<style lang="scss">
@import '@/styles/variables.scss';
</style>
