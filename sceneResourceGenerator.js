const contextManager = require('./lib/multiModalContextManager');
const { getUserPersonality } = require('./personalityDatabase');

// 场景化资源生成器
class SceneResourceGenerator {
  constructor() {
    // 初始化资源生成器
  }

  // 生成场景化资源
  async generateResources(userId, message, scenario) {
    // 获取用户上下文
    const context = contextManager.getFullContext(userId);
    
    // 获取用户人格数据
    const personality = getUserPersonality(userId);
    
    // 根据场景类型生成相应的资源
    switch (scenario) {
      case 'family_dinner':
        return await this.generateFamilyDinnerResources(userId, message, context, personality);
      case 'shopping':
        return await this.generateShoppingResources(userId, message, context, personality);
      case 'music':
        return await this.generateMusicResources(userId, message, context, personality);
      default:
        return null;
    }
  }

  // 生成家庭聚餐相关资源
  async generateFamilyDinnerResources(userId, message, context, personality) {
    // 从对话历史中提取用户的饮食禁忌
    const dietaryRestrictions = this.extractDietaryRestrictions(userId, context);
    
    // 从对话历史中提取用户所在城市
    const city = this.extractUserCity(userId, context);
    
    // 生成食谱
    const recipe = this.generateRecipe(dietaryRestrictions);
    
    // 生成附近超市/菜市场推荐
    const markets = await this.generateMarketRecommendations(city);
    
    // 生成聚餐氛围音乐歌单
    const playlist = this.generateMusicPlaylist('family_dinner');
    
    // 整合资源
    const resources = {
      type: 'family_dinner',
      recipe,
      markets,
      playlist
    };
    
    return resources;
  }

  // 生成购物相关资源
  async generateShoppingResources(userId, message, context, personality) {
    // 从对话历史中提取用户所在城市
    const city = this.extractUserCity(userId, context);
    
    // 从消息中提取购物需求
    const shoppingItems = this.extractShoppingItems(message);
    
    // 生成附近超市/商场推荐
    const stores = await this.generateStoreRecommendations(city, shoppingItems);
    
    // 整合资源
    const resources = {
      type: 'shopping',
      stores,
      shoppingItems
    };
    
    return resources;
  }

  // 生成音乐相关资源
  async generateMusicResources(userId, message, context, personality) {
    // 从消息中提取音乐类型或场景
    const musicType = this.extractMusicType(message);
    
    // 生成音乐歌单
    const playlist = this.generateMusicPlaylist(musicType);
    
    // 整合资源
    const resources = {
      type: 'music',
      playlist
    };
    
    return resources;
  }

  // 从对话历史中提取用户的饮食禁忌
  extractDietaryRestrictions(userId, context) {
    // 示例实现：从对话历史中查找包含"过敏"、"忌口"、"不能吃"等关键词的句子
    const dietaryRestrictions = [];
    
    if (context && context.conversationHistory) {
      context.conversationHistory.forEach(entry => {
        if (entry.type === 'user' && entry.content) {
          const lowerContent = entry.content.toLowerCase();
          
          // 查找过敏食物
          if (lowerContent.includes('过敏')) {
            const allergyMatch = lowerContent.match(/过敏[^，。！？；：]+/);
            if (allergyMatch) {
              dietaryRestrictions.push(allergyMatch[0]);
            }
          }
          
          // 查找忌口食物
          if (lowerContent.includes('忌口') || lowerContent.includes('不能吃')) {
            const restrictionMatch = lowerContent.match(/(忌口|不能吃)[^，。！？；：]+/);
            if (restrictionMatch) {
              dietaryRestrictions.push(restrictionMatch[0]);
            }
          }
        }
      });
    }
    
    return dietaryRestrictions;
  }

  // 从对话历史中提取用户所在城市
  extractUserCity(userId, context) {
    // 示例实现：从对话历史中查找包含城市名称的句子
    let city = '北京'; // 默认城市
    
    if (context && context.conversationHistory) {
      context.conversationHistory.forEach(entry => {
        if (entry.type === 'user' && entry.content) {
          const lowerContent = entry.content.toLowerCase();
          
          // 简单的城市名称匹配
          const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '天津'];
          for (const c of cities) {
            if (lowerContent.includes(c.toLowerCase())) {
              city = c;
              break;
            }
          }
        }
      });
    }
    
    return city;
  }

  // 从消息中提取购物需求
  extractShoppingItems(message) {
    // 示例实现：从消息中提取购物物品
    const shoppingItems = [];
    
    if (message) {
      // 简单的物品提取逻辑
      const itemKeywords = ['买', '需要', '采购', '准备'];
      const lowerMessage = message.toLowerCase();
      
      for (const keyword of itemKeywords) {
        if (lowerMessage.includes(keyword)) {
          const itemMatch = lowerMessage.split(keyword)[1].split(/[，。！？；：]/)[0];
          if (itemMatch) {
            shoppingItems.push(itemMatch.trim());
          }
          break;
        }
      }
    }
    
    return shoppingItems;
  }

  // 从消息中提取音乐类型或场景
  extractMusicType(message) {
    // 示例实现：从消息中提取音乐类型或场景
    let musicType = 'pop'; // 默认音乐类型
    
    if (message) {
      const lowerMessage = message.toLowerCase();
      
      // 简单的音乐类型匹配
      const musicTypes = ['流行', '摇滚', '古典', '爵士', '电子', '乡村', '民谣', '嘻哈'];
      for (const type of musicTypes) {
        if (lowerMessage.includes(type.toLowerCase())) {
          musicType = type;
          break;
        }
      }
      
      // 简单的场景匹配
      const musicScenes = ['工作', '学习', '运动', '放松', '聚餐', '派对', '睡眠'];
      for (const scene of musicScenes) {
        if (lowerMessage.includes(scene.toLowerCase())) {
          musicType = scene;
          break;
        }
      }
    }
    
    return musicType;
  }

  // 生成食谱
  generateRecipe(dietaryRestrictions) {
    // 示例实现：根据饮食禁忌生成简单的食谱
    // 实际应用中可以调用外部API或使用预定义的食谱数据库
    
    // 基础食谱库
    const recipes = [
      {
        name: '番茄炒蛋',
        ingredients: ['番茄', '鸡蛋', '盐', '糖', '油'],
        steps: [
          '番茄洗净切块，鸡蛋打散备用',
          '热锅倒油，倒入鸡蛋液翻炒至凝固，盛出备用',
          '锅中留底油，放入番茄块翻炒至出汁',
          '加入盐和糖调味，倒入炒好的鸡蛋翻炒均匀即可'
        ]
      },
      {
        name: '宫保鸡丁',
        ingredients: ['鸡肉', '花生米', '葱', '姜', '蒜', '干辣椒', '盐', '糖', '醋', '生抽', '淀粉', '油'],
        steps: [
          '鸡肉切丁，用盐、生抽、淀粉腌制15分钟',
          '葱切段，姜、蒜切片备用',
          '热锅倒油，放入花生米炸熟，盛出备用',
          '锅中留底油，放入干辣椒、姜、蒜爆香',
          '倒入腌制好的鸡丁翻炒至变色',
          '加入盐、糖、醋、生抽调味，翻炒均匀',
          '放入葱段和炸好的花生米，翻炒均匀即可'
        ]
      },
      {
        name: '清炒时蔬',
        ingredients: ['青菜', '蒜', '盐', '油'],
        steps: [
          '青菜洗净切段，蒜切片备用',
          '热锅倒油，放入蒜片爆香',
          '倒入青菜段翻炒至断生',
          '加入盐调味，翻炒均匀即可'
        ]
      }
    ];
    
    // 过滤掉包含饮食禁忌的食谱
    let filteredRecipes = recipes;
    
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      filteredRecipes = recipes.filter(recipe => {
        const recipeText = JSON.stringify(recipe).toLowerCase();
        return !dietaryRestrictions.some(restriction => 
          recipeText.includes(restriction.toLowerCase())
        );
      });
    }
    
    // 随机选择一个食谱
    const selectedRecipe = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
    
    return selectedRecipe;
  }

  // 生成附近超市/菜市场推荐
  async generateMarketRecommendations(city) {
    // 示例实现：根据城市生成附近超市/菜市场推荐
    // 实际应用中可以调用地图API（如高德地图、百度地图）获取实时数据
    
    // 模拟数据
    const markets = [
      {
        name: '沃尔玛超市',
        address: `${city}市朝阳区建国路100号`,
        type: '超市',
        distance: '2.5公里',
        rating: 4.5
      },
      {
        name: '家乐福超市',
        address: `${city}市海淀区中关村大街50号`,
        type: '超市',
        distance: '3.2公里',
        rating: 4.3
      },
      {
        name: '新发地菜市场',
        address: `${city}市丰台区京开高速路新发地桥西侧`,
        type: '菜市场',
        distance: '5.1公里',
        rating: 4.7
      }
    ];
    
    return markets;
  }

  // 生成附近超市/商场推荐
  async generateStoreRecommendations(city, shoppingItems) {
    // 示例实现：根据城市和购物需求生成附近超市/商场推荐
    // 实际应用中可以调用地图API（如高德地图、百度地图）获取实时数据
    
    // 模拟数据
    const stores = [
      {
        name: '大悦城',
        address: `${city}市朝阳区朝阳北路101号`,
        type: '商场',
        distance: '1.8公里',
        rating: 4.8,
        itemsAvailable: ['服装', '化妆品', '电子产品', '美食']
      },
      {
        name: '物美超市',
        address: `${city}市海淀区花园路13号`,
        type: '超市',
        distance: '2.1公里',
        rating: 4.4,
        itemsAvailable: ['食品', '日用品', '生鲜']
      },
      {
        name: '苏宁易购',
        address: `${city}市西城区西单北大街131号`,
        type: '电器商场',
        distance: '3.5公里',
        rating: 4.6,
        itemsAvailable: ['电子产品', '家电', '手机']
      }
    ];
    
    // 如果有购物需求，过滤出提供这些商品的商店
    if (shoppingItems && shoppingItems.length > 0) {
      const filteredStores = stores.filter(store => {
        return shoppingItems.some(item => 
          store.itemsAvailable.some(availableItem => 
            availableItem.toLowerCase().includes(item.toLowerCase())
          )
        );
      });
      
      return filteredStores.length > 0 ? filteredStores : stores;
    }
    
    return stores;
  }

  // 生成音乐歌单
  generateMusicPlaylist(musicType) {
    // 示例实现：根据音乐类型或场景生成音乐歌单
    // 实际应用中可以调用音乐API（如 Spotify、网易云音乐）获取实时数据
    
    // 模拟歌单数据
    const playlists = {
      pop: [
        { name: '小幸运', artist: '田馥甄' },
        { name: '告白气球', artist: '周杰伦' },
        { name: '芒种', artist: '音阙诗听' },
        { name: 'Lemon', artist: '米津玄师' },
        { name: 'Shape of You', artist: 'Ed Sheeran' }
      ],
      rock: [
        { name: '光辉岁月', artist: 'Beyond' },
        { name: 'Smells Like Teen Spirit', artist: 'Nirvana' },
        { name: 'Don\'t Cry', artist: 'Guns N\' Roses' },
        { name: 'Paranoid Android', artist: 'Radiohead' },
        { name: 'Creep', artist: 'Radiohead' }
      ],
      family_dinner: [
        { name: '甜蜜蜜', artist: '邓丽君' },
        { name: '月亮代表我的心', artist: '邓丽君' },
        { name: '朋友', artist: '周华健' },
        { name: '回家', artist: '顺子' },
        { name: 'Happy', artist: 'Pharrell Williams' }
      ],
      工作: [
        { name: '平凡之路', artist: '朴树' },
        { name: '夜空中最亮的星', artist: '逃跑计划' },
        { name: 'Counting Stars', artist: 'OneRepublic' },
        { name: 'Viva La Vida', artist: 'Coldplay' },
        { name: 'Eye of the Tiger', artist: 'Survivor' }
      ],
      放松: [
        { name: 'Weightless', artist: 'Marconi Union' },
        { name: 'Clair de Lune', artist: 'Debussy' },
        { name: 'Canon in D', artist: 'Johann Pachelbel' },
        { name: 'Hoppípolla', artist: 'Sigur Rós' },
        { name: 'The Blue Danube', artist: 'Johann Strauss II' }
      ]
    };
    
    // 返回匹配的歌单，如果没有匹配的则返回流行歌曲
    return playlists[musicType] || playlists.pop;
  }
}

// 导出单例实例
module.exports = new SceneResourceGenerator();