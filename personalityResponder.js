const { getUserPersonality, getCurrentRole, getRoles } = require('./personalityDatabase');
const { autoReply } = require('./autoreply');
const contextManager = require('./lib/multiModalContextManager');
const complianceReview = require('./complianceReview');
const sceneResourceGenerator = require('./sceneResourceGenerator');
const { analyzeScenario } = require('./personalityAnalyzer');


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

// 不同风格的响应模板
const STYLE_TEMPLATES = {
    academic: {
        greeting: '您好！我是您的学术助手，很高兴为您提供严谨的学术信息和分析。',
        farewell: '感谢您的咨询，希望我的回答对您的学术研究有所帮助。',
        thanks: '不客气，为您提供准确的学术支持是我的职责。',
        help: '我可以为您提供以下学术相关帮助：1. 概念解释；2. 文献检索；3. 数据分析建议；4. 论文写作指导。',
        tone: '严谨、客观、专业，使用学术术语，逻辑清晰'
    },
    colloquial: {
        greeting: '嘿！嘛呢？有啥想聊的不？',
        farewell: '行嘞，回见哈！有事儿随时找我～',
        thanks: '害，客气啥呀！这点儿小事儿不算啥',
        help: '有啥需要帮忙的不？无论是生活琐事还是八卦咨询，我都能陪你唠唠',
        tone: '口语化、亲切、随意，使用方言词汇，贴近生活'
    },
    humorous: {
        greeting: '哈喽呀！我是你的快乐小助手，今天有什么需要我排忧解难或者逗你开心的吗？',
        farewell: '拜拜啦！希望你今天笑口常开，要是想我了就再来找我玩哦～',
        thanks: '不客气不客气！能帮到你我也超开心的，就像吃了一块巧克力一样甜～',
        help: '我可以帮你做这些有趣的事情：1. 讲笑话；2. 出馊主意；3. 分析情感问题（虽然可能不太专业）；4. 陪你吐槽',
        tone: '幽默、风趣、活泼，使用夸张的表达，添加表情符号'
    },
    concise: {
        greeting: '您好！有什么可以帮您？',
        farewell: '感谢咨询，再见！',
        thanks: '不客气',
        help: '我可以回答问题、提供信息、协助解决问题',
        tone: '简洁、直接、高效，使用短句，避免冗余'
    },
    literary: {
        greeting: '您好！很高兴在这文字的世界里与您相遇，有什么我可以为您效劳的吗？',
        farewell: '感谢您的陪伴，愿您在人生的旅途中一帆风顺，我们后会有期。',
        thanks: '无需言谢，能为您略尽绵薄之力，实乃我的荣幸。',
        help: '我可以为您提供以下帮助：1. 诗词鉴赏；2. 美文创作；3. 语言表达优化；4. 文学知识解答',
        tone: '文雅、优美、富有诗意，使用修辞手法，注重语言美感'
    }
};

// 生成基于角色人格的响应
async function generatePersonalityResponse(userId, message, roleId = null) {
    // 获取指定角色或当前角色
    const personality = roleId ? getRoleById(userId, roleId) : getCurrentRole(userId);
    
    if (!personality) {
        // 如果角色没有人格数据，使用默认响应
        return autoReply(message);
    }
    
    // 获取所有角色的对话历史，用于角色间呼应
    const allRoles = getRoles(userId);
    const allConversationHistory = [];
    
    for (const role in allRoles) {
        allConversationHistory.push(...allRoles[role].conversationHistory);
    }
    
    // 按时间排序对话历史
    allConversationHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 获取最近的几条对话，用于上下文理解
    const recentHistory = allConversationHistory.slice(-10);
    
    // 分析最近对话中其他角色的响应
    const otherRolesResponses = recentHistory
        .filter(entry => entry.roleId && entry.roleId !== personality.id)
        .map(entry => entry.aiResponse);
    
    // 分析用户消息，确定响应类型
    const responseType = determineResponseType(message);
    
    // 分析对话场景
    const scenario = analyzeScenario(message);
    
    // 获取用户选择的风格类型
    const styleType = personality.styleParameters.styleType || 'default';
    
    let response = '';
    
    // 处理特殊风格
    if (STYLE_TEMPLATES[styleType]) {
        const styleTemplate = STYLE_TEMPLATES[styleType];
        response = styleTemplate[responseType] || styleTemplate.help;
        
        // 根据风格类型调整响应
        response = adjustResponseByStyleType(response, styleType);
        
        // 调整emoji密度（根据风格和用户设置）
        response = adjustEmojiDensityByStyle(response, styleType, personality.styleParameters.emojiDensity);
    } else {
        // 默认风格处理
        // 获取相应的响应模板
        const templates = RESPONSE_TEMPLATES[responseType] || RESPONSE_TEMPLATES.help;
        
        // 根据正式程度选择模板
        const template = selectTemplateByFormality(templates, personality.styleParameters.formalityLevel);
        
        // 调整句式复杂度
        response = adjustSentenceComplexity(template, personality.styleParameters.sentenceComplexity);
        
        // 调整emoji密度
        response = adjustEmojiDensity(response, personality.styleParameters.emojiDensity);
        
        // 根据决策权重调整响应内容
        response = adjustResponseByDecisionWeights(response, message, personality.decisionWeights);
        
        // 根据价值观倾向调整响应内容
        response = adjustResponseByValues(response, message, personality.personalityTraits.altruism);
    }
    
    // 在响应中考虑其他角色的观点
    if (otherRolesResponses.length > 0) {
        // 根据当前角色的人格，决定如何呼应其他角色
        if (personality.decisionWeights.empathyPriority > 0.7) {
            // 高共情角色：肯定其他角色的观点
            response = `我同意之前的观点：${otherRolesResponses[otherRolesResponses.length - 1]}。\n${response}`;
        } else if (personality.decisionWeights.rulesPriority > 0.7) {
            // 高规则角色：基于其他角色的观点提供补充
            response = `根据之前的分析，我想补充：\n${response}`;
        }
    }
    
    // Perform compliance review on the generated response
    const reviewResult = complianceReview.review(response);
    
    if (reviewResult.overallRiskLevel === 'high') {
        // Block high-risk response
        return '很抱歉，我无法提供这个问题的回答。';
    } else if (reviewResult.overallRiskLevel === 'medium') {
        // Optimize medium-risk response
        response = complianceReview.optimizeContent(response);
    }
    
    // 生成场景化资源
    let resources = null;
    try {
        resources = await sceneResourceGenerator.generateResources(userId, message, scenario);
    } catch (error) {
        console.error('生成场景化资源失败:', error);
    }
    
    // 如果生成了资源，将资源整合到响应中
    if (resources) {
        // 根据不同场景生成不同的资源展示方式
        switch (resources.type) {
            case 'family_dinner':
                response += '\n\n### 🍽️ 家庭聚餐推荐';
                response += '\n\n#### 食谱: ' + resources.recipe.name;
                response += '\n\n**食材清单:**';
                response += '\n' + resources.recipe.ingredients.map(ingredient => `- ${ingredient}`).join('\n');
                response += '\n\n**制作步骤:**';
                response += '\n' + resources.recipe.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
                
                if (resources.markets && resources.markets.length > 0) {
                    response += '\n\n#### 🛒 附近超市/菜市场推荐';
                    response += '\n' + resources.markets.map(market => `- ${market.name} (${market.type}): ${market.address}，距离: ${market.distance}，评分: ${market.rating}`).join('\n');
                }
                
                if (resources.playlist && resources.playlist.length > 0) {
                    response += '\n\n#### 🎵 聚餐氛围音乐歌单';
                    response += '\n' + resources.playlist.map(song => `- ${song.name} - ${song.artist}`).join('\n');
                }
                break;
                
            case 'shopping':
                response += '\n\n### 🛒 购物推荐';
                if (resources.shoppingItems && resources.shoppingItems.length > 0) {
                    response += '\n\n**您需要购买的商品:**';
                    response += '\n' + resources.shoppingItems.map(item => `- ${item}`).join('\n');
                }
                
                if (resources.stores && resources.stores.length > 0) {
                    response += '\n\n#### 附近商店推荐';
                    response += '\n' + resources.stores.map(store => `- ${store.name} (${store.type}): ${store.address}，距离: ${store.distance}，评分: ${store.rating}`).join('\n');
                }
                break;
                
            case 'music':
                response += '\n\n### 🎵 音乐推荐';
                if (resources.playlist && resources.playlist.length > 0) {
                    response += '\n' + resources.playlist.map(song => `- ${song.name} - ${song.artist}`).join('\n');
                }
                break;
                
            default:
                break;
        }
    }
    
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
    // 如果模板是undefined或字符串，直接返回默认响应
    if (!template || typeof template === 'string') {
        return '很抱歉，我无法理解您的请求。';
    }
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

// 根据风格类型调整响应内容
function adjustResponseByStyleType(response, styleType) {
    switch (styleType) {
        case 'academic':
            // 学术风格：添加更多专业术语和引用提示
            return response + '\n\n需要注意的是，以上回答基于现有学术研究，建议您进一步查阅相关文献以获取更全面的信息。';
        case 'colloquial':
            // 口语风格：添加更多口语化表达
            return response + '\n\n你懂我意思吧？有啥不明白的尽管问哈！';
        case 'humorous':
            // 幽默风格：添加更多幽默元素
            const jokes = [
                '对了，给你讲个冷笑话：为什么程序员喜欢穿格子衫？因为他们没有bug！哈哈哈哈～',
                '差点忘了告诉你，我今天学会了一个新表情：😜 是不是很可爱？',
                '悄悄告诉你，我其实是个隐藏的段子手，需要听段子随时找我！'
            ];
            return response + '\n\n' + jokes[Math.floor(Math.random() * jokes.length)];
        case 'concise':
            // 简洁风格：保持简洁，不添加额外内容
            return response;
        case 'literary':
            // 文学风格：添加更多诗意的表达
            const literaryQuotes = [
                '正如诗人所说："海内存知己，天涯若比邻。" 希望我的回答能为您带来一些启发。',
                '在文字的世界里，每一个问题都是一次探索的旅程，很高兴能与您同行。',
                '愿我的回答能像一束光，照亮您寻找答案的道路。'
            ];
            return response + '\n\n' + literaryQuotes[Math.floor(Math.random() * literaryQuotes.length)];
        default:
            return response;
    }
}

// 根据风格类型调整emoji密度
function adjustEmojiDensityByStyle(response, styleType, userEmojiDensity) {
    // 不同风格有不同的默认emoji密度
    let baseEmojiDensity = 0.5;
    
    switch (styleType) {
        case 'academic':
            baseEmojiDensity = 0.1; // 学术风格很少使用emoji
            break;
        case 'colloquial':
            baseEmojiDensity = 0.6; // 口语风格适量使用emoji
            break;
        case 'humorous':
            baseEmojiDensity = 0.9; // 幽默风格大量使用emoji
            break;
        case 'concise':
            baseEmojiDensity = 0.2; // 简洁风格很少使用emoji
            break;
        case 'literary':
            baseEmojiDensity = 0.3; // 文学风格偶尔使用emoji
            break;
        default:
            baseEmojiDensity = 0.5;
    }
    
    // 结合用户设置的emoji密度，取两者的平均值
    const finalEmojiDensity = (baseEmojiDensity + userEmojiDensity) / 2;
    
    // 使用现有的adjustEmojiDensity函数调整emoji密度
    return adjustEmojiDensity(response, finalEmojiDensity);
}

// 根据角色ID获取角色
function getRoleById(userId, roleId) {
    const roles = getRoles(userId);
    return roles[roleId] || null;
}

// 导出函数
module.exports = {
    generatePersonalityResponse
};
