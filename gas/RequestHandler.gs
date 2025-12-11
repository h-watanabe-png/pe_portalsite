/**
 * PEポータルサイト - リクエストハンドラー
 * 
 * フォーム送信やステータス更新などのリクエストを処理
 */

/**
 * 依頼送信を処理（doPost経由）
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
    let requestType, requestData;
    
    if (e.parameter && e.parameter.requestType) {
      // URLパラメータから取得
      requestType = e.parameter.requestType;
      requestData = e.postData ? JSON.parse(e.postData.contents || '{}') : {};
    } else if (e.postData && e.postData.contents) {
      // POSTデータから取得
      const postData = JSON.parse(e.postData.contents);
      requestType = postData.requestType || 'system_team';
      requestData = postData.data || postData;
      
      // 自動仕分け機能（requestTypeが指定されていない場合）
      if (!postData.requestType && requestData.issue) {
        const classification = classifyRequest(
          requestData.issue || '',
          requestData.requestTypeDetail || '',
          requestData.brand || '',
          requestData.householdId || '',
          requestData.studentNumber || '',
          requestData.selectionNumber || '',
          requestData.teacherNumber || ''
        );
        
        // 信頼度が高い場合（0.7以上）は自動仕分け、それ以外はユーザーに確認
        if (classification.confidence >= 0.7) {
          requestType = classification.suggestedType;
          requestData.autoClassified = true;
          requestData.classificationResult = classification;
          requestData.needsFeedback = true; // フィードバックを求めるフラグ
        } else {
          // 信頼度が低い場合は、ユーザーに確認を求める
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            needsConfirmation: true,
            classificationResult: classification,
            message: '依頼先を自動判定できませんでした。システムチームまたは経理を選択してください。'
          }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    } else {
      // 直接呼び出しの場合（google.script.run経由）
      requestType = e.requestType || 'system_team';
      requestData = e;
    }
    
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
    
    // Slack通知を送信（拡張版）
    try {
      const slackResult = sendSlackNotificationEnhanced({
        requestId: requestId,
        requesterName: requestData.requesterName || authResult.userEmail,
        brand: requestData.brand || '',
        urgency: requestData.urgency || '中',
        issue: requestData.issue || requestData.requestContent || '',
        requestId: requestId
      }, 'new_request', requestType);
      
      if (slackResult && slackResult.success) {
        Logger.log(`Slack通知を送信しました: ${requestId}`);
      }
    } catch (e) {
      Logger.log('Slack通知送信エラー（処理は継続）: ' + e.toString());
    }
    
    // レスポンスを作成
    const response = {
      success: true,
      requestId: requestId,
      message: '依頼を送信しました。'
    };
    
    // 自動仕分けされた場合は、フィードバック情報を含める
    if (requestData.needsFeedback && requestData.classificationResult) {
      response.needsFeedback = true;
      response.classificationResult = requestData.classificationResult;
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
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
    return !!(data.requesterName && data.brand && data.requestTypeDetail && data.urgency && data.issue);
  } else if (requestType === 'accounting') {
    // 経理依頼の必須項目
    return !!(data.requesterName && data.brand && data.requestTypeDetail && data.urgency && data.issue);
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
    data.requestTypeDetail || '', // 依頼種別（詳細）
    data.urgency || '中', // 緊急度
    data.desiredDate || '', // 対応希望日
    data.householdId || '', // 世帯ID
    data.studentNumber || '', // 生徒番号
    data.selectionNumber || '', // 選考番号
    data.teacherNumber || '', // 教師番号（新規追加）
    data.requestMonth || '', // 請求月（経理のみ、新規追加）
    data.amount || '', // 金額（経理のみ、新規追加）
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
  
  // スナップショットキャッシュを無効化
  invalidateSnapshotCache('依頼_統合管理');
  invalidateSnapshotCache(sheetName);
  
  // レスポンスに自動仕分け情報を含める
  const response = {
    success: true,
    requestId: requestId,
    message: '依頼を送信しました'
  };
  
  if (requestData.autoClassified && requestData.classificationResult) {
    response.needsFeedback = true;
    response.classificationResult = requestData.classificationResult;
  }
  
  return response;
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
      
      // スナップショットキャッシュを無効化
      invalidateSnapshotCache('依頼_統合管理');
      
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

/**
 * 依頼内容を自動仕分け（フロントエンドから呼び出し）
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleClassifyRequest(e) {
  try {
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'アクセス権限がありません'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const postData = JSON.parse(e.postData.contents || '{}');
    
    const classification = classifyRequest(
      postData.issue || '',
      postData.requestTypeDetail || '',
      postData.brand || '',
      postData.householdId || '',
      postData.studentNumber || '',
      postData.selectionNumber || '',
      postData.teacherNumber || ''
    );
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      classification: classification
    }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    Logger.log('handleClassifyRequest エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: '自動仕分け中にエラーが発生しました'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 推奨項目を取得（フロントエンドから呼び出し）
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleGetRecommendedFields(e) {
  try {
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'アクセス権限がありません'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const postData = JSON.parse(e.postData.contents || '{}');
    
    const recommendations = getRecommendedFields(
      postData.requestType || 'system_team',
      postData.requestTypeDetail || ''
    );
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      recommendations: recommendations
    }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    Logger.log('handleGetRecommendedFields エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: '推奨項目の取得中にエラーが発生しました'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 自分の依頼一覧を取得
 * @return {Object} 依頼一覧データ
 */
function getMyRequests() {
  try {
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return {
        success: false,
        error: 'アクセス権限がありません'
      };
    }
    
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_統合管理');
    
    if (!sheet) {
      return {
        success: true,
        requests: []
      };
    }
    
    const data = getSheetDataOptimized(sheet);
    
    if (data.length <= 1) {
      return {
        success: true,
        requests: []
      };
    }
    
    // 現在のユーザーを取得
    const currentUser = Session.getActiveUser().getEmail();
    const userPrefix = currentUser.split('@')[0];
    
    // ヘッダー行をスキップ
    const rows = data.slice(1);
    
    // 自分の依頼をフィルタリング
    const myRequests = rows
      .filter(row => {
        const requester = row[4]; // 依頼者列（インデックス4）
        return requester && requester.toString().includes(userPrefix);
      })
      .map(row => ({
        requestId: row[0] || '', // 依頼ID
        requestDate: row[1] || new Date(), // 受付日
        requestType: row[2] === 'システムチーム' ? 'system_team' : 
                     row[2] === '経理' ? 'accounting' : 'unknown', // 依頼種別
        brand: row[3] || '', // ブランド
        requester: row[4] || '', // 依頼者
        summary: row[5] || '', // 要約
        status: row[8] || '未設定', // 状態
        urgency: row[9] || '低' // 緊急度（優先度）
      }))
      .sort((a, b) => {
        // 受付日でソート（新しい順）
        const dateA = a.requestDate instanceof Date ? a.requestDate : new Date(a.requestDate);
        const dateB = b.requestDate instanceof Date ? b.requestDate : new Date(b.requestDate);
        return dateB - dateA;
      });
    
    return {
      success: true,
      requests: myRequests
    };
  } catch (e) {
    Logger.log('getMyRequests エラー: ' + e.toString());
    return {
      success: false,
      error: 'データの取得に失敗しました'
    };
  }
}

