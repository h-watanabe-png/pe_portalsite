/**
 * PEポータルサイト - ダッシュボードデータ取得
 * 
 * ダッシュボード表示用のデータを取得
 */

/**
 * ダッシュボードデータを取得（スナップショットキャッシュ使用）
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
    
    // スナップショットキャッシュから統計を取得
    const stats = getDashboardStatsFromSnapshot();
    
    // 最近の依頼を取得（スナップショットキャッシュ使用）
    const recentRequests = getRecentRequestsFromSnapshot(10);
    
    return {
      success: true,
      stats: stats,
      recentRequests: recentRequests,
      cacheUsed: true
    };
  } catch (e) {
    Logger.log('getDashboardData エラー: ' + e.toString());
    // エラー時は通常の方法で取得
    try {
      return {
        success: true,
        stats: calculateDashboardStats(),
        recentRequests: getRecentRequests(10),
        cacheUsed: false
      };
    } catch (e2) {
      return {
        success: false,
        error: 'データの取得に失敗しました'
      };
    }
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
      myPending: 0,
      totalProcessing: 0,
      announcements: 0,
      total: 0,
      completed: 0
    };
  }
  
  const data = getSheetDataOptimized(sheet);
  
  if (data.length <= 1) {
    return {
      myPending: 0,
      totalProcessing: 0,
      announcements: 0,
      total: 0,
      completed: 0
    };
  }
  
  // ヘッダー行をスキップ
  const rows = data.slice(1);
  
  // 現在のユーザーを取得
  const currentUser = Session.getActiveUser().getEmail();
  
  // 列のインデックス（ヘッダー行を確認して調整が必要な場合は修正）
  // 仮定: 依頼ID=0, 受付日=1, 依頼元=2, ブランド=3, 依頼者=4, 要約=5, ..., 状態=8, 優先度=9
  const requestIdCol = 0;
  const requestDateCol = 1;
  const requesterCol = 4;
  const statusCol = 8;
  const priorityCol = 9;
  const requestTypeCol = 2; // 依頼元（システムチーム/経理）
  
  const stats = {
    myPending: 0,
    totalProcessing: 0,
    announcements: 0,
    total: rows.length,
    completed: 0
  };
  
  rows.forEach(row => {
    const status = row[statusCol];
    const priority = row[priorityCol];
    const requester = row[requesterCol];
    
    // 自分の依頼残数（未完了の依頼）
    if (requester && requester.toString().includes(currentUser.split('@')[0])) {
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
  
  // 今月のお知らせ数（システム設定シートから取得）
  try {
    const configSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('システム設定');
    if (configSheet) {
      const configData = configSheet.getDataRange().getValues();
      const today = new Date();
      const thisMonth = today.getMonth() + 1;
      const thisYear = today.getFullYear();
      
      // お知らせシートがある場合は、今月のお知らせ数をカウント
      const announcementSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('お知らせ');
      if (announcementSheet) {
        const announcementData = announcementSheet.getDataRange().getValues();
        const thisMonthAnnouncements = announcementData.slice(1).filter(row => {
          if (!row[0]) return false;
          const date = new Date(row[0]);
          return date.getMonth() + 1 === thisMonth && date.getFullYear() === thisYear;
        });
        stats.announcements = thisMonthAnnouncements.length;
      }
    }
  } catch (e) {
    Logger.log('お知らせ数取得エラー: ' + e.toString());
    stats.announcements = 0;
  }
  
  return stats;
}

/**
 * 最近の依頼を取得（スナップショットキャッシュ使用）
 * @param {number} limit - 取得件数（デフォルト: 10）
 * @return {Array<Object>} 依頼データの配列
 */
function getRecentRequestsFromSnapshot(limit = 10) {
  const snapshot = getSnapshotFromCache('依頼_統合管理');
  
  if (!snapshot || !snapshot.data) {
    // キャッシュがない場合は通常の方法で取得
    return getRecentRequests(limit);
  }
  
  const { data, headers } = snapshot;
  const currentUser = Session.getActiveUser().getEmail();
  const userPrefix = currentUser.split('@')[0];
  
  // 列インデックスを取得
  const requestIdCol = headers.indexOf('依頼ID');
  const requestDateCol = headers.indexOf('受付日');
  const requestTypeCol = headers.indexOf('依頼元');
  const brandCol = headers.indexOf('ブランド');
  const requesterCol = headers.indexOf('依頼者');
  const summaryCol = headers.indexOf('要約');
  const statusCol = headers.indexOf('状態');
  const priorityCol = headers.indexOf('優先度');
  
  if (requestIdCol === -1 || requestDateCol === -1) {
    // 列が見つからない場合は通常の方法で取得
    return getRecentRequests(limit);
  }
  
  // 現在のユーザーの依頼をフィルタリング
  const myRequests = data
    .filter(row => {
      const requester = row[requesterCol];
      return requester && requester.toString().includes(userPrefix);
    })
    .map(row => ({
      requestId: row[requestIdCol] || '',
      requestDate: row[requestDateCol] || new Date(),
      requestType: row[requestTypeCol] === 'システムチーム' ? 'system_team' : 
                   row[requestTypeCol] === '経理' ? 'accounting' : 'unknown',
      brand: row[brandCol] || '',
      requester: row[requesterCol] || '',
      summary: row[summaryCol] || '',
      status: row[statusCol] || '未設定',
      urgency: row[priorityCol] || '低'
    }))
    .sort((a, b) => {
      // 受付日でソート（新しい順）
      const dateA = a.requestDate instanceof Date ? a.requestDate : new Date(a.requestDate);
      const dateB = b.requestDate instanceof Date ? b.requestDate : new Date(b.requestDate);
      return dateB - dateA;
    })
    .slice(0, limit);
  
  return myRequests;
}

/**
 * 最近の依頼を取得（通常版、フォールバック用）
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
  
  // 現在のユーザーを取得
  const currentUser = Session.getActiveUser().getEmail();
  
  // オブジェクトに変換（現在のユーザーの依頼のみ）
  return recentRows
    .filter(row => {
      // 依頼者列（インデックス4）に現在のユーザーが含まれているか確認
      const requester = row[4];
      return requester && requester.toString().includes(currentUser.split('@')[0]);
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
    .slice(0, limit); // 指定件数まで
}

