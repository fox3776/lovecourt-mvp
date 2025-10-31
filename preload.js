// preload.js - 预加载脚本
// 这个文件用于在Vite启动前执行一些预加载操作

console.log('preload.js loaded');

// 可以在这里添加一些全局变量或环境设置
if (typeof global !== 'undefined') {
  // Node.js环境
  global.__VUE_OPTIONS_API__ = true;
  global.__VUE_PROD_DEVTOOLS__ = false;
}

// 导出空对象，确保模块可以正常加载
module.exports = {};