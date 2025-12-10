# Gitプッシュ問題の解決方法

**作成日**: 2025年12月10日  
**最終更新日**: 2025年12月10日

---

## ⚠️ 問題

GitHubのPush Protectionが認証ファイル（`md-csv-autodl-ed1adb38de50.json`）を検出してプッシュをブロックしています。

### エラーメッセージ
```
remote: error: GH013: Repository rule violations found for refs/heads/ai-develop.
remote: - GITHUB PUSH PROTECTION
remote:   - Push cannot contain secrets
remote:   - Google Cloud Service Account Credentials
remote:     locations:
remote:       - commit: 48dc2e4e933a48b1251711ab2c03bfd8db523095
remote:         path: md-csv-autodl-ed1adb38de50.json:1
```

---

## 🔧 解決方法

### 方法1: GitHubのURLから許可する（推奨・簡単）

1. **GitHubのURLにアクセス**
   - https://github.com/h-watanabe-png/pe_portalsite/security/secret-scanning/unblock-secret/36dnF7duqKoWjUOy8PLyah3Xacs

2. **「Allow secret」をクリック**
   - 認証ファイルをGitリポジトリに含めることを許可

3. **Gitプッシュを再実行**
   ```bash
   git push origin ai-develop
   ```

**注意**: この方法は、認証ファイルをGitリポジトリに含めることを許可します。セキュリティ上のリスクがあるため、**実験用ブランチ（`ai-develop`）でのみ使用**してください。

---

### 方法2: コミット履歴から認証ファイルを削除する（推奨・安全）

認証ファイルをGit履歴から完全に削除します。

#### 手順

1. **git filter-branchを使用して履歴を書き換え**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch md-csv-autodl-ed1adb38de50.json" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **強制プッシュ（注意: 履歴を書き換えるため）**
   ```bash
   git push origin ai-develop --force
   ```

**注意**: この方法は、Git履歴を書き換えるため、**他の人がこのブランチを使用している場合は問題が発生する可能性があります**。実験用ブランチ（`ai-develop`）でのみ使用してください。

---

### 方法3: 新しいコミットで認証ファイルを削除する（簡単・安全）

既存のコミット履歴はそのままで、新しいコミットで認証ファイルを削除します。

#### 手順

1. **認証ファイルを削除（既に完了）**
   ```bash
   git rm --cached md-csv-autodl-ed1adb38de50.json
   ```

2. **.gitignoreに追加（既に完了）**
   - `.gitignore`に`md-csv-autodl-ed1adb38de50.json`を追加

3. **コミット**
   ```bash
   git commit -m "[自動] 認証ファイルをGit管理から除外"
   ```

4. **GitHubのURLから許可**
   - https://github.com/h-watanabe-png/pe_portalsite/security/secret-scanning/unblock-secret/36dnF7duqKoWjUOy8PLyah3Xacs
   - 「Allow secret」をクリック

5. **Gitプッシュを再実行**
   ```bash
   git push origin ai-develop
   ```

**注意**: この方法でも、以前のコミット（`48dc2e4`）に認証ファイルが含まれているため、GitHubのPush Protectionがブロックする可能性があります。その場合は、方法1または方法2を使用してください。

---

## 📋 推奨される対応

### 実験用ブランチ（`ai-develop`）の場合

**方法1（GitHubのURLから許可）を推奨**します。

理由:
- 簡単で迅速
- 実験用ブランチなので、セキュリティリスクは限定的
- 履歴を書き換える必要がない

### 本番ブランチ（`main`）の場合

**方法2（コミット履歴から削除）を推奨**します。

理由:
- 認証ファイルをGit履歴から完全に削除できる
- セキュリティリスクを最小化できる

---

## 🔍 確認方法

### 認証ファイルがGit管理から除外されているか確認

```bash
git ls-files | grep md-csv-autodl-ed1adb38de50.json
```

何も表示されなければ、Git管理から除外されています。

### .gitignoreに追加されているか確認

```bash
cat .gitignore | grep md-csv-autodl-ed1adb38de50.json
```

表示されれば、.gitignoreに追加されています。

---

## 📝 変更履歴 (Change History)

### 2025-12-10 [時刻]
- **変更内容**: Gitプッシュ問題の解決方法ドキュメントを作成
- **変更理由**: GitHubのPush Protectionによるブロックを解決する方法を明確化するため
- **変更前**: 
  ```markdown
  （Gitプッシュ問題の解決方法ドキュメントが存在しない）
  ```
- **変更後**: 
  ```markdown
  - work/pe_portalsite_ai_develop/docs/Gitプッシュ問題の解決方法.mdを作成
  - 問題の説明を記載
  - 3つの解決方法を記載（GitHubのURLから許可、コミット履歴から削除、新しいコミットで削除）
  - 推奨される対応を記載
  - 確認方法を記載
  ```
- **影響範囲**: Gitプッシュ問題の解決方法の明確化
- **関連タスク/Issue**: Gitプッシュ問題の解決

---

**本ドキュメントは、GitHubのPush Protectionによるブロックを解決する方法を記載した文書です。**

