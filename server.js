const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Conversation = require('./models/conversation');
const { generatePersonalityResponse } = require('./personalityResponder');
const { analyzeScenario } = require('./personalityAnalyzer');
const sceneResourceGenerator = require('./sceneResourceGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 连接MongoDB数据库
mongoose.connect('mongodb://localhost:27017/reddragon', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB数据库连接成功');
}).catch((error) => {
  console.error('MongoDB数据库连接失败:', error);
  process.exit(1);
});

// API端点

// 获取用户对话历史
app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ userId: req.params.userId });
    if (!conversation) {
      // 如果没有对话历史，创建一个新的
      const newConversation = new Conversation({ userId: req.params.userId });
      await newConversation.save();
      return res.json(newConversation);
    }
    res.json(conversation);
  } catch (error) {
    console.error('获取对话历史失败:', error);
    res.status(500).json({ error: '获取对话历史失败' });
  }
});

// 添加新消息
app.post('/api/conversations/:userId/messages', async (req, res) => {
  try {
    const { type, content, metadata } = req.body;
    if (!type || !content) {
      return res.status(400).json({ error: '消息类型和内容不能为空' });
    }
    
    let conversation = await Conversation.findOne({ userId: req.params.userId });
    if (!conversation) {
      conversation = new Conversation({ userId: req.params.userId });
    }
    
    conversation.messages.push({ type, content, metadata });
    await conversation.save();
    
    res.json(conversation);
  } catch (error) {
    console.error('添加消息失败:', error);
    res.status(500).json({ error: '添加消息失败' });
  }
});

// 更新可视化数据
app.put('/api/conversations/:userId/visualizations', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      return res.status(400).json({ error: '可视化类型和数据不能为空' });
    }
    
    let conversation = await Conversation.findOne({ userId: req.params.userId });
    if (!conversation) {
      return res.status(404).json({ error: '对话不存在' });
    }
    
    conversation.visualizations[type] = data;
    await conversation.save();
    
    res.json(conversation);
  } catch (error) {
    console.error('更新可视化数据失败:', error);
    res.status(500).json({ error: '更新可视化数据失败' });
  }
});

// 生成可视化数据
app.post('/api/conversations/:userId/generate-visualization', async (req, res) => {
  try {
    const { type } = req.body;
    if (!type) {
      return res.status(400).json({ error: '可视化类型不能为空' });
    }
    
    const conversation = await Conversation.findOne({ userId: req.params.userId });
    if (!conversation || conversation.messages.length === 0) {
      return res.status(404).json({ error: '没有足够的对话数据生成可视化' });
    }
    
    let visualizationData = null;
    
    switch (type) {
      case 'mindmap':
        visualizationData = generateMindmap(conversation.messages);
        break;
      case 'timeline':
        visualizationData = generateTimeline(conversation.messages);
        break;
      case 'flowchart':
        visualizationData = generateFlowchart(conversation.messages);
        break;
      default:
        return res.status(400).json({ error: '不支持的可视化类型' });
    }
    
    conversation.visualizations[type] = visualizationData;
    await conversation.save();
    
    res.json(visualizationData);
  } catch (error) {
    console.error('生成可视化数据失败:', error);
    res.status(500).json({ error: '生成可视化数据失败' });
  }
});

// 生成场景化资源
app.post('/api/conversations/:userId/generate-scene-resources', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }
    
    const userId = req.params.userId;
    
    // 分析对话场景
    const scenario = analyzeScenario(message);
    
    // 生成场景化资源
    const resources = await sceneResourceGenerator.generateResources(userId, message, scenario);
    
    if (!resources) {
      return res.status(404).json({ error: '没有为该场景生成任何资源' });
    }
    
    // 将资源添加到对话历史中
    let conversation = await Conversation.findOne({ userId });
    if (!conversation) {
      conversation = new Conversation({ userId });
    }
    
    // 添加用户消息
    conversation.messages.push({ type: 'user', content: message });
    
    // 添加AI响应（包含资源）
    const aiResponse = await generatePersonalityResponse(userId, message);
    conversation.messages.push({ type: 'ai', content: aiResponse, metadata: { resources } });
    
    await conversation.save();
    
    res.json({ resources, aiResponse });
  } catch (error) {
    console.error('生成场景化资源失败:', error);
    res.status(500).json({ error: '生成场景化资源失败' });
  }
});

// 生成思维导图数据
function generateMindmap(messages) {
  // 简单的思维导图生成逻辑
  // 实际应用中可能需要更复杂的自然语言处理
  const mindmap = {
    id: 'root',
    text: '对话内容',
    children: []
  };
  
  let currentParent = mindmap;
  
  messages.forEach((message, index) => {
    const node = {
      id: `node-${index}`,
      text: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
      children: []
    };
    
    if (message.type === 'user') {
      node.color = '#4285F4';
    } else {
      node.color = '#34A853';
    }
    
    currentParent.children.push(node);
    currentParent = node;
  });
  
  return mindmap;
}

// 生成时间线数据
function generateTimeline(messages) {
  // 时间线生成逻辑
  return {
    events: messages.map((message, index) => ({
      id: `event-${index}`,
      title: message.type === 'user' ? '用户消息' : 'AI回复',
      description: message.content,
      date: message.timestamp,
      color: message.type === 'user' ? '#4285F4' : '#34A853'
    }))
  };
}

// 生成流程图数据
function generateFlowchart(messages) {
  // 流程图生成逻辑
  const nodes = [];
  const edges = [];
  
  messages.forEach((message, index) => {
    const nodeId = `node-${index}`;
    nodes.push({
      id: nodeId,
      label: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : ''),
      color: message.type === 'user' ? '#4285F4' : '#34A853',
      shape: message.type === 'user' ? 'oval' : 'rectangle'
    });
    
    if (index > 0) {
      edges.push({
        from: `node-${index-1}`,
        to: nodeId,
        arrows: 'to'
      });
    }
  });
  
  return {
    nodes,
    edges
  };
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器正在运行，端口号: ${PORT}`);
});
