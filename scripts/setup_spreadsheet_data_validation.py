"""
スプレッドシートにデータ検証（プルダウン）を設定するスクリプト

ユーザーが入力しなくても、プルダウンから選択して更新できるようにする
"""

import json
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# 設定
SPREADSHEET_ID = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0'
SERVICE_ACCOUNT_FILE = Path('md-csv-autodl-ed1adb38de50.json')

# データ検証の設定
DATA_VALIDATION_CONFIG = {
    '依頼_統合管理': {
        # 列名: 選択肢のリスト
        '依頼元': ['システムチーム', '経理'],
        '状態': ['新規', '処理中', '完了', '保留', 'キャンセル'],
        '優先度': ['高（業務停止）', '中（業務に支障あり）', '低（業務に支障なし）'],
        'ブランド': ['EB', 'TKT', 'その他']
    },
    '依頼_システムチーム': {
        'ステータス': ['新規', '処理中', '完了', '保留', 'キャンセル'],
        '緊急度': ['高（業務停止）', '中（業務に支障あり）', '低（業務に支障なし）'],
        '重要度': ['高（業務停止）', '中（業務に支障あり）', '低（業務に支障なし）'],
        'ブランド': ['EB', 'TKT', 'その他'],
        '発生頻度': ['常に発生', '時々発生', '初めて発生', '不明']
    },
    '依頼_経理': {
        'ステータス': ['新規', '処理中', '完了', '保留', 'キャンセル'],
        '緊急度': ['高（業務停止）', '中（業務に支障あり）', '低（業務に支障なし）'],
        '重要度': ['高（業務停止）', '中（業務に支障あり）', '低（業務に支障なし）'],
        'ブランド': ['EB', 'TKT', 'その他'],
        '依頼種別': ['請求関連', '支払関連', '口座・決済関連', '報酬関連', 'その他'],
        '締日種別': ['当月15日', '翌月15日', '指定日']
    }
}


def get_sheets_service():
    """Google Sheets APIのサービスを取得"""
    if not SERVICE_ACCOUNT_FILE.exists():
        raise FileNotFoundError(f'サービスアカウントファイルが見つかりません: {SERVICE_ACCOUNT_FILE}')
    
    credentials = service_account.Credentials.from_service_account_file(
        str(SERVICE_ACCOUNT_FILE),
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    
    return build('sheets', 'v4', credentials=credentials)


def get_sheet_info(service, spreadsheet_id, sheet_name):
    """シートの情報を取得"""
    try:
        result = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        
        for sheet in result.get('sheets', []):
            if sheet['properties']['title'] == sheet_name:
                return {
                    'sheet_id': sheet['properties']['sheetId'],
                    'title': sheet['properties']['title']
                }
        
        return None
    except HttpError as error:
        print(f'シート情報取得エラー: {error}')
        return None


def find_column_index(service, spreadsheet_id, sheet_name, column_name):
    """列名から列インデックスを取得"""
    try:
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=f'{sheet_name}!1:1'
        ).execute()
        
        values = result.get('values', [])
        if not values:
            return None
        
        headers = values[0]
        try:
            return headers.index(column_name) + 1  # 1始まり
        except ValueError:
            return None
    except HttpError as error:
        print(f'列インデックス取得エラー: {error}')
        return None


def set_data_validation(service, spreadsheet_id, sheet_id, column_index, values):
    """データ検証（プルダウン）を設定"""
    try:
        # データ検証ルールを作成
        rule = {
            'condition': {
                'type': 'ONE_OF_LIST',
                'values': [{'userEnteredValue': value} for value in values]
            },
            'showCustomUi': True,
            'strict': True
        }
        
        # リクエストを作成
        request = {
            'setDataValidation': {
                'range': {
                    'sheetId': sheet_id,
                    'startRowIndex': 1,  # ヘッダー行を除く
                    'endRowIndex': 1000,  # 最大1000行まで
                    'startColumnIndex': column_index - 1,  # 0始まり
                    'endColumnIndex': column_index
                },
                'rule': rule
            }
        }
        
        body = {
            'requests': [request]
        }
        
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body=body
        ).execute()
        
        print(f'  列 {column_index} ({values[0]}など) にデータ検証を設定しました')
        return True
    except HttpError as error:
        print(f'  データ検証設定エラー: {error}')
        return False


def setup_data_validations():
    """すべてのシートにデータ検証を設定"""
    print('スプレッドシートにデータ検証（プルダウン）を設定します...')
    
    service = get_sheets_service()
    
    for sheet_name, validations in DATA_VALIDATION_CONFIG.items():
        print(f'\nシート: {sheet_name}')
        
        # シート情報を取得
        sheet_info = get_sheet_info(service, SPREADSHEET_ID, sheet_name)
        if not sheet_info:
            print(f'  シートが見つかりません: {sheet_name}')
            continue
        
        sheet_id = sheet_info['sheet_id']
        
        # 各列にデータ検証を設定
        for column_name, values in validations.items():
            column_index = find_column_index(service, SPREADSHEET_ID, sheet_name, column_name)
            
            if column_index:
                set_data_validation(service, SPREADSHEET_ID, sheet_id, column_index, values)
            else:
                print(f'  列が見つかりません: {column_name}')
    
    print('\nデータ検証の設定が完了しました！')


if __name__ == '__main__':
    setup_data_validations()

