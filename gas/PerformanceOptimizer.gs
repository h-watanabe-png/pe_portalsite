/**
 * PEポータルサイト - パフォーマンス最適化
 * 
 * スプレッドシートとGASアプリの連動、動作速度、UI/UXを最適化
 */

/**
 * スプレッドシートのデータを効率的に取得（スナップショットキャッシュ優先）
 * @param {Sheet} sheet - シートオブジェクト
 * @param {number} cacheSeconds - キャッシュ有効期限（秒、デフォルト: 60）
 * @param {boolean} useSnapshot - スナップショットキャッシュを使用するか（デフォルト: true）
 * @return {Array<Array>} シートデータ
 */
function getSheetDataOptimized(sheet, cacheSeconds = 60, useSnapshot = true) {
  if (!sheet) {
    return [];
  }
  
  const sheetName = sheet.getName();
  
  // スナップショットキャッシュを優先的に使用
  if (useSnapshot) {
    const snapshot = getSnapshotFromCache(sheetName);
    if (snapshot && snapshot.data) {
      // ヘッダーとデータを結合して返す
      return [snapshot.headers, ...snapshot.data];
    }
  }
  
  // スナップショットがない場合は通常のキャッシュを使用
  const cacheKey = `sheet_data_${sheetName}`;
  const cached = getCachedData(cacheKey, () => {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow <= 1 || lastCol === 0) {
      return [];
    }
    
    // 一括取得（最適化）
    return sheet.getRange(1, 1, lastRow, lastCol).getValues();
  }, cacheSeconds);
  
  return cached || [];
}

/**
 * スプレッドシートのデータを一括書き込み（最適化版）
 * @param {Sheet} sheet - シートオブジェクト
 * @param {Array<Array>} data - 書き込むデータ配列
 * @param {number} startRow - 開始行（デフォルト: 1）
 * @param {number} startCol - 開始列（デフォルト: 1）
 */
function setSheetDataOptimized(sheet, data, startRow = 1, startCol = 1) {
  if (!data || data.length === 0 || !sheet) {
    return;
  }
  
  const numRows = data.length;
  const numCols = data[0].length;
  
  // 一括書き込み（1回のAPI呼び出し）
  sheet.getRange(startRow, startCol, numRows, numCols).setValues(data);
  
  // キャッシュを無効化（通常キャッシュとスナップショットキャッシュの両方）
  const sheetName = sheet.getName();
  const cacheKey = `sheet_data_${sheetName}`;
  CacheService.getScriptCache().remove(cacheKey);
  
  // スナップショットキャッシュも無効化
  invalidateSnapshotCache(sheetName);
}

/**
 * ページネーション対応のデータ取得（最適化版）
 * @param {Sheet} sheet - シートオブジェクト
 * @param {number} page - ページ番号（1始まり）
 * @param {number} pageSize - 1ページあたりの件数
 * @param {Object} filters - フィルタ条件（オプション）
 * @return {Object} ページネーション情報とデータ
 */
function getPaginatedData(sheet, page, pageSize, filters = {}) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return {
      rows: [],
      totalRows: 0,
      totalPages: 0,
      currentPage: page
    };
  }
  
  // 全データを取得（キャッシュ付き）
  const allData = getSheetDataOptimized(sheet);
  
  if (allData.length <= 1) {
    return {
      rows: [],
      totalRows: 0,
      totalPages: 0,
      currentPage: page
    };
  }
  
  // ヘッダー行を除く
  const headers = allData[0];
  let rows = allData.slice(1);
  
  // フィルタリング
  if (filters && Object.keys(filters).length > 0) {
    rows = rows.filter(row => {
      return Object.keys(filters).every(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex === -1) return true;
        const value = row[colIndex];
        const filterValue = filters[key];
        
        if (typeof filterValue === 'string') {
          return value && value.toString().includes(filterValue);
        } else if (Array.isArray(filterValue)) {
          return filterValue.includes(value);
        }
        return value === filterValue;
      });
    });
  }
  
  // ソート（受付日で降順）
  rows.sort((a, b) => {
    const dateA = a[1] instanceof Date ? a[1] : new Date(a[1]);
    const dateB = b[1] instanceof Date ? b[1] : new Date(b[1]);
    return dateB - dateA;
  });
  
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / pageSize);
  
  // ページネーション
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = rows.slice(startIndex, endIndex);
  
  return {
    rows: paginatedRows,
    totalRows: totalRows,
    totalPages: totalPages,
    currentPage: page
  };
}

/**
 * バッチリクエスト処理（複数のデータを一度に取得）
 * @param {Array<string>} requestTypes - リクエストタイプの配列
 * @return {Object} バッチデータ
 */
function getBatchData(requestTypes) {
  const result = {};
  
  // 並列処理（可能な限り）
  requestTypes.forEach(type => {
    try {
      switch (type) {
        case 'dashboard_stats':
          result.stats = calculateDashboardStats();
          break;
        case 'recent_requests':
          result.recentRequests = getRecentRequests(10);
          break;
        case 'deadline_calendar':
          result.deadlineCalendar = getDeadlineCalendar();
          break;
        case 'my_requests':
          result.myRequests = getMyRequests();
          break;
        default:
          Logger.log(`不明なリクエストタイプ: ${type}`);
      }
    } catch (e) {
      Logger.log(`${type} 取得エラー: ${e.toString()}`);
      result[type] = { error: e.toString() };
    }
  });
  
  return result;
}

/**
 * 非同期処理のキュー管理
 * @param {string} taskId - タスクID
 * @param {Function} taskFunction - 実行する関数
 * @param {Object} params - パラメータ
 */
function queueAsyncTask(taskId, taskFunction, params) {
  // タスクをPropertiesServiceに保存
  PropertiesService.getScriptProperties()
    .setProperty(`task_${taskId}`, JSON.stringify({
      function: taskFunction.name,
      params: params,
      timestamp: new Date().toISOString()
    }));
  
  // タスクをトリガー（1秒後）
  ScriptApp.newTrigger('processAsyncTask')
    .timeBased()
    .after(1 * 1000)
    .create();
}

/**
 * 非同期タスクを処理（トリガーから呼び出される）
 */
function processAsyncTask() {
  const properties = PropertiesService.getScriptProperties();
  const taskKeys = properties.getKeys().filter(key => key.startsWith('task_'));
  
  if (taskKeys.length === 0) {
    return;
  }
  
  // 最初のタスクを処理
  const key = taskKeys[0];
  const taskData = JSON.parse(properties.getProperty(key));
  
  try {
    // タスクを実行
    const taskFunction = eval(taskData.function);
    if (typeof taskFunction === 'function') {
      taskFunction.apply(null, taskData.params);
    }
    
    // タスクデータを削除
    properties.deleteProperty(key);
    
    Logger.log(`非同期タスクを処理しました: ${key}`);
  } catch (e) {
    Logger.log(`非同期タスク処理エラー: ${e.toString()}`);
  }
}

/**
 * レスポンス時間を計測
 * @param {Function} func - 計測する関数
 * @param {Array} args - 関数の引数
 * @return {Object} 実行結果と実行時間
 */
function measureExecutionTime(func, args = []) {
  const startTime = new Date().getTime();
  let result;
  let error;
  
  try {
    result = func.apply(null, args);
  } catch (e) {
    error = e.toString();
  }
  
  const endTime = new Date().getTime();
  const executionTime = endTime - startTime;
  
  return {
    result: result,
    error: error,
    executionTime: executionTime
  };
}

/**
 * データ更新の最適化（差分更新）
 * @param {Sheet} sheet - シートオブジェクト
 * @param {string} keyCol - キー列名
 * @param {string} keyValue - キー値
 * @param {Object} updates - 更新するデータ
 * @return {boolean} 更新成功かどうか
 */
function updateSheetRowOptimized(sheet, keyCol, keyValue, updates) {
  try {
    const data = getSheetDataOptimized(sheet);
    
    if (data.length <= 1) {
      return false;
    }
    
    const headers = data[0];
    const keyColIndex = headers.indexOf(keyCol);
    
    if (keyColIndex === -1) {
      return false;
    }
    
    // 更新する行を検索
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][keyColIndex] === keyValue) {
        rowIndex = i + 1; // 1始まりに変換
        break;
      }
    }
    
    if (rowIndex === -1) {
      return false;
    }
    
    // 更新する列を特定
    const updateRanges = [];
    Object.keys(updates).forEach(colName => {
      const colIndex = headers.indexOf(colName);
      if (colIndex !== -1) {
        updateRanges.push({
          row: rowIndex,
          col: colIndex + 1, // 1始まり
          value: updates[colName]
        });
      }
    });
    
    // 一括更新（可能な限り）
    if (updateRanges.length > 0) {
      const range = sheet.getRange(
        rowIndex,
        updateRanges[0].col,
        1,
        updateRanges.length
      );
      const values = [updateRanges.map(r => r.value)];
      range.setValues(values);
      
      // キャッシュを無効化
      const sheetName = sheet.getName();
      const cacheKey = `sheet_data_${sheetName}`;
      CacheService.getScriptCache().remove(cacheKey);
      
      return true;
    }
    
    return false;
  } catch (e) {
    Logger.log('updateSheetRowOptimized エラー: ' + e.toString());
    return false;
  }
}
