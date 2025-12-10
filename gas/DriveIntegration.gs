/**
 * PEポータルサイト - Google Drive連携
 * 
 * Google Driveに格納されたknowledgeやマニュアルとの連動
 * ユーザー自身が検索・参照・更新を容易にする
 */

/**
 * Google Driveフォルダからファイル一覧を取得
 * @param {string} folderId - フォルダID
 * @param {boolean} includeSubfolders - サブフォルダも含めるか
 * @return {Array<Object>} ファイル情報の配列
 */
function getDriveFiles(folderId, includeSubfolders = true) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = [];
    
    // フォルダ内のファイルを取得
    const folderFiles = folder.getFiles();
    while (folderFiles.hasNext()) {
      const file = folderFiles.next();
      files.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        type: file.getMimeType(),
        size: file.getSize(),
        lastModified: file.getLastUpdated(),
        folderId: folderId,
        folderName: folder.getName()
      });
    }
    
    // サブフォルダも含める場合
    if (includeSubfolders) {
      const subfolders = folder.getFolders();
      while (subfolders.hasNext()) {
        const subfolder = subfolders.next();
        const subfolderFiles = getDriveFiles(subfolder.getId(), true);
        files.push(...subfolderFiles);
      }
    }
    
    return files;
  } catch (e) {
    Logger.log('Google Driveファイル取得エラー: ' + e.toString());
    return [];
  }
}

/**
 * ナレッジベースフォルダからファイルを取得
 * @return {Array<Object>} ファイル情報の配列
 */
function getKnowledgeBaseFiles() {
  const config = getConfig();
  const knowledgeBaseFolderId = config.system.knowledgeBaseFolderId || '10RCcFHe1hh1V56_P1qLg5uNDxk23yNQC';
  
  // ナレッジベースフォルダのパスを構築
  // 03_データ参照/FAQ資料 または 03_データ参照/ナレッジベース
  const mainFolderId = '10RCcFHe1hh1V56_P1qLg5uNDxk23yNQC';
  const mainFolder = DriveApp.getFolderById(mainFolderId);
  
  let knowledgeFolder = null;
  const folders = mainFolder.getFolders();
  while (folders.hasNext()) {
    const folder = folders.next();
    if (folder.getName().includes('データ参照')) {
      const subfolders = folder.getFolders();
      while (subfolders.hasNext()) {
        const subfolder = subfolders.next();
        if (subfolder.getName().includes('FAQ') || subfolder.getName().includes('ナレッジ')) {
          knowledgeFolder = subfolder;
          break;
        }
      }
      if (knowledgeFolder) break;
    }
  }
  
  if (!knowledgeFolder) {
    Logger.log('ナレッジベースフォルダが見つかりません');
    return [];
  }
  
  return getDriveFiles(knowledgeFolder.getId(), true);
}

/**
 * ファイルメタデータをスプレッドシートにインデックス化
 * @param {Array<Object>} files - ファイル情報の配列
 * @return {Object} インデックス化結果
 */
function indexDriveFiles(files) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Driveファイルインデックス');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createDriveFileIndexSheet(spreadsheetId);
    }
    
    const existingData = getSheetDataOptimized(sheet);
    const existingFileIds = new Set();
    
    // 既存のファイルIDを取得（ヘッダー行をスキップ）
    for (let i = 1; i < existingData.length; i++) {
      existingFileIds.add(existingData[i][0]); // ファイルIDは1列目
    }
    
    const newFiles = [];
    const updatedFiles = [];
    
    files.forEach(file => {
      const fileId = file.id;
      const rowData = [
        fileId, // ファイルID
        file.name, // ファイル名
        file.url, // URL
        file.type, // MIMEタイプ
        file.size, // サイズ
        file.lastModified, // 最終更新日時
        file.folderId, // フォルダID
        file.folderName, // フォルダ名
        '', // タグ（後で設定可能）
        '', // 説明（後で設定可能）
        '', // カテゴリ（後で設定可能）
        true, // 有効
        new Date() // インデックス更新日時
      ];
      
      if (existingFileIds.has(fileId)) {
        // 既存ファイルの更新
        const rowIndex = findRowIndexByFileId(sheet, fileId);
        if (rowIndex > 0) {
          sheet.getRange(rowIndex, 2, 1, rowData.length - 1).setValues([rowData.slice(1)]);
          updatedFiles.push(fileId);
        }
      } else {
        // 新規ファイルの追加
        sheet.appendRow(rowData);
        newFiles.push(fileId);
      }
    });
    
    Logger.log(`Driveファイルをインデックス化しました: 新規${newFiles.length}件、更新${updatedFiles.length}件`);
    
    return {
      success: true,
      newFiles: newFiles.length,
      updatedFiles: updatedFiles.length,
      total: files.length
    };
  } catch (e) {
    Logger.log('Driveファイルインデックス化エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * Driveファイルインデックスシートを作成
 * @param {string} spreadsheetId - スプレッドシートID
 * @return {Sheet} 作成したシート
 */
function createDriveFileIndexSheet(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.insertSheet('Driveファイルインデックス');
  
  // ヘッダー行を設定
  const headers = [
    'ファイルID',
    'ファイル名',
    'URL',
    'MIMEタイプ',
    'サイズ',
    '最終更新日時',
    'フォルダID',
    'フォルダ名',
    'タグ',
    '説明',
    'カテゴリ',
    '有効',
    'インデックス更新日時'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行を固定
  sheet.setFrozenRows(1);
  
  // 列幅を調整
  sheet.setColumnWidth(1, 200); // ファイルID
  sheet.setColumnWidth(2, 300); // ファイル名
  sheet.setColumnWidth(3, 400); // URL
  sheet.setColumnWidth(9, 200); // タグ
  sheet.setColumnWidth(10, 400); // 説明
  
  Logger.log('Driveファイルインデックスシートを作成しました');
  
  return sheet;
}

/**
 * ファイルIDで行インデックスを検索
 * @param {Sheet} sheet - シート
 * @param {string} fileId - ファイルID
 * @return {number} 行インデックス（見つからない場合は-1）
 */
function findRowIndexByFileId(sheet, fileId) {
  const data = getSheetDataOptimized(sheet);
  const fileIdCol = 1; // ファイルIDは1列目
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][fileIdCol - 1] === fileId) {
      return i + 1; // 1始まりに変換
    }
  }
  
  return -1;
}

/**
 * ファイルを検索
 * @param {string} query - 検索クエリ（ファイル名、タグ、説明で検索）
 * @param {string} category - カテゴリ（オプション）
 * @param {number} limit - 取得件数（デフォルト: 50）
 * @return {Array<Object>} 検索結果
 */
function searchFiles(query, category = '', limit = 50) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Driveファイルインデックス');
    
    if (!sheet) {
      return [];
    }
    
    const data = getSheetDataOptimized(sheet);
    
    if (data.length <= 1) {
      return [];
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // 検索条件でフィルタリング
    const results = rows.filter(row => {
      // 有効なファイルのみ
      if (row[11] !== true && row[11] !== 'TRUE') {
        return false;
      }
      
      // カテゴリでフィルタ
      if (category && row[10] !== category) {
        return false;
      }
      
      // 検索クエリでフィルタ
      if (query) {
        const queryLower = query.toLowerCase();
        const fileName = (row[1] || '').toLowerCase();
        const tags = (row[8] || '').toLowerCase();
        const description = (row[9] || '').toLowerCase();
        
        if (!fileName.includes(queryLower) && 
            !tags.includes(queryLower) && 
            !description.includes(queryLower)) {
          return false;
        }
      }
      
      return true;
    });
    
    // 最終更新日時でソート（新しい順）
    results.sort((a, b) => {
      const dateA = a[5] instanceof Date ? a[5] : new Date(a[5]);
      const dateB = b[5] instanceof Date ? b[5] : new Date(b[5]);
      return dateB - dateA;
    });
    
    // 件数制限
    const limitedResults = results.slice(0, limit);
    
    // オブジェクトに変換
    return limitedResults.map(row => ({
      fileId: row[0],
      fileName: row[1],
      url: row[2],
      mimeType: row[3],
      size: row[4],
      lastModified: row[5],
      folderId: row[6],
      folderName: row[7],
      tags: row[8] ? row[8].split(',').map(t => t.trim()) : [],
      description: row[9],
      category: row[10]
    }));
  } catch (e) {
    Logger.log('ファイル検索エラー: ' + e.toString());
    return [];
  }
}

/**
 * ファイルメタデータを更新（ユーザー自身が更新可能）
 * @param {string} fileId - ファイルID
 * @param {Object} metadata - メタデータ（tags, description, category）
 * @return {Object} 更新結果
 */
function updateFileMetadata(fileId, metadata) {
  try {
    // 認証チェック
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return {
        success: false,
        error: 'アクセス権限がありません'
      };
    }
    
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Driveファイルインデックス');
    
    if (!sheet) {
      return {
        success: false,
        error: 'Driveファイルインデックスシートが見つかりません'
      };
    }
    
    const rowIndex = findRowIndexByFileId(sheet, fileId);
    if (rowIndex === -1) {
      return {
        success: false,
        error: 'ファイルが見つかりません'
      };
    }
    
    // メタデータを更新
    if (metadata.tags !== undefined) {
      sheet.getRange(rowIndex, 9).setValue(metadata.tags.join(', ')); // タグ
    }
    if (metadata.description !== undefined) {
      sheet.getRange(rowIndex, 10).setValue(metadata.description); // 説明
    }
    if (metadata.category !== undefined) {
      sheet.getRange(rowIndex, 11).setValue(metadata.category); // カテゴリ
    }
    
    // 更新日時を更新
    sheet.getRange(rowIndex, 13).setValue(new Date()); // インデックス更新日時
    
    Logger.log(`ファイルメタデータを更新しました: ${fileId}`);
    
    return {
      success: true,
      message: 'ファイルメタデータを更新しました'
    };
  } catch (e) {
    Logger.log('ファイルメタデータ更新エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * ファイルを追加（ユーザー自身が追加可能）
 * @param {string} fileId - ファイルID（Google DriveのファイルID）
 * @param {Object} metadata - メタデータ（tags, description, category）
 * @return {Object} 追加結果
 */
function addFileToIndex(fileId, metadata = {}) {
  try {
    // 認証チェック
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return {
        success: false,
        error: 'アクセス権限がありません'
      };
    }
    
    // Google Driveからファイル情報を取得
    let file;
    try {
      file = DriveApp.getFileById(fileId);
    } catch (e) {
      return {
        success: false,
        error: 'ファイルが見つかりません。ファイルIDを確認してください。'
      };
    }
    
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Driveファイルインデックス');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createDriveFileIndexSheet(spreadsheetId);
    }
    
    // 既に存在するか確認
    const existingRowIndex = findRowIndexByFileId(sheet, fileId);
    if (existingRowIndex > 0) {
      return {
        success: false,
        error: 'このファイルは既にインデックスに登録されています'
      };
    }
    
    // フォルダ情報を取得
    const parents = file.getParents();
    let folderId = '';
    let folderName = '';
    if (parents.hasNext()) {
      const folder = parents.next();
      folderId = folder.getId();
      folderName = folder.getName();
    }
    
    const rowData = [
      fileId, // ファイルID
      file.getName(), // ファイル名
      file.getUrl(), // URL
      file.getMimeType(), // MIMEタイプ
      file.getSize(), // サイズ
      file.getLastUpdated(), // 最終更新日時
      folderId, // フォルダID
      folderName, // フォルダ名
      (metadata.tags || []).join(', '), // タグ
      metadata.description || '', // 説明
      metadata.category || '', // カテゴリ
      true, // 有効
      new Date() // インデックス更新日時
    ];
    
    sheet.appendRow(rowData);
    
    Logger.log(`ファイルをインデックスに追加しました: ${fileId}`);
    
    return {
      success: true,
      message: 'ファイルをインデックスに追加しました',
      fileId: fileId
    };
  } catch (e) {
    Logger.log('ファイル追加エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * ナレッジベースフォルダを自動インデックス化（トリガー用）
 */
function autoIndexKnowledgeBase() {
  try {
    Logger.log('ナレッジベースの自動インデックス化を開始');
    
    const files = getKnowledgeBaseFiles();
    
    if (files.length === 0) {
      Logger.log('インデックス化するファイルが見つかりません');
      return {
        success: true,
        message: 'インデックス化するファイルが見つかりません',
        indexed: 0
      };
    }
    
    const result = indexDriveFiles(files);
    
    Logger.log(`ナレッジベースの自動インデックス化が完了: ${result.newFiles}件新規、${result.updatedFiles}件更新`);
    
    return result;
  } catch (e) {
    Logger.log('ナレッジベース自動インデックス化エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

