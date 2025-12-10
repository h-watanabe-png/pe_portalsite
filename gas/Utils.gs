/**
 * PEポータルサイト - ユーティリティ関数
 * 
 * GASの制約を回避するための共通関数
 */

/**
 * 実行時間をチェックし、制限時間に近づいたら処理を中断
 * @param {Date} startTime - 処理開始時刻
 * @param {number} maxExecutionTimeMs - 最大実行時間（ミリ秒、デフォルト: 5分30秒）
 * @return {boolean} 続行可能かどうか
 */
function checkExecutionTime(startTime, maxExecutionTimeMs = 5.5 * 60 * 1000) {
  const elapsed = new Date().getTime() - startTime.getTime();
  return elapsed < maxExecutionTimeMs;
}

/**
 * チェックポイントを保存
 * @param {string} key - チェックポイントのキー
 * @param {Object} data - 保存するデータ
 */
function saveCheckpoint(key, data) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(`checkpoint_${key}`, JSON.stringify({
    data: data,
    timestamp: new Date().toISOString()
  }));
}

/**
 * チェックポイントを取得
 * @param {string} key - チェックポイントのキー
 * @return {Object|null} チェックポイントデータ
 */
function getCheckpoint(key) {
  const properties = PropertiesService.getScriptProperties();
  const checkpoint = properties.getProperty(`checkpoint_${key}`);
  
  if (!checkpoint) {
    return null;
  }
  
  try {
    return JSON.parse(checkpoint);
  } catch (e) {
    Logger.log('チェックポイント取得エラー: ' + e.toString());
    return null;
  }
}

/**
 * チェックポイントをクリア
 * @param {string} key - チェックポイントのキー
 */
function clearCheckpoint(key) {
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty(`checkpoint_${key}`);
}

/**
 * 次の実行をスケジュール
 * @param {string} functionName - 実行する関数名
 * @param {number} delayMs - 遅延時間（ミリ秒、デフォルト: 1分）
 */
function scheduleNextExecution(functionName, delayMs = 60 * 1000) {
  ScriptApp.newTrigger(functionName)
    .timeBased()
    .after(delayMs)
    .create();
  
  Logger.log(`${functionName} を ${delayMs}ms 後にスケジュールしました`);
}

/**
 * 指数バックオフ付きリトライ
 * @param {Function} fn - 実行する関数
 * @param {number} maxRetries - 最大リトライ回数（デフォルト: 3）
 * @param {number} initialDelayMs - 初期遅延時間（ミリ秒、デフォルト: 1000）
 * @return {*} 関数の戻り値
 */
function retryWithBackoff(fn, maxRetries = 3, initialDelayMs = 1000) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return fn();
    } catch (e) {
      attempt++;
      
      if (attempt >= maxRetries) {
        Logger.log(`リトライ上限に達しました: ${e.toString()}`);
        throw e;
      }
      
      // 指数バックオフ: 1秒、2秒、4秒...
      const waitTime = initialDelayMs * Math.pow(2, attempt - 1);
      Logger.log(`${waitTime}ms待機してからリトライします (試行 ${attempt}/${maxRetries})`);
      Utilities.sleep(waitTime);
    }
  }
}

/**
 * スプレッドシートのデータを一括取得（最適化版）
 * @param {Sheet} sheet - シートオブジェクト
 * @return {Array<Array>} データ配列
 */
function getSheetDataOptimized(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 0 || lastCol <= 0) {
    return [];
  }
  
  // 必要な範囲のみを一括取得
  return sheet.getRange(1, 1, lastRow, lastCol).getValues();
}

/**
 * スプレッドシートのデータを一括書き込み（最適化版）
 * @param {Sheet} sheet - シートオブジェクト
 * @param {Array<Array>} data - 書き込むデータ配列
 * @param {number} startRow - 開始行（デフォルト: 1）
 * @param {number} startCol - 開始列（デフォルト: 1）
 */
function setSheetDataOptimized(sheet, data, startRow = 1, startCol = 1) {
  if (!data || data.length === 0) {
    return;
  }
  
  const numRows = data.length;
  const numCols = data[0].length;
  
  // 一括書き込み
  sheet.getRange(startRow, startCol, numRows, numCols).setValues(data);
}

/**
 * キャッシュからデータを取得、なければ計算してキャッシュに保存
 * @param {string} cacheKey - キャッシュキー
 * @param {Function} computeFunction - データを計算する関数
 * @param {number} expirationSeconds - 有効期限（秒、デフォルト: 300）
 * @return {*} キャッシュされたデータ
 */
function getCachedData(cacheKey, computeFunction, expirationSeconds = 300) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // キャッシュが壊れている場合は再計算
    }
  }
  
  // キャッシュがない場合は計算
  const data = computeFunction();
  
  // キャッシュに保存
  cache.put(cacheKey, JSON.stringify(data), expirationSeconds);
  
  return data;
}

/**
 * ロック付きで処理を実行
 * @param {Function} processFunction - 実行する処理
 * @param {number} timeoutMs - ロック取得のタイムアウト（ミリ秒、デフォルト: 30000）
 * @return {Object} 処理結果
 */
function executeWithLock(processFunction, timeoutMs = 30000) {
  const lock = LockService.getDocumentLock();
  
  try {
    if (lock.tryLock(timeoutMs)) {
      try {
        const result = processFunction();
        return { success: true, data: result };
      } finally {
        lock.releaseLock();
      }
    } else {
      return {
        success: false,
        error: '他の処理が実行中です。しばらく待ってから再試行してください。'
      };
    }
  } catch (e) {
    Logger.log('ロック処理エラー: ' + e.toString());
    return {
      success: false,
      error: '処理中にエラーが発生しました。'
    };
  }
}

/**
 * バッチ処理の実装
 * @param {Array} items - 処理するアイテムの配列
 * @param {Function} processItem - アイテムを処理する関数
 * @param {number} batchSize - バッチサイズ（デフォルト: 50）
 * @param {Date} startTime - 処理開始時刻
 * @return {Object} 処理結果
 */
function processBatch(items, processItem, batchSize = 50, startTime = new Date()) {
  const results = [];
  const maxExecutionTime = 5 * 60 * 1000; // 5分
  
  for (let i = 0; i < items.length; i += batchSize) {
    // 実行時間チェック
    if (!checkExecutionTime(startTime, maxExecutionTime)) {
      // 残りの処理を次の実行に委譲
      const remaining = items.slice(i);
      scheduleNextExecution('processBatch', 60 * 1000);
      
      return {
        success: true,
        processed: results.length,
        total: items.length,
        message: '処理を継続中です。しばらくお待ちください。'
      };
    }
    
    // バッチ処理
    const batch = items.slice(i, i + batchSize);
    const batchResults = batch.map(item => processItem(item));
    results.push(...batchResults);
  }
  
  return {
    success: true,
    processed: results.length,
    total: items.length,
    data: results
  };
}

