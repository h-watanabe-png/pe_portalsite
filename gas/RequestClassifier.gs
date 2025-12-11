/**
 * PEポータルサイト - リクエスト自動仕分け機能
 * 
 * Slack問い合わせ分析結果を基に、依頼内容から自動的にシステムチームか経理かを判定
 */

/**
 * システムチーム関連キーワード（重み付け付き）
 * キーワード: 出現頻度（分析結果から）
 */
const SYSTEM_KEYWORDS = {
  'エラー': 66,
  'ログイン': 16,
  'Filemaker': 2,
  'FM': 29,
  '貼り付け': 10,
  '権限': 13,
  'VPN': 2,
  'リモート': 2,
  '面接': 96,
  '選考': 34,
  '教師': 220,
  '生徒': 258,
  'PC': 18,
  '設定': 22,
  'セッティング': 22,
  'システム': 22,
  '不具合': 22,
  '修正': 180,
  '改修': 2,
  'FileMaker': 2,
  'filemaker': 2,
  'fm': 29,
  'エラ': 66,
  'ログ': 16,
  '権': 13,
  '面接S': 96,
  '面接s': 96,
  '選考F': 34,
  '選考f': 34,
  '教師F': 220,
  '教師f': 220,
  '生徒F': 258,
  '生徒f': 258
};

/**
 * 経理関連キーワード（重み付け付き）
 * キーワード: 出現頻度（分析結果から）
 */
const ACCOUNTING_KEYWORDS = {
  '請求': 318,
  '口座': 141,
  'クレカ': 136,
  'クレジットカード': 136,
  '決済': 117,
  '振込': 92,
  '報酬': 72,
  '支払': 58,
  '金額': 39,
  '経理': 21,
  '銀行': 18,
  'カード': 18,
  '領収': 8,
  '費用': 4,
  '請求書': 318,
  '請求修正': 318,
  '請求作成': 318,
  '報酬計算': 72,
  '報酬支払': 72,
  '振込手続き': 92,
  '口座変更': 141,
  '口座登録': 141,
  '領収書': 8,
  'クレジット': 136,
  'クレ': 136
};

/**
 * 依頼内容から自動仕分けを実行
 * @param {string} issue - 発生している問題 / 依頼内容
 * @param {string} requestTypeDetail - 依頼種別（詳細）
 * @param {string} brand - ブランド
 * @param {string} householdId - 世帯ID
 * @param {string} studentNumber - 生徒番号
 * @param {string} selectionNumber - 選考番号
 * @param {string} teacherNumber - 教師番号
 * @return {Object} 仕分け結果 {suggestedType: string, confidence: number, systemScore: number, accountingScore: number, keywords: Array}
 */
function classifyRequest(issue, requestTypeDetail, brand, householdId, studentNumber, selectionNumber, teacherNumber) {
  // テキストを結合して分析
  const fullText = [
    issue || '',
    requestTypeDetail || '',
    brand || '',
    householdId || '',
    studentNumber || '',
    selectionNumber || '',
    teacherNumber || ''
  ].join(' ').toLowerCase();
  
  // システムチームスコアを計算
  let systemScore = 0;
  const systemKeywordsFound = [];
  
  for (const [keyword, weight] of Object.entries(SYSTEM_KEYWORDS)) {
    const keywordLower = keyword.toLowerCase();
    if (fullText.includes(keywordLower)) {
      systemScore += weight;
      systemKeywordsFound.push(keyword);
    }
  }
  
  // 経理スコアを計算
  let accountingScore = 0;
  const accountingKeywordsFound = [];
  
  for (const [keyword, weight] of Object.entries(ACCOUNTING_KEYWORDS)) {
    const keywordLower = keyword.toLowerCase();
    if (fullText.includes(keywordLower)) {
      accountingScore += weight;
      accountingKeywordsFound.push(keyword);
    }
  }
  
  // 依頼種別から判定（優先度: 高）
  if (requestTypeDetail) {
    const requestTypeLower = requestTypeDetail.toLowerCase();
    
    // システムチーム関連の依頼種別
    if (requestTypeLower.includes('エラー') || 
        requestTypeLower.includes('修正') || 
        requestTypeLower.includes('改修') || 
        requestTypeLower.includes('設定') || 
        requestTypeLower.includes('権限') || 
        requestTypeLower.includes('面接') || 
        requestTypeLower.includes('選考') ||
        requestTypeLower.includes('PC') ||
        requestTypeLower.includes('システム')) {
      systemScore += 100; // 高い重み付け
    }
    
    // 経理関連の依頼種別
    if (requestTypeLower.includes('請求') || 
        requestTypeLower.includes('報酬') || 
        requestTypeLower.includes('振込') || 
        requestTypeLower.includes('クレカ') || 
        requestTypeLower.includes('口座') || 
        requestTypeLower.includes('決済') || 
        requestTypeLower.includes('領収')) {
      accountingScore += 100; // 高い重み付け
    }
  }
  
  // スコアが同程度の場合は、デフォルトでシステムチーム
  let suggestedType = 'system_team';
  let confidence = 0.5;
  
  if (systemScore > accountingScore) {
    suggestedType = 'system_team';
    const totalScore = systemScore + accountingScore;
    confidence = totalScore > 0 ? systemScore / totalScore : 0.5;
  } else if (accountingScore > systemScore) {
    suggestedType = 'accounting';
    const totalScore = systemScore + accountingScore;
    confidence = totalScore > 0 ? accountingScore / totalScore : 0.5;
  } else {
    // スコアが同じ場合は、デフォルトでシステムチーム
    suggestedType = 'system_team';
    confidence = 0.5;
  }
  
  return {
    suggestedType: suggestedType,
    confidence: confidence,
    systemScore: systemScore,
    accountingScore: accountingScore,
    systemKeywords: systemKeywordsFound,
    accountingKeywords: accountingKeywordsFound
  };
}

/**
 * 依頼種別から推奨項目を取得
 * @param {string} requestType - リクエストタイプ（system_team / accounting）
 * @param {string} requestTypeDetail - 依頼種別（詳細）
 * @return {Object} 推奨項目 {requiredFields: Array, recommendedFields: Array, helpText: string}
 */
function getRecommendedFields(requestType, requestTypeDetail) {
  const recommendations = {
    requiredFields: [],
    recommendedFields: [],
    helpText: ''
  };
  
  if (requestType === 'system_team') {
    // システムチーム依頼の推奨項目
    if (requestTypeDetail && requestTypeDetail.includes('エラー')) {
      recommendations.recommendedFields.push('error-message');
      recommendations.helpText = 'エラーメッセージやエラー画面のスクリーンショットがあると、対応が迅速になります。';
    } else if (requestTypeDetail && (requestTypeDetail.includes('面接') || requestTypeDetail.includes('選考'))) {
      recommendations.recommendedFields.push('selection-number', 'teacher-number', 'student-number');
      recommendations.helpText = '選考番号、教師番号、生徒番号があると、対応が迅速になります。';
    } else if (requestTypeDetail && requestTypeDetail.includes('設定')) {
      recommendations.recommendedFields.push('household-id', 'student-number');
      recommendations.helpText = '世帯IDや生徒番号があると、対応が迅速になります。';
    }
  } else if (requestType === 'accounting') {
    // 経理依頼の推奨項目
    if (requestTypeDetail && (requestTypeDetail.includes('請求') || requestTypeDetail.includes('報酬'))) {
      recommendations.recommendedFields.push('household-id', 'request-month', 'amount');
      recommendations.helpText = '世帯ID、請求月、金額があると、対応が迅速になります。';
    } else if (requestTypeDetail && requestTypeDetail.includes('振込')) {
      recommendations.recommendedFields.push('household-id', 'teacher-number');
      recommendations.helpText = '世帯ID、教師番号があると、対応が迅速になります。';
    }
  }
  
  return recommendations;
}

