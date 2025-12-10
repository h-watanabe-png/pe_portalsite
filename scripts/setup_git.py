"""
Gitリポジトリのセットアップスクリプト
Cursor AIエージェントが自動生成・実行
"""

import subprocess
import os
from pathlib import Path

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent
os.chdir(PROJECT_ROOT)

def setup_git():
    """Gitリポジトリのセットアップ"""
    print("=" * 60)
    print("Gitリポジトリのセットアップを開始します")
    print("=" * 60)
    
    # 1. Gitリポジトリを初期化（既に存在する場合はスキップ）
    if not os.path.exists('.git'):
        print("\n[1/5] Gitリポジトリを初期化...")
        try:
            subprocess.run(['git', 'init'], check=True)
            print("✓ Gitリポジトリを初期化しました")
        except subprocess.CalledProcessError as e:
            print(f"✗ エラー: Gitリポジトリの初期化に失敗しました: {e}")
            return False
    else:
        print("\n[1/5] Gitリポジトリは既に初期化されています")
    
    # 2. リモートリポジトリを設定
    print("\n[2/5] リモートリポジトリを設定...")
    remote_url = 'https://github.com/h-watanabe-png/pe_portalsite.git'
    try:
        # 既存のリモートを確認
        result = subprocess.run(['git', 'remote', 'get-url', 'origin'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            if result.stdout.strip() == remote_url:
                print("✓ リモートリポジトリは既に設定されています")
            else:
                print(f"⚠ 既存のリモートURLが異なります: {result.stdout.strip()}")
                print(f"  新しいURLに更新します: {remote_url}")
                subprocess.run(['git', 'remote', 'set-url', 'origin', remote_url], check=True)
                print("✓ リモートリポジトリを更新しました")
        else:
            # リモートが存在しない場合は追加
            subprocess.run(['git', 'remote', 'add', 'origin', remote_url], check=True)
            print("✓ リモートリポジトリを設定しました")
    except subprocess.CalledProcessError as e:
        print(f"✗ エラー: リモートリポジトリの設定に失敗しました: {e}")
        return False
    
    # 3. 別ブランチ（ai-develop）を作成
    print("\n[3/5] 別ブランチ（ai-develop）を作成...")
    try:
        # 現在のブランチを確認
        result = subprocess.run(['git', 'branch', '--show-current'], 
                              capture_output=True, text=True)
        current_branch = result.stdout.strip()
        
        # ai-developブランチが存在するか確認
        result = subprocess.run(['git', 'branch', '--list', 'ai-develop'], 
                              capture_output=True, text=True)
        if 'ai-develop' in result.stdout:
            print("✓ ai-developブランチは既に存在します")
            subprocess.run(['git', 'checkout', 'ai-develop'], check=True)
            print("✓ ai-developブランチに切り替えました")
        else:
            # ブランチを作成して切り替え
            subprocess.run(['git', 'checkout', '-b', 'ai-develop'], check=True)
            print("✓ ai-developブランチを作成して切り替えました")
    except subprocess.CalledProcessError as e:
        print(f"✗ エラー: ブランチの作成に失敗しました: {e}")
        return False
    
    # 4. .gitignoreを作成
    print("\n[4/5] .gitignoreを作成...")
    gitignore_content = """# Node modules
node_modules/

# Clasp
.clasp.json

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Temporary files
*.tmp
*.temp
"""
    gitignore_path = PROJECT_ROOT / '.gitignore'
    if not gitignore_path.exists():
        with open(gitignore_path, 'w', encoding='utf-8') as f:
            f.write(gitignore_content)
        print("✓ .gitignoreを作成しました")
    else:
        print("✓ .gitignoreは既に存在します")
    
    # 5. 初期コミットを作成（変更がある場合）
    print("\n[5/5] 初期コミットを作成...")
    try:
        # 変更があるか確認
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            # 変更をステージング
            subprocess.run(['git', 'add', '.'], check=True)
            # コミット
            subprocess.run(['git', 'commit', '-m', '[自動] Phase 1: Gitリポジトリのセットアップ'], check=True)
            print("✓ 初期コミットを作成しました")
        else:
            print("✓ コミットする変更がありません")
    except subprocess.CalledProcessError as e:
        print(f"⚠ 警告: コミットの作成に失敗しました（既にコミット済みの可能性があります）: {e}")
    
    print("\n" + "=" * 60)
    print("Gitリポジトリのセットアップが完了しました")
    print("=" * 60)
    return True

if __name__ == '__main__':
    success = setup_git()
    if success:
        print("\n✓ すべての処理が正常に完了しました")
    else:
        print("\n✗ 一部の処理でエラーが発生しました")
        exit(1)

