/**
 * PEポータルサイト - 設定管理
 * 
 * システム全体の設定値を管理します。
 */

/**
 * 設定を取得（キャッシュ付き）
 * @return {Object} 設定オブジェクト
 */
function getConfig() {
  // キャッシュから取得を試みる
  const cached = getCachedData('system_config', () => {
    return loadConfigFromSpreadsheet();
  }, 300); // 5分間キャッシュ
  
  return cached;
}

/**
 * スプレッドシートから設定を読み込む
 * @return {Object} 設定オブジェクト
 */
function loadConfigFromSpreadsheet() {
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('システム設定');
  const data = sheet.getDataRange().getValues();
  
  const config = {
    system: {},
    slack: {},
    notebooklm: {}
  };
  
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const value = data[i][1];
    
    if (!key) continue;
    
    // キーに基づいて分類
    if (key.startsWith('Slack')) {
      const slackKey = key.replace('Slack', '').replace(/^_/, '');
      config.slack[slackKey.toLowerCase()] = value;
    } else if (key.startsWith('NotebookLM')) {
      const notebooklmKey = key.replace('NotebookLM', '').replace(/^_/, '');
      config.notebooklm[notebooklmKey.toLowerCase()] = value;
    } else {
      config.system[key] = value;
    }
  }
  
  // デフォルト値を設定
  if (!config.slack.webhookurl) {
    config.slack.webhookurl = '';
  }
  if (!config.slack.channel) {
    config.slack.channel = '';
  }
  if (!config.notebooklm.enabled) {
    config.notebooklm.enabled = false;
  }
  
  return config;
}

/**
 * 設定を更新（管理者用）
 * @param {string} key - 設定キー
 * @param {string} value - 設定値
 * @return {Object} 更新結果
 */
function updateConfig(key, value) {
  try {
    // 認証チェック（管理者のみ）
    const authResult = checkAuthorization();
    if (!authResult.authorized || !authResult.userEmail.endsWith('@tomonokai-corp.com')) {
      return {
        success: false,
        error: '管理者のみが設定を更新できます'
      };
    }
    
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('システム設定');
    const data = sheet.getDataRange().getValues();
    
    // 設定項目を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        
        // キャッシュをクリア
        CacheService.getScriptCache().remove('system_config');
        
        Logger.log(`設定を更新しました: ${key} = ${value}`);
        
        return {
          success: true,
          message: '設定を更新しました'
        };
      }
    }
    
    // 設定項目が見つからない場合は追加
    sheet.appendRow([key, value, '', '手動']);
    
    // キャッシュをクリア
    CacheService.getScriptCache().remove('system_config');
    
    return {
      success: true,
      message: '設定を追加しました'
    };
  } catch (e) {
    Logger.log('設定更新エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}
