const { createUserPersonality, updateUserPersonality, getUserPersonality } = require('./personalityDatabase');
const { generatePersonalityResponse } = require('./personalityResponder');

// 创建一个测试用户
const testUserId = 'test_user_001';
createUserPersonality(testUserId);

// 测试消息
const testMessage = '你好，我需要帮助';

// 测试不同风格的响应
const stylesToTest = ['default', 'academic', 'colloquial', 'humorous', 'concise', 'literary'];

// 测试家庭聚餐场景
const testFamilyDinnerMessage = '周末家庭聚餐有什么推荐的食谱吗？';

async function runTests() {
    console.log('测试动态对话风格迁移功能：');
    console.log(`用户消息：${testMessage}`);
    console.log('\n');
    
    for (const style of stylesToTest) {
        // 获取当前用户人格数据
        const currentPersonality = getUserPersonality(testUserId);
        
        // 更新用户风格，保留现有的风格参数
        updateUserPersonality(testUserId, {
            styleParameters: {
                ...currentPersonality.styleParameters,
                styleType: style,
                formalityLevel: currentPersonality.styleParameters.formalityLevel || 0.5,
                sentenceComplexity: currentPersonality.styleParameters.sentenceComplexity || 0.5,
                emojiDensity: currentPersonality.styleParameters.emojiDensity || 0.5
            }
        });
        
        // 生成响应
        const response = await generatePersonalityResponse(testUserId, testMessage);
        
        // 打印结果
        console.log(`风格：${style}`);
        console.log(`响应：${response}`);
        console.log('\n');
    }
    
    // 测试家庭聚餐场景
    console.log('\n\n测试家庭聚餐场景：');
    console.log(`用户消息：${testFamilyDinnerMessage}`);
    console.log('\n');
    
    // 设置为默认风格
    updateUserPersonality(testUserId, {
        styleParameters: {
            styleType: 'default',
            formalityLevel: 0.5,
            sentenceComplexity: 0.5,
            emojiDensity: 0.5
        }
    });
    
    // 生成响应
    const response = await generatePersonalityResponse(testUserId, testFamilyDinnerMessage);
    
    // 打印结果
    console.log(`响应：${response}`);
    console.log('\n');
    
    console.log('测试完成！');
}

// 运行测试
runTests().catch(error => {
    console.error('测试失败:', error);
});