import { createSSRApp } from 'vue'
import App from './app.vue';

// 确保BASE_URL在全局可用
const BASE_URL = import.meta.env.BASE_URL || '/';
// 设置全局BASE_URL
if (typeof global !== 'undefined') {
  (global as any).__IMPORT_META_ENV_BASE_URL__ = BASE_URL;
}
if (typeof window !== 'undefined') {
  (window as any).__IMPORT_META_ENV_BASE_URL__ = BASE_URL;
  (window as any).BASE_URL = BASE_URL;
}
globalThis.__IMPORT_META_ENV_BASE_URL__ = BASE_URL;
globalThis.BASE_URL = BASE_URL;

// 立即初始化微信云开发（在应用创建前）
let cloudInitialized = false;

// 尝试初始化云开发的函数
function initializeCloud() {
  try {
    // 检查是否在微信环境中
    if (typeof wx === 'undefined') {
      console.warn('非微信环境，跳过云开发初始化');
      return false;
    }
    
    // 检查云开发是否可用
    if (!wx.cloud) {
      console.error('当前微信版本不支持云开发');
      return false;
    }
    
    // 使用环境变量或默认环境ID
    const cloudEnvId = (process.env.WX_CLOUD_ENV_ID || '').trim() || 'cloud1-5gfyzts930f77098';
    console.log('准备初始化微信云开发，环境ID:', cloudEnvId || '(未设置)');
    
    // 执行初始化（不依赖是否已有 database 方法）
    try {
      wx.cloud.init({ env: cloudEnvId, traceUser: true, throwOnError: false });
      console.log('微信云开发初始化成功');
      return true;
    } catch (initError) {
      console.error('微信云开发初始化异常:', initError);
      return false;
    }
  } catch (error) {
    console.error('初始化云开发过程中发生错误:', error);
    return false;
  }
}

// 立即执行初始化
cloudInitialized = initializeCloud();

// 数据库检查和自动初始化函数（不依赖云函数）
async function checkAndInitializeDatabase() {
  // 只有在云开发初始化成功后才进行数据库检查
  if (!cloudInitialized || typeof wx === 'undefined' || !wx.cloud || !wx.cloud.database) {
    console.warn('云开发未初始化或不可用，跳过数据库检查');
    return false;
  }

  try {
    const db = wx.cloud.database();
    console.log('开始检查数据库集合是否存在...');
    
    // 检查users集合是否存在
    try {
      await db.collection('users').count();
      console.log('数据库集合检查通过，users集合已存在');
      return true;
    } catch (collectionError) {
      console.log('数据库集合检查失败，开始直接初始化数据库...');
      
      // 检查是否是集合不存在的错误
      if (collectionError.errCode === -502005 || 
          collectionError.message?.includes('collection not exists') || 
          collectionError.message?.includes('Db or Table not exist')) {
        
        console.log('检测到集合不存在错误，尝试直接初始化数据库集合...');
        
        // 直接初始化数据库集合（不依赖云函数）
        try {
          const collections = ['users', 'chat_list', 'chat_details'];
          let successCount = 0;
          
          for (const collectionName of collections) {
            try {
              // 尝试添加临时文档来确保集合存在
              const tempId = `temp_${collectionName}_${Date.now()}`;
              await db.collection(collectionName).add({
                data: {
                  _id: tempId,
                  temp: true,
                  createTime: db.serverDate(),
                  description: '临时文档，用于确保集合存在'
                }
              });
              
              // 删除临时文档
              await db.collection(collectionName).doc(tempId).remove();
              console.log(`集合 ${collectionName} 确认存在`);
              successCount++;
              
            } catch (addError) {
              // 如果是重复键错误，说明集合已存在
              if (addError.errCode === -502003) {
                console.log(`集合 ${collectionName} 已存在`);
                successCount++;
              } else if (addError.errCode === -502005) {
                // 集合不存在错误，需要特殊处理
                console.warn(`集合 ${collectionName} 不存在，尝试创建集合...`);
                
                // 尝试使用不同的方法来创建集合
                try {
                  // 方法1：尝试直接添加文档（可能会自动创建集合）
                  const tempId = `temp_${collectionName}_${Date.now()}`;
                  await db.collection(collectionName).add({
                    data: {
                      _id: tempId,
                      temp: true,
                      createTime: db.serverDate(),
                      description: '临时文档，用于创建集合'
                    }
                  });
                  
                  // 删除临时文档
                  await db.collection(collectionName).doc(tempId).remove();
                  console.log(`集合 ${collectionName} 创建成功`);
                  successCount++;
                  
                } catch (createError) {
                  console.warn(`创建集合 ${collectionName} 失败:`, createError.message);
                  // 继续处理其他集合
                }
              } else {
                console.warn(`处理集合 ${collectionName} 时出现警告:`, addError.message);
                // 继续处理其他集合
              }
            }
          }
          
          const success = successCount > 0; // 至少成功处理一个集合就算成功
          console.log('数据库直接初始化完成，成功处理集合数:', successCount);
          return success;
          
        } catch (directInitError) {
          console.error('直接初始化数据库失败:', directInitError);
          return false;
        }
      } else {
        console.error('数据库检查时发生其他错误:', collectionError);
        return false;
      }
    }
  } catch (error) {
    console.error('数据库检查和初始化过程中发生错误:', error);
    return false;
  }
}

// 根据需要启用数据库初始化（默认关闭，避免在无云数据库的环境报错）
const ENABLE_DB_INIT = false;
if (cloudInitialized && ENABLE_DB_INIT) {
  console.log('开始数据库自动检查和初始化...');
  checkAndInitializeDatabase().then((dbReady) => {
    console.log('数据库检查和初始化完成，状态:', dbReady ? '成功' : '失败');
    databaseStatus = dbReady ? 'ready' : 'error';
    if (typeof global !== 'undefined') (global as any)._databaseStatus = databaseStatus;
    if (typeof window !== 'undefined') (window as any)._databaseStatus = databaseStatus;
    globalThis._databaseStatus = databaseStatus;
  });
}

// 设置全局标志
if (typeof global !== 'undefined') {
  (global as any)._cloudInitialized = cloudInitialized;
}
if (typeof window !== 'undefined') {
  (window as any)._cloudInitialized = cloudInitialized;
}
globalThis._cloudInitialized = cloudInitialized;

console.log('云开发初始化完成，状态:', cloudInitialized);

// 导出初始化状态，方便其他模块使用
export const cloudInitStatus = cloudInitialized;

// 数据库状态变量（初始为检查中）
let databaseStatus = 'checking';

// 导出数据库状态，方便其他模块使用
export { databaseStatus };

// 创建应用实例
export function createApp() {
  // 使用已在模块加载时初始化的云开发状态
  
  const app = createSSRApp(App);
  
  // 将BASE_URL注入到Vue应用
  app.config.globalProperties.$BASE_URL = BASE_URL;
  // 将云开发初始化状态注入到Vue应用
  app.config.globalProperties.$cloudInitialized = cloudInitialized;
  
  // 获取当前数据库状态（默认为检查中）
  let databaseStatus = ENABLE_DB_INIT ? 'checking' : 'skipped';
  if (typeof global !== 'undefined' && (global as any)._databaseStatus) {
    databaseStatus = (global as any)._databaseStatus;
  } else if (typeof window !== 'undefined' && (window as any)._databaseStatus) {
    databaseStatus = (window as any)._databaseStatus;
  } else if (globalThis._databaseStatus) {
    databaseStatus = globalThis._databaseStatus;
  }
  
  // 将数据库状态注入到Vue应用
  app.config.globalProperties.$databaseStatus = databaseStatus;
  
  return {
    app,
    databaseStatus
  };

}
