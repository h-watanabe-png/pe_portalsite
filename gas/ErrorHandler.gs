/**
 * PEポータルサイト - エラーハンドリング
 * 
 * 統一的なエラーハンドリングとログ記録
 */

/**
 * エラーハンドリング付きで関数を実行
 * @param {Function} fn - 実行する関数
 * @param {string} context - コンテキスト（関数名など）
 * @return {Object} 実行結果
 */
function executeWithErrorHandling(fn, context = 'unknown') {
  try {
    const result = fn();
    return {
      success: true,
      data: result
    };
  } catch (e) {
    const errorMessage = e.toString();
    Logger.log(`[${context}] エラー: ${errorMessage}`);
    Logger.log(`[${context}] スタック: ${e.stack}`);
    
    // エラーログをスプレッドシートに記録（オプション）
    logError(context, errorMessage, e.stack);
    
    return {
      success: false,
      error: errorMessage,
      context: context
    };
  }
}

/**
 * エラーログを記録
 * @param {string} context - コンテキスト
 * @param {string} errorMessage - エラーメッセージ
 * @param {string} stack - スタックトレース
 */
function logError(context, errorMessage, stack) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheetName = 'エラーログ';
    
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      // シートが存在しない場合は作成（オプション）
      return;
    }
    
    // エラーログを追加
    sheet.appendRow([
      new Date(),
      context,
      errorMessage,
      stack
    ]);
  } catch (e) {
    // エラーログの記録に失敗した場合はLoggerのみ
    Logger.log('エラーログの記録に失敗: ' + e.toString());
  }
}

/**
 * ユーザーフレンドリーなエラーメッセージを生成
 * @param {Error} error - エラーオブジェクト
 * @return {string} ユーザーフレンドリーなエラーメッセージ
 */
function getUserFriendlyErrorMessage(error) {
  const errorMessage = error.toString();
  
  // GASの一般的なエラーメッセージをユーザーフレンドリーに変換
  if (errorMessage.includes('Exceeded maximum execution time')) {
    return '処理に時間がかかりすぎました。しばらく待ってから再試行してください。';
  }
  
  if (errorMessage.includes('Service invoked too many times')) {
    return 'リクエストが多すぎます。しばらく待ってから再試行してください。';
  }
  
  if (errorMessage.includes('does not have permission')) {
    return 'アクセス権限がありません。管理者にお問い合わせください。';
  }
  
  if (errorMessage.includes('The caller does not have permission')) {
    return 'アクセス権限がありません。管理者にお問い合わせください。';
  }
  
  // デフォルトメッセージ
  return '処理中にエラーが発生しました。しばらく待ってから再試行してください。';
}

