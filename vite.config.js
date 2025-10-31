import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig(({ mode }) => {
  // 加载.env文件中的环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  // 将环境变量设置到process.env中，确保在构建过程中可用
  Object.keys(env).forEach(key => {
    process.env[key] = env[key];
  });
  const useMock = String(env.USE_MOCK || '').toLowerCase() === 'true';
  const cloudEnvId = env.WX_CLOUD_ENV_ID || '';
  const forceCloudOnly = String(env.FORCE_CLOUD_ONLY || '').toLowerCase() === 'true';

  // 在非 Mock 场景下，必须提供服务地址与密钥
  if (!useMock && !forceCloudOnly) {
    if (!env.DIFY_BASE_URL || !env.DIFY_API_KEY) {
      console.warn('[build] DIFY_BASE_URL or DIFY_API_KEY missing. For dev, set USE_MOCK=true or FORCE_CLOUD_ONLY=true, or provide the vars.');
    }
  }

  return {
    plugins: [
      uni(),
    ],
    base: '/', // 配置BASE_URL为根路径
    publicDir: 'static', // 将根目录下的 static 原样拷贝到 dist
    define: {
      // 定义全局常量，确保在客户端代码中也能访问环境变量
      'process.env.DIFY_BASE_URL': JSON.stringify(env.DIFY_BASE_URL || ''),
      'process.env.DIFY_API_KEY': JSON.stringify(env.DIFY_API_KEY || ''),
      'process.env.USE_MOCK': JSON.stringify(env.USE_MOCK || 'false'),
      'process.env.WX_CLOUD_ENV_ID': JSON.stringify(cloudEnvId),
      'process.env.FORCE_CLOUD_ONLY': JSON.stringify(forceCloudOnly ? 'true' : 'false'),
      'process.env.BASE_URL': JSON.stringify(env.BASE_URL || '/')
    }
  }
})