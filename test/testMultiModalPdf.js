const path = require('path');
const { generateMultiModalPdf, reverseIterationTest, stressTest } = require('../lib/aiPdfWriter');
const fs = require('fs');

// 创建测试输出目录
const testOutputDir = path.join(__dirname, 'output');
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true });
}

// 测试多模态PDF生成功能
async function testMultiModalPdfGeneration() {
  console.log('开始测试多模态PDF生成功能...');
  
  // 测试输入数据
  const input = {
    text: '这是一段测试文本，包含一些事实数据：2023年6月1日，公司销售额达到100万美元。同时，用户满意度为95%。',
    tables: [path.join(__dirname, 'data', 'test_table.xlsx')], // 假设我们有一个测试表格文件
    // images: [path.join(__dirname, 'data', 'test_image.jpg')], // 暂时跳过图片处理
    audioTranscripts: ['这是一段语音转文字的测试内容。用户表达了对产品的积极反馈，认为产品功能强大，易于使用。同时，用户也提出了一些改进建议，希望增加更多的自定义选项。']
  };
  
  // 测试输出路径
  const outputPath = path.join(testOutputDir, 'test_multi_modal.pdf');
  
  // 测试选项
  const options = {
    title: '多模态PDF测试报告',
    industry: 'general', // 可以测试 'finance' 或 'medical' 行业
    pdfOptions: {
      size: 'A4',
      margin: 50
    }
  };
  
  try {
    const result = await generateMultiModalPdf(input, outputPath, options);
    console.log(`多模态PDF生成成功：${result.pdfPath}`);
    
    // 输出校验结果
    console.log('\n格式校验结果：');
    console.log(`状态：${result.checks.format.status}`);
    console.log(`问题数量：${result.checks.format.issues.length}`);
    if (result.checks.format.issues.length > 0) {
      console.log('问题详情：', result.checks.format.issues);
    }
    
    console.log('\n逻辑校验结果：');
    console.log(`状态：${result.checks.logic.status}`);
    console.log(`问题数量：${result.checks.logic.issues.length}`);
    if (result.checks.logic.issues.length > 0) {
      console.log('问题详情：', result.checks.logic.issues);
    }
    
    console.log('\n合规校验结果：');
    console.log(`状态：${result.checks.compliance.status}`);
    console.log(`风险等级：${result.checks.compliance.riskLevel}`);
    console.log(`问题数量：${result.checks.compliance.issues.length}`);
    if (result.checks.compliance.issues.length > 0) {
      console.log('问题详情：', result.checks.compliance.issues);
    }
    
    console.log('\n多模态PDF生成功能测试完成！');
  } catch (error) {
    console.error('多模态PDF生成功能测试失败：', error);
    throw error;
  }
}

// 测试逆向迭代测试功能
async function testReverseIterationTest() {
  console.log('\n开始测试逆向迭代测试功能...');
  
  // 模板PDF路径（假设我们有一个模板文件）
  const templatePath = path.join(__dirname, 'data', 'template.pdf');
  
  // 测试输入数据
  const input = {
    text: '这是根据模板生成的测试内容。模板PDF包含一些示例内容，我们将尝试生成类似风格的PDF。'
  };
  
  // 测试输出路径
  const outputPath = path.join(testOutputDir, 'test_reverse_iteration.pdf');
  
  try {
    const result = await reverseIterationTest(templatePath, input, outputPath);
    console.log(`逆向迭代测试完成：`);
    console.log(`模板路径：${result.templatePath}`);
    console.log(`生成路径：${result.outputPath}`);
    console.log(`版式还原度：${result.layoutSimilarity.toFixed(2)}`);
    console.log(`信息匹配精度：${result.informationAccuracy.toFixed(2)}`);
    
    console.log('\n逆向迭代测试功能测试完成！');
  } catch (error) {
    console.error('逆向迭代测试功能测试失败：', error);
    // 如果模板文件不存在，我们可以跳过这个测试
    console.log('注意：如果模板文件不存在，逆向迭代测试将无法运行。请确保template.pdf文件存在于test/data目录中。');
  }
}

// 测试压力测试功能
async function testStressTest() {
  console.log('\n开始测试压力测试功能...');
  
  // 生成大量碎片化输入
  const fragmentedInput = [];
  
  // 添加100条文本片段
  for (let i = 1; i <= 100; i++) {
    fragmentedInput.push({
      type: 'text',
      content: `这是文本片段 ${i}。包含一些测试内容，用于压力测试。`
    });
  }
  
  // 添加一些表格和图片（可选）
  // fragmentedInput.push({
  //   type: 'table',
  //   content: path.join(__dirname, 'data', 'test_table.xlsx')
  // });
  
  // fragmentedInput.push({
  //   type: 'image',
  //   content: path.join(__dirname, 'data', 'test_image.jpg')
  // });
  
  // 测试输出路径
  const outputPath = path.join(testOutputDir, 'test_stress_test.pdf');
  
  try {
    const result = await stressTest(fragmentedInput, outputPath);
    console.log(`压力测试完成：`);
    console.log(`输入片段数量：${result.inputCount}`);
    console.log(`生成路径：${result.outputPath}`);
    console.log(`信息覆盖率：${result.informationCoverage.toFixed(2)}`);
    console.log(`冗余度：${result.redundancy.toFixed(2)}`);
    console.log(`阅读流畅度：${result.readingFluency.toFixed(2)}`);
    
    console.log('\n压力测试功能测试完成！');
  } catch (error) {
    console.error('压力测试功能测试失败：', error);
    throw error;
  }
}

// 运行所有测试
async function runAllTests() {
  try {
    console.log('开始多模态PDF智能生成与动态校验系统测试...\n');
    
    // 测试多模态PDF生成功能
    await testMultiModalPdfGeneration();
    
    // 测试逆向迭代测试功能
    await testReverseIterationTest();
    
    // 测试压力测试功能
    await testStressTest();
    
    console.log('\n所有测试完成！');
  } catch (error) {
    console.error('测试失败：', error);
    process.exit(1);
  }
}

// 执行测试
runAllTests();