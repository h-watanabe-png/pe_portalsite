/**
 * PEポータルサイト - 認証・認可システム
 * 
 * Google OAuth + ホワイトリスト方式による認証・認可
 */

/**
 * 認証・認可チェック関数
 * @return {Object} {authorized: boolean, userEmail: string, reason: string, authMethod: string}
 */
function checkAuthorization() {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    if (!userEmail) {
      return {
        authorized: false,
        userEmail: null,
        reason: 'ユーザーがログインしていません。Googleアカウントでログインしてください。',
        authMethod: 'google_oauth'
      };
    }
    
    // 会社ドメインのチェック
    const companyDomain = '@tomonokai-corp.com';
    if (userEmail.endsWith(companyDomain)) {
      return {
        authorized: true,
        userEmail: userEmail,
        reason: '会社ドメインのユーザー',
        authMethod: 'google_oauth'
      };
    }
    
    // ホワイトリストのチェック
    const whitelist = getWhitelistEmails();
    if (whitelist.includes(userEmail)) {
      return {
        authorized: true,
        userEmail: userEmail,
        reason: 'ホワイトリストに登録されたユーザー',
        authMethod: 'google_oauth'
      };
    }
    
    return {
      authorized: false,
      userEmail: userEmail,
      reason: 'アクセス権限がありません。管理者にお問い合わせください。',
      authMethod: 'google_oauth'
    };
  } catch (e) {
    Logger.log('認証チェックエラー: ' + e.toString());
    return {
      authorized: false,
      userEmail: null,
      reason: '認証チェック中にエラーが発生しました。',
      authMethod: 'google_oauth'
    };
  }
}

/**
 * ホワイトリストを取得（スプレッドシートから読み込み、キャッシュ付き）
 * @return {Array<string>} 許可されたメールアドレスの配列
 */
function getWhitelistEmails() {
  // キャッシュから取得を試みる
  const cache = CacheService.getScriptCache();
  const cacheKey = 'whitelist_emails';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // キャッシュが壊れている場合は再取得
    }
  }
  
  // スプレッドシートから取得
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheetName = 'システム設定';
  
  try {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('システム設定シートが見つかりません');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    
    // ホワイトリストの設定項目を探す
    const whitelistRow = data.find(row => row[0] === '外部ユーザーホワイトリスト');
    if (whitelistRow && whitelistRow[1]) {
      // カンマ区切りでメールアドレスを分割
      const emails = whitelistRow[1]
        .split(',')
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));
      
      // キャッシュに保存（有効期限: 5分）
      cache.put(cacheKey, JSON.stringify(emails), 300);
      
      return emails;
    }
    
    return [];
  } catch (e) {
    Logger.log('ホワイトリスト取得エラー: ' + e.toString());
    return [];
  }
}

/**
 * ホワイトリストを更新（管理者用）
 * @param {Array<string>} emails - 追加するメールアドレスの配列
 * @return {Object} 更新結果
 */
function updateWhitelist(emails) {
  try {
    // 認証チェック（管理者のみ）
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return {
        success: false,
        error: 'アクセス権限がありません'
      };
    }
    
    // 管理者チェック（会社ドメインのみ）
    if (!authResult.userEmail.endsWith('@tomonokai-corp.com')) {
      return {
        success: false,
        error: '管理者のみがホワイトリストを更新できます'
      };
    }
    
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheetName = 'システム設定';
    
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    
    // ホワイトリストの設定項目を探す
    let whitelistRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === '外部ユーザーホワイトリスト') {
        whitelistRowIndex = i + 1; // 1始まりに変換
        break;
      }
    }
    
    // 既存のホワイトリストを取得
    const existingEmails = getWhitelistEmails();
    
    // 新しいメールアドレスを追加（重複を除去）
    const allEmails = [...new Set([...existingEmails, ...emails])];
    const whitelistValue = allEmails.join(', ');
    
    if (whitelistRowIndex > 0) {
      // 既存の行を更新
      sheet.getRange(whitelistRowIndex, 2).setValue(whitelistValue);
    } else {
      // 新しい行を追加
      sheet.appendRow(['外部ユーザーホワイトリスト', whitelistValue, 'アクセスを許可する外部メールアドレス（カンマ区切り）', '手動']);
    }
    
    // キャッシュをクリア
    const cache = CacheService.getScriptCache();
    cache.remove('whitelist_emails');
    
    Logger.log(`ホワイトリストを更新しました: ${allEmails.length}件`);
    
    return {
      success: true,
      message: `ホワイトリストを更新しました（${allEmails.length}件）`,
      emails: allEmails
    };
  } catch (e) {
    Logger.log('ホワイトリスト更新エラー: ' + e.toString());
    return {
      success: false,
      error: 'ホワイトリストの更新に失敗しました: ' + e.toString()
    };
  }
}

/**
 * 現在のユーザー情報を取得
 * @return {Object} ユーザー情報
 */
function getCurrentUser() {
  try {
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();
    
    if (!userEmail) {
      return {
        authenticated: false,
        email: null,
        name: null
      };
    }
    
    return {
      authenticated: true,
      email: userEmail,
      name: user.getName(),
      isCompanyDomain: userEmail.endsWith('@tomonokai-corp.com'),
      isWhitelisted: getWhitelistEmails().includes(userEmail)
    };
  } catch (e) {
    Logger.log('ユーザー情報取得エラー: ' + e.toString());
    return {
      authenticated: false,
      email: null,
      name: null
    };
  }
}

/**
 * アクセスログを記録
 * @param {string} action - アクション名
 * @param {Object} details - 詳細情報
 */
function logAccess(action, details = {}) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheetName = 'アクセスログ';
    
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    
    // シートが存在しない場合は作成（オプション）
    if (!sheet) {
      // アクセスログシートは後で作成するため、ここではLoggerのみ
      Logger.log(`[アクセスログ] ${action}: ${JSON.stringify(details)}`);
      return;
    }
    
    const user = Session.getActiveUser();
    const userEmail = user.getEmail() || 'unknown';
    
    // アクセスログを追加
    sheet.appendRow([
      new Date(),
      userEmail,
      action,
      JSON.stringify(details)
    ]);
    
    // ログが多くなりすぎないように、古いログを削除（オプション）
    const lastRow = sheet.getLastRow();
    if (lastRow > 1000) {
      // 1000行を超えたら古いログを削除
      sheet.deleteRows(2, lastRow - 1000);
    }
  } catch (e) {
    // ログ記録に失敗しても処理は継続
    Logger.log('アクセスログ記録エラー: ' + e.toString());
  }
}

