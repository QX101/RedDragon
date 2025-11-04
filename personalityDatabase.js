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

// 创建新角色
function createRole(userId, roleName, roleDescription, initialPersonality = null) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (!data.users[userId]) {
        // 如果用户不存在，创建新用户
        data.users[userId] = {
            id: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            currentRole: null,
            roles: {}
        };
    }
    
    // 角色ID由用户ID和角色名称组成
    const roleId = `${userId}_${roleName.replace(/\s+/g, '_').toLowerCase()}`;
    
    if (!data.users[userId].roles[roleId]) {
        // 创建新角色
        data.users[userId].roles[roleId] = {
            id: roleId,
            name: roleName,
            description: roleDescription,
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
                formalityLevel: 0.5, // 正式程度 (0-1)
                styleType: 'default' // 风格类型: default, academic, colloquial, humorous, concise, literary
            },
            decisionWeights: {
                rulesPriority: 0.5, // 规则优先权重 (0-1)
                empathyPriority: 0.5 // 共情优先权重 (0-1)
            },
            evolutionHistory: []
        };
        
        // 如果提供了初始人格，覆盖默认值
        if (initialPersonality) {
            data.users[userId].roles[roleId] = {
                ...data.users[userId].roles[roleId],
                ...initialPersonality
            };
        }
        
        // 如果是第一个角色，设置为当前角色
        if (!data.users[userId].currentRole) {
            data.users[userId].currentRole = roleId;
        }
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`已为用户 ${userId} 创建角色: ${roleName}`);
    }
    
    return data.users[userId].roles[roleId];
}

// 获取用户的所有角色
function getRoles(userId) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    return data.users[userId]?.roles || {};
}

// 获取用户的当前角色
function getCurrentRole(userId) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    if (!data.users[userId]) return null;
    
    const currentRoleId = data.users[userId].currentRole;
    return data.users[userId].roles[currentRoleId] || null;
}

// 切换用户的当前角色
function switchRole(userId, roleId) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (data.users[userId] && data.users[userId].roles[roleId]) {
        data.users[userId].currentRole = roleId;
        data.users[userId].updatedAt = new Date().toISOString();
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`用户 ${userId} 已切换到角色: ${data.users[userId].roles[roleId].name}`);
        return true;
    }
    
    console.log(`用户 ${userId} 切换角色失败: 角色 ${roleId} 不存在`);
    return false;
}

// 删除角色
function deleteRole(userId, roleId) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (data.users[userId] && data.users[userId].roles[roleId]) {
        delete data.users[userId].roles[roleId];
        data.users[userId].updatedAt = new Date().toISOString();
        
        // 如果删除的是当前角色，设置新的当前角色
        if (data.users[userId].currentRole === roleId) {
            const remainingRoles = Object.keys(data.users[userId].roles);
            data.users[userId].currentRole = remainingRoles.length > 0 ? remainingRoles[0] : null;
        }
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`用户 ${userId} 已删除角色: ${roleId}`);
        return true;
    }
    
    console.log(`用户 ${userId} 删除角色失败: 角色 ${roleId} 不存在`);
    return false;
}

// 更新角色人格数据
function updateRolePersonality(userId, roleId, updates) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (data.users[userId] && data.users[userId].roles[roleId]) {
        data.users[userId].roles[roleId] = {
            ...data.users[userId].roles[roleId],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`已更新用户 ${userId} 角色 ${roleId} 的人格数据`);
        return data.users[userId].roles[roleId];
    } else {
        console.log(`更新角色人格数据失败: 用户 ${userId} 或角色 ${roleId} 不存在`);
        return null;
    }
}

// 记录对话历史（对所有角色可见）
function recordConversationHistory(userId, userMessage, aiResponse, context, roleId = null) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (data.users[userId]) {
        const conversationEntry = {
            timestamp: new Date().toISOString(),
            userMessage,
            aiResponse,
            context,
            roleId: roleId // 记录是哪个角色的响应
        };
        
        // 为所有角色添加相同的对话历史
        for (const role in data.users[userId].roles) {
            data.users[userId].roles[role].conversationHistory.push(conversationEntry);
            
            // 限制对话历史长度，保留最近100条
            if (data.users[userId].roles[role].conversationHistory.length > 100) {
                data.users[userId].roles[role].conversationHistory = data.users[userId].roles[role].conversationHistory.slice(-100);
            }
        }
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`已记录用户 ${userId} 的对话历史`);
    }
}

// 记录角色人格演化轨迹
function recordEvolutionHistory(userId, roleId, trigger, changes) {
    const data = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    
    if (data.users[userId] && data.users[userId].roles[roleId]) {
        const evolutionEntry = {
            timestamp: new Date().toISOString(),
            trigger,
            changes
        };
        
        data.users[userId].roles[roleId].evolutionHistory.push(evolutionEntry);
        
        // 限制演化历史长度，保留最近50条
        if (data.users[userId].roles[roleId].evolutionHistory.length > 50) {
            data.users[userId].roles[roleId].evolutionHistory = data.users[userId].roles[roleId].evolutionHistory.slice(-50);
        }
        
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log(`已记录用户 ${userId} 角色 ${roleId} 的人格演化轨迹`);
    }
}

// 初始化数据库
initializeDatabase();

// 为了向后兼容，保留旧的函数名
function getUserPersonality(userId) {
    console.warn('getUserPersonality() 已过时，请使用 getCurrentRole() 代替');
    return getCurrentRole(userId);
}

function createUserPersonality(userId) {
    console.warn('createUserPersonality() 已过时，请使用 createRole() 代替');
    return createRole(userId, '默认角色', '默认的AI角色');
}

function updateUserPersonality(userId, updates) {
    console.warn('updateUserPersonality() 已过时，请使用 updateRolePersonality() 代替');
    const user = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8')).users[userId];
    if (user && user.currentRole) {
        return updateRolePersonality(userId, user.currentRole, updates);
    }
    return null;
}

// 导出函数
module.exports = {
    // 旧的API（向后兼容）
    getUserPersonality,
    createUserPersonality,
    updateUserPersonality,
    
    // 新的多角色API
    createRole,
    getRoles,
    getCurrentRole,
    switchRole,
    deleteRole,
    updateRolePersonality,
    
    // 共享API
    recordConversationHistory,
    recordEvolutionHistory
};
