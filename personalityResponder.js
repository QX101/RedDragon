const { getUserPersonality } = require('./personalityDatabase');
const { autoReply } = require('./autoreply');
const contextManager = require('./lib/multiModalContextManager');

// 简单的响应模板库
const RESPONSE_TEMPLATES = {
    greeting: [
        { formal: '您好！有什么我可以帮助您的吗？', casual: '嗨！有什么我能帮到你的吗？😊' },
        { formal: '欢迎！请问您需要什么协助？', casual: '欢迎！有什么事吗？😄' },
        { formal: '您好！很高兴为您服务。', casual: '你好呀！很高兴见到你～' }
    ],
    farewell: [
        { formal: '感谢您的咨询，祝您工作愉快！', casual: '谢谢你的咨询，祝你有个美好的一天！😊' },
        { formal: '再见！期待下次为您服务。', casual: '拜拜！下次见啦～😄' },
        { formal: '感谢您的时间，祝您生活愉快！', casual: '谢啦！祝你生活开心哦！' }
    ],
    thanks: [
        { formal: '不客气，这是我应该做的。', casual: '不客气啦！😊' },
        { formal: '很高兴能帮到您。', casual: '能帮到你真好！😄' },
        { formal: '不用谢，这是我的荣幸。', casual: '别客气，小事一桩～' }
    ],
    help: [
        { formal: '我可以为您提供以下帮助：1. 回答问题；2. 提供信息；3. 协助解决问题。', casual: '我可以帮你做这些哦：😉 1. 回答各种问题；2. 提供实用信息；3. 帮你解决小麻烦。' },
        { formal: '请告诉我您需要什么帮助，我会尽力协助您。', casual: '有什么需要我帮忙的吗？尽管说哦！😄' },
        { formal: '您可以向我咨询任何问题，我会为您解答。', casual: '想问什么都可以哦！我会尽力回答你的～' }
    ]
};

// 生成基于人格的响应
function generatePersonalityResponse(userId, message) {
    // 获取用户人格数据
    const personality = getUserPersonality(userId);
    
    if (!personality) {
        // 如果用户没有人格数据，使用默认响应
        return autoReply(message);
    }
    
    // 分析用户消息，确定响应类型
    const responseType = determineResponseType(message);
    
    // 获取相应的响应模板
    const templates = RESPONSE_TEMPLATES[responseType] || RESPONSE_TEMPLATES.help;
    
    // 根据正式程度选择模板
    const template = selectTemplateByFormality(templates, personality.styleParameters.formalityLevel);
    
    // 调整句式复杂度
    let response = adjustSentenceComplexity(template, personality.styleParameters.sentenceComplexity);
    
    // 调整emoji密度
    response = adjustEmojiDensity(response, personality.styleParameters.emojiDensity);
    
    // 根据决策权重调整响应内容
    response = adjustResponseByDecisionWeights(response, message, personality.decisionWeights);
    
    // 根据价值观倾向调整响应内容
    response = adjustResponseByValues(response, message, personality.personalityTraits.altruism);
    
    return response;
}

// 确定响应类型
function determineResponseType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('你好') || lowerMessage.includes('您好') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
        return 'greeting';
    } else if (lowerMessage.includes('再见') || lowerMessage.includes('拜拜') || lowerMessage.includes('bye')) {
        return 'farewell';
    } else if (lowerMessage.includes('谢谢') || lowerMessage.includes('thank')) {
        return 'thanks';
    } else if (lowerMessage.includes('帮助') || lowerMessage.includes('帮我') || lowerMessage.includes('help')) {
        return 'help';
    } else {
        return 'general';
    }
}

// 根据正式程度选择模板
function selectTemplateByFormality(templates, formalityLevel) {
    // 正式程度越高，选择越正式的模板
    const index = Math.round(formalityLevel * (templates.length - 1));
    return templates[index];
}

// 调整句式复杂度
function adjustSentenceComplexity(template, complexityLevel) {
    // 这里简化处理，根据复杂度选择正式或非正式模板
    return complexityLevel > 0.5 ? template.formal : template.casual;
}

// 调整emoji密度
function adjustEmojiDensity(response, emojiDensity) {
    if (emojiDensity < 0.3) {
        // 低emoji密度：移除所有emoji
        return response.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    } else if (emojiDensity < 0.7) {
        // 中等emoji密度：保持原有emoji
        return response;
    } else {
        // 高emoji密度：添加更多emoji
        const emojis = ['😊', '😄', '😉', '👍', '❤️', '👏', '🎉', '✨', '🌟', '🔥'];
        const words = response.split(' ');
        
        // 每3个单词添加一个emoji
        const enhancedWords = words.map((word, index) => {
            if (index % 3 === 0 && index !== 0) {
                return word + ' ' + emojis[Math.floor(Math.random() * emojis.length)];
            }
            return word;
        });
        
        return enhancedWords.join(' ');
    }
}

// 根据决策权重调整响应内容
function adjustResponseByDecisionWeights(response, message, decisionWeights) {
    // 这里简化处理，根据规则优先或共情优先调整响应
    if (decisionWeights.rulesPriority > decisionWeights.empathyPriority) {
        // 规则优先：添加更多事实性信息
        return response + '\n\n根据相关规则，我会为您提供准确的信息和建议。';
    } else {
        // 共情优先：添加更多情感支持
        return response + '\n\n我理解您的情况，会尽力为您提供帮助和支持。';
    }
}

// 根据价值观倾向调整响应内容
function adjustResponseByValues(response, message, altruismLevel) {
    if (altruismLevel > 0.7) {
        // 高利他主义：添加更多鼓励帮助他人的内容
        return response + '\n\n如果您有能力，不妨考虑帮助身边需要帮助的人，这会让世界变得更美好。';
    } else if (altruismLevel < 0.3) {
        // 高利己主义：添加更多关注个人利益的内容
        return response + '\n\n请确保您的决策符合自己的最佳利益，保护好自己的权益。';
    } else {
        // 中等：保持中立
        return response;
    }
}

// 导出函数
module.exports = {
    generatePersonalityResponse
};
