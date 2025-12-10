"""
GASプロジェクトのデプロイスクリプト
Cursor AIエージェントが自動生成・実行

完成したら一括デプロイするためのスクリプト
"""

import subprocess
import os
import json
from pathlib import Path
from datetime import datetime

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent
GAS_DIR = PROJECT_ROOT / 'gas'

def deploy_gas(force=False):
    """GASプロジェクトをデプロイ"""
    print("=" * 60)
    print("GASプロジェクトのデプロイを開始します")
    print("=" * 60)
    print(f"デプロイ時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    os.chdir(GAS_DIR)
    
    # 1. claspがインストールされているか確認
    print("\n[1/4] claspの確認...")
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
    print("\n[2/4] 設定ファイルの確認...")
    clasp_json_path = GAS_DIR / '.clasp.json'
    if not clasp_json_path.exists():
        print("✗ エラー: .clasp.jsonが見つかりません")
        return False
    
    with open(clasp_json_path, 'r', encoding='utf-8') as f:
        clasp_config = json.load(f)
    script_id = clasp_config.get('scriptId', '')
    print(f"✓ スクリプトID: {script_id}")
    
    # 3. clasp pushを実行
    print("\n[3/4] clasp pushを実行...")
    try:
        if force:
            result = subprocess.run(['clasp', 'push', '--force'], 
                                  capture_output=True, text=True)
        else:
            result = subprocess.run(['clasp', 'push'], 
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
                print("   強制プッシュを実行しますか？ (y/N): ", end='')
                # 自動的に強制プッシュを実行
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
    
    # 4. Web AppのURLを取得
    print("\n[4/4] Web AppのURLを取得...")
    try:
        result = subprocess.run(['clasp', 'open', '--webapp'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ Web AppのURLを取得しました")
            # URLを抽出（出力から）
            print("\n【Web AppのURL】")
            print("GASエディタでWeb AppのURLを確認してください:")
            print(f"  https://script.google.com/home/projects/{script_id}/edit")
            print("\n【デプロイ方法の選択】")
            print("\n方法1: 既存のデプロイを更新（推奨）")
            print("  - デプロイバージョンの数を抑える")
            print("  - 過去のバージョンを削除する必要がない")
            print("  手順:")
            print("  1. GASエディタで「デプロイ」→「デプロイを管理」を選択")
            print("  2. 既存のデプロイを選択 → 「編集」をクリック")
            print("  3. 「新しいバージョン」を選択して更新")
            print("\n方法2: 新しいデプロイを作成")
            print("  - テスト用や本番用を分ける場合に使用")
            print("  - デプロイバージョンの数が増えるため注意")
            print("  手順:")
            print("  1. GASエディタで「デプロイ」→「新しいデプロイ」を選択")
            print("  2. 種類: ウェブアプリ を選択")
            print("  3. 実行ユーザー: 自分 を選択")
            print("  4. アクセスできるユーザー: 全員 または 組織内 を選択")
            print("  5. デプロイをクリックしてURLを取得")
            print("\n【注意事項】")
            print("  - 過去のバージョンを削除する際は注意が必要です")
            print("  - 現在使用中のデプロイは削除しないでください")
            print("  - 詳細は docs/GASデプロイバージョン管理ガイド.md を参照")
        else:
            print("⚠ Web AppのURLの取得に失敗しました（手動で確認してください）")
    except Exception as e:
        print(f"⚠ Web AppのURL取得エラー: {e}")
    
    print("\n" + "=" * 60)
    print("GASプロジェクトのデプロイが完了しました")
    print("=" * 60)
    return True

if __name__ == '__main__':
    import sys
    force = '--force' in sys.argv or '-f' in sys.argv
    
    print("\n【注意】")
    print("  このスクリプトはコードのプッシュのみを行います。")
    print("  デプロイ管理（既存デプロイの更新など）は deploy_manage.py を使用してください。")
    print("  例: python scripts\\deploy_manage.py update")
    print()
    
    success = deploy_gas(force=force)
    if success:
        print("\n✓ すべての処理が正常に完了しました")
        print("\n【次のステップ】")
        print("  デプロイ管理スクリプトを実行:")
        print("    python scripts\\deploy_manage.py update  # 既存デプロイを更新（推奨）")
        print("    または")
        print("    python scripts\\deploy_manage.py create  # 新しいデプロイを作成")
    else:
        print("\n✗ 一部の処理でエラーが発生しました")
        exit(1)

