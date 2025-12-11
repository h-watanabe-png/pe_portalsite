/**
 * PEポータルサイト - 認証・認可
 * 
 * ユーザー認証とアクセス制御を管理
 */

/**
 * 認証チェック（ドメイン制限とホワイトリスト）
 * @return {Object} 認証結果
 */
function checkAuthorization() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    if (!email) {
      return {
        authorized: false,
        userEmail: '',
        reason: 'ログインしていません'
      };
    }
    
    // ドメイン制限チェック
    const allowedDomain = '@tomonokai-corp.com';
    if (email.endsWith(allowedDomain)) {
      return {
        authorized: true,
        userEmail: email,
        reason: ''
      };
    }
    
    // ホワイトリストチェック
    const whitelist = getWhitelist();
    if (whitelist.includes(email)) {
      return {
        authorized: true,
        userEmail: email,
        reason: ''
      };
    }
    
    // アクセス拒否
    return {
      authorized: false,
      userEmail: email,
      reason: 'アクセス権限がありません。会社ドメイン（@tomonokai-corp.com）のアカウント、またはホワイトリストに登録されたアカウントのみアクセス可能です。'
    };
  } catch (e) {
    Logger.log('認証チェックエラー: ' + e.toString());
    return {
      authorized: false,
      userEmail: '',
      reason: '認証チェック中にエラーが発生しました: ' + e.toString()
    };
  }
}

/**
 * ホワイトリストを取得
 * @return {Array<string>} ホワイトリスト（メールアドレスの配列）
 */
function getWhitelist() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('ユーザーホワイトリスト');
    
    if (!sheet) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const whitelist = [];
    
    // ヘッダー行をスキップして、メールアドレス列（1列目）を取得
    for (let i = 1; i < data.length; i++) {
      const email = data[i][0];
      if (email && typeof email === 'string' && email.includes('@')) {
        whitelist.push(email.trim());
      }
    }
    
    return whitelist;
  } catch (e) {
    Logger.log('ホワイトリスト取得エラー: ' + e.toString());
    return [];
  }
}

/**
 * アクセスログを記録
 * @param {string} action - アクション名
 * @param {Object} details - 詳細情報
 */
function logAccess(action, details) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('アクセスログ');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createAccessLogSheet(spreadsheetId);
    }
    
    const now = new Date();
    const rowData = [
      now, // アクセス日時
      action || '', // アクション
      details.userEmail || '', // ユーザーメールアドレス
      details.authorized ? '許可' : '拒否', // 認証結果
      details.path || details.action || '', // パス/アクション
      details.clientIP || '' // IPアドレス
    ];
    
    sheet.appendRow(rowData);
  } catch (e) {
    Logger.log('アクセスログ記録エラー: ' + e.toString());
  }
}

/**
 * アクセスログシートを作成
 * @param {string} spreadsheetId - スプレッドシートID
 * @return {Sheet} 作成したシート
 */
function createAccessLogSheet(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.insertSheet('アクセスログ');
  
  // ヘッダー行を設定
  const headers = [
    'アクセス日時',
    'アクション',
    'ユーザーメールアドレス',
    '認証結果',
    'パス/アクション',
    'IPアドレス'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行を固定
  sheet.setFrozenRows(1);
  
  Logger.log('アクセスログシートを作成しました');
  return sheet;
}

/**
 * ユーザー情報を取得
 * @return {Object} ユーザー情報
 */
function getUserInfo() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    const authResult = checkAuthorization();
    
    return {
      success: true,
      email: email,
      authorized: authResult.authorized,
      reason: authResult.reason || ''
    };
  } catch (e) {
    Logger.log('getUserInfo エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}
