/**
 * PEポータルサイト - ダッシュボードデータ取得
 * 
 * ダッシュボード表示用のデータを取得
 */

/**
 * ダッシュボードデータを取得（キャッシュ付き）
 * @return {Object} ダッシュボードデータ
 */
function getDashboardData() {
  try {
    // 認証チェック
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return {
        success: false,
        error: 'アクセス権限がありません'
      };
    }
    
    // キャッシュから取得を試みる
    const cached = getCachedData('dashboard_data', () => {
      return {
        stats: calculateDashboardStats(),
        recent: getRecentRequests(10)
      };
    }, 300); // 5分間キャッシュ
    
    return {
      success: true,
      stats: cached.stats,
      recent: cached.recent
    };
  } catch (e) {
    Logger.log('getDashboardData エラー: ' + e.toString());
    return {
      success: false,
      error: 'データの取得に失敗しました'
    };
  }
}

/**
 * ダッシュボード統計を計算
 * @return {Object} 統計データ
 */
function calculateDashboardStats() {
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_統合管理');
  
  if (!sheet) {
    return {
      total: 0,
      processing: 0,
      completed: 0,
      urgent: 0
    };
  }
  
  const data = getSheetDataOptimized(sheet);
  
  if (data.length <= 1) {
    return {
      total: 0,
      processing: 0,
      completed: 0,
      urgent: 0
    };
  }
  
  // ヘッダー行をスキップ
  const rows = data.slice(1);
  
  const stats = {
    total: rows.length,
    processing: 0,
    completed: 0,
    urgent: 0
  };
  
  // 状態列は9列目（インデックス8）
  const statusCol = 9;
  // 優先度列は10列目（インデックス9）
  const priorityCol = 10;
  
  rows.forEach(row => {
    const status = row[statusCol - 1];
    const priority = row[priorityCol - 1];
    
    if (status === '処理中' || status === '保留') {
      stats.processing++;
    } else if (status === '完了') {
      stats.completed++;
    }
    
    if (priority === '高') {
      stats.urgent++;
    }
  });
  
  return stats;
}

/**
 * 最近の依頼を取得
 * @param {number} limit - 取得件数（デフォルト: 10）
 * @return {Array<Object>} 依頼データの配列
 */
function getRecentRequests(limit = 10) {
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_統合管理');
  
  if (!sheet) {
    return [];
  }
  
  const data = getSheetDataOptimized(sheet);
  
  if (data.length <= 1) {
    return [];
  }
  
  // ヘッダー行をスキップ
  const rows = data.slice(1);
  
  // 受付日でソート（新しい順）
  const sortedRows = rows.sort((a, b) => {
    const dateA = a[1] instanceof Date ? a[1] : new Date(a[1]);
    const dateB = b[1] instanceof Date ? b[1] : new Date(b[1]);
    return dateB - dateA;
  });
  
  // 指定件数まで取得
  const recentRows = sortedRows.slice(0, limit);
  
  // オブジェクトに変換
  return recentRows.map(row => ({
    id: row[0], // 依頼ID
    date: row[1], // 受付日
    source: row[2], // 依頼元
    brand: row[3], // ブランド
    requester: row[4], // 依頼者
    summary: row[5], // 要約
    status: row[8], // 状態
    priority: row[9] // 優先度
  }));
}

