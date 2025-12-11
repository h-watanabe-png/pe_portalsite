# PEポータルサイト AI開発プロジェクト IPアドレス制御とアクセス制限ガイド

**作成日**: 2025年12月10日  
**最終更新日**: 2025年12月10日

---

## 📋 GASにおけるIPアドレス制御の制約

### 重要な制約

**GASのWeb Appでは、直接IPアドレス制御はできません。**

理由：
- GASの`doGet`や`doPost`関数では、リクエスト元のIPアドレスを取得する方法が提供されていない
- `Session.getActiveUser()`や`Session.getEffectiveUser()`はユーザー情報のみ取得可能
- HTTPヘッダーからIPアドレスを取得することもできない（GASのセキュリティサンドボックス）

---

## 🔒 代替アクセス制御方法

### 方法1: Google OAuth認証 + ドメイン制限（現在実装済み・推奨）

**現在の実装**:
- 会社ドメイン（`@tomonokai-corp.com`）のユーザーのみアクセス可能
- ホワイトリストに登録された外部ユーザーもアクセス可能

**メリット**:
- ✅ GASの標準機能で実装可能
- ✅ ユーザー認証が確実
- ✅ アクセスログが残る

**実装箇所**: `gas/Auth.gs`の`checkAuthorization()`関数

### 方法2: ホワイトリスト方式（現在実装済み）

**現在の実装**:
- スプレッドシートの`システム設定`シートにホワイトリストを保存
- 会社ドメイン以外のユーザーはホワイトリストで制御

**メリット**:
- ✅ 柔軟にユーザーを追加・削除可能
- ✅ 非エンジニアでも管理可能

**実装箇所**: `gas/Auth.gs`の`getWhitelistEmails()`関数

### 方法3: Google Cloud Functions/Cloud Runとのハイブリッド構成（IP制御が必要な場合）

**アーキテクチャ**:
```
ユーザー → Cloud Functions/Cloud Run（IP制御） → GAS Web App
```

**実装方法**:
1. Cloud Functions/Cloud RunでIPアドレス制御を実装
2. IP制御を通過したリクエストのみGAS Web Appに転送
3. GAS Web Appは通常通り認証・認可を実行

**メリット**:
- ✅ IPアドレス制御が可能
- ✅ より高度なセキュリティ制御が可能
- ✅ GASの制約を回避

**デメリット**:
- ⚠️ 実装が複雑
- ⚠️ 追加のインフラコスト
- ⚠️ 運用が複雑になる

### 方法4: Google Cloud Armor（エンタープライズ向け）

**説明**:
- Google Cloud Armorは、Google Cloud Load Balancerと組み合わせて使用
- IPアドレスベースのアクセス制御が可能
- DDoS対策も同時に実現

**適用範囲**:
- Cloud RunやCloud Functions経由でアクセスする場合のみ
- GAS Web Appに直接適用は不可

---

## 🛡️ 現在のアクセス制御の強化案

### 案1: アクセスログの記録（推奨）

**実装内容**:
- アクセス日時、ユーザー、IPアドレス（取得可能な場合）を記録
- スプレッドシートの`アクセスログ`シートに保存

**メリット**:
- ✅ 不正アクセスの検知が可能
- ✅ アクセスパターンの分析が可能

**注意点**:
- GASではIPアドレスを直接取得できないため、ユーザー情報とアクセス日時のみ記録

### 案2: セッション管理の強化

**実装内容**:
- セッションIDを生成して管理
- 一定時間（例：30分）でセッションを無効化
- 同一ユーザーの同時セッション数を制限

**メリット**:
- ✅ セッションハイジャック対策
- ✅ 不正アクセスの検知が容易

### 案3: レート制限の実装

**実装内容**:
- ユーザーごとのリクエスト数を制限（例：1分間に10回まで）
- 超過した場合は一時的にアクセスを拒否

**メリット**:
- ✅ DDoS攻撃や不正アクセスの防止
- ✅ GASの同時実行数制限の保護

**実装方法**:
- `PropertiesService`でリクエスト数を記録
- タイムスタンプとリクエスト数を管理

---

## 🔍 IPアドレス制御が必要な場合の実装方法

### ハイブリッド構成の実装例

#### 1. Cloud FunctionsでのIP制御

```javascript
// Cloud Functions (Node.js)
const functions = require('@google-cloud/functions-framework');
const {google} = require('googleapis');

// 許可されたIPアドレスのリスト
const ALLOWED_IPS = [
  '203.0.113.0/24',  // 会社のIPレンジ
  '198.51.100.0/24'  // 別のIPレンジ
];

function isIPAllowed(ip) {
  return ALLOWED_IPS.some(range => {
    // CIDR表記のチェック（簡易版）
    // 実際の実装では、より詳細なIP範囲チェックが必要
    return ip.startsWith(range.split('/')[0].substring(0, 8));
  });
}

functions.http('proxyToGAS', async (req, res) => {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  // IPアドレスチェック
  if (!isIPAllowed(clientIP)) {
    res.status(403).send('Access denied: IP address not allowed');
    return;
  }
  
  // GAS Web Appにリクエストを転送
  const gasWebAppUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
  const response = await fetch(gasWebAppUrl, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body)
  });
  
  const data = await response.json();
  res.json(data);
});
```

#### 2. GAS側での認証（既存実装を維持）

```javascript
// gas/Auth.gs（既存の実装を維持）
function doGet(e) {
  const authResult = checkAuthorization();
  if (!authResult.authorized) {
    return HtmlService.createHtmlOutput('アクセス権限がありません');
  }
  // 通常の処理
}
```

---

## 📊 現在の実装状況

### 実装済みのアクセス制御

1. **ドメインベースのアクセス制御** ✅
   - 会社ドメイン（`@tomonokai-corp.com`）のユーザーのみアクセス可能
   - 実装: `gas/Auth.gs`

2. **ホワイトリスト方式** ✅
   - スプレッドシートで管理
   - 実装: `gas/Auth.gs`の`getWhitelistEmails()`

3. **GAS制約回避の設計** ✅
   - バッチ処理、チェックポイントパターン、パフォーマンス最適化
   - 実装: `gas/Utils.gs`, `gas/PerformanceOptimizer.gs`

### 未実装の機能

1. **IPアドレス制御** ❌
   - GASの制約により直接実装不可
   - 代替案: Cloud Functions/Cloud Runとのハイブリッド構成

2. **アクセスログ** ⚠️
   - 設計はあるが未実装
   - 実装可能（IPアドレスは取得不可）

3. **レート制限** ⚠️
   - 設計はあるが未実装
   - 実装可能

---

## 🎯 推奨される実装方針

### 現時点での推奨

1. **現在の実装を維持**（ドメイン制限 + ホワイトリスト）
   - GASの標準機能で実装可能
   - 運用が簡単
   - セキュリティも十分

2. **アクセスログの追加**（推奨）
   - 不正アクセスの検知
   - アクセスパターンの分析

3. **レート制限の追加**（オプション）
   - DDoS攻撃対策
   - GASの同時実行数制限の保護

### IPアドレス制御が必要な場合

1. **Cloud Functions/Cloud Runとのハイブリッド構成を検討**
   - 実装が複雑になるが、IP制御が可能
   - 追加のインフラコストが発生

2. **Google Cloud Armorの利用**（エンタープライズ向け）
   - より高度なセキュリティ制御
   - 追加のコストが発生

---

## 📝 実装例：アクセスログの追加

### 実装コード

```javascript
/**
 * アクセスログを記録
 * @param {string} userEmail - ユーザーメールアドレス
 * @param {string} path - アクセスしたパス
 * @param {string} method - HTTPメソッド（GET/POST）
 */
function logAccess(userEmail, path, method) {
  try {
    const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
    let sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('アクセスログ');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = createAccessLogSheet(spreadsheetId);
    }
    
    const now = new Date();
    const rowData = [
      now, // アクセス日時
      userEmail, // ユーザーメールアドレス
      path, // アクセスしたパス
      method, // HTTPメソッド
      Session.getActiveUser().getEmail() || '', // 実行ユーザー
      '' // IPアドレス（GASでは取得不可）
    ];
    
    sheet.appendRow(rowData);
    
    // 古いログを削除（1000件以上の場合）
    const data = sheet.getDataRange().getValues();
    if (data.length > 1000) {
      const rowsToDelete = data.length - 1000;
      sheet.deleteRows(2, rowsToDelete); // ヘッダー行を残す
    }
  } catch (e) {
    Logger.log('アクセスログ記録エラー: ' + e.toString());
  }
}

/**
 * アクセスログシートを作成
 */
function createAccessLogSheet(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.insertSheet('アクセスログ');
  
  const headers = [
    'アクセス日時',
    'ユーザーメールアドレス',
    'アクセスパス',
    'HTTPメソッド',
    '実行ユーザー',
    'IPアドレス'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  
  return sheet;
}
```

---

## 📝 変更履歴 (Change History)

### 2025-12-10 [時刻]
- **変更内容**: IPアドレス制御とアクセス制限ガイドを作成
- **変更理由**: IPアドレス制御の実現可能性と代替案を明確化するため
- **変更前**: 
  ```markdown
  （IPアドレス制御に関するガイドが存在しない）
  ```
- **変更後**: 
  ```markdown
  - work/pe_portalsite_ai_develop/docs/IPアドレス制御とアクセス制限ガイド.mdを作成
  - GASにおけるIPアドレス制御の制約を説明
  - 代替アクセス制御方法を提示（現在実装済みの方法を含む）
  - ハイブリッド構成の実装例を追加
  - アクセスログの実装例を追加
  ```
- **影響範囲**: アクセス制御の設計と実装方針
- **関連タスク/Issue**: IPアドレス制御の実現可能性の検討

---

**本ガイドは、GASにおけるIPアドレス制御の制約と代替案を説明しています。現在の実装（ドメイン制限 + ホワイトリスト）で十分なセキュリティが確保されています。**

