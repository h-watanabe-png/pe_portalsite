/**
 * PEポータルサイト - リクエストハンドラー
 * 
 * フォーム送信やステータス更新などのリクエストを処理
 */

/**
 * 依頼送信を処理
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleSubmitRequest(e) {
  try {
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'アクセス権限がありません'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // リクエストデータを取得
    const requestType = e.parameter.requestType; // 'system_team' または 'accounting'
    const requestData = JSON.parse(e.postData.contents || '{}');
    
    // データ検証
    if (!validateRequestData(requestData, requestType)) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'データの検証に失敗しました'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // スプレッドシートに保存
    const requestId = saveRequest(requestData, requestType, authResult.userEmail);
    
    // 通知送信（非同期、エラーが発生しても処理は継続）
    try {
      sendNotificationAsync(requestId, requestType);
    } catch (e) {
      Logger.log('通知送信エラー（処理は継続）: ' + e.toString());
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      requestId: requestId,
      message: '依頼を送信しました。'
    }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    Logger.log('handleSubmitRequest エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: '処理中にエラーが発生しました'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ステータス更新を処理
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleUpdateStatus(e) {
  try {
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'アクセス権限がありません'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // リクエストデータを取得
    const requestId = e.parameter.requestId;
    const status = e.parameter.status;
    const memo = e.parameter.memo || '';
    
    if (!requestId || !status) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'リクエストIDとステータスが必要です'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ステータスを更新
    const success = updateRequestStatus(requestId, status, memo, authResult.userEmail);
    
    if (success) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'ステータスを更新しました。'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'ステータスの更新に失敗しました'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
      
  } catch (e) {
    Logger.log('handleUpdateStatus エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: '処理中にエラーが発生しました'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * リクエストデータを検証
 * @param {Object} data - リクエストデータ
 * @param {string} requestType - リクエストタイプ
 * @return {boolean} 検証結果
 */
function validateRequestData(data, requestType) {
  // 基本的な検証
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // リクエストタイプに応じた検証
  if (requestType === 'system_team') {
    // システムチーム依頼の必須項目
    return !!(data.requesterName && data.brand && data.issue);
  } else if (requestType === 'accounting') {
    // 経理依頼の必須項目
    return !!(data.requesterName && data.brand && data.requestContent);
  }
  
  return false;
}

/**
 * 依頼をスプレッドシートに保存
 * @param {Object} data - リクエストデータ
 * @param {string} requestType - リクエストタイプ
 * @param {string} userEmail - ユーザーメールアドレス
 * @return {string} リクエストID
 */
function saveRequest(data, requestType, userEmail) {
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheetName = requestType === 'system_team' 
    ? '依頼_システムチーム' 
    : '依頼_経理';
  
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  
  // リクエストIDを生成
  const requestId = Utilities.getUuid();
  const now = new Date();
  
  // データを配列に変換
  const rowData = [
    now, // 送信日時
    data.requesterName || userEmail, // 依頼者氏名
    data.brand || '', // ブランド
    data.urgency || '中', // 緊急度
    data.desiredDate || '', // 対応希望日
    data.householdId || '', // 世帯ID
    data.studentNumber || '', // 生徒番号
    data.selectionNumber || '', // 選考番号
    data.issue || data.requestContent || '', // 発生している問題 / 依頼内容詳細
    data.desiredAction || '', // 希望の対応
    data.frequency || '', // 発生頻度
    data.errorMessage || data.relatedUrl || '', // エラー文・URL / 関連URL
    data.hasAttachment ? 'あり' : 'なし', // ファイル添付
    '新規', // ステータス
    '', // 担当者
    '', // 完了日
    data.memo || '', // 備考
    '', // ファイルURL
    '', // 通知送信日時
    now // 更新日時
  ];
  
  // 一括書き込み（最適化）
  sheet.appendRow(rowData);
  
  // 統合管理シートにも追加
  addToIntegratedManagement(requestId, requestType, data, userEmail, now);
  
  return requestId;
}

/**
 * 統合管理シートに追加
 * @param {string} requestId - リクエストID
 * @param {string} requestType - リクエストタイプ
 * @param {Object} data - リクエストデータ
 * @param {string} userEmail - ユーザーメールアドレス
 * @param {Date} now - 現在日時
 */
function addToIntegratedManagement(requestId, requestType, data, userEmail, now) {
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_統合管理');
  
  const rowData = [
    requestId, // 依頼ID
    now, // 受付日
    requestType === 'system_team' ? 'システムチーム' : '経理', // 依頼元
    data.brand || '', // ブランド
    data.requesterName || userEmail, // 依頼者
    data.issue || data.requestContent || '', // 要約
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheet.getSheetId()}`, // 元データURL
    '', // 担当者
    '新規', // 状態
    data.urgency || '中', // 優先度
    data.desiredDate || '', // 期限
    '', // 重要メモ
    '', // SlackChannelId
    '', // SlackThreadUrl
    '', // SlackThreadTs
    '', // 最終通知日時
    '', // 手動通知テキスト
    false, // 手動通知送信
    userEmail, // 最終更新者
    now // 最終更新日時
  ];
  
  sheet.appendRow(rowData);
}

/**
 * ステータスを更新
 * @param {string} requestId - リクエストID
 * @param {string} status - 新しいステータス
 * @param {string} memo - メモ
 * @param {string} userEmail - ユーザーメールアドレス
 * @return {boolean} 更新成功かどうか
 */
function updateRequestStatus(requestId, status, memo, userEmail) {
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_統合管理');
  
  const data = getSheetDataOptimized(sheet);
  
  // リクエストIDで検索
  const requestIdCol = 1; // 依頼IDは1列目
  const statusCol = 9; // 状態は9列目
  const memoCol = 12; // 重要メモは12列目
  const updatedByCol = 19; // 最終更新者は19列目
  const updatedAtCol = 20; // 最終更新日時は20列目
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][requestIdCol - 1] === requestId) {
      // ステータスを更新
      const rowIndex = i + 1; // 1始まりに変換
      sheet.getRange(rowIndex, statusCol).setValue(status);
      if (memo) {
        sheet.getRange(rowIndex, memoCol).setValue(memo);
      }
      sheet.getRange(rowIndex, updatedByCol).setValue(userEmail);
      sheet.getRange(rowIndex, updatedAtCol).setValue(new Date());
      
      return true;
    }
  }
  
  return false;
}

/**
 * 通知を非同期で送信（トリガーを使用）
 * @param {string} requestId - リクエストID
 * @param {string} requestType - リクエストタイプ
 */
function sendNotificationAsync(requestId, requestType) {
  // 通知データをPropertiesServiceに保存
  PropertiesService.getScriptProperties()
    .setProperty(`notification_${requestId}`, JSON.stringify({
      requestId: requestId,
      requestType: requestType,
      timestamp: new Date().toISOString()
    }));
  
  // 通知処理をトリガー（1秒後）
  ScriptApp.newTrigger('processNotification')
    .timeBased()
    .after(1 * 1000)
    .create();
}

/**
 * 通知を処理（トリガーから呼び出される）
 */
function processNotification() {
  // 通知データを取得
  const properties = PropertiesService.getScriptProperties();
  const notificationKeys = properties.getKeys().filter(key => key.startsWith('notification_'));
  
  if (notificationKeys.length === 0) {
    return;
  }
  
  // 最初の通知を処理
  const key = notificationKeys[0];
  const notificationData = JSON.parse(properties.getProperty(key));
  
  try {
    // 通知を送信（Slack等）
    // 実装は後で追加
    
    // 通知データを削除
    properties.deleteProperty(key);
    
    Logger.log(`通知を送信しました: ${notificationData.requestId}`);
  } catch (e) {
    Logger.log('通知送信エラー: ' + e.toString());
  }
}

