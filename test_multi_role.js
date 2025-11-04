const { createRole, getRoles, getCurrentRole, switchRole, recordConversationHistory } = require('./personalityDatabase');
const { generatePersonalityResponse } = require('./personalityResponder');

// 测试用户ID
const userId = 'test_user_002';

// 测试多角色对话系统
async function testMultiRoleSystem() {
    console.log('=== 多角色协同对话系统测试 ===\n');
    
    // 第一步：创建不同人设的AI角色
    console.log('1. 创建不同人设的AI角色...');
    
    // 创建职场导师角色
    const careerCoach = createRole(
        userId, 
        '职场导师', 
        '提供职业发展建议和职场问题解决方案',
        {
            personalityTraits: {
                altruism: 0.6,
                riskPreference: 0.4
            },
            styleParameters: {
                styleType: 'formal',
                formalityLevel: 0.8,
                sentenceComplexity: 0.7,
                emojiDensity: 0.1
            },
            decisionWeights: {
                rulesPriority: 0.7,
                empathyPriority: 0.3
            }
        }
    );
    
    // 创建心理咨询师角色
    const counselor = createRole(
        userId, 
        '心理咨询师', 
        '提供情绪支持和心理问题疏导',
        {
            personalityTraits: {
                altruism: 0.9,
                riskPreference: 0.2
            },
            styleParameters: {
                styleType: 'colloquial',
                formalityLevel: 0.4,
                sentenceComplexity: 0.5,
                emojiDensity: 0.6
            },
            decisionWeights: {
                rulesPriority: 0.3,
                empathyPriority: 0.7
            }
        }
    );
    
    // 创建创意伙伴角色
    const creativePartner = createRole(
        userId, 
        '创意伙伴', 
        '提供创意想法和灵感激发',
        {
            personalityTraits: {
                altruism: 0.7,
                riskPreference: 0.8
            },
            styleParameters: {
                styleType: 'humorous',
                formalityLevel: 0.2,
                sentenceComplexity: 0.6,
                emojiDensity: 0.9
            },
            decisionWeights: {
                rulesPriority: 0.2,
                empathyPriority: 0.8
            }
        }
    );
    
    console.log(`   ✓ 已创建角色: ${careerCoach.name}`);
    console.log(`   ✓ 已创建角色: ${counselor.name}`);
    console.log(`   ✓ 已创建角色: ${creativePartner.name}`);
    
    // 第二步：查看用户的所有角色
    console.log('\n2. 查看用户的所有角色...');
    const roles = getRoles(userId);
    Object.values(roles).forEach(role => {
        console.log(`   - ${role.name}: ${role.description}`);
    });
    
    // 第三步：测试角色切换
    console.log('\n3. 测试角色切换...');
    
    // 切换到心理咨询师角色
    switchRole(userId, counselor.id);
    console.log(`   ✓ 当前角色: ${getCurrentRole(userId).name}`);
    
    // 第四步：模拟用户对话
    console.log('\n4. 模拟用户对话...');
    
    const userMessages = [
        '我最近工作压力很大，感觉快撑不住了',
        '我想换一份工作，但又担心找不到更好的',
        '我需要一些创意来提升我的工作效率'
    ];
    
    for (const message of userMessages) {
        console.log(`\n用户: ${message}`);
        
        // 获取当前角色
        const currentRole = getCurrentRole(userId);
        
        // 生成响应
        const response = generatePersonalityResponse(userId, message);
        console.log(`${currentRole.name}: ${response}`);
        
        // 记录对话历史
        recordConversationHistory(userId, message, response, { scenario: 'work' }, currentRole.id);
        
        // 切换角色
        if (currentRole.id === counselor.id) {
            // 从心理咨询师切换到职场导师
            switchRole(userId, careerCoach.id);
        } else if (currentRole.id === careerCoach.id) {
            // 从职场导师切换到创意伙伴
            switchRole(userId, creativePartner.id);
        } else {
            // 从创意伙伴切换到心理咨询师
            switchRole(userId, counselor.id);
        }
    }
    
    console.log('\n=== 测试完成 ===');
}

// 运行测试
testMultiRoleSystem().catch(console.error);