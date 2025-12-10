# PEポータルサイト AI開発プロジェクト Python自動化スクリプト一覧

**作成日**: 2025年12月3日  
**最終更新日**: 2025年12月3日

---

## 📋 概要

このドキュメントは、Cursor AIエージェントが**自動作成・実行するPythonスクリプト**の一覧です。

**基本原則**: 手動処理を減らすため、Cursor AIエージェントはPythonスクリプトを自動作成・実行して、すべての操作を自動化します。

---

## 🔧 必要なPythonライブラリ

### インストールコマンド

```bash
pip install google-auth google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

### 使用するライブラリ

- `google-auth` - Google API認証
- `google-api-python-client` - Google Sheets API、Google Drive API
- `google-auth-httplib2` - Google API認証（HTTP）
- `google-auth-oauthlib` - Google API認証（OAuth）
- `subprocess` - claspコマンド、Gitコマンドの実行（標準ライブラリ）
- `json` - JSONファイルの処理（標準ライブラリ）
- `os`, `pathlib` - ファイル操作（標準ライブラリ）

---

## 📝 Pythonスクリプト一覧

### 1. setup_spreadsheet.py

**目的**: スプレッドシートのセットアップ（11シートの作成、ヘッダー行の設定、初期データの設定）

**保存先**: `work/pe_portalsite_ai_develop/scripts/setup_spreadsheet.py`

**実装内容**:
- Google Sheets APIを使用して既存スプレッドシート「PEポータルサイト管理」に11シートを作成
- 各シートにヘッダー行を設定
- システム設定シートに初期データを設定
- ダッシュボード_集計シートに統計項目の行を追加

**実行方法**:
```bash
python work/pe_portalsite_ai_develop/scripts/setup_spreadsheet.py
```

---

### 2. setup_gas_project.py

**目的**: GASプロジェクトのセットアップ（ファイルの作成、clasp push）

**保存先**: `work/pe_portalsite_ai_develop/scripts/setup_gas_project.py`

**実装内容**:
- appsscript.jsonを作成・編集
- .clasp.jsonを作成・編集（スクリプトIDを設定）
- 基本的なGASスクリプトファイルを作成（Config.gs, Main.gs, BatchProcessor.gs, TriggerManager.gs）
- 基本的なHTMLファイルを作成（index.html, system-team-request.html, accounting-request.html, request-status.html, faq-help.html）
- 基本的なJavaScriptファイルを作成（embed-config.js, dashboard.js, form-handler.js, status-filter.js）
- 基本的なCSSファイルを作成（common.css）
- clasp pushでGASプロジェクトに反映

**実行方法**:
```bash
python work/pe_portalsite_ai_develop/scripts/setup_gas_project.py
```

---

### 3. setup_git.py

**目的**: Gitリポジトリのセットアップ（初期化、リモート設定、.gitignore作成）

**保存先**: `work/pe_portalsite_ai_develop/scripts/setup_git.py`

**実装内容**:
- Gitリポジトリを初期化（既に存在する場合はスキップ）
- リモートリポジトリを設定: `https://github.com/h-watanabe-png/pe_portalsite.git`
- **別ブランチ（`ai-develop`）を作成**（既存プロジェクトの`main`ブランチとは分離）
- .gitignoreを作成（node_modules, .clasp.json等を除外）
- 初期コミットを作成
- リモートにプッシュ（必要に応じて、`ai-develop`ブランチに）

**実行方法**:
```bash
python work/pe_portalsite_ai_develop/scripts/setup_git.py
```

---

### 4. create_json_files.py

**目的**: JSONファイルの作成（設定ファイル、マスターデータ）

**保存先**: `work/pe_portalsite_ai_develop/scripts/create_json_files.py`

**実装内容**:
- config.jsonを作成（システム設定）
- master_data.jsonを作成（マスターデータ、必要に応じて）
- ローカルに保存: `work/pe_portalsite_ai_develop/gas/`
- clasp pushでGASプロジェクトに反映

**実行方法**:
```bash
python work/pe_portalsite_ai_develop/scripts/create_json_files.py
```

---

### 5. create_markdown_files.py

**目的**: Markdownファイルの作成（ドキュメント、マニュアル）

**保存先**: `work/pe_portalsite_ai_develop/scripts/create_markdown_files.py`

**実装内容**:
- README.mdを作成（GASプロジェクト用）
- MANUAL.mdを作成（ユーザーマニュアル、必要に応じて）
- Google Drive APIを使用して「03_データ参照/参考資料/」フォルダに保存（推奨）
- または、GASプロジェクト内に保存（clasp pushで反映）

**実行方法**:
```bash
python work/pe_portalsite_ai_develop/scripts/create_markdown_files.py
```

---

### 6. git_commit_push.py

**目的**: Gitコミット・プッシュ（変更の自動コミット・プッシュ）

**保存先**: `work/pe_portalsite_ai_develop/scripts/git_commit_push.py`

**実装内容**:
- 変更をステージング（git add .）
- コミット（git commit -m "[自動] [コミットメッセージ]"）
- リモートにプッシュ（git push origin ai-develop）（既存プロジェクトの`main`ブランチには影響しない）

**実行方法**:
```bash
python work/pe_portalsite_ai_develop/scripts/git_commit_push.py
```

**注意事項**:
- コミットメッセージは実行時に指定可能
- エラーハンドリングを適切に実装（リモートが既に存在する場合など）

---

## 🔄 実行フロー（完全自動化）

### Phase 1: 基盤構築の実行フロー

```
1. setup_git.pyを実行（Gitリポジトリのセットアップ）
   ↓
2. setup_spreadsheet.pyを実行（スプレッドシートのセットアップ）
   ↓
3. setup_gas_project.pyを実行（GASプロジェクトのセットアップ）
   ↓
4. create_json_files.pyを実行（JSONファイルの作成、必要に応じて）
   ↓
5. create_markdown_files.pyを実行（Markdownファイルの作成、必要に応じて）
   ↓
6. git_commit_push.pyを実行（変更のコミット・プッシュ）
   ↓
7. 完了
```

### Cursor AIエージェントへの指示例

```
要件定義書と自動実装ガイドを参照して、Phase 1: 基盤構築を完全自動で実装してください。

実装手順：
1. Pythonスクリプトを自動作成（setup_git.py, setup_spreadsheet.py, setup_gas_project.py等）
2. Pythonスクリプトを順番に実行
3. 実行結果を確認
4. エラーが発生した場合は適切にエラーハンドリング
5. 完了後、git_commit_push.pyを実行して変更をコミット・プッシュ

既存リソース情報：
- Google DriveフォルダID: 10RCcFHe1hh1V56_P1qLg5uNDxk23yNQC
- スプレッドシートID: 1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0
- GASプロジェクトスクリプトID: 1czGmHa0Zyz1QCS9VfTYBIpNZSIMJY2lACGtvbTv8fVHcWAekPM_fqFfT
- GitリポジトリURL: https://github.com/h-watanabe-png/pe_portalsite.git
```

---

## 📋 実装チェックリスト

### Pythonスクリプトの作成
- [ ] setup_git.pyが作成されているか
- [ ] setup_spreadsheet.pyが作成されているか
- [ ] setup_gas_project.pyが作成されているか
- [ ] create_json_files.pyが作成されているか（必要に応じて）
- [ ] create_markdown_files.pyが作成されているか（必要に応じて）
- [ ] git_commit_push.pyが作成されているか

### Pythonスクリプトの実行
- [ ] setup_git.pyが正常に実行されたか
- [ ] setup_spreadsheet.pyが正常に実行されたか
- [ ] setup_gas_project.pyが正常に実行されたか
- [ ] create_json_files.pyが正常に実行されたか（必要に応じて）
- [ ] create_markdown_files.pyが正常に実行されたか（必要に応じて）
- [ ] git_commit_push.pyが正常に実行されたか

### エラーハンドリング
- [ ] エラーが発生した場合、適切にエラーメッセージを表示しているか
- [ ] エラーが発生した場合、処理を継続できるか（可能な範囲で）
- [ ] エラーログが記録されているか

---

## 🎯 Cursor AIエージェントへの指示テンプレート

### テンプレート1: Pythonスクリプトの作成と実行
```
要件定義書と自動実装ガイドを参照して、以下のPythonスクリプトを作成し、実行してください：

1. [スクリプト名].pyを作成（[目的]）
2. スクリプトを実行
3. 実行結果を確認
4. エラーが発生した場合は適切にエラーハンドリング
```

### テンプレート2: Phase 1の完全自動実装
```
要件定義書と自動実装ガイドを参照して、Phase 1: 基盤構築を完全自動で実装してください。

実装手順：
1. Pythonスクリプトを自動作成（setup_git.py, setup_spreadsheet.py, setup_gas_project.py等）
2. Pythonスクリプトを順番に実行
3. 実行結果を確認
4. エラーが発生した場合は適切にエラーハンドリング
5. 完了後、git_commit_push.pyを実行して変更をコミット・プッシュ

既存リソース情報：
- Google DriveフォルダID: 10RCcFHe1hh1V56_P1qLg5uNDxk23yNQC
- スプレッドシートID: 1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0
- GASプロジェクトスクリプトID: 1czGmHa0Zyz1QCS9VfTYBIpNZSIMJY2lACGtvbTv8fVHcWAekPM_fqFfT
- GitリポジトリURL: https://github.com/h-watanabe-png/pe_portalsite.git
```

---

## 📝 変更履歴 (Change History)

### 2025-12-03 [時刻]
- **変更内容**: Python自動化スクリプト一覧を作成
- **変更理由**: Cursor AIエージェントが自動作成・実行するPythonスクリプトの一覧を明確化するため
- **変更前**: 
  ```markdown
  （Python自動化スクリプト一覧が存在しない）
  ```
- **変更後**: 
  ```markdown
  - work/pe_portalsite_ai_develop/docs/Python自動化スクリプト一覧.mdを作成
  - 必要なPythonライブラリを記載
  - Pythonスクリプト一覧を記載（setup_git.py, setup_spreadsheet.py, setup_gas_project.py等）
  - 実行フローを記載
  - Cursor AIエージェントへの指示テンプレートを記載
  ```
- **影響範囲**: 実験プロジェクトのPython自動化スクリプトの明確化
- **関連タスク/Issue**: Python自動化スクリプト一覧の作成

---

**本ドキュメントは、Cursor AIエージェントが自動作成・実行するPythonスクリプトの一覧を記載した文書です。実装の進行に応じて適切に更新されます。**

