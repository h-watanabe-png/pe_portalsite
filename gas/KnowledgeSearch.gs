/**
 * PEポータルサイト - ナレッジ検索機能
 * 
 * ユーザー自身が検索・参照・更新を容易にする
 */

/**
 * ナレッジを検索
 * @param {string} query - 検索クエリ
 * @param {string} category - カテゴリ（オプション）
 * @param {number} limit - 取得件数（デフォルト: 20）
 * @return {Object} 検索結果
 */
function searchKnowledge(query, category = '', limit = 20) {
  try {
    // 認証チェック
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return {
        success: false,
        error: 'アクセス権限がありません'
      };
    }
    
    const results = {
      files: [],
      knowledgeBase: [],
      faq: []
    };
    
    // 1. Driveファイルを検索
    const files = searchFiles(query, category, limit);
    results.files = files.map(file => ({
      type: 'file',
      id: file.fileId,
      title: file.fileName,
      url: file.url,
      description: file.description || '',
      tags: file.tags || [],
      category: file.category || '',
      lastModified: file.lastModified,
      mimeType: file.mimeType
    }));
    
    // 2. ナレッジベースを検索
    const knowledgeBase = searchKnowledgeBase(query, category, limit);
    results.knowledgeBase = knowledgeBase;
    
    // 3. FAQを検索
    const faq = searchFAQ(query, category, limit);
    results.faq = faq;
    
    return {
      success: true,
      query: query,
      category: category,
      results: results,
      total: results.files.length + results.knowledgeBase.length + results.faq.length
    };
  } catch (e) {
    Logger.log('ナレッジ検索エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * ナレッジベースを検索
 * @param {string} query - 検索クエリ
 * @param {string} category - カテゴリ
 * @param {number} limit - 取得件数
 * @return {Array<Object>} 検索結果
 */
function searchKnowledgeBase(query, category = '', limit = 20) {
  try {
    // スナップショットキャッシュから検索
    const result = searchSnapshotCache('ナレッジベース', {
      '公開': true
    }, 1, limit);
    
    if (!result || !result.rows || result.rows.length === 0) {
      return [];
    }
    
    const { rows, headers } = result;
    
    // 列インデックスを取得
    const titleCol = headers.indexOf('タイトル');
    const categoryCol = headers.indexOf('カテゴリ');
    const contentCol = headers.indexOf('内容');
    const tagsCol = headers.indexOf('タグ');
    const publicCol = headers.indexOf('公開');
    const knowledgeIdCol = headers.indexOf('ナレッジID');
    const relatedRequestIdsCol = headers.indexOf('関連依頼ID');
    const createdAtCol = headers.indexOf('作成日');
    const updatedAtCol = headers.indexOf('更新日');
    const viewCountCol = headers.indexOf('参照回数');
    
    if (titleCol === -1 || categoryCol === -1) {
      // 列が見つからない場合は通常の方法で検索
      return searchKnowledgeBaseFallback(query, category, limit);
    }
    
    // 検索条件でフィルタリング
    const filteredRows = rows.filter(row => {
      // 公開されているもののみ
      if (row[publicCol] !== true && row[publicCol] !== 'TRUE') {
        return false;
      }
      
      // カテゴリでフィルタ
      if (category && row[categoryCol] !== category) {
        return false;
      }
      
      // 検索クエリでフィルタ
      if (query) {
        const queryLower = query.toLowerCase();
        const title = (row[titleCol] || '').toLowerCase();
        const content = (row[contentCol] || '').toLowerCase();
        const tags = (row[tagsCol] || '').toLowerCase();
        
        if (!title.includes(queryLower) && 
            !content.includes(queryLower) && 
            !tags.includes(queryLower)) {
          return false;
        }
      }
      
      return true;
    });
    
    // 検索条件でフィルタリング
    const results = rows.filter(row => {
      // 公開されているもののみ
      if (row[9] !== true && row[9] !== 'TRUE') {
        return false;
      }
      
      // カテゴリでフィルタ
      if (category && row[2] !== category) {
        return false;
      }
      
      // 検索クエリでフィルタ
      if (query) {
        const queryLower = query.toLowerCase();
        const title = (row[1] || '').toLowerCase();
        const content = (row[3] || '').toLowerCase();
        const tags = (row[5] || '').toLowerCase();
        
        if (!title.includes(queryLower) && 
            !content.includes(queryLower) && 
            !tags.includes(queryLower)) {
          return false;
        }
      }
      
      return true;
    });
    
    // 更新日でソート（新しい順）
    filteredRows.sort((a, b) => {
      const dateA = a[updatedAtCol] instanceof Date ? a[updatedAtCol] : new Date(a[updatedAtCol] || 0);
      const dateB = b[updatedAtCol] instanceof Date ? b[updatedAtCol] : new Date(b[updatedAtCol] || 0);
      return dateB - dateA;
    });
    
    // 件数制限
    const limitedResults = filteredRows.slice(0, limit);
    
    // オブジェクトに変換
    return limitedResults.map(row => ({
      type: 'knowledge',
      id: row[knowledgeIdCol] || '',
      title: row[titleCol] || '',
      category: row[categoryCol] || '',
      content: row[contentCol] || '',
      relatedRequestIds: row[relatedRequestIdsCol] ? row[relatedRequestIdsCol].toString().split(',').map(id => id.trim()) : [],
      tags: row[tagsCol] ? row[tagsCol].toString().split(',').map(t => t.trim()) : [],
      createdAt: row[createdAtCol] || new Date(),
      updatedAt: row[updatedAtCol] || new Date(),
      viewCount: row[viewCountCol] || 0
    }));
  } catch (e) {
    Logger.log('ナレッジベース検索エラー: ' + e.toString());
    // エラー時はフォールバック
    return searchKnowledgeBaseFallback(query, category, limit);
  }
}

/**
 * ナレッジベースを検索（フォールバック、通常の方法）
 * @param {string} query - 検索クエリ
 * @param {string} category - カテゴリ
 * @param {number} limit - 取得件数
 * @return {Array<Object>} 検索結果
 */
function searchKnowledgeBaseFallback(query, category = '', limit = 20) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('ナレッジベース');
    
    if (!sheet) {
      return [];
    }
    
    const data = getSheetDataOptimized(sheet, 60, false); // スナップショットを使用しない
    
    if (data.length <= 1) {
      return [];
    }
    
    const rows = data.slice(1);
    
    // 検索条件でフィルタリング
    const results = rows.filter(row => {
      // 公開されているもののみ
      if (row[9] !== true && row[9] !== 'TRUE') {
        return false;
      }
      
      // カテゴリでフィルタ
      if (category && row[2] !== category) {
        return false;
      }
      
      // 検索クエリでフィルタ
      if (query) {
        const queryLower = query.toLowerCase();
        const title = (row[1] || '').toLowerCase();
        const content = (row[3] || '').toLowerCase();
        const tags = (row[5] || '').toLowerCase();
        
        if (!title.includes(queryLower) && 
            !content.includes(queryLower) && 
            !tags.includes(queryLower)) {
          return false;
        }
      }
      
      return true;
    });
    
    // 更新日でソート（新しい順）
    results.sort((a, b) => {
      const dateA = a[7] instanceof Date ? a[7] : new Date(a[7]);
      const dateB = b[7] instanceof Date ? b[7] : new Date(b[7]);
      return dateB - dateA;
    });
    
    // 件数制限
    const limitedResults = results.slice(0, limit);
    
    // オブジェクトに変換
    return limitedResults.map(row => ({
      type: 'knowledge',
      id: row[0],
      title: row[1],
      category: row[2],
      content: row[3],
      relatedRequestIds: row[4] ? row[4].split(',').map(id => id.trim()) : [],
      tags: row[5] ? row[5].split(',').map(t => t.trim()) : [],
      createdAt: row[6],
      updatedAt: row[7],
      viewCount: row[8] || 0
    }));
  } catch (e) {
    Logger.log('ナレッジベース検索エラー（フォールバック）: ' + e.toString());
    return [];
  }
}

/**
 * FAQを検索
 * @param {string} query - 検索クエリ
 * @param {string} category - カテゴリ
 * @param {number} limit - 取得件数
 * @return {Array<Object>} 検索結果
 */
function searchFAQ(query, category = '', limit = 20) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('FAQ_公開インデックス');
    
    if (!sheet) {
      return [];
    }
    
    const data = getSheetDataOptimized(sheet);
    
    if (data.length <= 1) {
      return [];
    }
    
    const rows = data.slice(1);
    
    // 検索条件でフィルタリング
    const results = rows.filter(row => {
      // 公開されているもののみ
      if (row[5] !== true && row[5] !== 'TRUE') {
        return false;
      }
      
      // タグでカテゴリフィルタ（タグ列を使用）
      if (category && row[3] && !row[3].includes(category)) {
        return false;
      }
      
      // 検索クエリでフィルタ
      if (query) {
        const queryLower = query.toLowerCase();
        const title = (row[0] || '').toLowerCase();
        const description = (row[1] || '').toLowerCase();
        const tags = (row[3] || '').toLowerCase();
        
        if (!title.includes(queryLower) && 
            !description.includes(queryLower) && 
            !tags.includes(queryLower)) {
          return false;
        }
      }
      
      return true;
    });
    
    // 更新日でソート（新しい順）
    results.sort((a, b) => {
      const dateA = a[4] instanceof Date ? a[4] : new Date(a[4]);
      const dateB = b[4] instanceof Date ? b[4] : new Date(b[4]);
      return dateB - dateA;
    });
    
    // 件数制限
    const limitedResults = results.slice(0, limit);
    
    // オブジェクトに変換
    return limitedResults.map(row => ({
      type: 'faq',
      id: row[0] || '', // タイトルをIDとして使用（必要に応じて変更）
      title: row[0],
      description: row[1],
      link: row[2],
      tags: row[3] ? row[3].split(',').map(t => t.trim()) : [],
      updatedAt: row[4],
      published: row[5]
    }));
  } catch (e) {
    Logger.log('FAQ検索エラー: ' + e.toString());
    return [];
  }
}

/**
 * ナレッジを追加（ユーザー自身が追加可能）
 * @param {string} title - タイトル
 * @param {string} category - カテゴリ
 * @param {string} content - 内容
 * @param {Array<string>} tags - タグ
 * @param {string} fileId - 関連ファイルID（オプション）
 * @return {Object} 追加結果
 */
function addKnowledgeByUser(title, category, content, tags = [], fileId = '') {
  try {
    // 認証チェック
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return {
        success: false,
        error: 'アクセス権限がありません'
      };
    }
    
    // ナレッジベースに追加
    const result = addToKnowledgeBase(title, category, content, [], tags);
    
    if (!result.success) {
      return result;
    }
    
    // ファイルIDが指定されている場合は、ファイルメタデータも更新
    if (fileId) {
      updateFileMetadata(fileId, {
        tags: tags,
        description: content.substring(0, 200), // 最初の200文字を説明として使用
        category: category
      });
    }
    
    Logger.log(`ユーザーがナレッジを追加しました: ${result.knowledgeId}`);
    
    return {
      success: true,
      knowledgeId: result.knowledgeId,
      message: 'ナレッジを追加しました'
    };
  } catch (e) {
    Logger.log('ナレッジ追加エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * ナレッジを更新（ユーザー自身が更新可能）
 * @param {string} knowledgeId - ナレッジID
 * @param {Object} updates - 更新データ（title, category, content, tags）
 * @return {Object} 更新結果
 */
function updateKnowledgeByUser(knowledgeId, updates) {
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
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('ナレッジベース');
    
    if (!sheet) {
      return {
        success: false,
        error: 'ナレッジベースシートが見つかりません'
      };
    }
    
    const data = getSheetDataOptimized(sheet);
    
    // ナレッジIDで検索
    const knowledgeIdCol = 1; // ナレッジIDは1列目
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][knowledgeIdCol - 1] === knowledgeId) {
        rowIndex = i + 1; // 1始まりに変換
        break;
      }
    }
    
    if (rowIndex === -1) {
      return {
        success: false,
        error: 'ナレッジが見つかりません'
      };
    }
    
    // 更新
    if (updates.title !== undefined) {
      sheet.getRange(rowIndex, 2).setValue(updates.title); // タイトル
    }
    if (updates.category !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(updates.category); // カテゴリ
    }
    if (updates.content !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(updates.content); // 内容
    }
    if (updates.tags !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(updates.tags.join(', ')); // タグ
    }
    
    // 更新日時を更新
    sheet.getRange(rowIndex, 8).setValue(new Date()); // 更新日
    
    Logger.log(`ユーザーがナレッジを更新しました: ${knowledgeId}`);
    
    return {
      success: true,
      message: 'ナレッジを更新しました'
    };
  } catch (e) {
    Logger.log('ナレッジ更新エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * ファイルをナレッジベースに追加（ユーザー自身が追加可能）
 * @param {string} fileId - Google DriveのファイルID
 * @param {string} category - カテゴリ
 * @param {Array<string>} tags - タグ
 * @param {string} description - 説明
 * @return {Object} 追加結果
 */
function addFileAsKnowledge(fileId, category, tags = [], description = '') {
  try {
    // 認証チェック
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return {
        success: false,
        error: 'アクセス権限がありません'
      };
    }
    
    // ファイルをインデックスに追加
    const indexResult = addFileToIndex(fileId, {
      tags: tags,
      description: description,
      category: category
    });
    
    if (!indexResult.success) {
      return indexResult;
    }
    
    // ファイル情報を取得
    const file = DriveApp.getFileById(fileId);
    
    // ナレッジベースにも追加
    const knowledgeResult = addToKnowledgeBase(
      file.getName(),
      category,
      description || `Google Driveファイル: ${file.getUrl()}`,
      [],
      tags
    );
    
    Logger.log(`ファイルをナレッジベースに追加しました: ${fileId}`);
    
    return {
      success: true,
      fileId: fileId,
      knowledgeId: knowledgeResult.knowledgeId,
      message: 'ファイルをナレッジベースに追加しました'
    };
  } catch (e) {
    Logger.log('ファイル追加エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

