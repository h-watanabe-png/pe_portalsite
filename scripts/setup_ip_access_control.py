"""
PEポータルサイト - IPアドレス制限設定スクリプト
スプレッドシートにIPアドレス制限の設定項目を追加
"""

import os
import json
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent

# スプレッドシートID
SPREADSHEET_ID = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0'

# サービスアカウントファイル
SERVICE_ACCOUNT_FILE = PROJECT_ROOT / 'md-csv-autodl-ed1adb38de50.json'


def get_sheets_service():
    """Google Sheets APIのサービスオブジェクトを取得"""
    try:
        if SERVICE_ACCOUNT_FILE.exists():
            credentials = service_account.Credentials.from_service_account_file(
                str(SERVICE_ACCOUNT_FILE),
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            service = build('sheets', 'v4', credentials=credentials)
            print(f"✓ サービスアカウントで認証: {SERVICE_ACCOUNT_FILE}")
            return service
        else:
            print("✗ エラー: サービスアカウントファイルが見つかりません")
            print(f"   パス: {SERVICE_ACCOUNT_FILE}")
            return None
    except Exception as e:
        print(f"✗ 認証エラー: {e}")
        return None


def find_row_by_key(sheet_data, key):
    """指定されたキーの行インデックスを検索"""
    for i, row in enumerate(sheet_data):
        if len(row) > 0 and row[0] == key:
            return i
    return -1


def update_system_settings():
    """システム設定シートにIPアドレス制限の設定を追加"""
    print("=" * 60)
    print("IPアドレス制限設定の追加")
    print("=" * 60)
    
    service = get_sheets_service()
    if not service:
        return False
    
    try:
        # システム設定シートのデータを取得
        sheet_name = 'システム設定'
        result = service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range=f'{sheet_name}!A:B'
        ).execute()
        
        values = result.get('values', [])
        
        if not values:
            print(f"✗ エラー: {sheet_name}シートが空です")
            return False
        
        print(f"✓ {sheet_name}シートのデータを取得しました ({len(values)}行)")
        
        # 既存の設定を確認
        ip_control_row = find_row_by_key(values, 'IPアドレス制御有効')
        ip_list_row = find_row_by_key(values, 'IPアドレス許可リスト')
        
        updates = []
        
        # IPアドレス制御有効の設定を追加/更新
        if ip_control_row == -1:
            # 新規追加（最後の行の後に追加）
            new_row_index = len(values) + 1
            updates.append({
                'range': f'{sheet_name}!A{new_row_index}:B{new_row_index}',
                'values': [['IPアドレス制御有効', 'false']]
            })
            print(f"✓ IPアドレス制御有効の設定を追加します（行{new_row_index}）")
        else:
            # 既存の設定を確認
            current_value = values[ip_control_row][1] if len(values[ip_control_row]) > 1 else ''
            print(f"✓ IPアドレス制御有効の設定が既に存在します（行{ip_control_row + 1}）")
            print(f"  現在の値: {current_value}")
            if current_value == '':
                # 値が空の場合はデフォルト値を設定
                updates.append({
                    'range': f'{sheet_name}!B{ip_control_row + 1}',
                    'values': [['false']]
                })
                print(f"  デフォルト値 'false' を設定します")
        
        # IPアドレス許可リストの設定を追加/更新
        if ip_list_row == -1:
            # 新規追加（最後の行の後に追加）
            new_row_index = len(values) + (2 if ip_control_row == -1 else 1)
            # デフォルトのIPアドレス例を設定（実際のIPアドレスに置き換えてください）
            updates.append({
                'range': f'{sheet_name}!A{new_row_index}:D{new_row_index}',
                'values': [['IPアドレス許可リスト', '', '', '']]
            })
            print(f"✓ IPアドレス許可リストの設定を追加します（行{new_row_index}）")
            print("  注意: 実際のIPアドレスを設定してください")
        else:
            # 既存の設定を確認
            current_ips = values[ip_list_row][1:] if len(values[ip_list_row]) > 1 else []
            current_ips = [ip for ip in current_ips if ip.strip() != '']
            print(f"✓ IPアドレス許可リストの設定が既に存在します（行{ip_list_row + 1}）")
            if current_ips:
                print(f"  現在のIPアドレス: {', '.join(current_ips)}")
            else:
                print("  現在のIPアドレス: なし")
        
        # 更新を実行
        if updates:
            body = {
                'valueInputOption': 'USER_ENTERED',
                'data': updates
            }
            
            result = service.spreadsheets().values().batchUpdate(
                spreadsheetId=SPREADSHEET_ID,
                body=body
            ).execute()
            
            print(f"\n✓ {len(updates)}件の設定を更新しました")
            print("\n設定内容:")
            print("  - IPアドレス制御有効: false（デフォルト、無効）")
            print("  - IPアドレス許可リスト: 空（IPアドレスを追加してください）")
            print("\n次のステップ:")
            print("  1. スプレッドシートを開いて確認")
            print("  2. IPアドレス制御を有効にする場合: 'IPアドレス制御有効' を 'true' に変更")
            print("  3. 許可するIPアドレスを 'IPアドレス許可リスト' の列に追加")
            print("    例: 192.168.1.100, 10.0.0.50, 203.0.113.0/24")
            return True
        else:
            print("\n✓ すべての設定が既に存在します。更新は不要です。")
            return True
            
    except HttpError as error:
        print(f"✗ エラー: {error}")
        return False
    except Exception as e:
        print(f"✗ 予期しないエラー: {e}")
        return False


if __name__ == '__main__':
    success = update_system_settings()
    if success:
        print("\n" + "=" * 60)
        print("✓ IPアドレス制限設定の追加が完了しました")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("✗ IPアドレス制限設定の追加に失敗しました")
        print("=" * 60)
        exit(1)

