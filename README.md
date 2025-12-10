# PEポータルサイト AI開発プロジェクト

## 📋 プロジェクト概要

**Cursor AIエージェントによる完全自動実装の実験プロジェクト**です。

`work/pe_portalsite`はGoogle Sitesベースで進める既存の案ですが、このプロジェクトでは、CursorのAIエージェントによる完全自動実装を実験します。

## 🎯 目的

このプロジェクトでは、**自分の工数をかけずに**、CursorのAIエージェントが以下を完全自動で実行することを目指します：

- スプレッドシートの作成
- GAS（Google Apps Script）の作成
- Google Driveへの保存
- GASプロジェクトへの保存
- 全部自動で行う

## 🔬 実験の背景

先日の原口さんとのメンター面談で、GASの制約で断念したが、**工夫次第でGASの制約を回避できる可能性がある**ことが分かりました。このプロジェクトでは、その可能性を実験的に検証します。

## ⚠️ 重要な注意事項

- **実験プロジェクト**: このプロジェクトは実験的な性質を持ちます
- **工数ゼロ**: 自分の工数をかけずに実験することが目的です
- **制約回避**: GASの制約を回避する工夫を検証します
- **完全自動化**: Pythonスクリプトを使用して、手動処理を減らします

## 🤖 自動化の仕組み

Cursor AIエージェントは、**Pythonスクリプトを自動作成・実行**して、すべての操作を自動化します：

- **スプレッドシートの作成・編集**: Google Sheets APIを使用
- **GASプロジェクトの作成・編集**: clasp pushを使用（subprocessで実行）
- **Git操作**: Gitコマンドを使用（subprocessで実行）
- **JSON/Markdownファイルの作成**: Pythonスクリプトで自動生成

詳細は `docs/自動実装ガイド.md` と `docs/Python自動化スクリプト一覧.md` を参照してください。

## 🚀 開発フロー

### 基本的な開発フロー（推奨）

GASのデプロイ回数に制限がないため、**直接デプロイしてWeb Appで動作確認**する方法を推奨します。

```bash
# 1. gas/フォルダ内のファイルを編集

# 2. コードをプッシュ
python scripts\deploy_gas.py --force

# 3. デプロイ管理（既存デプロイを更新）
python scripts\deploy_manage.py update

# 4. Web AppのURLで動作確認
# deploy_manage.pyがGASエディタを開き、手順を表示します
```

詳細は `docs/開発フローガイド.md` を参照してください。

## 📁 フォルダ構造

```
pe_portalsite_ai_develop/
├── README.md          # このファイル
├── docs/              # プロジェクトドキュメント
├── scripts/           # Python自動化スクリプト（Cursor AIエージェントが自動作成）
└── gas/               # GASプロジェクトファイル（clasp pushでGASに反映）
```

## 🔗 リソース情報

### Gitリポジトリ
- **URL**: `https://github.com/h-watanabe-png/pe_portalsite.git`
- **ブランチ**: `ai-develop`（既存プロジェクトの`main`ブランチとは分離）
- **注意**: 既存プロジェクト（`work/pe_portalsite`）には影響しません

### 既存リソース（作成済み）
- **Google DriveフォルダID**: `10RCcFHe1hh1V56_P1qLg5uNDxk23yNQC`
- **スプレッドシートID**: `1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0`
- **GASプロジェクトスクリプトID**: `1czGmHa0Zyz1QCS9VfTYBIpNZSIMJY2lACGtvbTv8fVHcWAekPM_fqFfT`

詳細は `docs/実装済みリソース情報.md` を参照してください。

## ⚠️ 安全性について

**重要**: この実験プロジェクトは既存プロジェクト（`work/pe_portalsite`）や他のリソースに**一切影響しません**。

- **ローカルファイル**: 完全に独立したフォルダ（`work/pe_portalsite_ai_develop/`）
- **GASプロジェクト**: 別のGASプロジェクト（スクリプトIDが異なる）
- **スプレッドシート**: 別のスプレッドシート（スプレッドシートIDが異なる）
- **Gitリポジトリ**: 別ブランチ（`ai-develop`）を使用

詳細は `docs/安全性確認と対策.md` を参照してください。

## 📝 ドキュメント

プロジェクトに関するドキュメントは`docs/`フォルダに格納されます。

---

## 📝 変更履歴 (Change History)

### 2025-12-03 21:00:00
- **変更内容**: Gitリポジトリ情報とPython自動化について追記、フォルダ構造を更新
- **変更理由**: Gitリポジトリ情報を記録し、Pythonスクリプトによる自動化について明確化するため
- **変更前**: 
  ```markdown
  - Gitリポジトリ情報が未記載
  - Python自動化について未記載
  - scripts/とgas/フォルダが未作成
  ```
- **変更後**: 
  ```markdown
  - Gitリポジトリ情報を追加（URL: https://github.com/h-watanabe-png/pe_portalsite.git）
  - Python自動化について追記
  - フォルダ構造を更新（scripts/, gas/を追加）
  - リソース情報セクションを追加
  ```
- **影響範囲**: README.mdの更新
- **関連タスク/Issue**: Gitリポジトリ情報の追加、Python自動化の明確化

### 2025-12-03 20:30:00
- **変更内容**: README.mdを更新し、プロジェクト憲章と実験計画書を作成
- **変更理由**: 実験プロジェクトとしての位置づけを明確化し、完全自動実装の目的と計画を記載するため
- **変更前**: 
  ```markdown
  - プロジェクト概要が簡易的
  - プロジェクト憲章と実験計画書が存在しない
  ```
- **変更後**: 
  ```markdown
  - README.mdを更新（実験プロジェクトとしての位置づけを明確化）
  - docs/プロジェクト憲章.mdを作成
  - docs/実験計画書.mdを作成
  - 完全自動実装の目的を記載
  - GAS制約回避の検証を目的として記載
  ```
- **影響範囲**: プロジェクトの目的と計画の明確化
- **関連タスク/Issue**: 実験プロジェクトの計画明確化

### 2025-12-03 20:18:00
- **変更内容**: プロジェクトフォルダとREADME.mdを作成
- **変更理由**: PEポータルサイトのAI開発プロジェクトを開始するため
- **変更前**: 
  ```markdown
  （フォルダが存在しない）
  ```
- **変更後**: 
  ```markdown
  - work/pe_portalsite_ai_develop/フォルダを作成
  - README.mdを作成
  ```
- **影響範囲**: 新規プロジェクトの開始
- **関連タスク/Issue**: PEポータルサイト AI開発プロジェクトの開始

