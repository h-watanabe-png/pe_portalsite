/**
 * PEポータルサイト - ナレッジ処理ハンドラー
 * 
 * ナレッジ検索・追加・更新のリクエストを処理
 */

/**
 * ナレッジ検索を処理
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleSearchKnowledge(e) {
  try {
    // POSTデータから取得を試みる
    let query = '';
    let category = '';
    let limit = 20;
    
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        query = postData.query || e.parameter.query || '';
        category = postData.category || e.parameter.category || '';
        limit = parseInt(postData.limit || e.parameter.limit || '20');
      } catch (parseError) {
        // JSON解析に失敗した場合はparameterから取得
        query = e.parameter.query || '';
        category = e.parameter.category || '';
        limit = parseInt(e.parameter.limit || '20');
      }
    } else {
      // parameterから取得
      query = e.parameter.query || '';
      category = e.parameter.category || '';
      limit = parseInt(e.parameter.limit || '20');
    }
    
    const result = searchKnowledge(query, category, limit);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('handleSearchKnowledge エラー: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: '検索中にエラーが発生しました: ' + err.toString()
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ナレッジ追加を処理
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleAddKnowledge(e) {
  try {
    let requestData = {};
    
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      // parameterから取得（フォールバック）
      requestData = {
        title: e.parameter.title || '',
        category: e.parameter.category || '',
        content: e.parameter.content || e.parameter.description || '',
        tags: e.parameter.tags ? e.parameter.tags.split(',') : [],
        fileId: e.parameter.fileId || ''
      };
    }
    
    const title = requestData.title || '';
    const category = requestData.category || '';
    const content = requestData.content || requestData.description || '';
    const tags = Array.isArray(requestData.tags) ? requestData.tags : 
                 (requestData.tags ? requestData.tags.split(',').map(t => t.trim()) : []);
    const fileId = requestData.fileId || '';
    
    // バリデーション
    if (!title || !category || !content) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'タイトル、カテゴリ、説明は必須です'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let result;
    if (fileId) {
      // ファイルIDが指定されている場合は、ファイルとして追加
      result = addFileAsKnowledge(fileId, category, tags, content);
    } else {
      // ナレッジベースに追加
      result = addKnowledgeByUser(title, category, content, tags, fileId);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('handleAddKnowledge エラー: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'ナレッジ追加中にエラーが発生しました: ' + err.toString()
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ナレッジ更新を処理
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleUpdateKnowledge(e) {
  try {
    const requestData = JSON.parse(e.postData.contents || '{}');
    
    const knowledgeId = requestData.knowledgeId || '';
    const updates = {
      title: requestData.title,
      category: requestData.category,
      content: requestData.content,
      tags: requestData.tags
    };
    
    const result = updateKnowledgeByUser(knowledgeId, updates);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log('handleUpdateKnowledge エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'ナレッジ更新中にエラーが発生しました'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ファイル追加を処理
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleAddFile(e) {
  try {
    const requestData = JSON.parse(e.postData.contents || '{}');
    
    const fileId = requestData.fileId || '';
    const category = requestData.category || '';
    const tags = requestData.tags || [];
    const description = requestData.description || '';
    
    const result = addFileToIndex(fileId, {
      tags: tags,
      description: description,
      category: category
    });
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log('handleAddFile エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'ファイル追加中にエラーが発生しました'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ファイルメタデータ更新を処理
 * @param {Object} e - リクエストパラメータ
 * @return {ContentService.TextOutput} JSONレスポンス
 */
function handleUpdateFileMetadata(e) {
  try {
    const requestData = JSON.parse(e.postData.contents || '{}');
    
    const fileId = requestData.fileId || '';
    const metadata = {
      tags: requestData.tags,
      description: requestData.description,
      category: requestData.category
    };
    
    const result = updateFileMetadata(fileId, metadata);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log('handleUpdateFileMetadata エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'ファイルメタデータ更新中にエラーが発生しました'
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

