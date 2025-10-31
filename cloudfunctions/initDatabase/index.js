// 初始化数据库集合和索引的云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取数据库引用
const db = cloud.database();
let indexNotSupported = false;
const ENABLE_INDEX = false; // 当前环境不支持自定义索引，默认跳过

// 确保集合存在：优先检测->尝试 createCollection -> 再写入/删除临时记录确认
async function ensureCollectionExists(collectionName) {
  console.log(`确保集合 ${collectionName} 存在...`);
  // 1) 先检测是否存在
  try {
    await db.collection(collectionName).count();
    console.log(`集合 ${collectionName} 已存在 (count ok)`);
    return;
  } catch (checkErr) {
    const notExist = checkErr?.code === -502005 || checkErr?.errCode === -502005 ||
      /not exist|not exists|ResourceNotFound/i.test(String(checkErr?.message || checkErr?.errMsg || ''));
    if (!notExist) {
      console.warn(`集合 ${collectionName} 检查异常，继续尝试创建:`, checkErr?.message || checkErr);
    } else {
      console.log(`集合 ${collectionName} 不存在，准备创建`);
    }
  }

  // 2) 尝试创建集合（如果已存在则忽略错误）
  try {
    if (typeof db.createCollection === 'function') {
      await db.createCollection(collectionName);
      console.log(`已创建集合 ${collectionName}`);
    } else {
      console.log('当前环境不支持 createCollection，跳过显式创建，改用临时写入确认');
    }
  } catch (createErr) {
    const existAlready = /already exist|already exists|Existed|exists/i.test(String(createErr?.message || createErr?.errMsg || '')) ||
      createErr?.code === -501001 || createErr?.errCode === -501001;
    if (existAlready) {
      console.log(`集合 ${collectionName} 可能已存在（createCollection 提示已存在），继续确认`);
    } else {
      console.warn(`createCollection 失败:`, createErr?.message || createErr);
      // 不中断，继续用临时写入确认
    }
  }

  // 3) 用临时写入 + 删除确认集合可用
  try {
    const tempId = `temp_${collectionName}_${Date.now()}`;
    await db.collection(collectionName).add({
      data: {
        _id: tempId,
        temp: true,
        createTime: db.serverDate(),
        description: '临时文档，用于确保集合存在'
      }
    });
    await db.collection(collectionName).doc(tempId).remove();
    console.log(`集合 ${collectionName} 确认存在可用`);
  } catch (finalErr) {
    console.error(`最终确认集合 ${collectionName} 时失败:`, finalErr?.message || finalErr);
    throw finalErr;
  }
}

exports.main = async (event, context) => {
  try {
    console.log('开始初始化数据库...');
    
    // 1. 创建用户集合(users)及其索引
    await initUsersCollection();
    
    // 2. 创建聊天列表集合(chat_list)及其索引
    await initChatListCollection();
    
    // 3. 创建聊天详情集合(chat_details)及其索引
    await initChatDetailsCollection();
    
    const msg = indexNotSupported
      ? '数据库集合就绪（索引功能当前环境不支持，已跳过）'
      : '数据库集合和索引创建成功';
    console.log('数据库初始化完成！', msg);

    return {
      success: true,
      message: msg,
      data: {
        collections: ['users', 'chat_list', 'chat_details'],
        indexes: {
          users: ['idx_id'],
          chat_list: ['idx_user_update', 'idx_title_preview'],
          chat_details: ['idx_id_user']
        },
        skippedIndexes: !!indexNotSupported
      }
    };
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return {
      success: false,
      message: '数据库初始化失败',
      error: error.message || error.errMsg || String(error)
    };
  }
};

// 初始化用户集合
async function initUsersCollection() {
  try {
    console.log('开始初始化用户集合(users)...');
    
    // 先确保集合存在
    await ensureCollectionExists('users');
    
    // 然后创建索引
    if (ENABLE_INDEX) {
      await createIndexIfNotExists('users', 'idx_id', [
        { name: '_id', direction: 1 }
      ], true);
    } else {
      indexNotSupported = true;
      console.log('[initDatabase] 跳过 users 索引创建');
    }
    
    console.log('用户集合初始化成功');
  } catch (error) {
    console.error('用户集合初始化失败:', error);
    throw error;
  }
}

// 初始化聊天列表集合
async function initChatListCollection() {
  try {
    console.log('开始初始化聊天列表集合(chat_list)...');
    
    // 先确保集合存在
    await ensureCollectionExists('chat_list');
    
    // 创建用户ID和更新时间的复合索引
    if (ENABLE_INDEX) {
      await createIndexIfNotExists('chat_list', 'idx_user_update', [
        { name: 'userId', direction: 1 },
        { name: 'updateTime', direction: -1 }
      ]);
    } else {
      indexNotSupported = true;
      console.log('[initDatabase] 跳过 chat_list 索引 idx_user_update');
    }
    
    // 创建标题和预览文本的文本索引（用于搜索）
    if (ENABLE_INDEX) {
      await createIndexIfNotExists('chat_list', 'idx_title_preview', [
        { name: 'title', direction: 'text' },
        { name: 'preview', direction: 'text' }
      ]);
    } else {
      indexNotSupported = true;
      console.log('[initDatabase] 跳过 chat_list 索引 idx_title_preview');
    }
    
    console.log('聊天列表集合初始化成功');
  } catch (error) {
    console.error('聊天列表集合初始化失败:', error);
    throw error;
  }
}

// 初始化聊天详情集合
async function initChatDetailsCollection() {
  try {
    console.log('开始初始化聊天详情集合(chat_details)...');
    
    // 先确保集合存在
    await ensureCollectionExists('chat_details');
    
    // 创建聊天ID和用户ID的复合索引
    if (ENABLE_INDEX) {
      await createIndexIfNotExists('chat_details', 'idx_id_user', [
        { name: 'chatId', direction: 1 },
        { name: 'userId', direction: 1 }
      ]);
    } else {
      indexNotSupported = true;
      console.log('[initDatabase] 跳过 chat_details 索引 idx_id_user');
    }
    
    console.log('聊天详情集合初始化成功');
  } catch (error) {
    console.error('聊天详情集合初始化失败:', error);
    throw error;
  }
}

// 通用方法：创建索引（如果不存在）
async function createIndexIfNotExists(collectionName, indexName, indexSpecs, unique = false) {
  try {
    const coll = db.collection(collectionName);
    const canCreate = typeof coll.createIndex === 'function';
    if (!canCreate) {
      indexNotSupported = true;
      console.log(`[initDatabase] 当前环境不支持 createIndex，跳过索引 ${indexName}`);
      return;
    }
    // 尝试 (name, specs, options) 方式
    try {
      await coll.createIndex(indexName, indexSpecs, { unique: !!unique });
      console.log(`成功创建索引 ${indexName} 在集合 ${collectionName} 上`);
      return;
    } catch (err) {
      // 备用签名：{ name, key, unique }
      const key = {};
      for (const spec of indexSpecs) key[spec.name] = spec.direction;
      await coll.createIndex({ name: indexName, key, unique: !!unique });
      console.log(`成功创建索引(备用签名) ${indexName} 在集合 ${collectionName} 上`);
    }
  } catch (error) {
    // 处理索引已存在的情况
    if (error.code === -502007 || error.errCode === -502007) {
      console.log(`索引 ${indexName} 在集合 ${collectionName} 上已存在`);
    } else if (String(error?.message || '').includes('is not a function')) {
      indexNotSupported = true;
      console.log(`[initDatabase] createIndex API 不可用，跳过索引 ${indexName}`);
    } else {
      throw error;
    }
  }
}
