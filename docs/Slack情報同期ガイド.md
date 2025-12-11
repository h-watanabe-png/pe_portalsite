# PEポータルサイト AI開発プロジェクト Slack情報同期ガイド

**作成日**: 2025年12月10日  
**最終更新日**: 2025年12月10日

---

## 📋 概要

このガイドでは、Slack APIからユーザー情報とチャンネル情報を取得してスプレッドシートに書き込む方法を説明します。

**目的**: GASアプリとSlack通知などを連携させるため、Slackのユーザー情報とチャンネル情報をスプレッドシートに保存します。

---

## 🔧 設定方法

### 1. slack_config.jsonの設定

プロジェクトルートに`slack_config.json`ファイルを作成し、以下の内容を記述します：

```json
{
  "slack_bot_token": "xoxb-your-bot-token-here",
  "s-hometutor_id": "T01234567"
}
```

**設定項目:**
- `slack_bot_token`: Slack Bot Token（`xoxb-`で始まるトークン）
- `s-hometutor_id`: SlackワークスペースID（`T`で始まるID）

**注意**: 
- `slack_bot_token`と`s-hometutor_id`は、Slack APIの認証に使用されます
- トークンは機密情報のため、Gitにコミットしないでください（`.gitignore`に追加済み）

### 2. GASスクリプトプロパティの設定

GASでSlack情報を同期する場合は、スクリプトプロパティに以下を設定します：

1. GASエディタで「プロジェクトの設定」→「スクリプト プロパティ」を開く
2. 以下のプロパティを追加：
   - `slack_bot_token`: Slack Bot Token
   - `s-hometutor_id`: SlackワークスペースID

**設定方法（GASエディタ）:**
```
ファイル → プロジェクトの設定 → スクリプト プロパティ
```

---

## 🐍 Pythonスクリプトでの実行（ローカル開発）

### 必要なライブラリのインストール

```bash
pip install requests google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 実行方法

```bash
python scripts/sync_slack_info.py
```

### 認証方法

Pythonスクリプトは以下のいずれかの認証方法をサポートします：

1. **OAuth2認証（token.json）**
   - プロジェクトルートに`token.json`を配置
   - Google OAuth2認証フローを実行してトークンを取得

2. **サービスアカウント認証（service_account.json）**
   - プロジェクトルートに`service_account.json`を配置
   - Google Cloud Consoleでサービスアカウントを作成し、JSONキーをダウンロード

3. **環境変数（GOOGLE_SERVICE_ACCOUNT_JSON）**
   - 環境変数`GOOGLE_SERVICE_ACCOUNT_JSON`にサービスアカウント情報を設定

### 実行結果

スクリプトを実行すると、以下の処理が行われます：

1. Slack APIからユーザー情報を取得
2. Slack APIからチャンネル情報を取得
3. スプレッドシートに`Slack_ユーザー`シートと`Slack_チャンネル`シートを作成（存在しない場合）
4. 取得した情報をスプレッドシートに書き込み

---

## 📊 GASスクリプトでの実行

### 実行方法

GASエディタで以下の関数を実行します：

```javascript
syncSlackInfo()
```

または、トリガーを設定して定期的に実行することもできます。

### トリガーの設定

1. GASエディタで「トリガー」を開く
2. 「トリガーを追加」をクリック
3. 以下の設定でトリガーを作成：
   - **実行する関数**: `syncSlackInfo`
   - **イベントのソース**: 時間主導型
   - **時間ベースのトリガー**: 日タイマー
   - **時刻**: 午前1時〜2時（推奨）

### 実行結果

GASスクリプトを実行すると、以下の処理が行われます：

1. スクリプトプロパティから`slack_bot_token`と`s-hometutor_id`を取得
2. Slack APIからユーザー情報を取得
3. Slack APIからチャンネル情報を取得
4. スプレッドシートに`Slack_ユーザー`シートと`Slack_チャンネル`シートを作成（存在しない場合）
5. 取得した情報をスプレッドシートに書き込み

---

## 📊 スプレッドシートのシート構成

### Slack_ユーザーシート

| 列名 | データ型 | 説明 |
|------|----------|------|
| ユーザーID | 文字列 | SlackユーザーID |
| 表示名 | 文字列 | 表示名（display_name） |
| 実名 | 文字列 | 実名（real_name） |
| メールアドレス | 文字列 | メールアドレス |
| ステータス | 文字列 | ステータス（active/inactive等） |
| 削除済み | 文字列 | 削除済みかどうか（はい/いいえ） |
| ボット | 文字列 | ボットかどうか（はい/いいえ） |
| タイムゾーン | 文字列 | タイムゾーン |
| 最終更新日時 | 数値 | 最終更新日時（Unixタイムスタンプ） |

### Slack_チャンネルシート

| 列名 | データ型 | 説明 |
|------|----------|------|
| チャンネルID | 文字列 | SlackチャンネルID |
| チャンネル名 | 文字列 | チャンネル名 |
| 説明 | 文字列 | チャンネルの説明（topicまたはpurpose） |
| 作成日時 | 数値 | 作成日時（Unixタイムスタンプ） |
| メンバー数 | 数値 | メンバー数 |
| プライベート | 文字列 | プライベートチャンネルかどうか（はい/いいえ） |
| アーカイブ済み | 文字列 | アーカイブ済みかどうか（はい/いいえ） |
| 共有チャンネル | 文字列 | 共有チャンネルかどうか（はい/いいえ） |
| 最終更新日時 | 数値 | 最終更新日時（Unixタイムスタンプ） |

---

## 🔗 Slack APIの権限

Slack Bot Tokenには以下のスコープが必要です：

- `users:read` - ユーザー情報の読み取り
- `channels:read` - パブリックチャンネルの読み取り
- `groups:read` - プライベートチャンネルの読み取り

**Slack Appの設定方法:**
1. [Slack API](https://api.slack.com/apps)でアプリを作成
2. 「OAuth & Permissions」で上記のスコープを追加
3. 「Install App to Workspace」でワークスペースにインストール
4. 「Bot User OAuth Token」をコピーして`slack_bot_token`に設定

---

## 🚨 エラーハンドリング

### Pythonスクリプトのエラー

**エラー: slack_bot_token が設定されていません**
- `slack_config.json`の`slack_bot_token`を確認してください

**エラー: Google認証情報が見つかりません**
- `token.json`、`service_account.json`、または環境変数を設定してください

**エラー: Slack API エラー**
- Bot Tokenが正しいか確認してください
- 必要なスコープが設定されているか確認してください

### GASスクリプトのエラー

**エラー: slack_bot_tokenがスクリプトプロパティに設定されていません**
- スクリプトプロパティに`slack_bot_token`を設定してください

**エラー: Slack API エラー**
- Bot Tokenが正しいか確認してください
- 必要なスコープが設定されているか確認してください

---

## 📝 使用例

### Pythonスクリプトでの定期実行

```bash
# cronで毎日午前2時に実行
0 2 * * * cd /path/to/project && python scripts/sync_slack_info.py
```

### GASスクリプトでの定期実行

1. GASエディタで「トリガー」を開く
2. 「トリガーを追加」をクリック
3. 以下の設定でトリガーを作成：
   - **実行する関数**: `syncSlackInfo`
   - **イベントのソース**: 時間主導型
   - **時間ベースのトリガー**: 日タイマー
   - **時刻**: 午前2時

---

## 🔄 更新頻度の推奨

- **推奨**: 1日1回（深夜に実行）
- **最小**: 1週間1回
- **最大**: 1時間1回（API制限に注意）

---

## 📝 変更履歴 (Change History)

### 2025-12-10 [時刻]
- **変更内容**: Slack情報同期ガイドを作成
- **変更理由**: Slack情報をスプレッドシートに同期する機能を追加するため
- **変更前**: 
  ```markdown
  （Slack情報同期ガイドが存在しない）
  ```
- **変更後**: 
  ```markdown
  - work/pe_portalsite_ai_develop/docs/Slack情報同期ガイド.mdを作成
  - slack_config.jsonの設定方法を記載
  - Pythonスクリプトでの実行方法を記載
  - GASスクリプトでの実行方法を記載
  - スプレッドシートのシート構成を記載
  - Slack APIの権限設定を記載
  - エラーハンドリングを記載
  ```
- **影響範囲**: Slack情報同期機能の追加
- **関連タスク/Issue**: Slack情報同期機能の実装

---

**本ガイドは、Slack情報をスプレッドシートに同期する機能の使用方法を説明する文書です。**

