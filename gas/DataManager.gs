/**
 * PEポータルサイト - データ管理
 * 
 * スプレッドシートをDBとして扱うためのデータ管理機能
 * NotebookLM、Slack、Google Workspace連携を考慮
 */

/**
 * 問い合わせ対応履歴を追加
 * @param {string} requestId - 依頼ID
 * @param {string} responder - 対応者
 * @param {string} content - 対応内容
 * @param {string} result - 対応結果
 * @param {string} slackThreadUrl - SlackスレッドURL（オプション）
 * @param {Array<string>} tags - タグ（オプション）
 * @return {Object} 保存結果
 */
function addCorrespondenceHistory(requestId, responder, content, result, slackThreadUrl = '', tags = []) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('問い合わせ対応履歴');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createCorrespondenceHistorySheet(spreadsheetId);
    }
    
    const correspondenceId = Utilities.getUuid();
    const now = new Date();
    
    const rowData = [
      correspondenceId, // 対応ID
      requestId || '', // 依頼ID
      now, // 対応日時
      responder, // 対応者
      content, // 対応内容
      result || '', // 対応結果
      slackThreadUrl || '', // 関連URL
      tags.join(', '), // タグ
      '', // 重要度（後で設定可能）
      '', // 次回対応予定日
      now // 更新日時
    ];
    
    sheet.appendRow(rowData);
    
    Logger.log(`問い合わせ対応履歴を追加しました: ${correspondenceId}`);
    
    return {
      success: true,
      correspondenceId: correspondenceId,
      message: '対応履歴を保存しました'
    };
  } catch (e) {
    Logger.log('問い合わせ対応履歴追加エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * 問い合わせ対応履歴シートを作成
 * @param {string} spreadsheetId - スプレッドシートID
 * @return {Sheet} 作成したシート
 */
function createCorrespondenceHistorySheet(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.insertSheet('問い合わせ対応履歴');
  
  // ヘッダー行を設定
  const headers = [
    '対応ID',
    '依頼ID',
    '対応日時',
    '対応者',
    '対応内容',
    '対応結果',
    '関連URL',
    'タグ',
    '重要度',
    '次回対応予定日',
    '更新日時'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行を固定
  sheet.setFrozenRows(1);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 200); // 対応ID
  sheet.setColumnWidth(4, 150); // 対応者
  sheet.setColumnWidth(5, 400); // 対応内容
  sheet.setColumnWidth(6, 150); // 対応結果
  sheet.setColumnWidth(7, 300); // 関連URL
  
  Logger.log('問い合わせ対応履歴シートを作成しました');
  
  return sheet;
}

/**
 * NotebookLM用のデータをエクスポート
 * @return {Array<Object>} NotebookLM用の構造化データ
 */
function exportForNotebookLM() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('問い合わせ対応履歴');
    
    if (!sheet) {
      return [];
    }
    
    const data = getSheetDataOptimized(sheet);
    
    if (data.length <= 1) {
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // NotebookLM用に構造化
    return rows.map(row => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      
      // 自然言語での説明を追加（NotebookLM検索用）
      record.description = 
        `${formatDate(record.対応日時)}に${record.対応者}が対応しました。` +
        `対応内容: ${record.対応内容}。` +
        `対応結果: ${record.対応結果}。` +
        (record.依頼ID ? `関連依頼ID: ${record.依頼ID}。` : '') +
        (record.タグ ? `タグ: ${record.タグ}。` : '');
      
      return record;
    });
  } catch (e) {
    Logger.log('NotebookLM用データエクスポートエラー: ' + e.toString());
    return [];
  }
}

/**
 * NotebookLM用のデータをCSV形式でエクスポート
 * @return {ContentService.TextOutput} CSV形式のデータ
 */
function exportForNotebookLMAsCSV() {
  const data = exportForNotebookLM();
  
  if (data.length === 0) {
    return ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.CSV);
  }
  
  // CSV形式に変換
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // ヘッダー行
  csvRows.push(headers.map(h => `"${h}"`).join(','));
  
  // データ行
  data.forEach(record => {
    const row = headers.map(header => {
      const value = record[header] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(row.join(','));
  });
  
  return ContentService.createTextOutput(csvRows.join('\n'))
    .setMimeType(ContentService.MimeType.CSV);
}

/**
 * Slackスレッド情報を保存
 * @param {string} requestId - 依頼ID
 * @param {string} threadTs - Slackスレッドタイムスタンプ
 * @param {string} channelId - SlackチャンネルID
 * @param {string} threadUrl - SlackスレッドURL
 */
function saveSlackThreadInfo(requestId, threadTs, channelId, threadUrl) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_統合管理');
    
    if (!sheet) {
      Logger.log('依頼_統合管理シートが見つかりません');
      return;
    }
    
    const data = getSheetDataOptimized(sheet);
    
    // 依頼IDで検索
    const requestIdCol = 1; // 依頼IDは1列目
    const slackChannelCol = 13; // SlackChannelIdは13列目
    const slackThreadUrlCol = 14; // SlackThreadUrlは14列目
    const slackThreadTsCol = 15; // SlackThreadTsは15列目
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][requestIdCol - 1] === requestId) {
        const rowIndex = i + 1; // 1始まりに変換
        sheet.getRange(rowIndex, slackChannelCol).setValue(channelId);
        sheet.getRange(rowIndex, slackThreadUrlCol).setValue(threadUrl);
        sheet.getRange(rowIndex, slackThreadTsCol).setValue(threadTs);
        
        Logger.log(`Slackスレッド情報を保存しました: ${requestId}`);
        return;
      }
    }
    
    Logger.log(`依頼IDが見つかりません: ${requestId}`);
  } catch (e) {
    Logger.log('Slackスレッド情報保存エラー: ' + e.toString());
  }
}

/**
 * 対応履歴とSlackスレッドを連携
 * @param {string} correspondenceId - 対応ID
 * @param {string} slackThreadUrl - SlackスレッドURL
 */
function linkCorrespondenceToSlack(correspondenceId, slackThreadUrl) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('問い合わせ対応履歴');
    
    if (!sheet) {
      Logger.log('問い合わせ対応履歴シートが見つかりません');
      return;
    }
    
    const data = getSheetDataOptimized(sheet);
    
    // 対応IDで検索
    const correspondenceIdCol = 1; // 対応IDは1列目
    const relatedUrlCol = 7; // 関連URLは7列目
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][correspondenceIdCol - 1] === correspondenceId) {
        const rowIndex = i + 1; // 1始まりに変換
        sheet.getRange(rowIndex, relatedUrlCol).setValue(slackThreadUrl);
        
        Logger.log(`対応履歴とSlackスレッドを連携しました: ${correspondenceId}`);
        return;
      }
    }
    
    Logger.log(`対応IDが見つかりません: ${correspondenceId}`);
  } catch (e) {
    Logger.log('対応履歴とSlack連携エラー: ' + e.toString());
  }
}

/**
 * ナレッジベースに追加
 * @param {string} title - タイトル
 * @param {string} category - カテゴリ
 * @param {string} content - 内容
 * @param {Array<string>} relatedRequestIds - 関連依頼ID
 * @param {Array<string>} tags - タグ
 * @return {Object} 保存結果
 */
function addToKnowledgeBase(title, category, content, relatedRequestIds = [], tags = []) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('ナレッジベース');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createKnowledgeBaseSheet(spreadsheetId);
    }
    
    const knowledgeId = Utilities.getUuid();
    const now = new Date();
    
    const rowData = [
      knowledgeId, // ナレッジID
      title, // タイトル
      category || '', // カテゴリ
      content, // 内容
      relatedRequestIds.join(', '), // 関連依頼ID
      tags.join(', '), // タグ
      now, // 作成日
      now, // 更新日
      0, // 参照回数
      true // 公開
    ];
    
    sheet.appendRow(rowData);
    
    Logger.log(`ナレッジベースに追加しました: ${knowledgeId}`);
    
    return {
      success: true,
      knowledgeId: knowledgeId,
      message: 'ナレッジベースに追加しました'
    };
  } catch (e) {
    Logger.log('ナレッジベース追加エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * ナレッジベースシートを作成
 * @param {string} spreadsheetId - スプレッドシートID
 * @return {Sheet} 作成したシート
 */
function createKnowledgeBaseSheet(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.insertSheet('ナレッジベース');
  
  // ヘッダー行を設定
  const headers = [
    'ナレッジID',
    'タイトル',
    'カテゴリ',
    '内容',
    '関連依頼ID',
    'タグ',
    '作成日',
    '更新日',
    '参照回数',
    '公開'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行を固定
  sheet.setFrozenRows(1);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 200); // ナレッジID
  sheet.setColumnWidth(2, 300); // タイトル
  sheet.setColumnWidth(3, 150); // カテゴリ
  sheet.setColumnWidth(4, 500); // 内容
  
  Logger.log('ナレッジベースシートを作成しました');
  
  return sheet;
}

/**
 * 日付をフォーマット
 * @param {Date|string} date - 日付
 * @return {string} フォーマットされた日付文字列
 */
function formatDate(date) {
  if (!date) {
    return '';
  }
  
  const d = date instanceof Date ? date : new Date(date);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

