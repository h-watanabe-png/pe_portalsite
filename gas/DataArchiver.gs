/**
 * PEポータルサイト - データアーカイブ機能
 * 
 * 完了して1年以上経過した依頼や古いSlackログを
 * 自動的にアーカイブ用スプレッドシートに移動
 */

/**
 * データアーカイブの設定
 */
const ARCHIVE_CONFIG = {
  // アーカイブ対象の経過年数
  archiveAfterYears: 1,
  
  // アーカイブ用スプレッドシートID（作成が必要な場合はnull）
  archiveSpreadsheetId: null, // 自動生成される
  
  // アーカイブ対象シート
  sheetsToArchive: [
    '依頼_統合管理',
    '依頼_システムチーム',
    '依頼_経理',
    '問い合わせ対応履歴'
  ]
};

/**
 * データアーカイブを実行
 * @param {boolean} dryRun - ドライラン（実際には移動しない、デフォルト: false）
 * @return {Object} アーカイブ結果
 */
function archiveOldData(dryRun = false) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const mainSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // アーカイブ用スプレッドシートを取得または作成
    const archiveSpreadsheet = getOrCreateArchiveSpreadsheet();
    
    const results = {
      archived: [],
      failed: [],
      totalArchived: 0,
      dryRun: dryRun,
      timestamp: new Date().toISOString()
    };
    
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - ARCHIVE_CONFIG.archiveAfterYears);
    
    // 各シートをアーカイブ
    ARCHIVE_CONFIG.sheetsToArchive.forEach(sheetName => {
      try {
        const sheet = mainSpreadsheet.getSheetByName(sheetName);
        if (!sheet) {
          results.failed.push({
            sheet: sheetName,
            error: 'シートが見つかりません'
          });
          return;
        }
        
        const archiveResult = archiveSheet(sheet, archiveSpreadsheet, cutoffDate, dryRun);
        
        if (archiveResult.success) {
          results.archived.push({
            sheet: sheetName,
            rowCount: archiveResult.archivedCount,
            remainingCount: archiveResult.remainingCount
          });
          results.totalArchived += archiveResult.archivedCount;
        } else {
          results.failed.push({
            sheet: sheetName,
            error: archiveResult.error
          });
        }
      } catch (e) {
        Logger.log(`アーカイブエラー (${sheetName}): ${e.toString()}`);
        results.failed.push({
          sheet: sheetName,
          error: e.toString()
        });
      }
    });
    
    Logger.log(`データアーカイブ完了: ${results.totalArchived}件（ドライラン: ${dryRun}）`);
    
    return results;
  } catch (e) {
    Logger.log('データアーカイブエラー: ' + e.toString());
    throw e;
  }
}

/**
 * アーカイブ用スプレッドシートを取得または作成
 * @return {Spreadsheet} アーカイブ用スプレッドシート
 */
function getOrCreateArchiveSpreadsheet() {
  const folderId = '10RCcFHe1hh1V56_P1qLg5uNDxk23yNQC'; // PE Portalフォルダ
  const folder = DriveApp.getFolderById(folderId);
  
  // 既存のアーカイブ用スプレッドシートを検索
  const archiveFileName = 'PEポータルサイト管理_アーカイブ';
  const files = folder.getFilesByName(archiveFileName);
  
  if (files.hasNext()) {
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }
  
  // アーカイブ用スプレッドシートを作成
  const archiveSpreadsheet = SpreadsheetApp.create(archiveFileName);
  const archiveFile = DriveApp.getFileById(archiveSpreadsheet.getId());
  
  // フォルダに移動
  DriveApp.getFileById(archiveSpreadsheet.getId()).getParents().next().removeFile(archiveFile);
  folder.addFile(archiveFile);
  
  Logger.log(`アーカイブ用スプレッドシートを作成しました: ${archiveSpreadsheet.getId()}`);
  
  return archiveSpreadsheet;
}

/**
 * シートをアーカイブ
 * @param {Sheet} sourceSheet - 元のシート
 * @param {Spreadsheet} archiveSpreadsheet - アーカイブ用スプレッドシート
 * @param {Date} cutoffDate - アーカイブ対象の基準日
 * @param {boolean} dryRun - ドライラン
 * @return {Object} アーカイブ結果
 */
function archiveSheet(sourceSheet, archiveSpreadsheet, cutoffDate, dryRun) {
  try {
    const sheetName = sourceSheet.getName();
    
    // アーカイブ用シートを取得または作成
    let archiveSheet = archiveSpreadsheet.getSheetByName(sheetName);
    if (!archiveSheet) {
      archiveSheet = archiveSpreadsheet.insertSheet(sheetName);
      
      // ヘッダー行をコピー
      const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues();
      archiveSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
      
      // ヘッダー行を固定
      archiveSheet.setFrozenRows(1);
    }
    
    // データを取得
    const data = getSheetDataOptimized(sourceSheet);
    
    if (data.length <= 1) {
      return {
        success: true,
        archivedCount: 0,
        remainingCount: 0
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // 日付列を特定（受付日、送信日時、対応日時など）
    const dateColumns = [];
    headers.forEach((header, index) => {
      if (header && (
        header.toString().includes('日') || 
        header.toString().includes('日時') ||
        header.toString().includes('Date') ||
        header.toString().includes('Timestamp')
      )) {
        dateColumns.push(index);
      }
    });
    
    if (dateColumns.length === 0) {
      return {
        success: false,
        error: '日付列が見つかりません'
      };
    }
    
    // アーカイブ対象の行を特定
    const rowsToArchive = [];
    const rowsToKeep = [];
    
    rows.forEach((row, index) => {
      let shouldArchive = false;
      
      // 日付列をチェック
      for (const colIndex of dateColumns) {
        const dateValue = row[colIndex];
        if (dateValue instanceof Date) {
          if (dateValue < cutoffDate) {
            shouldArchive = true;
            break;
          }
        } else if (dateValue) {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime()) && date < cutoffDate) {
            shouldArchive = true;
            break;
          }
        }
      }
      
      // ステータスが「完了」または「キャンセル」の場合のみアーカイブ対象
      const statusCol = headers.indexOf('状態') !== -1 ? headers.indexOf('状態') : 
                       headers.indexOf('ステータス') !== -1 ? headers.indexOf('ステータス') : -1;
      
      if (statusCol !== -1) {
        const status = row[statusCol];
        if (status !== '完了' && status !== 'キャンセル') {
          shouldArchive = false; // 未完了の依頼はアーカイブしない
        }
      }
      
      if (shouldArchive) {
        rowsToArchive.push({ row: row, originalIndex: index + 2 }); // ヘッダー行 + 1始まり
      } else {
        rowsToKeep.push(row);
      }
    });
    
    if (rowsToArchive.length === 0) {
      return {
        success: true,
        archivedCount: 0,
        remainingCount: rows.length
      };
    }
    
    if (dryRun) {
      return {
        success: true,
        archivedCount: rowsToArchive.length,
        remainingCount: rowsToKeep.length,
        dryRun: true
      };
    }
    
    // アーカイブ用シートに追加
    const archiveData = rowsToArchive.map(item => item.row);
    if (archiveData.length > 0) {
      const lastRow = archiveSheet.getLastRow();
      archiveSheet.getRange(lastRow + 1, 1, archiveData.length, archiveData[0].length)
        .setValues(archiveData);
    }
    
    // 元のシートから削除（逆順で削除してインデックスを維持）
    rowsToArchive.sort((a, b) => b.originalIndex - a.originalIndex);
    rowsToArchive.forEach(item => {
      sourceSheet.deleteRow(item.originalIndex);
    });
    
    // スナップショットキャッシュを無効化
    invalidateSnapshotCache(sheetName);
    
    Logger.log(`${sheetName}: ${rowsToArchive.length}件をアーカイブ、${rowsToKeep.length}件を残しました`);
    
    return {
      success: true,
      archivedCount: rowsToArchive.length,
      remainingCount: rowsToKeep.length
    };
  } catch (e) {
    Logger.log(`シートアーカイブエラー: ${e.toString()}`);
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * アーカイブ実行のトリガーを設定（月1回実行）
 */
function setupArchiveTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'archiveOldDataScheduled') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 新しいトリガーを作成（毎月1日 午前2時）
  ScriptApp.newTrigger('archiveOldDataScheduled')
    .timeBased()
    .onMonthDay(1)
    .atHour(2)
    .create();
  
  Logger.log('データアーカイブのトリガーを設定しました（毎月1日 午前2時）');
}

/**
 * スケジュール実行用のアーカイブ関数（トリガーから呼び出される）
 */
function archiveOldDataScheduled() {
  try {
    Logger.log('スケジュール実行: データアーカイブを開始');
    const result = archiveOldData(false); // ドライランなし
    
    // 結果をログに記録
    Logger.log(`アーカイブ完了: ${result.totalArchived}件`);
    
    // 管理者に通知（必要に応じて）
    // sendArchiveNotification(result);
  } catch (e) {
    Logger.log('スケジュール実行エラー: ' + e.toString());
  }
}

