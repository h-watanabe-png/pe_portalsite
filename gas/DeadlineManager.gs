/**
 * PEポータルサイト - 締日管理
 * 
 * 請求書関連の締日（毎月15日）を管理
 */

/**
 * 締日を計算
 * @param {Date} requestDate - 依頼日
 * @param {string} deadlineType - 締日種別（当月15日/翌月15日/指定日）
 * @param {Date} customDeadline - カスタム締日（指定日の場合）
 * @return {Object} 締日情報
 */
function calculateDeadline(requestDate, deadlineType, customDeadline) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let deadline;
  
  if (deadlineType === '当月15日') {
    deadline = new Date(today.getFullYear(), today.getMonth(), 15);
    // 15日が過ぎている場合は翌月15日
    if (deadline < today) {
      deadline = new Date(today.getFullYear(), today.getMonth() + 1, 15);
    }
  } else if (deadlineType === '翌月15日') {
    deadline = new Date(today.getFullYear(), today.getMonth() + 1, 15);
  } else if (deadlineType === '指定日') {
    deadline = customDeadline || new Date(today.getFullYear(), today.getMonth() + 1, 15);
  } else {
    // デフォルト: 翌月15日
    deadline = new Date(today.getFullYear(), today.getMonth() + 1, 15);
  }
  
  deadline.setHours(0, 0, 0, 0);
  
  // 締日までの日数を計算
  const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  
  // アラートレベルを決定
  let alertLevel = 'normal';
  if (daysUntil <= 0) {
    alertLevel = 'overdue';
  } else if (daysUntil <= 3) {
    alertLevel = 'urgent';
  } else if (daysUntil <= 7) {
    alertLevel = 'warning';
  }
  
  // 優先度を自動設定
  let priority = '低';
  let urgency = '低';
  if (daysUntil <= 0) {
    priority = '高（業務停止）';
    urgency = '緊急（1時間以内）';
  } else if (daysUntil <= 3) {
    priority = '高（業務停止）';
    urgency = '緊急（1時間以内）';
  } else if (daysUntil <= 7) {
    priority = '高（業務停止）';
    urgency = '高（当日中）';
  }
  
  return {
    deadline: deadline,
    daysUntil: daysUntil,
    alertLevel: alertLevel,
    priority: priority,
    urgency: urgency
  };
}

/**
 * 締日アラートを取得
 * @param {string} requestId - 依頼ID
 * @return {Object} アラート情報
 */
function getDeadlineAlert(requestId) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_経理');
    
    if (!sheet) {
      return null;
    }
    
    const data = getSheetDataOptimized(sheet);
    
    // 依頼IDで検索
    const requestIdCol = 0; // 依頼IDは0列目（仮定）
    const deadlineTypeCol = 10; // 締日種別は10列目（仮定）
    const deadlineDateCol = 11; // 締日は11列目（仮定）
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][requestIdCol] === requestId) {
        const deadlineType = data[i][deadlineTypeCol];
        const deadlineDate = data[i][deadlineDateCol];
        
        if (deadlineType && deadlineDate) {
          return calculateDeadline(new Date(), deadlineType, deadlineDate instanceof Date ? deadlineDate : new Date(deadlineDate));
        }
      }
    }
    
    return null;
  } catch (e) {
    Logger.log('getDeadlineAlert エラー: ' + e.toString());
    return null;
  }
}

/**
 * 締日リマインダーを送信
 */
function sendDeadlineReminders() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_経理');
    
    if (!sheet) {
      Logger.log('依頼_経理シートが見つかりません');
      return;
    }
    
    const data = getSheetDataOptimized(sheet);
    
    if (data.length <= 1) {
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // ヘッダー行をスキップ
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const requestType = row[2]; // 依頼種別
      const deadlineDate = row[11]; // 締日
      const status = row[18]; // ステータス
      
      // 請求関連で、未完了の依頼のみ
      if (requestType && requestType.includes('請求') && status !== '完了' && status !== 'キャンセル') {
        if (deadlineDate instanceof Date || deadlineDate) {
          const deadline = deadlineDate instanceof Date ? deadlineDate : new Date(deadlineDate);
          deadline.setHours(0, 0, 0, 0);
          
          const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
          
          // 7日前、3日前、当日にリマインダーを送信
          if (daysUntil === 7 || daysUntil === 3 || daysUntil === 0) {
            sendDeadlineReminderNotification(row, daysUntil);
          }
        }
      }
    }
  } catch (e) {
    Logger.log('sendDeadlineReminders エラー: ' + e.toString());
  }
}

/**
 * 締日リマインダー通知を送信
 * @param {Array} row - 依頼データ行
 * @param {number} daysUntil - 締日までの日数
 */
function sendDeadlineReminderNotification(row, daysUntil) {
  try {
    const requestId = row[0] || '';
    const requester = row[1] || '';
    const issue = row[12] || '';
    
    let message = '';
    if (daysUntil === 0) {
      message = `🚨 請求書締日が本日です。依頼ID: ${requestId}`;
    } else if (daysUntil === 3) {
      message = `⚠️ 請求書締日まで残り3日です。依頼ID: ${requestId}`;
    } else if (daysUntil === 7) {
      message = `📅 請求書締日まで残り7日です。依頼ID: ${requestId}`;
    }
    
    // Slack通知を送信
    if (message) {
      sendSlackNotificationEnhanced({
        requestId: requestId,
        requesterName: requester,
        issue: issue,
        message: message
      }, 'deadline_reminder', 'accounting');
    }
  } catch (e) {
    Logger.log('sendDeadlineReminderNotification エラー: ' + e.toString());
  }
}

/**
 * 締日カレンダーを取得
 * @return {Object} 締日カレンダーデータ
 */
function getDeadlineCalendar() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // 当月の15日
  const currentDeadline = new Date(currentYear, currentMonth, 15);
  const isCurrentDeadlinePassed = currentDeadline < today;
  
  // 翌月の15日
  const nextDeadline = new Date(currentYear, currentMonth + 1, 15);
  
  const activeDeadline = isCurrentDeadlinePassed ? nextDeadline : currentDeadline;
  const daysUntil = Math.ceil((activeDeadline - today) / (1000 * 60 * 60 * 24));
  
  return {
    currentDeadline: currentDeadline,
    nextDeadline: nextDeadline,
    activeDeadline: activeDeadline,
    daysUntil: daysUntil,
    isCurrentDeadlinePassed: isCurrentDeadlinePassed
  };
}

