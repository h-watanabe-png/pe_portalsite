/**
 * PEポータルサイト - ダッシュボード用JavaScript
 * 
 * ダッシュボードのデータ読み込みと表示を管理
 */

/**
 * ダッシュボードを読み込む
 */
function loadDashboard() {
  console.log('ダッシュボードを読み込み中...');
  
  // ユーザー情報を取得
  loadUserInfo();
  
  // ダッシュボードデータを読み込む
  loadDashboardData();
  
  // 最近の依頼を読み込む
  loadRecentRequests();
}

/**
 * ユーザー情報を読み込む
 */
function loadUserInfo() {
  google.script.run
    .withSuccessHandler(function(userInfo) {
      if (userInfo && userInfo.email) {
        const userName = userInfo.email.split('@')[0];
        const userStatus = userInfo.authorized ? '認証済み' : '未認証';
        
        const userNameEl = document.getElementById('user-name');
        const userStatusEl = document.getElementById('user-status');
        
        if (userNameEl) {
          userNameEl.textContent = userName;
        }
        if (userStatusEl) {
          userStatusEl.textContent = userStatus;
        }
      }
    })
    .withFailureHandler(function(error) {
      console.error('ユーザー情報取得エラー:', error);
      const userStatusEl = document.getElementById('user-status');
      if (userStatusEl) {
        userStatusEl.textContent = 'エラー';
      }
    })
    .getUserInfo();
}

/**
 * ダッシュボードデータを読み込む
 */
function loadDashboardData() {
  showLoading();
  
  google.script.run
    .withSuccessHandler(function(result) {
      hideLoading();
      
      if (result && result.success) {
        updateKPIDashboard(result.stats);
      } else {
        console.error('ダッシュボードデータ取得エラー:', result.error);
        showError('ダッシュボードデータの取得に失敗しました');
        showEmptyState();
      }
    })
    .withFailureHandler(function(error) {
      hideLoading();
      console.error('ダッシュボードデータ取得エラー:', error);
      showError('ダッシュボードデータの取得に失敗しました');
      showEmptyState();
    })
    .getDashboardData();
}

/**
 * 最近の依頼を読み込む
 */
function loadRecentRequests() {
  google.script.run
    .withSuccessHandler(function(result) {
      if (result && result.success) {
        displayRecentRequests(result.requests || []);
      } else {
        console.error('最近の依頼取得エラー:', result.error);
        displayRecentRequests([]);
      }
    })
    .withFailureHandler(function(error) {
      console.error('最近の依頼取得エラー:', error);
      displayRecentRequests([]);
    })
    .getMyRequests();
}

/**
 * KPIダッシュボードを更新
 * @param {Object} stats - 統計データ
 */
function updateKPIDashboard(stats) {
  if (!stats) {
    return;
  }
  
  const myPendingEl = document.getElementById('my-pending-count');
  const totalProcessingEl = document.getElementById('total-processing-count');
  const announcementEl = document.getElementById('announcement-count');
  
  if (myPendingEl) {
    myPendingEl.textContent = stats.myPending || 0;
  }
  if (totalProcessingEl) {
    totalProcessingEl.textContent = stats.totalProcessing || 0;
  }
  if (announcementEl) {
    announcementEl.textContent = stats.announcements || 0;
  }
}

/**
 * 最近の依頼を表示
 * @param {Array<Object>} requests - 依頼データの配列
 */
function displayRecentRequests(requests) {
  const container = document.getElementById('recent-requests-container');
  
  if (!container) {
    return;
  }
  
  if (!requests || requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-message">依頼がありません</div>
      </div>
    `;
    return;
  }
  
  const table = document.createElement('table');
  table.className = 'data-table';
  
  // ヘッダー行
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>依頼ID</th>
      <th>受付日</th>
      <th>依頼種別</th>
      <th>要約</th>
      <th>状態</th>
      <th>緊急度</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // データ行
  const tbody = document.createElement('tbody');
  requests.forEach(request => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(request.requestId || '')}</td>
      <td>${formatDate(request.requestDate)}</td>
      <td>${getRequestTypeLabel(request.requestType)}</td>
      <td>${escapeHtml(request.summary || '').substring(0, 50)}${request.summary && request.summary.length > 50 ? '...' : ''}</td>
      <td><span class="status-badge ${getStatusClass(request.status)}">${escapeHtml(request.status || '未設定')}</span></td>
      <td><span class="badge ${getUrgencyClass(request.urgency)}">${escapeHtml(request.urgency || '低')}</span></td>
    `;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  
  container.innerHTML = '';
  container.appendChild(table);
}

/**
 * 日付をフォーマット
 * @param {Date|string} date - 日付
 * @return {string} フォーマットされた日付文字列
 */
function formatDate(date) {
  if (!date) {
    return '';
  }
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 依頼種別のラベルを取得
 * @param {string} requestType - 依頼種別
 * @return {string} ラベル
 */
function getRequestTypeLabel(requestType) {
  const labels = {
    'system_team': 'システムチーム',
    'accounting': '経理',
    'unknown': '不明'
  };
  return labels[requestType] || requestType || '不明';
}

/**
 * ステータスに応じたクラスを取得
 * @param {string} status - ステータス
 * @return {string} クラス名
 */
function getStatusClass(status) {
  if (status === '完了') return 'completed';
  if (status === '処理中') return 'processing';
  if (status === '保留') return 'pending';
  if (status === 'キャンセル') return 'cancelled';
  return 'pending';
}

/**
 * 緊急度に応じたクラスを取得
 * @param {string} urgency - 緊急度
 * @return {string} クラス名
 */
function getUrgencyClass(urgency) {
  if (urgency === '高' || urgency === '高（業務停止）') return 'badge-danger';
  if (urgency === '中' || urgency === '中（業務に支障あり）') return 'badge-warning';
  if (urgency === '低' || urgency === '低（業務に支障なし）') return 'badge-primary';
  return 'badge-primary';
}

/**
 * HTMLエスケープ
 * @param {string} text - テキスト
 * @return {string} エスケープされたテキスト
 */
function escapeHtml(text) {
  if (!text) {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 空の状態を表示
 */
function showEmptyState() {
  updateKPIDashboard({ myPending: 0, totalProcessing: 0, announcements: 0 });
  displayRecentRequests([]);
}

/**
 * ローディング表示
 */
function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

/**
 * ローディング非表示
 */
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

/**
 * エラーメッセージを表示
 * @param {string} message - エラーメッセージ
 */
function showError(message) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    
    // 3秒後に自動で非表示
    setTimeout(function() {
      errorEl.classList.add('hidden');
    }, 3000);
  } else {
    console.error(message);
  }
}

/**
 * 成功メッセージを表示
 * @param {string} message - 成功メッセージ
 */
function showSuccess(message) {
  const successEl = document.getElementById('success-message');
  if (successEl) {
    successEl.textContent = message;
    successEl.classList.remove('hidden');
    
    // 3秒後に自動で非表示
    setTimeout(function() {
      successEl.classList.add('hidden');
    }, 3000);
  } else {
    console.log(message);
  }
}

// ページ読み込み時にダッシュボードを読み込む
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadDashboard);
} else {
  loadDashboard();
}
