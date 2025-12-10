/**
 * PEポータルサイト - メイン処理
 * 
 * メイン処理を管理します。
 */

/**
 * Web Appのメインエントリーポイント
 * @param {Object} e - リクエストパラメータ
 * @return {HtmlOutput} HTML出力
 */
function doGet(e) {
  // 認証チェック
  const authResult = checkAuthorization();
  
  // アクセスログを記録
  logAccess('doGet', {
    authorized: authResult.authorized,
    userEmail: authResult.userEmail,
    path: e.parameter.path || 'index'
  });
  
  if (!authResult.authorized) {
    // アクセス拒否ページを返す
    return HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>アクセス拒否 - PEポータルサイト</title>
        <style>
          body {
            font-family: 'Noto Sans JP', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 500px;
            text-align: center;
          }
          h1 {
            color: #d32f2f;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .contact {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .contact a {
            color: #1976d2;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ アクセス権限がありません</h1>
          <p>${authResult.reason}</p>
          <div class="contact">
            <p>お問い合わせ: <a href="mailto:h-watanabe@tomonokai-corp.com">h-watanabe@tomonokai-corp.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `)
      .setTitle('アクセス拒否 - PEポータルサイト')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  // 認証成功時は通常のページを返す
  const path = e.parameter.path || 'index';
  
  try {
    return HtmlService.createTemplateFromFile(path)
      .evaluate()
      .setTitle('PEポータルサイト')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    Logger.log('テンプレート読み込みエラー: ' + e.toString());
    // テンプレートが見つからない場合はindex.htmlを返す
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('PEポータルサイト')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * POSTリクエストのエントリーポイント
 * @param {Object} e - リクエストパラメータ
 * @return {HtmlOutput} HTML出力
 */
function doPost(e) {
  // 認証チェック
  const authResult = checkAuthorization();
  
  // アクセスログを記録
  logAccess('doPost', {
    authorized: authResult.authorized,
    userEmail: authResult.userEmail,
    action: e.parameter.action || 'unknown'
  });
  
  if (!authResult.authorized) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: authResult.reason
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // アクションに応じて処理を分岐
  const action = e.parameter.action;
  
  try {
    switch (action) {
      case 'submit_request':
        return handleSubmitRequest(e);
      case 'update_status':
        return handleUpdateStatus(e);
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: '不明なアクションです'
        }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (e) {
    Logger.log('doPost エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: '処理中にエラーが発生しました'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HTMLファイルのインクルード用
 * @param {string} filename - ファイル名
 * @return {string} ファイル内容
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * メニューを追加（スプレッドシートを開いた時）
 */
function onOpen() {
  // メニューを追加（必要に応じて）
  // 注意: Web Appでは実行されない
}

/**
 * メイン処理（テスト用）
 */
function main() {
  // メイン処理
  Logger.log('PEポータルサイト - メイン処理を開始');
}
