"""
ローカル開発環境のセットアップスクリプト
Cursor AIエージェントが自動生成・実行
"""

import subprocess
import os
import json
from pathlib import Path

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent
GAS_DIR = PROJECT_ROOT / 'gas'

def setup_local_dev():
    """ローカル開発環境のセットアップ"""
    print("=" * 60)
    print("ローカル開発環境のセットアップを開始します")
    print("=" * 60)
    
    os.chdir(GAS_DIR)
    
    # 1. claspがインストールされているか確認
    print("\n[1/5] claspのインストール確認...")
    try:
        result = subprocess.run(['clasp', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ claspがインストールされています: {result.stdout.strip()}")
        else:
            print("⚠ claspがインストールされていません")
            print("   以下のコマンドでインストールしてください:")
            print("   npm install -g @google/clasp")
            return False
    except FileNotFoundError:
        print("⚠ claspコマンドが見つかりません")
        print("   以下のコマンドでインストールしてください:")
        print("   npm install -g @google/clasp")
        return False
    
    # 2. clasp loginの確認
    print("\n[2/5] claspログイン確認...")
    try:
        result = subprocess.run(['clasp', 'login', '--status'], 
                              capture_output=True, text=True)
        if result.returncode == 0 and 'Logged in' in result.stdout:
            print("✓ claspにログイン済みです")
        else:
            print("⚠ claspにログインしていません")
            print("   以下のコマンドでログインしてください:")
            print("   clasp login")
            print("   ブラウザが開くので、Googleアカウントでログインしてください")
    except Exception as e:
        print(f"⚠ claspログイン確認エラー: {e}")
    
    # 3. .clasp.jsonの確認
    print("\n[3/5] .clasp.jsonの確認...")
    clasp_json_path = GAS_DIR / '.clasp.json'
    if clasp_json_path.exists():
        with open(clasp_json_path, 'r', encoding='utf-8') as f:
            clasp_config = json.load(f)
        print(f"✓ .clasp.jsonが存在します")
        print(f"   スクリプトID: {clasp_config.get('scriptId', 'N/A')}")
    else:
        print("⚠ .clasp.jsonが見つかりません")
        return False
    
    # 4. ローカル開発用の設定ファイルを作成
    print("\n[4/5] ローカル開発用の設定ファイルを作成...")
    create_local_config()
    
    # 5. 開発フローの説明
    print("\n[5/5] 開発フローの説明...")
    print_development_workflow()
    
    print("\n" + "=" * 60)
    print("ローカル開発環境のセットアップが完了しました")
    print("=" * 60)
    return True

def create_local_config():
    """ローカル開発用の設定ファイルを作成"""
    # .claspignoreの作成（不要なファイルを除外）
    claspignore_content = """# ローカル開発用の一時ファイル
*.tmp
*.temp
*.log

# バックアップファイル
*.backup
*.bak

# IDE設定
.vscode/
.idea/

# その他
.DS_Store
Thumbs.db
"""
    claspignore_path = GAS_DIR / '.claspignore'
    if not claspignore_path.exists():
        with open(claspignore_path, 'w', encoding='utf-8') as f:
            f.write(claspignore_content)
        print("  ✓ .claspignoreを作成しました")
    else:
        print("  ✓ .claspignoreは既に存在します")
    
    # package.jsonの作成（claspのバージョン管理用）
    package_json = {
        "name": "pe-portal-site-gas",
        "version": "1.0.0",
        "description": "PEポータルサイト GASプロジェクト",
        "scripts": {
            "push": "clasp push",
            "push:force": "clasp push --force",
            "pull": "clasp pull",
            "deploy": "clasp deploy",
            "open": "clasp open",
            "logs": "clasp logs"
        },
        "devDependencies": {
            "@google/clasp": "^2.4.2"
        }
    }
    package_json_path = GAS_DIR / 'package.json'
    if not package_json_path.exists():
        with open(package_json_path, 'w', encoding='utf-8') as f:
            json.dump(package_json, f, indent=2, ensure_ascii=False)
        print("  ✓ package.jsonを作成しました")
    else:
        print("  ✓ package.jsonは既に存在します")

def print_development_workflow():
    """開発フローの説明を表示"""
    print("""
【ローカル開発フロー】

1. ローカルで開発
   - gas/フォルダ内のファイルを編集
   - ローカルで動作確認（HTML/CSS/JSはブラウザで確認可能）

2. 動作確認
   - HTMLファイル: ブラウザで直接開いて確認
   - JavaScript: ブラウザのコンソールで確認
   - GAS関数: ローカルでは実行できないため、デプロイ後に確認

3. デプロイ（完成したら）
   - python scripts\\deploy_gas.py を実行
   - または: cd gas && clasp push --force

4. Web Appで確認
   - GASエディタでWeb AppのURLを取得
   - ブラウザでアクセスして動作確認

【注意事項】
- GASの一部機能（Session.getActiveUser()など）はローカルでは動作しません
- ローカルで確認できるのは主にHTML/CSS/JavaScriptの見た目とロジック
- 実際の動作確認はデプロイ後にWeb Appで行う必要があります
""")

if __name__ == '__main__':
    success = setup_local_dev()
    if success:
        print("\n✓ すべての処理が正常に完了しました")
    else:
        print("\n✗ 一部の処理でエラーが発生しました")
        exit(1)

