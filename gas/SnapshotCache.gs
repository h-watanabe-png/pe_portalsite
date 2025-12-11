/**
 * PEポータルサイト - スナップショットキャッシュ
 * 
 * スプレッドシートのデータを定期的にキャッシュに保存し、
 * ダッシュボードや検索の速度を向上させる
 */

/**
 * スナップショットキャッシュの設定
 */
const SNAPSHOT_CACHE_CONFIG = {
  // キャッシュ有効期限（秒）
  expirationSeconds: 3600, // 1時間
  
  // 更新間隔（分）- 手動更新のみのため使用しない
  // updateIntervalMinutes: 15, // 手動更新のみに変更
  
  // キャッシュするシート一覧
  sheetsToCache: [
    '依頼_統合管理',
    '依頼_システムチーム',
    '依頼_経理',
    '問い合わせ対応履歴',
    'ナレッジベース',
    'Slack_ユーザー',
    'Slack_チャンネル',
    'システム設定'
  ]
};

/**
 * スナップショットキャッシュを更新（全シート）
 * この関数は定期的なトリガーから呼び出される
 */
function updateSnapshotCache() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const cache = CacheService.getScriptCache();
    
    const results = {
      success: [],
      failed: [],
      timestamp: new Date().toISOString()
    };
    
    // 各シートのスナップショットを取得してキャッシュに保存
    SNAPSHOT_CACHE_CONFIG.sheetsToCache.forEach(sheetName => {
      try {
        const sheet = spreadsheet.getSheetByName(sheetName);
        
        if (!sheet) {
          Logger.log(`シートが見つかりません: ${sheetName}`);
          results.failed.push({
            sheet: sheetName,
            error: 'シートが見つかりません'
          });
          return;
        }
        
        // スナップショットを取得
        const snapshot = getSheetSnapshot(sheet);
        
        // キャッシュに保存
        const cacheKey = `snapshot_${sheetName}`;
        const cacheData = {
          data: snapshot.data,
          headers: snapshot.headers,
          rowCount: snapshot.rowCount,
          columnCount: snapshot.columnCount,
          timestamp: snapshot.timestamp
        };
        
        cache.put(cacheKey, JSON.stringify(cacheData), SNAPSHOT_CACHE_CONFIG.expirationSeconds);
        
        // メタデータも保存（更新時刻など）
        const metaKey = `snapshot_meta_${sheetName}`;
        const metaData = {
          lastUpdated: new Date().toISOString(),
          rowCount: snapshot.rowCount,
          columnCount: snapshot.columnCount
        };
        cache.put(metaKey, JSON.stringify(metaData), SNAPSHOT_CACHE_CONFIG.expirationSeconds);
        
        results.success.push({
          sheet: sheetName,
          rowCount: snapshot.rowCount,
          columnCount: snapshot.columnCount
        });
        
        Logger.log(`スナップショットキャッシュを更新しました: ${sheetName} (${snapshot.rowCount}行)`);
      } catch (e) {
        Logger.log(`スナップショットキャッシュ更新エラー (${sheetName}): ${e.toString()}`);
        results.failed.push({
          sheet: sheetName,
          error: e.toString()
        });
      }
    });
    
    // 更新結果をログに記録
    Logger.log(`スナップショットキャッシュ更新完了: 成功 ${results.success.length}件, 失敗 ${results.failed.length}件`);
    
    return results;
  } catch (e) {
    Logger.log('スナップショットキャッシュ更新エラー: ' + e.toString());
    throw e;
  }
}

/**
 * シートのスナップショットを取得
 * @param {Sheet} sheet - シートオブジェクト
 * @return {Object} スナップショットデータ
 */
function getSheetSnapshot(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 0 || lastCol <= 0) {
    return {
      data: [],
      headers: [],
      rowCount: 0,
      columnCount: 0,
      timestamp: new Date().toISOString()
    };
  }
  
  // 全データを一括取得
  const allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  
  // ヘッダーとデータを分離
  const headers = allData.length > 0 ? allData[0] : [];
  const data = allData.length > 1 ? allData.slice(1) : [];
  
  return {
    data: data,
    headers: headers,
    rowCount: data.length,
    columnCount: headers.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * スナップショットキャッシュからデータを取得
 * @param {string} sheetName - シート名
 * @param {boolean} forceRefresh - 強制更新（デフォルト: false）
 * @return {Object|null} スナップショットデータ
 */
function getSnapshotFromCache(sheetName, forceRefresh = false) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `snapshot_${sheetName}`;
  
  if (forceRefresh) {
    // 強制更新の場合はキャッシュを削除
    cache.remove(cacheKey);
    cache.remove(`snapshot_meta_${sheetName}`);
  }
  
  const cached = cache.get(cacheKey);
  
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log(`スナップショットキャッシュ解析エラー (${sheetName}): ${e.toString()}`);
      // キャッシュが壊れている場合は削除
      cache.remove(cacheKey);
    }
  }
  
  // キャッシュがない場合は、リアルタイムで取得してキャッシュに保存
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return null;
    }
    
    const snapshot = getSheetSnapshot(sheet);
    const cacheData = {
      data: snapshot.data,
      headers: snapshot.headers,
      rowCount: snapshot.rowCount,
      columnCount: snapshot.columnCount,
      timestamp: snapshot.timestamp
    };
    
    // キャッシュに保存
    cache.put(cacheKey, JSON.stringify(cacheData), SNAPSHOT_CACHE_CONFIG.expirationSeconds);
    
    return cacheData;
  } catch (e) {
    Logger.log(`スナップショット取得エラー (${sheetName}): ${e.toString()}`);
    return null;
  }
}

/**
 * スナップショットキャッシュから検索
 * @param {string} sheetName - シート名
 * @param {Object} filters - フィルタ条件
 * @param {number} page - ページ番号（1始まり）
 * @param {number} pageSize - 1ページあたりの件数
 * @return {Object} 検索結果
 */
function searchSnapshotCache(sheetName, filters = {}, page = 1, pageSize = 20) {
  const snapshot = getSnapshotFromCache(sheetName);
  
  if (!snapshot || !snapshot.data) {
    return {
      rows: [],
      totalRows: 0,
      totalPages: 0,
      currentPage: page
    };
  }
  
  const { data, headers } = snapshot;
  
  // フィルタリング
  let filteredData = data;
  if (filters && Object.keys(filters).length > 0) {
    filteredData = data.filter(row => {
      return Object.keys(filters).every(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex === -1) return true;
        
        const value = row[colIndex];
        const filterValue = filters[key];
        
        if (typeof filterValue === 'string') {
          return value && value.toString().toLowerCase().includes(filterValue.toLowerCase());
        } else if (Array.isArray(filterValue)) {
          return filterValue.includes(value);
        } else if (typeof filterValue === 'object' && filterValue.operator) {
          // 高度なフィルタ（例: { operator: '>', value: 100 }）
          switch (filterValue.operator) {
            case '>':
              return value > filterValue.value;
            case '<':
              return value < filterValue.value;
            case '>=':
              return value >= filterValue.value;
            case '<=':
              return value <= filterValue.value;
            case '==':
              return value === filterValue.value;
            case '!=':
              return value !== filterValue.value;
            default:
              return true;
          }
        }
        return value === filterValue;
      });
    });
  }
  
  // ページネーション
  const totalRows = filteredData.length;
  const totalPages = Math.ceil(totalRows / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  
  return {
    rows: paginatedData,
    headers: headers,
    totalRows: totalRows,
    totalPages: totalPages,
    currentPage: page
  };
}

/**
 * スナップショットキャッシュを無効化
 * @param {string} sheetName - シート名（省略時は全シート）
 */
function invalidateSnapshotCache(sheetName = null) {
  const cache = CacheService.getScriptCache();
  
  if (sheetName) {
    // 特定のシートのキャッシュを無効化
    cache.remove(`snapshot_${sheetName}`);
    cache.remove(`snapshot_meta_${sheetName}`);
    Logger.log(`スナップショットキャッシュを無効化しました: ${sheetName}`);
  } else {
    // 全シートのキャッシュを無効化
    SNAPSHOT_CACHE_CONFIG.sheetsToCache.forEach(name => {
      cache.remove(`snapshot_${name}`);
      cache.remove(`snapshot_meta_${name}`);
    });
    Logger.log('全スナップショットキャッシュを無効化しました');
  }
}

/**
 * スナップショットキャッシュの状態を取得
 * @return {Object} キャッシュ状態
 */
function getSnapshotCacheStatus() {
  const cache = CacheService.getScriptCache();
  const status = {
    sheets: [],
    totalCached: 0,
    totalRows: 0,
    oldestUpdate: null,
    newestUpdate: null,
    needsUpdate: false
  };
  
  const now = new Date();
  const updateThreshold = 20 * 60 * 1000; // 20分（更新間隔15分 + マージン5分）
  
  SNAPSHOT_CACHE_CONFIG.sheetsToCache.forEach(sheetName => {
    const metaKey = `snapshot_meta_${sheetName}`;
    const meta = cache.get(metaKey);
    
    if (meta) {
      try {
        const metaData = JSON.parse(meta);
        const lastUpdated = new Date(metaData.lastUpdated);
        const age = now - lastUpdated;
        const isOld = age > updateThreshold;
        
        status.sheets.push({
          name: sheetName,
          lastUpdated: metaData.lastUpdated,
          lastUpdatedTimestamp: lastUpdated.getTime(),
          ageMinutes: Math.round(age / (60 * 1000)),
          rowCount: metaData.rowCount,
          columnCount: metaData.columnCount,
          cached: true,
          isOld: isOld
        });
        
        status.totalCached++;
        status.totalRows += metaData.rowCount || 0;
        
        // 最も古い更新時刻を記録
        if (!status.oldestUpdate || lastUpdated < status.oldestUpdate) {
          status.oldestUpdate = lastUpdated;
        }
        
        // 最も新しい更新時刻を記録
        if (!status.newestUpdate || lastUpdated > status.newestUpdate) {
          status.newestUpdate = lastUpdated;
        }
        
        // 古いキャッシュがあるかチェック
        if (isOld) {
          status.needsUpdate = true;
        }
      } catch (e) {
        status.sheets.push({
          name: sheetName,
          cached: false,
          error: 'メタデータ解析エラー'
        });
      }
    } else {
      status.sheets.push({
        name: sheetName,
        cached: false
      });
      status.needsUpdate = true; // キャッシュがない場合は更新が必要
    }
  });
  
  return status;
}

/**
 * スナップショットキャッシュを手動更新（ロック付き）
 * @return {Object} 更新結果
 */
function updateSnapshotCacheManual() {
  try {
    // ロックを取得（同時更新を防止）
    const lock = LockService.getScriptLock();
    
    // ロック取得を試みる（タイムアウト: 10秒）
    if (!lock.tryLock(10000)) {
      return {
        success: false,
        error: '他のユーザーが更新中です。しばらく待ってから再試行してください。',
        locked: true
      };
    }
    
    try {
      // 更新中フラグを設定（PropertiesServiceに保存）
      const properties = PropertiesService.getScriptProperties();
      const updateKey = 'snapshot_cache_updating';
      const existingUpdate = properties.getProperty(updateKey);
      
      if (existingUpdate) {
        const updateData = JSON.parse(existingUpdate);
        const updateStartTime = new Date(updateData.startTime);
        const now = new Date();
        
        // 5分以上更新中の場合は、ロックが解除されなかったと判断して更新を続行
        if (now - updateStartTime < 5 * 60 * 1000) {
          lock.releaseLock();
          return {
            success: false,
            error: '更新処理が既に実行中です。しばらく待ってから再試行してください。',
            updating: true,
            startTime: updateData.startTime
          };
        }
      }
      
      // 更新開始時刻を記録
      properties.setProperty(updateKey, JSON.stringify({
        startTime: new Date().toISOString(),
        user: Session.getActiveUser().getEmail()
      }));
      
      // スナップショットキャッシュを更新
      const result = updateSnapshotCache();
      
      // 更新中フラグを削除
      properties.deleteProperty(updateKey);
      
      lock.releaseLock();
      
      return {
        success: true,
        result: result,
        message: 'スナップショットキャッシュを更新しました。',
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      // エラー時も更新中フラグを削除
      PropertiesService.getScriptProperties().deleteProperty('snapshot_cache_updating');
      lock.releaseLock();
      throw e;
    }
  } catch (e) {
    Logger.log('スナップショットキャッシュ手動更新エラー: ' + e.toString());
    return {
      success: false,
      error: '更新中にエラーが発生しました: ' + e.toString()
    };
  }
}

/**
 * 定期的なキャッシュ更新トリガーを削除（手動更新のみに変更）
 * 注意: 手動更新のみの運用に変更したため、この関数はトリガーを削除するのみ
 */
function setupSnapshotCacheTrigger() {
  // 既存のトリガーを削除（手動更新のみの運用に変更）
  const triggers = ScriptApp.getProjectTriggers();
  let deletedCount = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateSnapshotCache') {
      ScriptApp.deleteTrigger(trigger);
      deletedCount++;
    }
  });
  
  if (deletedCount > 0) {
    Logger.log(`スナップショットキャッシュの自動更新トリガーを削除しました（${deletedCount}件）。手動更新のみの運用に変更しました。`);
  } else {
    Logger.log('スナップショットキャッシュの自動更新トリガーは設定されていませんでした。手動更新のみの運用です。');
  }
  
  // 初回手動更新を推奨（コメントアウト）
  // updateSnapshotCache();
}

/**
 * スナップショットキャッシュを使用したダッシュボード統計の取得
 * @return {Object} 統計データ
 */
function getDashboardStatsFromSnapshot() {
  const snapshot = getSnapshotFromCache('依頼_統合管理');
  
  if (!snapshot || !snapshot.data) {
    // キャッシュがない場合は通常の方法で取得
    return calculateDashboardStats();
  }
  
  const { data, headers } = snapshot;
  const currentUser = Session.getActiveUser().getEmail();
  const userPrefix = currentUser.split('@')[0];
  
  // 列インデックスを取得
  const requesterCol = headers.indexOf('依頼者');
  const statusCol = headers.indexOf('状態');
  const priorityCol = headers.indexOf('優先度');
  
  if (requesterCol === -1 || statusCol === -1) {
    // 列が見つからない場合は通常の方法で取得
    return calculateDashboardStats();
  }
  
  const stats = {
    myPending: 0,
    totalProcessing: 0,
    announcements: 0,
    total: data.length,
    completed: 0
  };
  
  data.forEach(row => {
    const status = row[statusCol];
    const requester = row[requesterCol];
    
    // 自分の依頼残数（未完了の依頼）
    if (requester && requester.toString().includes(userPrefix)) {
      if (status !== '完了' && status !== 'キャンセル') {
        stats.myPending++;
      }
    }
    
    // 全体の処理中件数
    if (status === '処理中' || status === '保留') {
      stats.totalProcessing++;
    }
    
    // 完了数
    if (status === '完了') {
      stats.completed++;
    }
  });
  
  return stats;
}

