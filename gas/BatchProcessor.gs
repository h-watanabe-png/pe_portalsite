/**
 * PEポータルサイト - バッチ処理
 * 
 * 夜間バッチ処理を管理します。
 */

/**
 * 日次データ集計（毎日 02:00実行）
 */
function dailyDataAggregation() {
  try {
    Logger.log('PEポータルサイト - 夜間バッチ処理を開始');
    const startTime = new Date();
    
    // 1. ダッシュボード集計を更新
    updateDashboardAggregation();
    
    // 2. Data Studio用エクスポートを更新
    prepareDataStudioDataSource();
    
    // 3. ナレッジベースの自動インデックス化（オプション、重い場合は別トリガーで実行）
    // autoIndexKnowledgeBase();
    
    const elapsed = new Date() - startTime;
    Logger.log(`夜間バッチ処理が完了しました（所要時間: ${elapsed}ms）`);
  } catch (e) {
    Logger.log('夜間バッチ処理エラー: ' + e.toString());
  }
}

/**
 * ダッシュボード集計を更新
 */
function updateDashboardAggregation() {
  try {
    const stats = calculateDashboardStats();
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('ダッシュボード_集計');
    
    if (!sheet) {
      Logger.log('ダッシュボード_集計シートが見つかりません');
      return;
    }
    
    const data = getSheetDataOptimized(sheet);
    const now = new Date();
    
    // 統計項目を更新
    for (let i = 1; i < data.length; i++) {
      const itemName = data[i][0];
      if (!itemName) continue;
      
      let value = 0;
      
      switch (itemName) {
        case '総リクエスト数':
          value = stats.total;
          break;
        case '処理中':
          value = stats.processing;
          break;
        case '完了':
          value = stats.completed;
          break;
        case '完了率':
          value = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          break;
        case '緊急依頼数':
          value = stats.urgent;
          break;
        // その他の統計項目も同様に更新
      }
      
      // 数値を更新
      sheet.getRange(i + 1, 2).setValue(value);
      // 最終更新日時を更新
      sheet.getRange(i + 1, 3).setValue(now);
    }
    
    Logger.log('ダッシュボード集計を更新しました');
  } catch (e) {
    Logger.log('ダッシュボード集計更新エラー: ' + e.toString());
  }
}

/**
 * Data Studio用エクスポートを準備
 */
function prepareDataStudioDataSource() {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sourceSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('依頼_統合管理');
    const exportSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Data Studio用エクスポート');
    
    if (!sourceSheet || !exportSheet) {
      Logger.log('必要なシートが見つかりません');
      return;
    }
    
    const sourceData = getSheetDataOptimized(sourceSheet);
    
    if (sourceData.length <= 1) {
      // データがない場合はクリア
      exportSheet.clear();
      return;
    }
    
    // ヘッダー行をスキップ
    const rows = sourceData.slice(1);
    
    // Data Studio用に変換
    const exportData = rows.map(row => {
      const requestDate = row[1]; // 受付日
      const requestId = row[0]; // 依頼ID
      const source = row[2]; // 依頼元
      const brand = row[3]; // ブランド
      const requester = row[4]; // 依頼者
      const urgency = row[9]; // 優先度
      const status = row[8]; // 状態
      const assignee = row[7]; // 担当者
      const completedDate = row[15] || ''; // 完了日（依頼_システムチーム/経理から取得する必要がある）
      
      // 処理時間を計算
      let processingHours = 0;
      let processingDays = 0;
      if (completedDate && requestDate) {
        const start = requestDate instanceof Date ? requestDate : new Date(requestDate);
        const end = completedDate instanceof Date ? completedDate : new Date(completedDate);
        const diffMs = end - start;
        processingHours = Math.round(diffMs / (1000 * 60 * 60));
        processingDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      }
      
      return [
        requestDate,
        requestId,
        source,
        brand,
        requester,
        urgency,
        status,
        assignee,
        processingHours,
        processingDays
      ];
    });
    
    // エクスポートシートをクリアして書き込み
    exportSheet.clear();
    const headers = [
      '送信日時',
      '依頼ID',
      '依頼種別',
      'ブランド',
      '依頼者',
      '緊急度',
      'ステータス',
      '担当者',
      '処理時間_時間',
      '処理時間_日'
    ];
    exportSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    exportSheet.getRange(2, 1, exportData.length, exportData[0].length).setValues(exportData);
    
    Logger.log(`Data Studio用エクスポートを準備しました: ${exportData.length}件`);
  } catch (e) {
    Logger.log('Data Studio用エクスポート準備エラー: ' + e.toString());
  }
}
