// 初始化数据库集合和索引的云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取数据库引用
const db = cloud.database();

// 直接创建集合的函数
async function ensureCollectionExists(collectionName) {
  try {
    console.log(`确保集合 ${collectionName} 存在...`);
    
    // 使用临时记录方法确保集合存在
    // 插入一条临时记录
    const tempId = `temp_${Date.now()}`;
    await db.collection(collectionName).add({
      data: {
        _id: tempId,
        temp: true,
        createTime: db.serverDate()
      }
    });
    
    // 删除临时记录
    await db.collection(collectionName).doc(tempId).remove();
    
    console.log(`集合 ${collectionName} 确认存在或已创建`);
  } catch (error) {
    // 如果是重复键错误，说明集合已存在，临时记录创建失败但集合是存在的
    if (error.code === -502003) {
      console.log(`集合 ${collectionName} 已存在`);
    } else {
      console.error(`确保集合 ${collectionName} 存在时出错:`, error);
      throw error;
    }
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
    
    console.log('数据库初始化完成！');
    
    return {
      success: true,
      message: '数据库集合和索引创建成功',
      data: {
        collections: ['users', 'chat_list', 'chat_details'],
        indexes: {
          users: ['idx_id'],
          chat_list: ['idx_user_update', 'idx_title_preview'],
          chat_details: ['idx_id_user']
        }
      }
    };
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return {
      success: false,
      message: '数据库初始化失败',
      error: error.message
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
    await createIndexIfNotExists('users', 'idx_id', [
      { name: '_id', direction: 1 }
    ], true);
    
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
    await createIndexIfNotExists('chat_list', 'idx_user_update', [
      { name: 'userId', direction: 1 },
      { name: 'updateTime', direction: -1 }
    ]);
    
    // 创建标题和预览文本的文本索引（用于搜索）
    await createIndexIfNotExists('chat_list', 'idx_title_preview', [
      { name: 'title', direction: 'text' },
      { name: 'preview', direction: 'text' }
    ]);
    
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
    await createIndexIfNotExists('chat_details', 'idx_id_user', [
      { name: 'chatId', direction: 1 },
      { name: 'userId', direction: 1 }
    ]);
    
    console.log('聊天详情集合初始化成功');
  } catch (error) {
    console.error('聊天详情集合初始化失败:', error);
    throw error;
  }
}

// 通用方法：创建索引（如果不存在）
async function createIndexIfNotExists(collectionName, indexName, indexSpecs, unique = false) {
  try {
    // 尝试创建索引 - 修正参数格式
    await db.collection(collectionName).createIndex(
      indexName,  // 索引名称作为第一个参数
      indexSpecs, // 索引定义作为第二个参数
      { unique: unique } // 索引选项作为第三个参数
    );
    console.log(`成功创建索引 ${indexName} 在集合 ${collectionName} 上`);
  } catch (error) {
    // 处理索引已存在的情况
    if (error.code === -502007) {
      console.log(`索引 ${indexName} 在集合 ${collectionName} 上已存在`);
    } else {
      throw error;
    }
  }
}