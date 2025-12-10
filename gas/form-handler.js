/**
 * PEポータルサイト - フォーム処理用JavaScript
 * 
 * フォーム送信処理を管理
 */

/**
 * システムチーム依頼を送信
 */
function submitSystemTeamRequest() {
  const form = document.getElementById('system-team-request-form');
  const formData = new FormData(form);
  
  // フォームデータをオブジェクトに変換
  const requestData = {
    requesterName: formData.get('requesterName') || '',
    brand: formData.get('brand') || '',
    urgency: formData.get('urgency') || '',
    desiredDate: formData.get('desiredDate') || '',
    householdId: formData.get('householdId') || '',
    studentNumber: formData.get('studentNumber') || '',
    selectionNumber: formData.get('selectionNumber') || '',
    issue: formData.get('issue') || '',
    desiredAction: formData.get('desiredAction') || '',
    frequency: formData.get('frequency') || '',
    errorMessage: formData.get('errorMessage') || '',
    memo: formData.get('memo') || '',
    hasAttachment: formData.get('fileAttachment') ? true : false
  };
  
  // バリデーション
  if (!validateSystemTeamRequest(requestData)) {
    return;
  }
  
  // 送信ボタンを無効化
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = '送信中...';
  
  // エラーメッセージを非表示
  hideMessages();
  
  // ファイルがある場合は先にアップロード
  const fileInput = document.getElementById('file-attachment');
  if (fileInput.files.length > 0) {
    uploadFiles(fileInput.files, requestData);
  } else {
    // ファイルがない場合は直接送信
    sendRequest(requestData, 'system_team');
  }
}

/**
 * システムチーム依頼のバリデーション
 * @param {Object} data - リクエストデータ
 * @return {boolean} バリデーション結果
 */
function validateSystemTeamRequest(data) {
  if (!data.requesterName) {
    showError('依頼者氏名を入力してください');
    return false;
  }
  
  if (!data.brand) {
    showError('ブランドを選択してください');
    return false;
  }
  
  if (!data.urgency) {
    showError('緊急度を選択してください');
    return false;
  }
  
  if (!data.issue) {
    showError('発生している問題を入力してください');
    return false;
  }
  
  return true;
}

/**
 * ファイルをアップロード
 * @param {FileList} files - アップロードするファイル
 * @param {Object} requestData - リクエストデータ
 */
function uploadFiles(files, requestData) {
  // ファイルアップロード処理（実装は後で追加）
  // 現在はファイル情報をリクエストデータに含める
  requestData.fileCount = files.length;
  requestData.fileNames = Array.from(files).map(f => f.name).join(', ');
  
  // リクエストを送信
  sendRequest(requestData, 'system_team');
}

/**
 * リクエストを送信
 * @param {Object} requestData - リクエストデータ
 * @param {string} requestType - リクエストタイプ
 */
function sendRequest(requestData, requestType) {
  // POSTリクエストで送信
  const payload = {
    action: 'submit_request',
    requestType: requestType,
    data: requestData
  };
  
  fetch(window.location.href, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(result => onRequestSubmitted(result))
  .catch(error => onRequestError(error));
}

/**
 * リクエスト送信成功時の処理
 * @param {Object} result - 送信結果
 */
function onRequestSubmitted(result) {
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = false;
  submitBtn.textContent = '送信';
  
  if (result.success) {
    showSuccess('依頼を送信しました。依頼ID: ' + result.requestId);
    // フォームをリセット
    document.getElementById('system-team-request-form').reset();
  } else {
    showError(result.error || '送信に失敗しました');
  }
}

/**
 * リクエスト送信エラー時の処理
 * @param {Error} error - エラー
 */
function onRequestError(error) {
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = false;
  submitBtn.textContent = '送信';
  
  showError('送信に失敗しました。しばらく待ってから再試行してください。');
  console.error('送信エラー:', error);
}

/**
 * 成功メッセージを表示
 * @param {string} message - メッセージ
 */
function showSuccess(message) {
  const successElement = document.getElementById('success-message');
  successElement.textContent = message;
  successElement.style.display = 'block';
  
  // 3秒後に非表示
  setTimeout(() => {
    successElement.style.display = 'none';
  }, 3000);
}

/**
 * エラーメッセージを表示
 * @param {string} message - メッセージ
 */
function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
}

/**
 * メッセージを非表示
 */
function hideMessages() {
  document.getElementById('success-message').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
}

/**
 * フォーム送信処理（汎用）
 * @param {string} formId - フォームID
 * @param {string} requestType - リクエストタイプ
 */
function handleFormSubmit(formId, requestType) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error('フォームが見つかりません:', formId);
    return;
  }
  
  const formData = new FormData(form);
  const requestData = {};
  
  // フォームデータをオブジェクトに変換
  for (const [key, value] of formData.entries()) {
    requestData[key] = value;
  }
  
  // バリデーション
  if (requestType === 'system_team') {
    if (!validateSystemTeamRequest(requestData)) {
      return;
    }
  } else if (requestType === 'accounting') {
    if (!validateAccountingRequest(requestData)) {
      return;
    }
  }
  
  // 送信
  sendRequest(requestData, requestType);
}

/**
 * 経理依頼のバリデーション
 * @param {Object} data - リクエストデータ
 * @return {boolean} バリデーション結果
 */
function validateAccountingRequest(data) {
  if (!data.requesterName) {
    showError('依頼者氏名を入力してください');
    return false;
  }
  
  if (!data.brand) {
    showError('ブランドを選択してください');
    return false;
  }
  
  if (!data.requestContent) {
    showError('依頼内容詳細を入力してください');
    return false;
  }
  
  return true;
}
