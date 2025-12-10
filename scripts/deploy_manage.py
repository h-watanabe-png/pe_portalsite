"""
GASプロジェクトのデプロイ管理スクリプト
Cursor AIエージェントが自動生成・実行

既存のデプロイを更新するか、新しいデプロイを作成するかを自動化
"""

import subprocess
import os
import json
from pathlib import Path
from datetime import datetime

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent
GAS_DIR = PROJECT_ROOT / 'gas'

def deploy_manage(action='update', description=None):
    """
    GASプロジェクトのデプロイ管理
    
    Args:
        action: 'update' (既存デプロイを更新) または 'create' (新規デプロイ作成)
        description: デプロイの説明（オプション）
    """
    print("=" * 60)
    print("GASプロジェクトのデプロイ管理を開始します")
    print("=" * 60)
    print(f"アクション: {action}")
    print(f"実行時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    os.chdir(GAS_DIR)
    
    # 1. claspがインストールされているか確認
    print("\n[1/5] claspの確認...")
    try:
        result = subprocess.run(['clasp', '--version'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("✗ エラー: claspがインストールされていません")
            print("   以下のコマンドでインストールしてください:")
            print("   npm install -g @google/clasp")
            return False
        print(f"✓ claspがインストールされています")
    except FileNotFoundError:
        print("✗ エラー: claspコマンドが見つかりません")
        return False
    
    # 2. .clasp.jsonの確認
    print("\n[2/5] 設定ファイルの確認...")
    clasp_json_path = GAS_DIR / '.clasp.json'
    if not clasp_json_path.exists():
        print("✗ エラー: .clasp.jsonが見つかりません")
        return False
    
    with open(clasp_json_path, 'r', encoding='utf-8') as f:
        clasp_config = json.load(f)
    script_id = clasp_config.get('scriptId', '')
    print(f"✓ スクリプトID: {script_id}")
    
    # 3. clasp pushを実行（コードを反映）
    print("\n[3/5] clasp pushを実行（コードを反映）...")
    try:
        result = subprocess.run(['clasp', 'push', '--force'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ clasp pushが成功しました")
            print(result.stdout)
        else:
            print("⚠ 警告: clasp pushに失敗しました")
            print(result.stderr)
            
            # 確認プロンプトが表示された場合
            if 'overwrite' in result.stderr.lower() or 'Manifest file has been updated' in result.stderr:
                print("\n⚠ マニフェストファイルが更新されています")
                print("   強制プッシュを実行します...")
                result = subprocess.run(['clasp', 'push', '--force'], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    print("✓ 強制プッシュが成功しました")
                    print(result.stdout)
                else:
                    print("✗ 強制プッシュに失敗しました")
                    print(result.stderr)
                    return False
            else:
                return False
    except Exception as e:
        print(f"✗ エラー: clasp pushでエラーが発生しました: {e}")
        return False
    
    # 4. デプロイ管理の案内
    print("\n[4/5] デプロイ管理の案内...")
    print_deploy_instructions(action, script_id, description)
    
    # 5. GASエディタを開く
    print("\n[5/5] GASエディタを開く...")
    try:
        subprocess.run(['clasp', 'open'], check=False)
        print("✓ GASエディタを開きました")
    except Exception as e:
        print(f"⚠ GASエディタの起動に失敗しました: {e}")
        print(f"   手動で開く: https://script.google.com/home/projects/{script_id}/edit")
    
    print("\n" + "=" * 60)
    print("デプロイ管理の準備が完了しました")
    print("=" * 60)
    return True

def print_deploy_instructions(action, script_id, description=None):
    """デプロイ手順を表示"""
    if action == 'update':
        print("\n【既存のデプロイを更新（推奨）】")
        print("  デプロイバージョンの数を抑えるため、既存のデプロイを更新することを推奨します。")
        print("\n  手順:")
        print("  1. GASエディタで「デプロイ」→「デプロイを管理」を選択")
        print("  2. 既存のデプロイ（ウェブアプリ）を選択")
        print("  3. 「編集」ボタンをクリック")
        print("  4. 「バージョン」で「新しいバージョン」を選択")
        if description:
            print(f"  5. 説明（オプション）: {description}")
        print("  5. 「デプロイ」をクリック")
        print("  6. 既存のURLがそのまま使用されます")
        
    elif action == 'create':
        print("\n【新しいデプロイを作成】")
        print("  テスト用や本番用を分ける場合に使用します。")
        print("  注意: デプロイバージョンの数が増えるため、定期的なクリーンアップが必要です。")
        print("\n  手順:")
        print("  1. GASエディタで「デプロイ」→「新しいデプロイ」を選択")
        print("  2. 種類: 「ウェブアプリ」を選択")
        print("  3. 実行ユーザー: 「自分」を選択")
        print("  4. アクセスできるユーザー: 「全員」または「組織内」を選択")
        if description:
            print(f"  5. 説明（オプション）: {description}")
        print("  5. 「デプロイ」をクリック")
        print("  6. 新しいURLが生成されます")
    
    print("\n【注意事項】")
    print("  - 過去のバージョンを削除する際は注意が必要です")
    print("  - 現在使用中のデプロイは削除しないでください")
    print("  - 詳細は docs/GASデプロイバージョン管理ガイド.md を参照")
    print(f"\n【GASエディタ】")
    print(f"  https://script.google.com/home/projects/{script_id}/edit")

def list_deployments():
    """デプロイ一覧を取得（claspでは直接取得できないため、案内のみ）"""
    print("\n【デプロイ一覧の確認方法】")
    print("  GASエディタで「デプロイ」→「デプロイを管理」を選択すると、")
    print("  すべてのデプロイ（ウェブアプリ、API実行可能など）が表示されます。")

if __name__ == '__main__':
    import sys
    
    # コマンドライン引数の解析
    action = 'update'  # デフォルトは既存デプロイの更新
    description = None
    
    if len(sys.argv) > 1:
        if sys.argv[1] in ['update', 'create', 'list']:
            action = sys.argv[1]
        elif sys.argv[1] in ['-h', '--help']:
            print("""
使用方法:
  python scripts\\deploy_manage.py [action] [description]

引数:
  action      'update' (既存デプロイを更新、デフォルト) または 'create' (新規デプロイ作成)
  description デプロイの説明（オプション）

例:
  python scripts\\deploy_manage.py update
  python scripts\\deploy_manage.py create "テスト環境"
  python scripts\\deploy_manage.py list
            """)
            exit(0)
    
    if len(sys.argv) > 2:
        description = sys.argv[2]
    
    if action == 'list':
        list_deployments()
    else:
        success = deploy_manage(action, description)
        if success:
            print("\n✓ すべての処理が正常に完了しました")
            print("\n【次のステップ】")
            print("  GASエディタでデプロイを更新または作成してください")
        else:
            print("\n✗ 一部の処理でエラーが発生しました")
            exit(1)

