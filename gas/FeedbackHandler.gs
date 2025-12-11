/**
 * PEポータルサイト - ユーザーフィードバック処理
 * 
 * 自動仕分けの精度確認やFAQ検索結果の評価を収集
 */

/**
 * 自動仕分けの精度確認フィードバックを保存
 * @param {string} requestId - 依頼ID
 * @param {string} suggestedType - 提案された依頼先（system_team/accounting）
 * @param {boolean} isCorrect - 正しかったかどうか
 * @param {string} correctType - 正しい依頼先（isCorrectがfalseの場合）
 * @return {Object} 保存結果
 */
function saveClassificationFeedback(requestId, suggestedType, isCorrect, correctType = '') {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('自動仕分けフィードバック');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createClassificationFeedbackSheet(spreadsheetId);
    }
    
    const feedbackId = Utilities.getUuid();
    const now = new Date();
    const userEmail = Session.getActiveUser().getEmail();
    
    const rowData = [
      feedbackId, // フィードバックID
      requestId, // 依頼ID
      suggestedType, // 提案された依頼先
      isCorrect, // 正しかったか
      correctType || '', // 正しい依頼先（間違っていた場合）
      userEmail, // フィードバック提供者
      now, // フィードバック日時
      now // 更新日時
    ];
    
    sheet.appendRow(rowData);
    
    Logger.log(`自動仕分けフィードバックを保存しました: ${feedbackId}`);
    
    return {
      success: true,
      feedbackId: feedbackId,
      message: 'フィードバックを保存しました'
    };
  } catch (e) {
    Logger.log('自動仕分けフィードバック保存エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * 自動仕分けフィードバックシートを作成
 * @param {string} spreadsheetId - スプレッドシートID
 * @return {Sheet} 作成したシート
 */
function createClassificationFeedbackSheet(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.insertSheet('自動仕分けフィードバック');
  
  // ヘッダー行を設定
  const headers = [
    'フィードバックID',
    '依頼ID',
    '提案された依頼先',
    '正しかったか',
    '正しい依頼先',
    'フィードバック提供者',
    'フィードバック日時',
    '更新日時'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行を固定
  sheet.setFrozenRows(1);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 200); // フィードバックID
  sheet.setColumnWidth(2, 200); // 依頼ID
  sheet.setColumnWidth(3, 150); // 提案された依頼先
  sheet.setColumnWidth(4, 100); // 正しかったか
  sheet.setColumnWidth(5, 150); // 正しい依頼先
  
  Logger.log('自動仕分けフィードバックシートを作成しました');
  
  return sheet;
}

/**
 * FAQ検索結果の評価フィードバックを保存
 * @param {string} knowledgeId - ナレッジIDまたはFAQ ID
 * @param {string} query - 検索クエリ
 * @param {boolean} wasHelpful - 役に立ったかどうか
 * @return {Object} 保存結果
 */
function saveFAQFeedback(knowledgeId, query, wasHelpful) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('FAQフィードバック');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createFAQFeedbackSheet(spreadsheetId);
    }
    
    const feedbackId = Utilities.getUuid();
    const now = new Date();
    const userEmail = Session.getActiveUser().getEmail();
    
    const rowData = [
      feedbackId, // フィードバックID
      knowledgeId, // ナレッジIDまたはFAQ ID
      query, // 検索クエリ
      wasHelpful, // 役に立ったか
      userEmail, // フィードバック提供者
      now, // フィードバック日時
      now // 更新日時
    ];
    
    sheet.appendRow(rowData);
    
    Logger.log(`FAQフィードバックを保存しました: ${feedbackId}`);
    
    return {
      success: true,
      feedbackId: feedbackId,
      message: 'フィードバックを保存しました'
    };
  } catch (e) {
    Logger.log('FAQフィードバック保存エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * FAQフィードバックシートを作成
 * @param {string} spreadsheetId - スプレッドシートID
 * @return {Sheet} 作成したシート
 */
function createFAQFeedbackSheet(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.insertSheet('FAQフィードバック');
  
  // ヘッダー行を設定
  const headers = [
    'フィードバックID',
    'ナレッジID',
    '検索クエリ',
    '役に立ったか',
    'フィードバック提供者',
    'フィードバック日時',
    '更新日時'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行を固定
  sheet.setFrozenRows(1);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 200); // フィードバックID
  sheet.setColumnWidth(2, 200); // ナレッジID
  sheet.setColumnWidth(3, 300); // 検索クエリ
  sheet.setColumnWidth(4, 100); // 役に立ったか
  
  Logger.log('FAQフィードバックシートを作成しました');
  
  return sheet;
}

/**
 * 自動仕分けの精度を分析
 * @return {Object} 精度分析結果
 */
function analyzeClassificationAccuracy() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('自動仕分けフィードバック');
    
    if (!sheet) {
      return {
        success: false,
        error: 'フィードバックシートが見つかりません'
      };
    }
    
    const data = getSheetDataOptimized(sheet);
    
    if (data.length <= 1) {
      return {
        success: true,
        total: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0
      };
    }
    
    const rows = data.slice(1);
    let total = 0;
    let correct = 0;
    let incorrect = 0;
    
    rows.forEach(row => {
      const isCorrect = row[3]; // 正しかったか
      if (isCorrect === true || isCorrect === 'TRUE') {
        correct++;
      } else {
        incorrect++;
      }
      total++;
    });
    
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    
    return {
      success: true,
      total: total,
      correct: correct,
      incorrect: incorrect,
      accuracy: Math.round(accuracy * 100) / 100
    };
  } catch (e) {
    Logger.log('自動仕分け精度分析エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * FAQ検索結果の評価を分析
 * @return {Object} 評価分析結果
 */
function analyzeFAQFeedback() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('FAQフィードバック');
    
    if (!sheet) {
      return {
        success: false,
        error: 'フィードバックシートが見つかりません'
      };
    }
    
    const data = getSheetDataOptimized(sheet);
    
    if (data.length <= 1) {
      return {
        success: true,
        total: 0,
        helpful: 0,
        notHelpful: 0,
        helpfulRate: 0
      };
    }
    
    const rows = data.slice(1);
    let total = 0;
    let helpful = 0;
    let notHelpful = 0;
    
    rows.forEach(row => {
      const wasHelpful = row[3]; // 役に立ったか
      if (wasHelpful === true || wasHelpful === 'TRUE') {
        helpful++;
      } else {
        notHelpful++;
      }
      total++;
    });
    
    const helpfulRate = total > 0 ? (helpful / total) * 100 : 0;
    
    return {
      success: true,
      total: total,
      helpful: helpful,
      notHelpful: notHelpful,
      helpfulRate: Math.round(helpfulRate * 100) / 100
    };
  } catch (e) {
    Logger.log('FAQフィードバック分析エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

