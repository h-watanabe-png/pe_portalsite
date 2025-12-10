/**
 * PEポータルサイト - パフォーマンス最適化
 * 
 * パフォーマンス最適化のための共通関数
 */

/**
 * スプレッドシートのデータを効率的に検索
 * @param {Sheet} sheet - シートオブジェクト
 * @param {number} searchCol - 検索する列（1始まり）
 * @param {*} searchValue - 検索値
 * @return {Array<Array>} マッチした行のデータ
 */
function searchSheetData(sheet, searchCol, searchValue) {
  const data = getSheetDataOptimized(sheet);
  
  if (data.length === 0) {
    return [];
  }
  
  // ヘッダー行をスキップ
  const header = data[0];
  const rows = data.slice(1);
  
  // 検索（クライアント側でフィルタリング）
  const matches = rows.filter(row => row[searchCol - 1] === searchValue);
  
  return matches;
}

/**
 * スプレッドシートのデータを効率的に更新
 * @param {Sheet} sheet - シートオブジェクト
 * @param {number} keyCol - キー列（1始まり）
 * @param {*} keyValue - キー値
 * @param {Object} updates - 更新するデータ（列番号: 値のマップ）
 */
function updateSheetRow(sheet, keyCol, keyValue, updates) {
  const data = getSheetDataOptimized(sheet);
  
  if (data.length === 0) {
    return false;
  }
  
  // ヘッダー行をスキップ
  const rows = data.slice(1);
  
  // 更新する行を検索
  const rowIndex = rows.findIndex(row => row[keyCol - 1] === keyValue);
  
  if (rowIndex === -1) {
    return false;
  }
  
  // 更新
  const actualRowIndex = rowIndex + 2; // ヘッダー行 + 1始まり
  
  for (const [col, value] of Object.entries(updates)) {
    sheet.getRange(actualRowIndex, parseInt(col)).setValue(value);
  }
  
  return true;
}

/**
 * スプレッドシートのデータを効率的に追加
 * @param {Sheet} sheet - シートオブジェクト
 * @param {Array} newRow - 追加する行のデータ
 */
function appendSheetRow(sheet, newRow) {
  // 単一行の追加は appendRow を使用（最適化されている）
  sheet.appendRow(newRow);
}

/**
 * スプレッドシートのデータを効率的に一括追加
 * @param {Sheet} sheet - シートオブジェクト
 * @param {Array<Array>} newRows - 追加する行のデータ配列
 */
function appendSheetRows(sheet, newRows) {
  if (!newRows || newRows.length === 0) {
    return;
  }
  
  const lastRow = sheet.getLastRow();
  const numCols = newRows[0].length;
  
  // 一括書き込み
  sheet.getRange(lastRow + 1, 1, newRows.length, numCols).setValues(newRows);
}

/**
 * ページネーション対応のデータ取得
 * @param {Sheet} sheet - シートオブジェクト
 * @param {number} page - ページ番号（1始まり）
 * @param {number} pageSize - 1ページあたりの件数
 * @return {Object} ページネーション情報とデータ
 */
function getPaginatedData(sheet, page, pageSize) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return {
      rows: [],
      totalRows: 0,
      totalPages: 0,
      currentPage: page
    };
  }
  
  // ヘッダー行を除く
  const totalRows = lastRow - 1;
  const totalPages = Math.ceil(totalRows / pageSize);
  
  // 必要な範囲のみを取得
  const startRow = (page - 1) * pageSize + 2; // ヘッダー行 + オフセット
  const endRow = Math.min(startRow + pageSize - 1, lastRow);
  
  const numCols = sheet.getLastColumn();
  const data = sheet.getRange(startRow, 1, endRow - startRow + 1, numCols)
    .getValues();
  
  return {
    rows: data,
    totalRows: totalRows,
    totalPages: totalPages,
    currentPage: page
  };
}

