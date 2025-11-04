const fs = require('fs');
const path = require('path');

// 人格数据库文件路径
const DATABASE_FILE = path.join(__dirname, 'database', 'personality.json');

// 初始化人格数据库
function initializeDatabase() {
    if (!fs.existsSync(DATABASE_FILE)) {
        const initialData = {
            users: {}
        };
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(initialData, null, 2));
        console.log('人格数据库已初始化');
    }
}

// 获取用户人格数据
function getUserPersonality(userId) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    return data.users[userId] || null;
}

// 创建新用户人格数据
function createUserPersonality(userId) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (!data.users[userId]) {
        data.users[userId] = {
            id: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            personalityTraits: {
                altruism: 0.5, // 利他主义倾向 (0-1)
                riskPreference: 0.5, // 风险偏好 (0-1)
                emotionalFeedbackFrequency: {
                    positive: 0,
                    negative: 0,
                    neutral: 0
                }
            },
            conversationHistory: [],
            styleParameters: {
                sentenceComplexity: 0.5, // 句式复杂度 (0-1)
                emojiDensity: 0.5, // emoji使用密度 (0-1)
                formalityLevel: 0.5 // 正式程度 (0-1)
            },
            decisionWeights: {
                rulesPriority: 0.5, // 规则优先权重 (0-1)
                empathyPriority: 0.5 // 共情优先权重 (0-1)
            },
            evolutionHistory: []
        };
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`已为用户 ${userId} 创建人格数据`);
    }
    
    return data.users[userId];
}

// 更新用户人格数据
function updateUserPersonality(userId, updates) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (data.users[userId]) {
        data.users[userId] = {
            ...data.users[userId],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`已更新用户 ${userId} 的人格数据`);
        return data.users[userId];
    } else {
        return createUserPersonality(userId);
    }
}

// 记录对话历史
function recordConversationHistory(userId, userMessage, aiResponse, context) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (data.users[userId]) {
        const conversationEntry = {
            timestamp: new Date().toISOString(),
            userMessage,
            aiResponse,
            context
        };
        
        data.users[userId].conversationHistory.push(conversationEntry);
        
        // 限制对话历史长度，保留最近100条
        if (data.users[userId].conversationHistory.length > 100) {
            data.users[userId].conversationHistory = data.users[userId].conversationHistory.slice(-100);
        }
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`已记录用户 ${userId} 的对话历史`);
    }
}

// 记录人格演化轨迹
function recordEvolutionHistory(userId, trigger, changes) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (data.users[userId]) {
        const evolutionEntry = {
            timestamp: new Date().toISOString(),
            trigger,
            changes
        };
        
        data.users[userId].evolutionHistory.push(evolutionEntry);
        
        // 限制演化历史长度，保留最近50条
        if (data.users[userId].evolutionHistory.length > 50) {
            data.users[userId].evolutionHistory = data.users[userId].evolutionHistory.slice(-50);
        }
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`已记录用户 ${userId} 的人格演化轨迹`);
    }
}

// 初始化数据库
initializeDatabase();

// 导出函数
module.exports = {
    getUserPersonality,
    createUserPersonality,
    updateUserPersonality,
    recordConversationHistory,
    recordEvolutionHistory
};
