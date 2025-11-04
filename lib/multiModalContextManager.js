const { Configuration, OpenAIApi } = require('openai');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// 配置OpenAI API
const configuration = new Configuration({
  apiKey: global.keyopenai,
});
const openai = new OpenAIApi(configuration);

// 配置日志文件
const logFilePath = path.join(__dirname, '..', 'logs', 'multi-modal-context.log');
const logDir = path.dirname(logFilePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志记录函数
function log(message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${message}${data ? ` - ${JSON.stringify(data)}` : ''}\n`;
  fs.appendFileSync(logFilePath, logEntry);
  console.log(logEntry.trim());
}

// 上下文模型
class MultiModalContext {
  constructor(userId) {
    this.userId = userId;
    this.history = [];
    this.currentContext = {};
    this.metadata = {
      lastUpdated: new Date(),
      contextLength: 0,
      modalitiesUsed: new Set()
    };
  }

  // 添加文本上下文
  addTextContext(text, source = 'user', metadata = {}) {
    const contextItem = {
      id: `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      content: text,
      source,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length
      }
    };
    
    this.history.push(contextItem);
    this.updateCurrentContext(contextItem);
    this.metadata.lastUpdated = new Date();
    this.metadata.contextLength++;
    this.metadata.modalitiesUsed.add('text');
    
    return contextItem;
  }

  // 添加图片上下文
  addImageContext(imagePath, extractedText, imageAnalysis, source = 'user', metadata = {}) {
    const contextItem = {
      id: `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      content: imagePath,
      source,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        extractedText,
        imageAnalysis,
        fileSize: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 0
      }
    };
    
    this.history.push(contextItem);
    this.updateCurrentContext(contextItem);
    this.metadata.lastUpdated = new Date();
    this.metadata.contextLength++;
    this.metadata.modalitiesUsed.add('image');
    
    return contextItem;
  }

  // 添加语音上下文
  addAudioContext(transcript, sentimentAnalysis, source = 'user', metadata = {}) {
    const contextItem = {
      id: `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'audio',
      content: transcript,
      source,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        sentimentAnalysis,
        wordCount: transcript.split(/\s+/).filter(word => word.length > 0).length
      }
    };
    
    this.history.push(contextItem);
    this.updateCurrentContext(contextItem);
    this.metadata.lastUpdated = new Date();
    this.metadata.contextLength++;
    this.metadata.modalitiesUsed.add('audio');
    
    return contextItem;
  }

  // 更新当前上下文
  updateCurrentContext(newContextItem) {
    // 这里可以实现更复杂的上下文更新逻辑
    // 例如，提取关键词、实体，更新上下文摘要等
    
    // 简单实现：保存最近的几个上下文项
    const maxContextItems = 20;
    this.currentContext.recentItems = this.history.slice(-maxContextItems);
    
    // 提取所有文本内容用于后续处理
    this.currentContext.allText = this.history
      .filter(item => item.type === 'text' || item.type === 'audio')
      .map(item => item.content)
      .join('\n');
      
    // 提取图片分析结果
    this.currentContext.imageAnalysis = this.history
      .filter(item => item.type === 'image' && item.metadata.imageAnalysis)
      .map(item => item.metadata.imageAnalysis)
      .reduce((acc, analysis) => {
        return {
          objects: [...acc.objects, ...analysis.objects],
          scenes: [...acc.scenes, ...analysis.scenes],
          text: [...acc.text, analysis.text]
        };
      }, { objects: [], scenes: [], text: [] });
  }

  // 获取上下文摘要
  getContextSummary() {
    // 这里可以实现更复杂的摘要生成逻辑
    // 例如，使用AI生成摘要
    
    // 简单实现：返回最近的几个上下文项
    return this.currentContext.recentItems.map(item => ({
      type: item.type,
      content: item.type === 'text' || item.type === 'audio' ? item.content.substring(0, 100) + '...' : path.basename(item.content),
      timestamp: item.timestamp
    }));
  }

  // 清理旧上下文
  cleanupOldContext(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    this.history = this.history.filter(item => item.timestamp >= cutoffTime);
    this.updateCurrentContext();
    this.metadata.contextLength = this.history.length;
  }
}

// 上下文管理器
class MultiModalContextManager {
  constructor() {
    this.contexts = new Map();
  }

  // 获取或创建用户上下文
  getContext(userId) {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, new MultiModalContext(userId));
      log('Created new multi-modal context', { userId });
    }
    return this.contexts.get(userId);
  }

  // 处理文本输入
  async processTextInput(userId, text, source = 'user', metadata = {}) {
    log('Processing text input', { userId, textLength: text.length });
    
    const context = this.getContext(userId);
    return context.addTextContext(text, source, metadata);
  }

  // 处理图片输入
  async processImageInput(userId, imagePath, source = 'user', metadata = {}) {
    log('Processing image input', { userId, imagePath });
    
    // 使用Tesseract.js提取图片中的文本
    let extractedText = '';
    try {
      const { data: { text } } = await Tesseract.recognize(
        imagePath,
        'eng+chi_sim', // 支持中英文
        {
          logger: info => log('Tesseract progress', { progress: info.progress })
        }
      );
      extractedText = text;
      log('Extracted text from image', { userId, textLength: text.length });
    } catch (error) {
      log('Error extracting text from image', { userId, error: error.message });
    }
    
    // 使用OpenAI分析图片内容
    let imageAnalysis = {};
    try {
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        // 使用OpenAI的GPT-4V图像理解API
        const response = await openai.createChatCompletion({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '请分析这张图片的内容，包括物体、场景、文字和情绪，并以JSON格式返回，包含以下字段：objects（物体数组）、scenes（场景数组）、text（提取的文字）、emotion（情绪）、confidence（置信度）'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        });
        
        // 解析响应内容
        try {
          imageAnalysis = JSON.parse(response.data.choices[0].message.content.trim());
        } catch (parseError) {
          log('Error parsing image analysis response', { userId, error: parseError.message });
          // 如果解析失败，使用提取的文本作为备用
          imageAnalysis = {
            objects: [],
            scenes: [],
            text: extractedText,
            emotion: 'neutral',
            confidence: 0.5
          };
        }
        
        log('Analyzed image content', { userId, analysis: imageAnalysis });
      }
    } catch (error) {
      log('Error analyzing image content', { userId, error: error.message });
      // 如果分析失败，使用提取的文本作为备用
      imageAnalysis = {
        objects: [],
        scenes: [],
        text: extractedText,
        emotion: 'neutral',
        confidence: 0.5
      };
    }
    
    const context = this.getContext(userId);
    return context.addImageContext(imagePath, extractedText, imageAnalysis, source, metadata);
  }

  // 处理语音输入
  async processAudioInput(userId, transcript, source = 'user', metadata = {}) {
    log('Processing audio input', { userId, transcriptLength: transcript.length });
    
    // 使用OpenAI分析语音语义和情绪
    let sentimentAnalysis = {};
    try {
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: `Analyze the sentiment and semantics of the following audio transcript:\n\n${transcript}\n\nPlease provide the analysis in JSON format with the following fields:\n- sentiment: 'positive', 'negative', or 'neutral'\n- confidence: a number between 0 and 1\n- keyPoints: an array of key points\n- emotions: an array of detected emotions`,
        temperature: 0.3,
        max_tokens: 200,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      
      sentimentAnalysis = JSON.parse(response.data.choices[0].text.trim());
      log('Analyzed audio sentiment', { userId, sentiment: sentimentAnalysis.sentiment });
    } catch (error) {
      log('Error analyzing audio sentiment', { userId, error: error.message });
    }
    
    const context = this.getContext(userId);
    return context.addAudioContext(transcript, sentimentAnalysis, source, metadata);
  }

  // 获取多模态上下文摘要
  getContextSummary(userId) {
    const context = this.getContext(userId);
    return context.getContextSummary();
  }

  // 获取完整上下文
  getFullContext(userId) {
    return this.getContext(userId);
  }

  // 清理旧上下文
  cleanupOldContexts(hours = 24) {
    log('Cleaning up old contexts', { hours });
    
    for (const [userId, context] of this.contexts.entries()) {
      context.cleanupOldContext(hours);
      if (context.history.length === 0) {
        this.contexts.delete(userId);
        log('Removed empty context', { userId });
      }
    }
  }
}

// 导出单例实例
module.exports = new MultiModalContextManager();
