# PEポータルサイト AI開発プロジェクト GAS制約回避アーキテクチャ設計書

**作成日**: 2025年12月10日  
**最終更新日**: 2025年12月10日

---

## 📋 設計方針

### 基本原則
1. **6分の壁を回避**: チェックポイントパターンで長時間処理を分割
2. **同時実行数制限への対応**: バッチ処理とキューイング
3. **メモリ効率の最適化**: 一括処理とストリーミング
4. **フロントエンド最適化**: 最小限のAPI呼び出しとキャッシュ
5. **エラーハンドリング**: 指数バックオフとリトライ機構

---

## 🏗️ アーキテクチャ概要

### 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                   フロントエンド（HTML/JS）                │
│  - 最小限のAPI呼び出し                                    │
│  - クライアント側キャッシュ                               │
│  - バッチリクエスト                                       │
└──────────────────┬──────────────────────────────────────┘
                   │ google.script.run (非同期)
                   │ または UrlFetchApp.fetch (同期)
                   ▼
┌─────────────────────────────────────────────────────────┐
│              GAS Web App (doGet/doPost)                  │
│  - 認証・認可チェック                                     │
│  - リクエストルーティング                                 │
│  - エラーハンドリング                                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              ビジネスロジック層                           │
│  - データ処理（バッチ処理）                               │
│  - チェックポイント管理                                   │
│  - トリガー管理                                           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              データアクセス層                             │
│  - SpreadsheetApp（一括読み書き）                        │
│  - PropertiesService（設定・キャッシュ）                  │
│  - CacheService（一時キャッシュ）                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 フロントエンドとバックエンドの連携設計

### 1. 通信パターン

#### パターン1: google.script.run（非同期、推奨）

**用途**: リアルタイムなUI更新、フォーム送信、データ取得

```javascript
// フロントエンド（HTML/JS）
function loadDashboard() {
  // 複数のデータを一度に取得（バッチリクエスト）
  google.script.run
    .withSuccessHandler(onSuccess)
    .withFailureHandler(onError)
    .getDashboardData(); // 1回の呼び出しで複数のデータを返す
}

function onSuccess(data) {
  // データを一度に更新（DOM操作を最小化）
  updateDashboard(data.stats, data.recentRequests, data.notifications);
}

function onError(error) {
  console.error('エラー:', error);
  showErrorMessage('データの取得に失敗しました。しばらく待ってから再試行してください。');
}
```

```javascript
// バックエンド（GAS）
function getDashboardData() {
  try {
    // 認証チェック
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      throw new Error('アクセス権限がありません');
    }
    
    // 複数のデータを一度に取得（API呼び出しを最小化）
    const stats = getDashboardStats();
    const recentRequests = getRecentRequests(10);
    const notifications = getNotifications(5);
    
    return {
      success: true,
      stats: stats,
      recentRequests: recentRequests,
      notifications: notifications
    };
  } catch (e) {
    Logger.log('getDashboardData エラー: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}
```

#### パターン2: CSV/JSONエクスポート（大量データ、推奨）

**用途**: 大量データの表示、ダッシュボード、データテーブル

```javascript
// フロントエンド（HTML/JS）
function loadLargeDataTable() {
  // スプレッドシートの公開CSVを直接取得（GASを経由しない）
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheetName = '依頼_統合管理_公開';
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  
  // CSVを取得してパース（クライアント側で処理）
  fetch(csvUrl)
    .then(response => response.text())
    .then(csv => {
      const data = parseCSV(csv);
      renderDataTable(data);
    })
    .catch(error => {
      console.error('データ取得エラー:', error);
      showErrorMessage('データの取得に失敗しました。');
    });
}
```

**メリット**:
- GASの実行時間を消費しない
- サーバー負荷が低い
- 転送速度が速い（数MBのデータでも数秒で取得可能）

#### パターン3: ストリーミング処理（長時間処理）

**用途**: 大量データの処理、レポート生成

```javascript
// バックエンド（GAS）
function processLargeData() {
  const startTime = new Date().getTime();
  const maxExecutionTime = 5 * 60 * 1000; // 5分30秒（安全マージン）
  
  // チェックポイントから再開
  const checkpoint = getCheckpoint();
  let currentRow = checkpoint.lastRow || 2;
  const totalRows = getTotalRows();
  
  const batchSize = 100; // 100行ずつ処理
  
  while (currentRow <= totalRows) {
    // 実行時間チェック
    const elapsed = new Date().getTime() - startTime;
    if (elapsed > maxExecutionTime) {
      // チェックポイントを保存
      saveCheckpoint({
        lastRow: currentRow,
        timestamp: new Date()
      });
      
      // 次の実行をトリガー
      ScriptApp.newTrigger('processLargeData')
        .timeBased()
        .after(1 * 60 * 1000) // 1分後
        .create();
      
      Logger.log(`処理を中断しました。次回 ${currentRow} 行目から再開します。`);
      return {
        success: true,
        message: '処理を継続中です。しばらくお待ちください。',
        progress: Math.round((currentRow / totalRows) * 100)
      };
    }
    
    // バッチ処理
    const batch = getRows(currentRow, batchSize);
    processBatch(batch);
    currentRow += batchSize;
  }
  
  // 処理完了
  clearCheckpoint();
  return {
    success: true,
    message: '処理が完了しました。',
    progress: 100
  };
}
```

---

## ⚡ パフォーマンス最適化

### 1. スプレッドシート操作の最適化

#### ❌ 悪い例（セル単位の書き込み）

```javascript
// これは非常に遅い（API呼び出しが大量発生）
function badExample() {
  const sheet = SpreadsheetApp.getActiveSheet();
  for (let i = 1; i <= 1000; i++) {
    sheet.getRange(i, 1).setValue('データ' + i); // 1000回のAPI呼び出し
  }
}
```

#### ✅ 良い例（一括書き込み）

```javascript
// これは高速（1回のAPI呼び出し）
function goodExample() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = [];
  
  // データを配列にまとめる
  for (let i = 1; i <= 1000; i++) {
    data.push(['データ' + i]);
  }
  
  // 一度に書き込み
  sheet.getRange(1, 1, data.length, 1).setValues(data); // 1回のAPI呼び出し
}
```

#### ✅ さらに良い例（範囲指定の最適化）

```javascript
// 必要な範囲のみを取得・更新
function optimizedExample() {
  const sheet = SpreadsheetApp.getActiveSheet();
  
  // データが存在する範囲のみを取得
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow > 0 && lastCol > 0) {
    // 必要な範囲のみを一括取得
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    
    // データを処理
    const processedData = processData(data);
    
    // 一括書き込み
    sheet.getRange(1, 1, processedData.length, processedData[0].length)
      .setValues(processedData);
  }
}
```

### 2. キャッシュの活用

#### PropertiesService（永続キャッシュ）

```javascript
/**
 * 設定値のキャッシュ（PropertiesService）
 * 用途: 頻繁にアクセスするが、変更が少ないデータ
 */
function getConfigCached() {
  const cache = PropertiesService.getScriptProperties();
  const cacheKey = 'system_config';
  const cached = cache.getProperty(cacheKey);
  
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // キャッシュが壊れている場合は再取得
    }
  }
  
  // キャッシュがない場合はスプレッドシートから取得
  const config = getConfigFromSpreadsheet();
  
  // キャッシュに保存（有効期限: 1時間）
  cache.setProperty(cacheKey, JSON.stringify(config));
  cache.setProperty(cacheKey + '_expires', 
    new Date().getTime() + (60 * 60 * 1000).toString());
  
  return config;
}
```

#### CacheService（一時キャッシュ）

```javascript
/**
 * 一時キャッシュ（CacheService）
 * 用途: 短時間で頻繁にアクセスするデータ
 */
function getDashboardStatsCached() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'dashboard_stats';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // キャッシュがない場合は計算
  const stats = calculateDashboardStats();
  
  // キャッシュに保存（有効期限: 5分）
  cache.put(cacheKey, JSON.stringify(stats), 300);
  
  return stats;
}
```

### 3. バッチ処理の実装

```javascript
/**
 * バッチ処理の実装例
 * 大量のデータを効率的に処理
 */
function processRequestsBatch(requestIds) {
  const batchSize = 50; // 50件ずつ処理
  const results = [];
  
  // バッチに分割
  for (let i = 0; i < requestIds.length; i += batchSize) {
    const batch = requestIds.slice(i, i + batchSize);
    
    // バッチ単位で処理
    const batchResults = processBatch(batch);
    results.push(...batchResults);
    
    // 実行時間チェック（安全マージン）
    const elapsed = new Date().getTime() - startTime;
    if (elapsed > 5 * 60 * 1000) {
      // 残りの処理を次の実行に委譲
      const remaining = requestIds.slice(i + batchSize);
      scheduleNextBatch(remaining);
      break;
    }
  }
  
  return results;
}

function processBatch(batch) {
  // スプレッドシートから一括取得
  const data = getDataByIds(batch);
  
  // 一括処理
  const processed = data.map(item => processItem(item));
  
  // 一括書き込み
  updateDataBatch(processed);
  
  return processed;
}
```

---

## 🛡️ 動作安定性の確保

### 1. エラーハンドリングとリトライ機構

#### 指数バックオフ（Exponential Backoff）

```javascript
/**
 * 指数バックオフ付きリトライ
 */
function fetchWithRetry(url, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true
      });
      
      if (response.getResponseCode() === 200) {
        return response;
      }
      
      // エラーレスポンスの場合はリトライ
      throw new Error(`HTTP ${response.getResponseCode()}`);
    } catch (e) {
      attempt++;
      
      if (attempt >= maxRetries) {
        Logger.log(`リトライ上限に達しました: ${url}`);
        throw e;
      }
      
      // 指数バックオフ: 1秒、2秒、4秒...
      const waitTime = Math.pow(2, attempt - 1) * 1000;
      Logger.log(`${waitTime}ms待機してからリトライします (試行 ${attempt}/${maxRetries})`);
      Utilities.sleep(waitTime);
    }
  }
}
```

### 2. 同時実行制御（LockService）

```javascript
/**
 * 同時実行制御の実装
 */
function updateCriticalData(data) {
  const lock = LockService.getDocumentLock();
  
  try {
    // ロック取得（最大30秒待機）
    if (lock.tryLock(30000)) {
      try {
        // クリティカルセクション（同時実行を防ぐ処理）
        const currentData = getCurrentData();
        const updatedData = mergeData(currentData, data);
        saveData(updatedData);
        
        return { success: true };
      } finally {
        // ロックを確実に解放
        lock.releaseLock();
      }
    } else {
      // ロック取得失敗（他の処理が実行中）
      return {
        success: false,
        error: '他の処理が実行中です。しばらく待ってから再試行してください。'
      };
    }
  } catch (e) {
    Logger.log('ロック処理エラー: ' + e.toString());
    return {
      success: false,
      error: '処理中にエラーが発生しました。'
    };
  }
}
```

### 3. タイムアウト対策

```javascript
/**
 * タイムアウト対策付き処理
 */
function processWithTimeout(processFunction, timeoutMs = 5 * 60 * 1000) {
  const startTime = new Date().getTime();
  
  // 定期的に実行時間をチェック
  const checkInterval = setInterval(() => {
    const elapsed = new Date().getTime() - startTime;
    if (elapsed > timeoutMs) {
      clearInterval(checkInterval);
      throw new Error('処理がタイムアウトしました');
    }
  }, 1000);
  
  try {
    const result = processFunction();
    clearInterval(checkInterval);
    return result;
  } catch (e) {
    clearInterval(checkInterval);
    throw e;
  }
}
```

---

## 📊 データ転送の最適化

### 1. CSV vs JSON の選択

#### 大量データ: CSV（推奨）

```javascript
// バックエンド: CSVエクスポート
function exportDataAsCSV() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // CSV形式に変換
  const csv = data.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  return ContentService.createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV);
}
```

```javascript
// フロントエンド: CSVパース
function loadDataFromCSV(csvUrl) {
  fetch(csvUrl)
    .then(response => response.text())
    .then(csv => {
      const data = parseCSV(csv);
      renderTable(data);
    });
}
```

#### 少量データ: JSON（推奨）

```javascript
// バックエンド: JSONエクスポート
function getDataAsJSON() {
  const data = getData();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 2. データ圧縮

```javascript
/**
 * データ圧縮（大量データの場合）
 */
function getCompressedData() {
  const data = getLargeData();
  const json = JSON.stringify(data);
  
  // 簡易的な圧縮（Base64エンコードはサイズを増やすため、実際には圧縮ライブラリが必要）
  // 注意: GASでは標準の圧縮ライブラリがないため、データ構造の最適化が重要
  return {
    compressed: true,
    data: json // 実際の実装では圧縮アルゴリズムを適用
  };
}
```

---

## 🔄 非同期処理とトリガー管理

### 1. バックグラウンド処理

```javascript
/**
 * バックグラウンド処理の実装
 */
function processInBackground(data) {
  // 処理をトリガーとして実行（非同期）
  const trigger = ScriptApp.newTrigger('processBackgroundTask')
    .timeBased()
    .after(1 * 1000) // 1秒後
    .create();
  
  // 処理データをPropertiesServiceに保存
  PropertiesService.getScriptProperties()
    .setProperty('background_task_data', JSON.stringify(data));
  
  return {
    success: true,
    message: '処理を開始しました。完了までしばらくお待ちください。'
  };
}

function processBackgroundTask() {
  // バックグラウンドで実行される処理
  const data = JSON.parse(
    PropertiesService.getScriptProperties().getProperty('background_task_data')
  );
  
  // 長時間処理を実行
  processLargeData(data);
  
  // 完了通知（Slack等）
  sendNotification('処理が完了しました');
}
```

### 2. キューイングシステム

```javascript
/**
 * キューイングシステムの実装
 */
function addToQueue(task) {
  const queue = getQueue();
  queue.push({
    id: Utilities.getUuid(),
    task: task,
    status: 'pending',
    createdAt: new Date()
  });
  saveQueue(queue);
  
  // キュー処理をトリガー
  processQueueIfNeeded();
}

function processQueueIfNeeded() {
  // 既に処理中の場合はスキップ
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return; // 他の処理が実行中
  }
  
  try {
    const queue = getQueue();
    const pendingTasks = queue.filter(t => t.status === 'pending');
    
    if (pendingTasks.length === 0) {
      return;
    }
    
    // 1つずつ処理（同時実行数を制御）
    const task = pendingTasks[0];
    task.status = 'processing';
    saveQueue(queue);
    
    try {
      executeTask(task);
      task.status = 'completed';
    } catch (e) {
      task.status = 'failed';
      task.error = e.toString();
    }
    
    saveQueue(queue);
    
    // 次のタスクがあれば、少し待ってから処理
    if (pendingTasks.length > 1) {
      ScriptApp.newTrigger('processQueueIfNeeded')
        .timeBased()
        .after(5 * 1000) // 5秒後
        .create();
    }
  } finally {
    lock.releaseLock();
  }
}
```

---

## 🎯 実装パターン集

### パターン1: ダッシュボード表示

```javascript
// バックエンド
function getDashboardData() {
  // キャッシュから取得を試みる
  const cached = getDashboardStatsCached();
  if (cached) {
    return cached;
  }
  
  // 複数のデータを一度に取得
  const stats = calculateStats();
  const recent = getRecentRequests(10);
  const notifications = getNotifications(5);
  
  const data = {
    stats: stats,
    recent: recent,
    notifications: notifications,
    timestamp: new Date()
  };
  
  // キャッシュに保存
  cacheDashboardStats(data);
  
  return data;
}
```

```javascript
// フロントエンド
function loadDashboard() {
  showLoading();
  
  google.script.run
    .withSuccessHandler(data => {
      hideLoading();
      renderDashboard(data);
    })
    .withFailureHandler(error => {
      hideLoading();
      showError('ダッシュボードの読み込みに失敗しました。');
    })
    .getDashboardData();
}
```

### パターン2: フォーム送信

```javascript
// フロントエンド
function submitForm(formData) {
  // バリデーション
  if (!validateForm(formData)) {
    showError('入力内容に誤りがあります。');
    return;
  }
  
  // 送信ボタンを無効化（二重送信防止）
  disableSubmitButton();
  
  google.script.run
    .withSuccessHandler(result => {
      enableSubmitButton();
      if (result.success) {
        showSuccess('送信が完了しました。');
        resetForm();
      } else {
        showError(result.error || '送信に失敗しました。');
      }
    })
    .withFailureHandler(error => {
      enableSubmitButton();
      showError('送信に失敗しました。しばらく待ってから再試行してください。');
    })
    .submitRequest(formData);
}
```

```javascript
// バックエンド
function submitRequest(formData) {
  try {
    // 認証チェック
    const authResult = checkAuthorization();
    if (!authResult.authorized) {
      return { success: false, error: 'アクセス権限がありません' };
    }
    
    // データ検証
    if (!validateRequestData(formData)) {
      return { success: false, error: 'データの検証に失敗しました' };
    }
    
    // スプレッドシートに保存（一括書き込み）
    const requestId = saveRequest(formData);
    
    // 通知送信（非同期）
    sendNotificationAsync(requestId);
    
    return {
      success: true,
      requestId: requestId,
      message: '依頼を送信しました。'
    };
  } catch (e) {
    Logger.log('submitRequest エラー: ' + e.toString());
    return {
      success: false,
      error: '処理中にエラーが発生しました。'
    };
  }
}
```

### パターン3: 大量データの表示

```javascript
// フロントエンド: ページネーション
function loadDataTable(page = 1, pageSize = 50) {
  showLoading();
  
  google.script.run
    .withSuccessHandler(data => {
      hideLoading();
      renderTable(data.rows);
      updatePagination(data.totalPages, page);
    })
    .withFailureHandler(error => {
      hideLoading();
      showError('データの読み込みに失敗しました。');
    })
    .getRequestsPaginated(page, pageSize);
}
```

```javascript
// バックエンド: ページネーション対応
function getRequestsPaginated(page, pageSize) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return { rows: [], totalPages: 0 };
  }
  
  // ヘッダー行を除く
  const totalRows = lastRow - 1;
  const totalPages = Math.ceil(totalRows / pageSize);
  
  // 必要な範囲のみを取得
  const startRow = (page - 1) * pageSize + 2; // ヘッダー行 + オフセット
  const endRow = Math.min(startRow + pageSize - 1, lastRow);
  
  const data = sheet.getRange(startRow, 1, endRow - startRow + 1, sheet.getLastColumn())
    .getValues();
  
  return {
    rows: data,
    totalPages: totalPages,
    currentPage: page
  };
}
```

---

## 📝 実装チェックリスト

### パフォーマンス
- [ ] スプレッドシート操作は一括処理（setValues/getValues）を使用
- [ ] キャッシュ（CacheService/PropertiesService）を活用
- [ ] 必要な範囲のみを取得（getLastRow/getLastColumnを使用）
- [ ] 大量データはCSVエクスポートまたはページネーションを使用
- [ ] google.script.runの呼び出しを最小化（バッチリクエスト）

### 安定性
- [ ] 6分制限対策（チェックポイントパターン）を実装
- [ ] エラーハンドリングとリトライ機構（指数バックオフ）を実装
- [ ] 同時実行制御（LockService）を実装
- [ ] タイムアウト対策を実装
- [ ] ログ記録（Logger.log）を実装

### セキュリティ
- [ ] 認証・認可チェックをすべてのエンドポイントに実装
- [ ] 入力データのバリデーションを実装
- [ ] エラーメッセージに機密情報を含めない
- [ ] ログに機密情報を記録しない

---

## 📝 変更履歴 (Change History)

### 2025-12-10 [時刻]
- **変更内容**: GAS制約回避アーキテクチャ設計書を作成
- **変更理由**: GASの制約を回避しつつ、処理速度、動作速度、動作安定性を確保するため
- **変更前**: 
  ```markdown
  （GAS制約回避アーキテクチャ設計書が存在しない）
  ```
- **変更後**: 
  ```markdown
  - work/pe_portalsite_ai_develop/docs/GAS制約回避アーキテクチャ設計書.mdを作成
  - アーキテクチャ概要を記載
  - フロントエンドとバックエンドの連携設計を記載
  - パフォーマンス最適化の実装例を記載
  - 動作安定性の確保方法を記載
  - データ転送の最適化方法を記載
  - 非同期処理とトリガー管理を記載
  - 実装パターン集を記載
  - 実装チェックリストを記載
  ```
- **影響範囲**: システム全体のアーキテクチャ設計と実装
- **関連タスク/Issue**: GAS制約回避アーキテクチャの実装

---

**本ドキュメントは、GASの制約を回避しつつ、高性能で安定したシステムを構築するための設計書です。**

