"""
Gitコミット・プッシュスクリプト
Cursor AIエージェントが自動生成・実行
"""

import subprocess
import os
from pathlib import Path

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent
os.chdir(PROJECT_ROOT)

def git_commit_push(commit_message="[自動] Phase 1: 基盤構築完了"):
    """Gitコミット・プッシュ"""
    print("=" * 60)
    print("Gitコミット・プッシュを開始します")
    print("=" * 60)
    
    # 1. 変更をステージング
    print("\n[1/3] 変更をステージング...")
    try:
        subprocess.run(['git', 'add', '.'], check=True)
        print("✓ 変更をステージングしました")
    except subprocess.CalledProcessError as e:
        print(f"✗ エラー: ステージングに失敗しました: {e}")
        return False
    
    # 2. コミット
    print("\n[2/3] コミット...")
    try:
        # 変更があるか確認
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            subprocess.run(['git', 'commit', '-m', commit_message], check=True)
            print(f"✓ コミットしました: {commit_message}")
        else:
            print("✓ コミットする変更がありません")
    except subprocess.CalledProcessError as e:
        print(f"⚠ 警告: コミットに失敗しました（既にコミット済みの可能性があります）: {e}")
    
    # 3. リモートにプッシュ
    print("\n[3/3] リモートにプッシュ...")
    try:
        # 現在のブランチを確認
        result = subprocess.run(['git', 'branch', '--show-current'], 
                              capture_output=True, text=True)
        current_branch = result.stdout.strip() or 'ai-develop'
        
        # リモートにプッシュ
        subprocess.run(['git', 'push', 'origin', current_branch], check=True)
        print(f"✓ {current_branch}ブランチにプッシュしました")
    except subprocess.CalledProcessError as e:
        print(f"⚠ 警告: プッシュに失敗しました: {e}")
        print("   リモートリポジトリが設定されていないか、認証が必要な可能性があります")
        return False
    
    print("\n" + "=" * 60)
    print("Gitコミット・プッシュが完了しました")
    print("=" * 60)
    return True

if __name__ == '__main__':
    import sys
    commit_message = sys.argv[1] if len(sys.argv) > 1 else "[自動] Phase 1: 基盤構築完了"
    
    success = git_commit_push(commit_message)
    if success:
        print("\n✓ すべての処理が正常に完了しました")
    else:
        print("\n✗ 一部の処理でエラーが発生しました")
        exit(1)

