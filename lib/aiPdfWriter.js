const { Configuration, OpenAIApi } = require('openai');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const Tesseract = require('tesseract.js');
const { PDFDocument: PDFLibDocument, StandardFonts, rgb } = require('pdf-lib');
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');

// 配置AWS Textract客户端
const textractClient = new TextractClient({
  region: 'us-east-1', // 可以根据需要更改区域
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// 配置日志文件
const logFilePath = path.join(__dirname, '..', 'logs', 'pdf-generator.log');
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

// Initialize OpenAI API
const configuration = new Configuration({
  apiKey: global.keyopenai,
});
const openai = new OpenAIApi(configuration);

/**
 * Generate text using OpenAI API based on the given prompt
 * @param {string} prompt - The prompt for the AI
 * @param {string} model - The AI model to use (default: 'text-davinci-003')
 * @param {number} temperature - Temperature for the AI response (default: 0.7)
 * @param {number} maxTokens - Maximum tokens for the AI response (default: 1000)
 * @returns {Promise<string>} - The generated text
 */
async function generateText(prompt, model = 'text-davinci-003', temperature = 0.7, maxTokens = 1000) {
  try {
    log('Generating text with OpenAI', { prompt, model, temperature, maxTokens });
    const response = await openai.createCompletion({
      model: model,
      prompt: prompt,
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    const generatedText = response.data.choices[0].text.trim();
    log('Generated text successfully', { length: generatedText.length });
    return generatedText;
  } catch (error) {
    log('Error generating text with OpenAI', { error: error.message });
    console.error('Error generating text with OpenAI:', error);
    throw error;
  }
}

/**
 * Generate a PDF using AI based on a given prompt
 * @param {string} prompt - The prompt for the AI to generate content
 * @param {string} outputPath - The path to save the generated PDF
 * @param {Object} options - Optional settings
 * @returns {Promise<string>} - The path to the generated PDF
 */
async function generateAiPdf(prompt, outputPath, options = {}) {
  try {
    log('Generating content with AI...');
    const content = await generateText(prompt, options.model, options.temperature, options.maxTokens);
    
    log('Creating PDF...');
    const pdfPath = await createPdf(content, outputPath, options.pdfOptions);
    
    log(`PDF generated successfully: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    log('Error generating AI PDF:', error);
    console.error('Error generating AI PDF:', error);
    throw error;
  }
}

/**
 * Process text content to extract structured information
 * @param {string} text - The input text
 * @returns {Promise<Object>} - Structured text information
 */
async function processText(text) {
  try {
    log('Processing text content', { length: text.length });
    // 这里可以添加更复杂的文本处理逻辑，比如提取实体、关键短语等
    // 目前先简单返回文本内容和基本统计信息
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    const result = {
      originalText: text,
      wordCount: words.length,
      sentenceCount: sentences.length,
      keyPhrases: [] // 可以后续添加关键词提取功能
    };
    
    log('Text processing completed', { wordCount: words.length, sentenceCount: sentences.length });
    return result;
  } catch (error) {
    log('Error processing text', { error: error.message });
    console.error('Error processing text:', error);
    throw error;
  }
}

/**
 * Process table file to extract structured information
 * @param {string} filePath - Path to the table file (Excel or CSV)
 * @returns {Promise<Object>} - Structured table information
 */
async function processTable(filePath) {
  try {
    log('Processing table file', { filePath });
    const fileExtension = path.extname(filePath).toLowerCase();
    
    let workbook;
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      workbook = XLSX.readFile(filePath);
    } else if (fileExtension === '.csv') {
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      workbook = XLSX.read(csvContent, { type: 'string' });
    } else {
      throw new Error(`Unsupported table file format: ${fileExtension}`);
    }
    
    const tableData = [];
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      tableData.push({
        sheetName,
        data: jsonData
      });
    });
    
    log('Table processing completed', { sheetCount: tableData.length });
    return {
      fileName: path.basename(filePath),
      sheets: tableData
    };
  } catch (error) {
    log('Error processing table', { error: error.message });
    console.error('Error processing table:', error);
    throw error;
  }
}

/**
 * Process image file to extract text using OCR
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object>} - Extracted text and image metadata
 */
async function processImage(filePath) {
  try {
    log('Processing image file', { filePath });
    
    // 使用Tesseract.js进行OCR识别
    const { data: { text } } = await Tesseract.recognize(
      filePath,
      'eng', // 默认使用英语，可根据需要添加其他语言
      {
        logger: info => log('Tesseract progress', { progress: info.progress })
      }
    );
    
    // 获取图片元数据
    const stats = fs.statSync(filePath);
    
    log('Image processing completed', { textLength: text.length, fileSize: stats.size });
    return {
      fileName: path.basename(filePath),
      extractedText: text,
      fileSize: stats.size,
      filePath: filePath
    };
  } catch (error) {
    log('Error processing image', { error: error.message });
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Process audio transcript to extract structured information
 * @param {string} transcript - The audio transcript text
 * @returns {Promise<Object>} - Structured transcript information
 */
async function processAudioTranscript(transcript) {
  try {
    log('Processing audio transcript', { length: transcript.length });
    
    // 这里可以添加更复杂的语音转文字处理逻辑，比如提取说话人、情绪分析等
    // 目前先简单返回转文字内容和基本统计信息
    const words = transcript.split(/\s+/).filter(word => word.length > 0);
    const sentences = transcript.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    log('Audio transcript processing completed', { wordCount: words.length, sentenceCount: sentences.length });
    return {
      originalTranscript: transcript,
      wordCount: words.length,
      sentenceCount: sentences.length,
      keyPoints: [] // 可以后续添加关键点提取功能
    };
  } catch (error) {
    log('Error processing audio transcript', { error: error.message });
    console.error('Error processing audio transcript:', error);
    throw error;
  }
}

/**
 * Parse a PDF template to extract layout and styling information
 * @param {string} templatePath - Path to the PDF template
 * @returns {Promise<Object>} - Extracted template information
 */
async function parsePdfTemplate(templatePath) {
  try {
    log('Parsing PDF template', { templatePath });
    
    // 读取PDF文件内容
    const pdfBuffer = fs.readFileSync(templatePath);
    
    // 使用pdf-parse提取基本信息
    const pdfData = await pdfParse(pdfBuffer);
    
    // 使用pdf-lib提取更详细的版式信息
    const pdfDoc = await PDFLibDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    const pageInfo = pages.map((page, index) => {
      const { width, height } = page.getSize();
      const fonts = page.getFonts();
      
      return {
        pageNumber: index + 1,
        width,
        height,
        fonts: Object.keys(fonts).map(fontName => {
          const font = fonts[fontName];
          return {
            name: fontName,
            family: font.getFamily(),
            style: font.isBold() ? 'bold' : font.isItalic() ? 'italic' : 'normal'
          };
        }),
        contentCount: page.getContentStream().length // 简化的内容计数
      };
    });
    
    log('PDF template parsing completed', { pageCount: pageInfo.length });
    return {
      fileName: path.basename(templatePath),
      pageCount: pdfData.numpages,
      info: pdfData.info,
      metadata: pdfData.metadata,
      pages: pageInfo
    };
  } catch (error) {
    log('Error parsing PDF template', { error: error.message });
    console.error('Error parsing PDF template:', error);
    throw error;
  }
}

/**
 * Generate a structured AI PDF with sections based on a given prompt
 * @param {string} prompt - The prompt for the AI to generate structured content
 * @param {string} outputPath - The path to save the generated PDF
 * @param {Object} options - Optional settings
 * @returns {Promise<string>} - The path to the generated PDF
 */
async function generateStructuredAiPdf(prompt, outputPath, options = {}) {
  try {
    log('Generating structured content with AI...');
    
    // Add instructions for structured output to the prompt
    const structuredPrompt = `${prompt}

Please output your response in the following structured format:
{
  "title": "Report Title",
  "sections": [
    {
      "heading": "Section 1",
      "level": 1,
      "content": "Content of section 1"
    },
    {
      "heading": "Section 1.1",
      "level": 2,
      "content": "Content of section 1.1"
    },
    {
      "heading": "Section 2",
      "level": 1,
      "content": "Content of section 2"
    }
  ]
}`;
    
    const structuredContent = await generateText(structuredPrompt, options.model, options.temperature, options.maxTokens);
    
    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(structuredContent);
    } catch (error) {
      log('Error parsing structured content, using as plain text', { error: error.message });
      parsedContent = { content: structuredContent };
    }
    
    log('Creating PDF with structured content...');
    const pdfPath = await createPdf(parsedContent, outputPath, options.pdfOptions);
    
    log(`Structured AI PDF generated successfully: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    log('Error generating structured AI PDF:', error);
    console.error('Error generating structured AI PDF:', error);
    throw error;
  }
}

/**
 * Create a PDF document with the given content
 * @param {Object} content - The content to write to the PDF (supports multiple types)
 * @param {string} outputPath - The path to save the PDF
 * @param {Object} options - Optional settings for the PDF
 * @returns {Promise<string>} - The path to the created PDF
 */
async function createPdf(content, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      log('Creating PDF document', { outputPath, options });
      
      // Create output directory if it doesn't exist
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        ...options
      });

      // Pipe the PDF to a write stream
      doc.pipe(fs.createWriteStream(outputPath));

      // Set default font and size
      doc.font('Helvetica').fontSize(12);

      // Process different types of content
      if (typeof content === 'string') {
        // Plain text content
        const paragraphs = content.split('\n\n');
        paragraphs.forEach((paragraph, index) => {
          if (index > 0) {
            doc.moveDown(1.5); // Add space between paragraphs
          }
          doc.text(paragraph, { align: 'left', indent: 20 });
        });
      } else if (Array.isArray(content)) {
        // Array of content items
        content.forEach((item, index) => {
          if (index > 0) {
            doc.moveDown(2); // Add space between items
          }
          
          switch (item.type) {
            case 'text':
              doc.text(item.content, item.options || { align: 'left', indent: 20 });
              break;
              
            case 'heading':
              const fontSize = item.level === 1 ? 24 : item.level === 2 ? 20 : item.level === 3 ? 18 : 16;
              doc.fontSize(fontSize).font('Helvetica-Bold');
              doc.text(item.content, item.options || { align: 'left' });
              doc.fontSize(12).font('Helvetica'); // Reset to default
              break;
              
            case 'table':
              // 简化的表格处理，实际应用中可能需要更复杂的布局
              const table = item.content;
              const headers = Object.keys(table[0]);
              
              // 设置表头样式
              doc.font('Helvetica-Bold');
              headers.forEach((header, i) => {
                doc.text(header, 50 + i * 150, doc.y, { width: 150, align: 'left' });
              });
              doc.moveDown(1);
              doc.font('Helvetica'); // Reset to default
              
              // 添加表格数据
              table.forEach((row, rowIndex) => {
                headers.forEach((header, colIndex) => {
                  doc.text(row[header], 50 + colIndex * 150, doc.y, { width: 150, align: 'left' });
                });
                doc.moveDown(0.5);
              });
              break;
              
            case 'image':
              if (fs.existsSync(item.content)) {
                doc.image(item.content, item.options || { width: 400 });
              } else {
                doc.text(`[Image not found: ${item.content}]`);
              }
              break;
              
            default:
              doc.text(`[Unsupported content type: ${item.type}]`);
          }
        });
      } else if (typeof content === 'object' && content !== null) {
        // Structured content object
        if (content.title) {
          doc.fontSize(24).font('Helvetica-Bold');
          doc.text(content.title, { align: 'center' });
          doc.fontSize(12).font('Helvetica'); // Reset to default
          doc.moveDown(2);
        }
        
        if (content.sections) {
          content.sections.forEach((section, sectionIndex) => {
            if (sectionIndex > 0) {
              doc.moveDown(2);
            }
            
            if (section.heading) {
              const fontSize = section.level === 1 ? 20 : section.level === 2 ? 18 : 16;
              doc.fontSize(fontSize).font('Helvetica-Bold');
              doc.text(section.heading, { align: 'left' });
              doc.fontSize(12).font('Helvetica'); // Reset to default
              doc.moveDown(1);
            }
            
            if (section.content) {
              createPdf(section.content, outputPath, options); // 递归处理嵌套内容
            }
          });
        }
      }

      // Finalize the PDF
      doc.end();

      // Resolve with the output path once the PDF is created
      doc.on('finish', () => {
        log('PDF document created successfully', { outputPath });
        resolve(outputPath);
      });
    } catch (error) {
      log('Error creating PDF', { error: error.message });
      console.error('Error creating PDF:', error);
      reject(error);
    }
  });
}

/**
 * Format check for PDF documents
 * @param {string} pdfPath - Path to the PDF document
 * @returns {Promise<Object>} - Format check results
 */
async function formatCheck(pdfPath) {
  try {
    log('Performing format check', { pdfPath });
    
    // 读取PDF文件内容
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFLibDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    const issues = [];
    
    // 检查页码连续性
    if (pages.length > 1) {
      for (let i = 0; i < pages.length; i++) {
        const pageNumber = i + 1;
        // 这里可以添加更复杂的页码检查逻辑
        // 目前简单检查页面数量是否正确
        if (pages[i] === undefined) {
          issues.push({
            type: 'error',
            message: `Page ${pageNumber} is missing`,
            page: pageNumber
          });
        }
      }
    }
    
    // 检查跨页元素断裂
    // 这里可以添加更复杂的跨页元素检查逻辑
    
    // 检查图片分辨率
    // 这里可以添加更复杂的图片分辨率检查逻辑
    
    log('Format check completed', { issueCount: issues.length });
    return {
      pdfPath,
      pageCount: pages.length,
      issues,
      status: issues.length === 0 ? 'passed' : 'failed'
    };
  } catch (error) {
    log('Error performing format check', { error: error.message });
    console.error('Error performing format check:', error);
    throw error;
  }
}

/**
 * Logic check for PDF content using knowledge graph
 * @param {string} pdfContent - Extracted text content from PDF
 * @returns {Promise<Object>} - Logic check results
 */
async function logicCheck(pdfContent) {
  try {
    log('Performing logic check', { contentLength: pdfContent.length });
    
    // 这里可以添加更复杂的逻辑检查逻辑，比如使用知识图谱验证因果关系
    // 目前简单检查内容的一致性
    const issues = [];
    
    // 示例：检查是否同时出现矛盾的陈述
    const hasWorkStatement = pdfContent.includes('在上班') || pdfContent.includes('在工作');
    const hasSleepStatement = pdfContent.includes('在家睡觉') || pdfContent.includes('在休息');
    
    if (hasWorkStatement && hasSleepStatement) {
      issues.push({
        type: 'warning',
        message: '内容中同时包含"在上班"和"在家睡觉"的陈述，可能存在逻辑矛盾',
        suggestion: '请确认具体情况，或修改其中一项陈述'
      });
    }
    
    // 示例：检查时间顺序的合理性
    const dateRegex = /(\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/g;
    const dates = pdfContent.match(dateRegex) || [];
    
    if (dates.length > 1) {
      // 这里可以添加更复杂的日期顺序检查逻辑
      log('Found multiple dates in content', { dates });
    }
    
    log('Logic check completed', { issueCount: issues.length });
    return {
      contentLength: pdfContent.length,
      issues,
      status: issues.length === 0 ? 'passed' : 'failed'
    };
  } catch (error) {
    log('Error performing logic check', { error: error.message });
    console.error('Error performing logic check:', error);
    throw error;
  }
}

/**
 * Compliance check for PDF content based on industry standards
 * @param {string} pdfContent - Extracted text content from PDF
 * @param {string} industry - Industry type (e.g., 'finance', 'medical')
 * @returns {Promise<Object>} - Compliance check results
 */
async function complianceCheck(pdfContent, industry = 'general') {
  try {
    log('Performing compliance check', { industry, contentLength: pdfContent.length });
    
    const issues = [];
    
    // 根据不同行业进行合规检查
    switch (industry) {
      case 'medical':
        // 医疗行业合规检查
        // 示例：检查是否包含必要的医疗术语和规范
        if (!pdfContent.includes('诊断') && !pdfContent.includes('治疗')) {
          issues.push({
            type: 'warning',
            message: '医疗文档中建议包含"诊断"或"治疗"等关键术语，以符合《病历书写基本规范》',
            suggestion: '请添加相关医疗术语和规范内容'
          });
        }
        
        // 检查是否包含隐私信息
        const privacyRegex = /(身份证号码|手机号码|银行卡号|家庭住址)/g;
        const privacyInfo = pdfContent.match(privacyRegex) || [];
        
        if (privacyInfo.length > 0) {
          issues.push({
            type: 'warning',
            message: `医疗文档中包含${privacyInfo.join(', ')}等隐私信息，建议进行脱敏处理`,
            suggestion: '请对隐私信息进行脱敏处理，如使用"*"代替部分字符'
          });
        }
        break;
        
      case 'finance':
        // 金融行业合规检查
        // 示例：检查是否包含风险提示
        if (!pdfContent.includes('风险提示') && !pdfContent.includes('投资有风险')) {
          issues.push({
            type: 'error',
            message: '金融文档中必须包含风险提示，以符合相关监管要求',
            suggestion: '请添加风险提示内容，如"投资有风险，入市需谨慎"'
          });
        }
        
        // 检查是否包含虚假宣传
        const falseClaimRegex = /(保证收益|保本保息|无风险)/g;
        const falseClaims = pdfContent.match(falseClaimRegex) || [];
        
        if (falseClaims.length > 0) {
          issues.push({
            type: 'error',
            message: `金融文档中包含${falseClaims.join(', ')}等虚假宣传内容，违反《广告法》和相关监管规定`,
            suggestion: '请修改相关内容，避免使用绝对化和虚假宣传的表述'
          });
        }
        break;
        
      default:
        // 通用合规检查
        // 示例：检查是否包含敏感词汇
        const sensitiveWords = ['色情', '暴力', '恐怖主义', '分裂国家'];
        const foundSensitiveWords = sensitiveWords.filter(word => pdfContent.includes(word));
        
        if (foundSensitiveWords.length > 0) {
          issues.push({
            type: 'error',
            message: `文档中包含敏感词汇：${foundSensitiveWords.join(', ')}`,
            suggestion: '请删除或修改包含敏感词汇的内容'
          });
        }
    }
    
    // 计算合规风险等级
    let riskLevel = 'low';
    const errorCount = issues.filter(issue => issue.type === 'error').length;
    const warningCount = issues.filter(issue => issue.type === 'warning').length;
    
    if (errorCount > 0) {
      riskLevel = 'high';
    } else if (warningCount > 2) {
      riskLevel = 'medium';
    }
    
    log('Compliance check completed', { issueCount: issues.length, riskLevel });
    return {
      industry,
      contentLength: pdfContent.length,
      issues,
      riskLevel,
      status: errorCount === 0 ? 'passed' : 'failed'
    };
  } catch (error) {
    log('Error performing compliance check', { error: error.message });
    console.error('Error performing compliance check:', error);
    throw error;
  }
}

/**
 * Generate a multi-modal PDF using AI
 * @param {Object} input - Multi-modal input data
 * @param {string} outputPath - The path to save the generated PDF
 * @param {Object} options - Optional settings
 * @returns {Promise<Object>} - Result containing PDF path and check results
 */
async function generateMultiModalPdf(input, outputPath, options = {}) {
  try {
    log('Starting multi-modal PDF generation', { inputTypes: Object.keys(input), outputPath });
    
    // Process all input modalities
    const processedInput = {};
    
    if (input.text) {
      processedInput.text = await processText(input.text);
    }
    
    if (input.tables && input.tables.length > 0) {
      processedInput.tables = [];
      for (const tablePath of input.tables) {
        const tableData = await processTable(tablePath);
        processedInput.tables.push(tableData);
      }
    }
    
    if (input.images && input.images.length > 0) {
      processedInput.images = [];
      for (const imagePath of input.images) {
        const imageData = await processImage(imagePath);
        processedInput.images.push(imageData);
      }
    }
    
    if (input.audioTranscripts && input.audioTranscripts.length > 0) {
      processedInput.audioTranscripts = [];
      for (const transcript of input.audioTranscripts) {
        const transcriptData = await processAudioTranscript(transcript);
        processedInput.audioTranscripts.push(transcriptData);
      }
    }
    
    // Generate AI content based on processed input
    const aiPrompt = generateMultiModalPrompt(processedInput, options.promptTemplate);
    log('Generated AI prompt', { promptLength: aiPrompt.length });
    
    const aiContent = await generateText(aiPrompt, options.model, options.temperature, options.maxTokens);
    log('Generated AI content', { contentLength: aiContent.length });
    
    // Create structured content for PDF
    const structuredContent = {
      title: options.title || 'Multi-modal PDF Report',
      sections: [
        {
          heading: 'Introduction',
          content: aiContent
        }
      ]
    };
    
    // Add tables to structured content
    if (processedInput.tables && processedInput.tables.length > 0) {
      processedInput.tables.forEach((table, index) => {
        structuredContent.sections.push({
          heading: `Table ${index + 1}: ${table.fileName}`,
          content: table.sheets[0].data // 简化处理，仅使用第一个工作表
        });
      });
    }
    
    // Add images to structured content
    if (processedInput.images && processedInput.images.length > 0) {
      processedInput.images.forEach((image, index) => {
        structuredContent.sections.push({
          heading: `Image ${index + 1}: ${image.fileName}`,
          content: [
            {
              type: 'text',
              content: `Extracted text from image: ${image.extractedText}`
            },
            {
              type: 'image',
              content: image.filePath,
              options: { width: 400 }
            }
          ]
        });
      });
    }
    
    // Create PDF
    const pdfPath = await createPdf(structuredContent, outputPath, options.pdfOptions);
    
    // Perform all three checks
    const pdfContent = (await pdfParse(fs.readFileSync(pdfPath))).text;
    
    const formatCheckResult = await formatCheck(pdfPath);
    const logicCheckResult = await logicCheck(pdfContent);
    const complianceCheckResult = await complianceCheck(pdfContent, options.industry);
    
    log('Multi-modal PDF generation completed', { pdfPath, formatCheck: formatCheckResult.status, logicCheck: logicCheckResult.status, complianceCheck: complianceCheckResult.status });
    
    return {
      pdfPath,
      processedInput,
      checks: {
        format: formatCheckResult,
        logic: logicCheckResult,
        compliance: complianceCheckResult
      }
    };
  } catch (error) {
    log('Error generating multi-modal PDF', { error: error.message });
    console.error('Error generating multi-modal PDF:', error);
    throw error;
  }
}

/**
 * Generate a prompt for AI based on multi-modal input
 * @param {Object} processedInput - Processed multi-modal input data
 * @param {string} template - Custom prompt template (optional)
 * @returns {string} - Generated AI prompt
 */
function generateMultiModalPrompt(processedInput, template) {
  if (template) {
    return template;
  }
  
  let prompt = 'Please generate a comprehensive report based on the following multi-modal information:\n\n';
  
  if (processedInput.text) {
    prompt += `Text content:\n${processedInput.text.originalText}\n\n`;
  }
  
  if (processedInput.tables && processedInput.tables.length > 0) {
    processedInput.tables.forEach((table, index) => {
      prompt += `Table ${index + 1} (${table.fileName}):\n`;
      prompt += `Sheet names: ${table.sheets.map(sheet => sheet.sheetName).join(', ')}\n`;
      prompt += `First few rows of first sheet:\n${JSON.stringify(table.sheets[0].data.slice(0, 3), null, 2)}\n\n`;
    });
  }
  
  if (processedInput.images && processedInput.images.length > 0) {
    processedInput.images.forEach((image, index) => {
      prompt += `Image ${index + 1} (${image.fileName}):\n`;
      prompt += `Extracted text: ${image.extractedText.substring(0, 100)}${image.extractedText.length > 100 ? '...' : ''}\n\n`;
    });
  }
  
  if (processedInput.audioTranscripts && processedInput.audioTranscripts.length > 0) {
    processedInput.audioTranscripts.forEach((transcript, index) => {
      prompt += `Audio transcript ${index + 1}:\n`;
      prompt += `${transcript.originalTranscript.substring(0, 200)}${transcript.originalTranscript.length > 200 ? '...' : ''}\n\n`;
    });
  }
  
  prompt += 'Please ensure the report is well-structured, coherent, and integrates information from all modalities.\n';
  prompt += 'If there are any inconsistencies or contradictions between different modalities, please note them.\n';
  
  return prompt;
}

/**
 * Reverse iteration test: Parse a template PDF and generate a similar one
 * @param {string} templatePath - Path to the template PDF
 * @param {Object} input - Input data for the new PDF
 * @param {string} outputPath - Path to save the generated PDF
 * @returns {Promise<Object>} - Test results
 */
async function reverseIterationTest(templatePath, input, outputPath) {
  try {
    log('Starting reverse iteration test', { templatePath, outputPath });
    
    // Parse the template PDF
    const templateInfo = await parsePdfTemplate(templatePath);
    
    // Generate new PDF using the same style as template
    const options = {
      pdfOptions: {
        size: templateInfo.pages[0].width > templateInfo.pages[0].height ? 'A4' : 'A4', // 简化处理
        margin: 50 // 简化处理，实际应用中可从模板提取
      },
      title: input.title || templateInfo.info.Title || 'Generated Report'
    };
    
    const result = await generateMultiModalPdf(input, outputPath, options);
    
    // Calculate layout similarity (simplified)
    const generatedPdfInfo = await parsePdfTemplate(outputPath);
    const layoutSimilarity = calculateLayoutSimilarity(templateInfo, generatedPdfInfo);
    
    // Calculate information matching accuracy (simplified)
    const inputText = Object.values(input).filter(v => typeof v === 'string').join(' ');
    const generatedText = (await pdfParse(fs.readFileSync(outputPath))).text;
    const informationAccuracy = calculateInformationAccuracy(inputText, generatedText);
    
    log('Reverse iteration test completed', { layoutSimilarity, informationAccuracy });
    
    return {
      templatePath,
      outputPath,
      layoutSimilarity,
      informationAccuracy,
      templateInfo,
      generatedPdfInfo
    };
  } catch (error) {
    log('Error performing reverse iteration test', { error: error.message });
    console.error('Error performing reverse iteration test:', error);
    throw error;
  }
}

/**
 * Calculate layout similarity between two PDFs (simplified)
 * @param {Object} templateInfo - Template PDF information
 * @param {Object} generatedInfo - Generated PDF information
 * @returns {number} - Similarity score (0-1)
 */
function calculateLayoutSimilarity(templateInfo, generatedInfo) {
  // 简化的布局相似度计算
  const pageCountMatch = templateInfo.pageCount === generatedInfo.pageCount ? 1 : 0;
  const pageSizeMatch = templateInfo.pages[0].width === generatedInfo.pages[0].width && 
                        templateInfo.pages[0].height === generatedInfo.pages[0].height ? 1 : 0;
  
  // 平均相似度
  return (pageCountMatch + pageSizeMatch) / 2;
}

/**
 * Calculate information matching accuracy (simplified)
 * @param {string} inputText - Input text
 * @param {string} generatedText - Generated text from PDF
 * @returns {number} - Accuracy score (0-1)
 */
function calculateInformationAccuracy(inputText, generatedText) {
  // 简化的信息匹配精度计算
  const inputWords = inputText.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  const generatedWords = generatedText.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  
  const matchedWords = inputWords.filter(word => generatedWords.includes(word));
  return matchedWords.length / inputWords.length;
}

/**
 * Stress test: Process large amount of fragmented information
 * @param {Array} fragmentedInput - Array of fragmented input data
 * @param {string} outputPath - Path to save the generated PDF
 * @returns {Promise<Object>} - Stress test results
 */
async function stressTest(fragmentedInput, outputPath) {
  try {
    log('Starting stress test', { inputCount: fragmentedInput.length, outputPath });
    
    // Combine fragmented input into a single input object
    const combinedInput = {
      text: fragmentedInput.filter(item => item.type === 'text').map(item => item.content).join('\n\n'),
      tables: fragmentedInput.filter(item => item.type === 'table').map(item => item.content),
      images: fragmentedInput.filter(item => item.type === 'image').map(item => item.content),
      audioTranscripts: fragmentedInput.filter(item => item.type === 'audio').map(item => item.content)
    };
    
    // Generate PDF with compressed and structured information
    const options = {
      pdfOptions: {
        size: 'A4',
        margin: 50
      },
      title: 'Stress Test Report',
      promptTemplate: 'Please process the following fragmented information, compress it, and organize it into a coherent, structured report. Remove redundant information and highlight the key points.\n\n' +
                      '{text}\n\n'
    };
    
    const result = await generateMultiModalPdf(combinedInput, outputPath, options);
    
    // Calculate information coverage
    const inputText = combinedInput.text;
    const generatedText = (await pdfParse(fs.readFileSync(outputPath))).text;
    const informationCoverage = calculateInformationAccuracy(inputText, generatedText);
    
    // Calculate redundancy
    const inputWordCount = inputText.split(/\s+/).filter(word => word.length > 0).length;
    const generatedWordCount = generatedText.split(/\s+/).filter(word => word.length > 0).length;
    const redundancy = generatedWordCount / inputWordCount;
    
    // Calculate reading fluency (simplified)
    const sentenceCount = generatedText.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
    const averageSentenceLength = generatedWordCount / sentenceCount;
    // 平均句子长度在15-25个单词之间被认为是流畅的
    const readingFluency = averageSentenceLength >= 15 && averageSentenceLength <= 25 ? 1 : 0.5;
    
    log('Stress test completed', { informationCoverage, redundancy, readingFluency });
    
    return {
      inputCount: fragmentedInput.length,
      outputPath,
      informationCoverage,
      redundancy,
      readingFluency,
      result
    };
  } catch (error) {
    log('Error performing stress test', { error: error.message });
    console.error('Error performing stress test:', error);
    throw error;
  }
}

module.exports = {
  generateText,
  createPdf,
  generateAiPdf,
  generateStructuredAiPdf,
  generateMultiModalPdf,
  processText,
  processTable,
  processImage,
  processAudioTranscript,
  formatCheck,
  logicCheck,
  complianceCheck,
  reverseIterationTest,
  stressTest
};
