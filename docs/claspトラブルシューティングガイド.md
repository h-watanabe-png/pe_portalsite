# claspトラブルシューティングガイド

**作成日**: 2025年10月27日  
**バージョン**: 1.0

---

## 1. 概要

本ガイドは、Google Apps Script (GAS) のローカル開発環境で使用するclaspコマンドが正常に動作しない場合の対処法をまとめたものです。

---

## 2. よくある問題と解決方法

### 2.1. claspコマンドが応答しない

#### 症状
- `clasp --version` を実行しても何も表示されない
- `clasp push` がハングする
- コマンドプロンプトが応答しなくなる

#### 原因
- フォルダ削除による設定ファイルの破損
- PowerShell実行ポリシーの問題
- claspのグローバルインストールの問題

#### 解決方法

##### 方法1: npxを使用した実行（推奨）
```powershell
# バージョン確認
npx @google/clasp --version

# ログイン
npx @google/clasp login

# プッシュ
npx @google/clasp push

# プル
npx @google/clasp pull
```

##### 方法2: claspの再インストール
```powershell
# アンインストール
npm uninstall -g @google/clasp

# 再インストール
npm install -g @google/clasp

# 認証
clasp login
```

##### 方法3: PowerShell実行ポリシーの変更
```powershell
# 現在のポリシー確認
Get-ExecutionPolicy

# プロセス単位でポリシー変更
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# clasp実行
clasp --version
```

### 2.2. 認証エラー

#### 症状
- `clasp login` でエラーが発生
- 認証が完了しない
- ブラウザが開かない

#### 解決方法
```powershell
# 認証状態確認
npx @google/clasp login --status

# 再認証
npx @google/clasp logout
npx @google/clasp login
```

### 2.3. プロジェクト設定の破損

#### 症状
- `.clasp.json` ファイルが見つからない
- スクリプトIDが無効
- プッシュ時にエラーが発生

#### 解決方法
```powershell
# プロジェクト再設定
npx @google/clasp create --type standalone

# 既存プロジェクトに接続
npx @google/clasp clone [SCRIPT_ID]
```

---

## 3. 予防策

### 3.1. 重要なフォルダの保護
以下のフォルダは**絶対に削除しない**でください：
- `C:\Users\[ユーザー名]\Documents\projects\pe_portalsite\gas\`
- `C:\Users\[ユーザー名]\Documents\projects\pe_portalsite\docs\`

### 3.2. 定期的なバックアップ
```powershell
# プロジェクト全体のバックアップ
npx @google/clasp pull

# 設定ファイルのバックアップ
copy .clasp.json .clasp.json.backup
```

### 3.3. 環境の確認
```powershell
# Node.jsバージョン確認
node --version

# npmバージョン確認
npm --version

# claspバージョン確認
npx @google/clasp --version
```

---

## 4. 緊急時の対応

### 4.1. claspが完全に動作しない場合

#### 手動でのコード同期
1. GASエディタでコードを直接編集
2. ローカルファイルを手動でコピー&ペースト
3. 変更を手動で同期

#### 新しいプロジェクトとして再作成
```powershell
# 新しいプロジェクト作成
npx @google/clasp create --type standalone --title "PE Portal Backup"

# 既存コードをコピー
# 手動でファイルをコピー&ペースト
```

### 4.2. データ損失の防止
- Google Driveの自動バックアップを有効化
- 重要な設定は複数箇所に記録
- 定期的な手動バックアップの実施

---

## 5. 参考情報

### 5.1. 公式ドキュメント
- [clasp公式ドキュメント](https://github.com/google/clasp)
- [Google Apps Script ドキュメント](https://developers.google.com/apps-script)

### 5.2. 関連ファイル
- `.clasp.json`: claspの設定ファイル
- `appsscript.json`: GASプロジェクトの設定ファイル
- `.clasprc.json`: 認証情報（自動生成）

### 5.3. ログファイルの場所
- Windows: `%USERPROFILE%\.clasprc.json`
- ログ: PowerShellの実行履歴

---

## 6. 更新履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025/10/27 | 1.0 | 初版作成 |

---

**作成者**: h-watanabe  
**最終更新**: 2025年10月27日
