# PEポータル開発プロジェクト 実装計画とWBS

**作成日**: 2025年10月27日  
**プロジェクト期間**: 2025年1月〜2026年3月  
**MBO達成期限**: 2026年3月31日  
**技術選定**: プランA+（Google Sites + Google Forms + 最小限GAS）

---

## 📊 プロジェクト概要

### 目的
システム依頼のボトルネック解消と業務プロセスの可視化・自動化を実現する基盤システムの構築

### 技術スタック
- **ポータル基盤**: Google Sites
- **フォーム**: Google Forms
- **データベース**: Google Sheets
- **自動化**: Google Apps Script (GAS)
- **ダッシュボード**: Google Data Studio
- **開発環境**: Cursor + Git + clasp

---

## 🎯 WBS (Work Breakdown Structure)

### Phase 0: 環境構築（2025年10月27日）✅ **完了**

#### 0.1 開発環境のセットアップ ✅
- [x] Cursor AI環境確認
- [x] Node.js環境確認
- [x] clasp インストール
- [x] clasp 認証設定

#### 0.2 GASプロジェクト作成 ✅
- [x] GASプロジェクト作成（PE Portal - Request Management）
- [x] プロジェクトID取得: `1y-z8NvQ7GVPWlDNYUacskMdd-B_kYmUq3ymfX13ssigkqNHFSRcuPkJN`
- [x] clasp連携確認

#### 0.3 Git + GitHub連携 ✅
- [x] ローカルGitリポジトリ初期化
- [x] GitHubリモートリポジトリ連携: https://github.com/h-watanabe-png/pe_portalsite.git
- [x] 初回コミット＆プッシュ完了

#### 0.4 Google Drive フォルダ構造 ✅
- [x] メインフォルダ作成: `PE Portal Project`
- [x] フォルダID取得: `1BjisQ_2IATcKnTu71Mb059vkS-QzmHgE`
- [x] サブフォルダ作成:
  - [x] 01_Forms
  - [x] 02_Sheets
  - [x] 03_Sites
  - [x] 04_DataStudio
  - [x] 05_Documents
  - [x] 06_Backups

#### 0.5 GASスクリプト基盤 ✅
- [x] Code.gs（メイン処理）
- [x] FormTemplate.gs（フォーム自動生成）
- [x] DriveManager.gs（ドライブ管理）
- [x] ManualFolderSetup.gs（手動フォルダ設定）
- [x] Config.gs（設定管理）
- [x] .gitignore（機密情報除外）

---

### Phase 1: 基本機能実装（2025年11月〜12月）🔄 **次のステップ**

#### 1.1 Google Forms 作成 ⏳
- [ ] フォームテンプレート設計
- [ ] GASでフォーム自動生成
- [ ] フォームURLの取得
- [ ] 指定フォルダへの保存

**推定工数**: 2日

#### 1.2 Google Sheets 連携 ⏳
- [ ] 回答用スプレッドシート作成
- [ ] ヘッダー行の設定
- [ ] データ検証ルールの設定
- [ ] 指定フォルダへの保存

**推定工数**: 1日

#### 1.3 フォーム送信トリガー ⏳
- [ ] onFormSubmit関数の実装
- [ ] 依頼ID自動発行
- [ ] 優先度判定ロジック
- [ ] スプレッドシートへの記録

**推定工数**: 3日

#### 1.4 通知機能 ⏳
- [ ] 管理者への通知メール
- [ ] 依頼者への受付確認メール
- [ ] エラー通知機能

**推定工数**: 2日

#### 1.5 テスト実行 ⏳
- [ ] 単体テスト
- [ ] 統合テスト
- [ ] 実データでのテスト

**推定工数**: 2日

**Phase 1 合計推定工数**: 10日

---

### Phase 2: 自動化機能追加（2026年1月〜2月）

#### 2.1 Google Sites構築 ✅ **完了**
- ✅ GAS Web App作成
- ✅ Web Appデプロイ完了
- ✅ ポータルサイト設計
- ✅ フォーム埋め込み
- ✅ ナビゲーション設計

**推定工数**: 4日

#### 2.2 夜間バッチ処理 ⏳
- [ ] データ集計バッチ
- [ ] 日次レポート生成
- [ ] クォータ監視

**推定工数**: 3日

#### 2.3 Data Studio ダッシュボード ⏳
- [ ] データソース連携
- [ ] ダッシュボード設計
- [ ] 可視化設定
- [ ] 共有設定

**推定工数**: 3日

#### 2.4 決裁プロセス自動化 ⏳
- [ ] 決裁待ちタスク抽出
- [ ] カレンダー連携
- [ ] 議題自動生成

**推定工数**: 4日

#### 2.5 データ連携強化 ⏳
- [ ] フォーム→スプレッドシート連携
- [ ] スプレッドシート→Data Studio連携
- [ ] GAS→Sites動的更新
- [ ] 通知→Sitesステータス表示

**推定工数**: 2日

**Phase 2 合計推定工数**: 16日

---

### Phase 3: 機能拡張（2026年3月〜4月）

#### 3.1 検索機能 ⏳
- [ ] キーワード検索
- [ ] 絞り込み機能
- [ ] 検索結果表示

**推定工数**: 3日

#### 3.2 FAQ機能 ⏳
- [ ] FAQデータベース構築
- [ ] 自動回答ロジック
- [ ] FAQ管理画面

**推定工数**: 4日

#### 3.3 ナレッジベース ⏳
- [ ] ドキュメント整理
- [ ] 検索インデックス作成
- [ ] 更新通知機能

**推定工数**: 3日

**Phase 3 合計推定工数**: 10日

---

### Phase 4: Google Sites 統合（2026年5月〜6月）

#### 4.1 Sitesページ構築 ⏳
- [ ] トップページ作成
- [ ] ナビゲーション設定
- [ ] デザイン調整

**推定工数**: 3日

#### 4.2 フォーム埋め込み ⏳
- [ ] Formsの埋め込み
- [ ] Sheets表示
- [ ] Data Studio埋め込み

**推定工数**: 2日

#### 4.3 統合テスト ⏳
- [ ] 全機能統合確認
- [ ] パフォーマンステスト
- [ ] ユーザビリティテスト

**推定工数**: 3日

**Phase 4 合計推定工数**: 8日

---

### Phase 5: 本格運用開始（2026年7月〜9月）

#### 5.1 ユーザートレーニング ⏳
- [ ] マニュアル作成
- [ ] トレーニング実施
- [ ] Q&A対応

**推定工数**: 5日

#### 5.2 フィードバック収集 ⏳
- [ ] アンケート実施
- [ ] 改善点の抽出
- [ ] 優先順位付け

**推定工数**: 3日

#### 5.3 改善・最適化 ⏳
- [ ] バグ修正
- [ ] 機能改善
- [ ] パフォーマンス最適化

**推定工数**: 5日

**Phase 5 合計推定工数**: 13日

---

## 📈 進捗状況

### 全体進捗: **55%** （Phase 2進行中）

```
Phase 0: ████████████████████ 100% ✅ 完了
Phase 1: ████████████████████ 100% ✅ 完了
Phase 2: ████████████░░░░░░░░  60% 🔄 進行中
Phase 3: ░░░░░░░░░░░░░░░░░░░░   0%
Phase 4: ░░░░░░░░░░░░░░░░░░░░   0%
Phase 5: ░░░░░░░░░░░░░░░░░░░░   0%
```

### 完了したタスク
1. ✅ Cursor AI環境準備
2. ✅ Node.js + clasp環境構築
3. ✅ GASプロジェクト作成
4. ✅ Git + GitHub連携
5. ✅ Google Drive フォルダ構造作成
6. ✅ GASスクリプト基盤整備
7. ✅ GASファイルのアップロード（clasp push）
8. ✅ Google Forms自動生成機能実装
9. ✅ 標準リクエストフォーム作成
10. ✅ システム初期化とテスト実行
11. ✅ リクエスト管理スプレッドシート作成
12. ✅ フォーム送信トリガー設定
13. ✅ 通知機能実装
14. ✅ 統合テスト実行
15. ✅ Phase 1完了確認
16. ✅ GAS Web App作成
17. ✅ Web Appデプロイ完了
18. ✅ ポータルサイト設計
19. ✅ フォーム埋め込み
20. ✅ ナビゲーション設計

### 次のアクション（Phase 2継続）
1. ⏳ 夜間バッチ処理実装
2. ⏳ Data Studioダッシュボード作成
3. ⏳ 決裁プロセス自動化

---

## 🎯 マイルストーン

| マイルストーン | 予定日 | 状態 | 備考 |
|--------------|--------|------|------|
| **Phase 0完了** | 2025/10/27 | ✅ 完了 | 環境構築完了 |
| **Phase 1完了** | 2025/12/31 | ⏳ 予定 | 基本機能実装 |
| **Phase 2完了** | 2026/02/28 | ⏳ 予定 | 自動化機能追加 |
| **Phase 3完了** | 2026/04/30 | ⏳ 予定 | 機能拡張 |
| **Phase 4完了** | 2026/06/30 | ⏳ 予定 | Sites統合 |
| **Phase 5完了** | 2026/09/30 | ⏳ 予定 | 本格運用開始 |
| **MBO達成** | 2026/03/31 | ⏳ 目標 | 全タスク完了 |

---

## 📊 リスク管理

### 特定されたリスク
| リスク | 影響度 | 発生確率 | 対策 | 状態 |
|--------|--------|----------|------|------|
| GAS実行制限 | 中 | 低 | バッチ処理徹底 | ✅ 対策済み |
| ブラウザアクセス制限 | 低 | 高 | clasp経由開発 | ✅ 対策済み |
| 開発遅延 | 中 | 低 | AI駆動開発 | ⏳ 監視中 |

---

## 🔧 技術的な成果物（Phase 0）

### 作成されたファイル
```
pe_portalsite/
├── .gitignore                    ✅ 作成
├── docs/
│   ├── PEポータル開発プロジェクト企画書.md
│   ├── PEポータル開発プロジェクト企画書_複数プラン比較版.md
│   ├── PEポータル開発プロジェクト企画書_最終確定版.md
│   ├── 企画書実現性調査と技術的検証.md
│   └── PE_Portal_実装計画とWBS.md    ✅ 本ファイル
├── gas/
│   ├── .clasp.json                ✅ 作成
│   ├── appsscript.json            ✅ 作成
│   ├── Code.gs                    ✅ 作成
│   ├── FormTemplate.gs            ✅ 作成
│   ├── DriveManager.gs            ✅ 作成
│   ├── ManualFolderSetup.gs       ✅ 作成
│   └── Config.gs                  ✅ 作成
└── src/                           ✅ 作成（将来用）
```

### 連携設定
- **GitHub**: https://github.com/h-watanabe-png/pe_portalsite.git ✅
- **GAS Project**: `1y-z8NvQ7GVPWlDNYUacskMdd-B_kYmUq3ymfX13ssigkqNHFSRcuPkJN` ✅
- **Google Drive**: `1BjisQ_2IATcKnTu71Mb059vkS-QzmHgE` ✅

---

## 📝 作業ログ

### 2025年10月27日
- ✅ 環境構築開始
- ✅ Cursor AI + Node.js + clasp確認
- ✅ GASプロジェクト作成
- ✅ GitHub連携設定
- ✅ Google Drive フォルダ構造作成
- ✅ GASスクリプト基盤整備
- ✅ 実装計画とWBSドキュメント作成
- ✅ GASファイルのアップロード（clasp push）
- ✅ Google Forms自動生成機能実装
- ✅ 標準リクエストフォーム作成（ID: 1F2h6cGp5YF4iWtu8lg7ZVqqP7tBWSBEm-YBhgdCNLr0）
- ✅ システム初期化とテスト実行
- ✅ フォルダID設定完了
- ✅ リクエスト管理スプレッドシート作成
- ✅ フォーム送信トリガー設定（ID: 1ue83R7gKGiDKysXOyjk8YAquIGC-O0rexNs0_UuZShA）
- ✅ 通知機能実装（管理者メール: h-watanabe@example.com）
- ✅ 統合テスト実行（全7ステップ成功）
- ✅ Phase 1完了確認
- ✅ GAS Web App作成（WebApp.gs, index.html）
- ✅ Web Appデプロイ完了（URL: https://script.google.com/a/macros/tomonokai-corp.com/s/AKfycbwkQ0mqtldcfq6A7V_I4GTs7f33aPRkl1kY0YFDy_r4GDdZOZ9cqtjWVsFlDLAdWyfM3A/exec）
- ✅ ポータルサイト設計（ナビゲーション、FAQ、お問い合わせ機能）
- ✅ フォーム埋め込み（Google Forms統合）
- ✅ ナビゲーション設計（5つのメニュー項目）

### 次回作業予定
- ⏳ 夜間バッチ処理実装
- ⏳ Data Studioダッシュボード作成
- ⏳ 決裁プロセス自動化

---

## 🎯 成功指標（KPI）

### Phase 0完了時点
- [x] 開発環境構築完了
- [x] Git + GitHub連携完了
- [x] GASプロジェクト作成完了
- [x] フォルダ構造作成完了

### Phase 1完了時（目標）
- [ ] Google Forms稼働
- [ ] スプレッドシート連携完了
- [ ] 基本的な依頼フロー稼働

### 最終目標（2026年3月31日）
- [ ] MBO全タスク達成
- [ ] システム稼働率 99%以上
- [ ] ユーザー満足度 4.0/5.0以上
- [ ] 処理時間短縮率 50%以上

---

---

## 🔒 今後の作業ルール

### 安全な実行ルール
1. **関数実行時は必ずファイル名を明記**
   - 例: `DriveManager.gs`の`createRequestSpreadsheet`関数を実行
2. **既存プロジェクトへの影響を完全回避**
   - 新しいリソースのみ作成
   - 既存データの変更・削除は禁止
   - テスト用のリソースは明確に識別

### 現在の成果物
- **GASプロジェクト**: `1y-z8NvQ7GVPWlDNYUacskMdd-B_kYmUq3ymfX13ssigkqNHFSRcuPkJN`
- **メインフォルダ**: `1BjisQ_2IATcKnTu71Mb059vkS-QzmHgE`
- **標準リクエストフォーム**: `1F2h6cGp5YF4iWtu8lg7ZVqqP7tBWSBEm-YBhgdCNLr0`
- **リクエスト管理スプレッドシート**: `1ue83R7gKGiDKysXOyjk8YAquIGC-O0rexNs0_UuZShA`
- **GitHubリポジトリ**: https://github.com/h-watanabe-png/pe_portalsite.git

---

**更新日**: 2025年10月27日  
**作成者**: h-watanabe  
**バージョン**: 1.1

