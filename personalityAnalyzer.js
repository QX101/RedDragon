const { getUserPersonality, updateUserPersonality, recordEvolutionHistory } = require('./personalityDatabase');
const contextManager = require('./lib/multiModalContextManager');

// 价值观词汇库
const VALUES_VOCABULARY = {
    altruism: [
        '帮助', '支持', '分享', '捐赠', '志愿者', '关怀', '体谅', '慷慨', '奉献', '互助',
        'help', 'support', 'share', 'donate', 'volunteer', 'care', 'considerate', 'generous', 'dedicate', 'mutual aid'
    ],
    egoism: [
        '我', '自己', '个人', '私利', '利益', '好处', '自私', '利己', '自我', '自身',
        'me', 'myself', 'personal', 'selfish', 'egoistic', 'self-interest', 'benefit', 'advantage', 'own', 'self'
    ]
};

// 情绪词汇库
const EMOTION_VOCABULARY = {
    positive: [
        '好', '开心', '高兴', '快乐', '满意', '幸福', '愉快', '喜悦', '兴奋', '愉悦',
        'good', 'happy', 'pleased', 'joyful', 'satisfied', 'blessed', 'delighted', 'excited', 'cheerful', 'glad'
    ],
    negative: [
        '不好', '难过', '悲伤', '痛苦', '生气', '愤怒', '失望', '沮丧', '郁闷', '烦躁',
        'bad', 'sad', 'sorrowful', 'painful', 'angry', 'furious', 'disappointed', 'frustrated', 'depressed', 'upset'
    ]
};

// 场景关键词库
const SCENARIO_KEYWORDS = {
    work: [
        '工作', '上班', '公司', '项目', '任务', '会议', '报告', '同事', '领导', '客户',
        'work', 'job', 'company', 'project', 'task', 'meeting', 'report', 'colleague', 'leader', 'client'
    ],
    life: [
        '生活', '家庭', '朋友', '娱乐', '休闲', '旅行', '电影', '音乐', '美食', '运动',
        'life', 'family', 'friend', 'entertainment', 'leisure', 'travel', 'movie', 'music', 'food', 'sports'
    ],
    study: [
        '学习', '学校', '学生', '老师', '作业', '考试', '课程', '知识', '教育', '培训',
        'study', 'school', 'student', 'teacher', 'homework', 'exam', 'course', 'knowledge', 'education', 'training'
    ]
};

// 分析用户价值观倾向
function analyzeValues(message) {
    let altruismScore = 0;
    let egoismScore = 0;
    
    const text = message.toLowerCase();
    
    // 计算利他主义词汇出现次数
    VALUES_VOCABULARY.altruism.forEach(word => {
        if (text.includes(word.toLowerCase())) {
            altruismScore++;
        }
    });
    
    // 计算利己主义词汇出现次数
    VALUES_VOCABULARY.egoism.forEach(word => {
        if (text.includes(word.toLowerCase())) {
            egoismScore++;
        }
    });
    
    // 计算总分数
    const totalScore = altruismScore + egoismScore;
    
    // 归一化到0-1范围
    let altruism = 0.5;
    if (totalScore > 0) {
        altruism = altruismScore / totalScore;
    }
    
    return altruism;
}

// 分析用户情绪
function analyzeEmotion(message) {
    let positiveScore = 0;
    let negativeScore = 0;
    
    const text = message.toLowerCase();
    
    // 计算积极情绪词汇出现次数
    EMOTION_VOCABULARY.positive.forEach(word => {
        if (text.includes(word.toLowerCase())) {
            positiveScore++;
        }
    });
    
    // 计算消极情绪词汇出现次数
    EMOTION_VOCABULARY.negative.forEach(word => {
        if (text.includes(word.toLowerCase())) {
            negativeScore++;
        }
    });
    
    // 确定主导情绪
    if (positiveScore > negativeScore) {
        return 'positive';
    } else if (negativeScore > positiveScore) {
        return 'negative';
    } else {
        return 'neutral';
    }
}

// 分析对话场景
function analyzeScenario(message) {
    let maxScore = 0;
    let dominantScenario = 'general';
    
    const text = message.toLowerCase();
    
    // 分析每个场景的关键词出现次数
    for (const [scenario, keywords] of Object.entries(SCENARIO_KEYWORDS)) {
        let score = 0;
        keywords.forEach(word => {
            if (text.includes(word.toLowerCase())) {
                score++;
            }
        });
        
        if (score > maxScore) {
            maxScore = score;
            dominantScenario = scenario;
        }
    }
    
    return dominantScenario;
}

// 分析用户人格并更新数据库
async function analyzePersonality(userId, message, contextType = 'text', contextData = {}) {
    // 获取用户人格数据
    let personality = getUserPersonality(userId);
    
    if (!personality) {
        // 如果用户不存在，创建新的人格数据
        personality = updateUserPersonality(userId, {});
    }
    
    // 获取多模态上下文
    const context = contextManager.getFullContext(userId);
    
    // 合并所有文本内容（文本消息、图片提取文本、语音转文字）
    let allText = message;
    if (context.currentContext.allText) {
        allText += '\n' + context.currentContext.allText;
    }
    
    // 分析价值观倾向
    const altruism = analyzeValues(allText);
    
    // 分析情绪
    let emotion = 'neutral';
    if (contextType === 'audio' && contextData.sentimentAnalysis) {
        // 使用语音情绪分析结果
        emotion = contextData.sentimentAnalysis.sentiment;
    } else {
        // 使用文本情绪分析
        emotion = analyzeEmotion(allText);
    }
    
    // 分析场景
    const scenario = analyzeScenario(allText);
    
    // 更新情绪反馈频率
    const emotionalFeedbackFrequency = {
        ...personality.personalityTraits.emotionalFeedbackFrequency,
        [emotion]: personality.personalityTraits.emotionalFeedbackFrequency[emotion] + 1
    };
    
    // 计算情绪反馈频率的总和
    const totalFeedback = emotionalFeedbackFrequency.positive + emotionalFeedbackFrequency.negative + emotionalFeedbackFrequency.neutral;
    
    // 计算消极情绪反馈的比例
    const negativeFeedbackRatio = totalFeedback > 0 ? emotionalFeedbackFrequency.negative / totalFeedback : 0;
    
    // 初始化人格变化对象
    const personalityChanges = {};
    
    // 调整价值观倾向
    if (altruism !== personality.personalityTraits.altruism) {
        // 缓慢调整，每次变化不超过0.1
        const delta = Math.min(0.1, Math.abs(altruism - personality.personalityTraits.altruism));
        const newAltruism = altruism > personality.personalityTraits.altruism 
            ? personality.personalityTraits.altruism + delta 
            : personality.personalityTraits.altruism - delta;
        
        personalityChanges.altruism = newAltruism;
    }
    
    // 根据场景调整风格参数
    let styleParametersChanges = {};
    switch (scenario) {
        case 'work':
            // 工作场景：降低emoji密度，提高正式程度
            styleParametersChanges = {
                emojiDensity: Math.max(0, personality.styleParameters.emojiDensity - 0.1),
                formalityLevel: Math.min(1, personality.styleParameters.formalityLevel + 0.1)
            };
            break;
        case 'life':
            // 生活场景：提高emoji密度，降低正式程度
            styleParametersChanges = {
                emojiDensity: Math.min(1, personality.styleParameters.emojiDensity + 0.1),
                formalityLevel: Math.max(0, personality.styleParameters.formalityLevel - 0.1)
            };
            break;
        case 'study':
            // 学习场景：提高句式复杂度，中等正式程度
            styleParametersChanges = {
                sentenceComplexity: Math.min(1, personality.styleParameters.sentenceComplexity + 0.1),
                formalityLevel: Math.min(0.7, Math.max(0.3, personality.styleParameters.formalityLevel))
            };
            break;
        default:
            // 通用场景：根据上下文调整
            // 如果上下文包含图片，稍微提高emoji密度
            if (context.metadata.modalitiesUsed.has('image')) {
                styleParametersChanges.emojiDensity = Math.min(1, personality.styleParameters.emojiDensity + 0.05);
            }
            // 如果上下文包含语音，稍微提高共情权重
            if (context.metadata.modalitiesUsed.has('audio')) {
                styleParametersChanges.empathyPriority = Math.min(1, personality.decisionWeights.empathyPriority + 0.05);
            }
            break;
        default:
            // 通用场景：保持当前风格
            styleParametersChanges = {};
    }
    
    // 根据消极情绪反馈比例调整决策权重
    let decisionWeightsChanges = {};
    if (negativeFeedbackRatio > 0.3) {
        // 高频负面反馈：提高共情优先权重
        decisionWeightsChanges = {
            empathyPriority: Math.min(1, personality.decisionWeights.empathyPriority + 0.1),
            rulesPriority: Math.max(0, personality.decisionWeights.rulesPriority - 0.1)
        };
    } else if (negativeFeedbackRatio < 0.1) {
        // 低频负面反馈：提高规则优先权重
        decisionWeightsChanges = {
            empathyPriority: Math.max(0, personality.decisionWeights.empathyPriority - 0.1),
            rulesPriority: Math.min(1, personality.decisionWeights.rulesPriority + 0.1)
        };
    }
    
    // 合并所有变化
    const allChanges = {
        personalityTraits: {
            ...personality.personalityTraits,
            altruism: personalityChanges.altruism || personality.personalityTraits.altruism,
            emotionalFeedbackFrequency
        },
        styleParameters: {
            ...personality.styleParameters,
            ...styleParametersChanges
        },
        decisionWeights: {
            ...personality.decisionWeights,
            ...decisionWeightsChanges
        }
    };
    
    // 更新人格数据库
    const updatedPersonality = updateUserPersonality(userId, allChanges);
    
    // 记录人格演化轨迹
    if (Object.keys(personalityChanges).length > 0 || 
        Object.keys(styleParametersChanges).length > 0 || 
        Object.keys(decisionWeightsChanges).length > 0) {
        
        const evolutionChanges = {
            personalityTraits: personalityChanges,
            styleParameters: styleParametersChanges,
            decisionWeights: decisionWeightsChanges
        };
        
        recordEvolutionHistory(userId, {
            type: 'conversation',
            message,
            emotion,
            scenario
        }, evolutionChanges);
    }
    
    return updatedPersonality;
}

// 导出函数
module.exports = {
    analyzeValues,
    analyzeEmotion,
    analyzeScenario,
    analyzePersonality
};
