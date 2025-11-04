class ComplianceReview {
  constructor() {
    // Initialize default sensitive word libraries
    this.politicalSensitiveWords = [
      '敏感词1', '敏感词2', '敏感词3', // Add more political sensitive words here
    ];
    this.privacyWords = [
      '身份证', '银行卡', '密码', '电话号码', '住址', // Add more privacy-related words here
    ];
    this.extremistWords = [
      '极端', '暴力', '恐怖', '仇恨', '自杀', // Add more extremist words here
    ];
    
    // Load custom word libraries from file if exists
    this.loadCustomWordLibraries();
  }
  
  loadCustomWordLibraries() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check if custom word libraries exist
      const customPoliticalWordsPath = path.join(__dirname, 'customPoliticalWords.txt');
      const customPrivacyWordsPath = path.join(__dirname, 'customPrivacyWords.txt');
      const customExtremistWordsPath = path.join(__dirname, 'customExtremistWords.txt');
      
      if (fs.existsSync(customPoliticalWordsPath)) {
        this.politicalSensitiveWords = [...this.politicalSensitiveWords, ...fs.readFileSync(customPoliticalWordsPath, 'utf8').split('\n').filter(word => word.trim())];
      }
      
      if (fs.existsSync(customPrivacyWordsPath)) {
        this.privacyWords = [...this.privacyWords, ...fs.readFileSync(customPrivacyWordsPath, 'utf8').split('\n').filter(word => word.trim())];
      }
      
      if (fs.existsSync(customExtremistWordsPath)) {
        this.extremistWords = [...this.extremistWords, ...fs.readFileSync(customExtremistWordsPath, 'utf8').split('\n').filter(word => word.trim())];
      }
    } catch (error) {
      console.error('Error loading custom word libraries:', error);
    }
  }
  
  // Check for political sensitive content
  checkPoliticalSensitivity(text) {
    const foundWords = this.politicalSensitiveWords.filter(word => text.includes(word));
    if (foundWords.length > 0) {
      return {
        riskLevel: 'high',
        reason: `检测到政治敏感内容: ${foundWords.join(', ')}`,
        foundWords
      };
    }
    return { riskLevel: 'low', reason: '未检测到政治敏感内容' };
  }
  
  // Check for privacy leakage
  checkPrivacyLeakage(text) {
    const foundWords = this.privacyWords.filter(word => text.includes(word));
    if (foundWords.length > 0) {
      // More sophisticated privacy detection (e.g., ID numbers, phone numbers)
      const idNumberRegex = /\d{17}[\d|X|x]/;
      const phoneNumberRegex = /1[3-9]\d{9}/;
      
      const hasIdNumber = idNumberRegex.test(text);
      const hasPhoneNumber = phoneNumberRegex.test(text);
      
      let reason = `检测到隐私相关内容: ${foundWords.join(', ')}`;
      if (hasIdNumber) reason += '，包含身份证号码';
      if (hasPhoneNumber) reason += '，包含电话号码';
      
      return {
        riskLevel: hasIdNumber || hasPhoneNumber ? 'high' : 'medium',
        reason,
        foundWords
      };
    }
    return { riskLevel: 'low', reason: '未检测到隐私泄露内容' };
  }
  
  // Check for emotional extremism
  checkEmotionalExtremism(text) {
    const foundWords = this.extremistWords.filter(word => text.includes(word));
    if (foundWords.length > 0) {
      return {
        riskLevel: 'high',
        reason: `检测到极端情绪内容: ${foundWords.join(', ')}`,
        foundWords
      };
    }
    
    // Check for excessive use of exclamation marks, question marks, or negative words
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const negativeWords = ['不', '没', '无', '否', '非', '别', '勿', '毋'];
    const negativeWordCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (exclamationCount > 5 || questionCount > 5 || negativeWordCount > 3) {
      return {
        riskLevel: 'medium',
        reason: '检测到情绪较为激烈的内容'
      };
    }
    
    return { riskLevel: 'low', reason: '情绪表达较为温和' };
  }
  
  // Check for logical errors
  checkLogicalErrors(text) {
    // Simple logical error detection (can be enhanced with NLP)
    const contradictions = [
      /是.*不是/, /不是.*是/, /有.*没有/, /没有.*有/, /能.*不能/, /不能.*能/
    ];
    
    const hasContradiction = contradictions.some(regex => regex.test(text));
    if (hasContradiction) {
      return {
        riskLevel: 'medium',
        reason: '检测到可能的逻辑矛盾'
      };
    }
    
    return { riskLevel: 'low', reason: '未检测到明显的逻辑错误' };
  }
  
  // Optimize content (convert aggressive language to constructive suggestions)
  optimizeContent(text) {
    // Simple optimization rules (can be enhanced with NLP)
    const optimizationRules = [
      { pattern: /你真笨|你真傻|你蠢/, replacement: '我觉得这个问题可能需要更多的思考' },
      { pattern: /没用|废物|垃圾/, replacement: '我认为这个方法可能不太有效' },
      { pattern: /去死|滚/, replacement: '我希望我们能保持文明交流' },
      { pattern: /不行|不可以/, replacement: '我建议换一种方式' },
    ];
    
    let optimizedText = text;
    for (const rule of optimizationRules) {
      optimizedText = optimizedText.replace(rule.pattern, rule.replacement);
    }
    
    return optimizedText;
  }
  
  // Perform comprehensive compliance review
  review(text) {
    const results = {
      politicalSensitivity: this.checkPoliticalSensitivity(text),
      privacyLeakage: this.checkPrivacyLeakage(text),
      emotionalExtremism: this.checkEmotionalExtremism(text),
      logicalErrors: this.checkLogicalErrors(text)
    };
    
    // Determine overall risk level
    let overallRiskLevel = 'low';
    if (Object.values(results).some(r => r.riskLevel === 'high')) {
      overallRiskLevel = 'high';
    } else if (Object.values(results).some(r => r.riskLevel === 'medium')) {
      overallRiskLevel = 'medium';
    }
    
    // Generate review summary
    const summary = {
      overallRiskLevel,
      results,
      timestamp: new Date().toISOString()
    };
    
    return summary;
  }
  
  // Process text through compliance review
  processText(text) {
    const reviewResult = this.review(text);
    
    if (reviewResult.overallRiskLevel === 'high') {
      // Block high-risk content
      return {
        blocked: true,
        message: '很抱歉，您的消息包含不符合规范的内容，请调整后重新发送。',
        reviewResult
      };
    } else if (reviewResult.overallRiskLevel === 'medium') {
      // Optimize medium-risk content
      const optimizedText = this.optimizeContent(text);
      return {
        blocked: false,
        originalText: text,
        optimizedText,
        message: '您的消息已进行适当调整以符合规范。',
        reviewResult
      };
    } else {
      // Low-risk content passes through
      return {
        blocked: false,
        text,
        reviewResult
      };
    }
  }
}

module.exports = new ComplianceReview();