<template>
  <view class="login-container">
    <view class="login-form">
      <text class="title">登录</text>
      <input v-model="username" placeholder="用户名" class="input-field" />
      <input v-model="password" placeholder="密码" type="password" class="input-field" />
      <button @click="handleLogin" class="login-btn">登录</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const username = ref('')
const password = ref('')

const handleLogin = () => {
  if (!username.value || !password.value) {
    uni.showToast({
      title: '请输入用户名和密码',
      icon: 'none'
    })
    return
  }
  
  // 模拟登录逻辑
  uni.showLoading({
    title: '登录中...'
  })
  
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })
    
    // 跳转到首页
    uni.switchTab({
      url: '/pages/index'
    })
  }, 1500)
}

onLoad(() => {
  console.log('登录页面加载')
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1b1f3b 0%, #0b0f1c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.login-form {
  background: rgba(255, 255, 255, 0.1);
  padding: 60rpx 40rpx;
  border-radius: 20rpx;
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 600rpx;
}

.title {
  color: white;
  font-size: 48rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 60rpx;
  display: block;
}

.input-field {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  color: white;
  font-size: 32rpx;
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.login-btn {
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 10rpx;
  padding: 30rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 20rpx;
}
</style>