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
    const query = e.parameter.query || '';
    const category = e.parameter.category || '';
    const limit = parseInt(e.parameter.limit || '20');
    
    const result = searchKnowledge(query, category, limit);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log('handleSearchKnowledge エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: '検索中にエラーが発生しました'
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
    const requestData = JSON.parse(e.postData.contents || '{}');
    
    const title = requestData.title || '';
    const category = requestData.category || '';
    const content = requestData.content || requestData.description || '';
    const tags = requestData.tags || [];
    const fileId = requestData.fileId || '';
    
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
  } catch (e) {
    Logger.log('handleAddKnowledge エラー: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'ナレッジ追加中にエラーが発生しました'
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

