"""
スプレッドシートのセットアップスクリプト
Cursor AIエージェントが自動生成・実行

注意: Google Sheets APIを使用するため、認証が必要です。
認証方法:
1. OAuth2認証: token.jsonファイルが必要
2. サービスアカウント: credentials.jsonファイルが必要
"""

import json
from pathlib import Path

# Google Sheets APIのインポート（必要なライブラリがインストールされている場合）
try:
    from google.oauth2.credentials import Credentials
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    print("⚠ 警告: Google APIライブラリがインストールされていません")
    print("   以下のコマンドでインストールしてください:")
    print("   pip install google-auth google-api-python-client google-auth-httplib2 google-auth-oauthlib")

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent

# スプレッドシートID（実験用）
SPREADSHEET_ID = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0'

# 既存プロジェクトのID（使用禁止）
EXISTING_SPREADSHEET_ID = '12jAvY-I-UMKpjT1sprYfAOxdIi8E-PqneMYjVBQ6DnY'

# 安全対策: 既存プロジェクトのIDを使用しようとした場合はエラー
if SPREADSHEET_ID == EXISTING_SPREADSHEET_ID:
    raise ValueError("既存プロジェクトのスプレッドシートIDを使用しようとしています。実験用のIDを使用してください。")

# シート定義
SHEETS_DEFINITION = {
    'システム設定': {
        'headers': ['設定項目', '設定値', '説明', '更新方法'],
        'initial_data': [
            ['システム名', 'PE Portal', 'システム名', '手動'],
            ['バージョン', '2.0.0', '現在のバージョン', '手動'],
            ['管理者メール', 'h-watanabe@tomonokai-corp.com', '管理者メール', '手動']
        ]
    },
    'フォーム設定_システムチーム': {
        'headers': ['項目ID', '項目名', 'タイプ', '必須', '選択肢', '説明', 'バリデーションルール', '表示順序'],
        'initial_data': []
    },
    'フォーム設定_経理': {
        'headers': ['項目ID', '項目名', 'タイプ', '必須', '選択肢', '説明', 'バリデーションルール', '表示順序'],
        'initial_data': []
    },
    '依頼_システムチーム': {
        'headers': ['送信日時', '依頼者氏名', 'ブランド', '緊急度', '対応希望日', '世帯ID', '生徒番号', '選考番号', 
                   '発生している問題', '希望の対応', '発生頻度', 'エラー文・URL', 'ファイル添付', 'ステータス', 
                   '担当者', '完了日', '備考', 'ファイルURL', '通知送信日時', '更新日時'],
        'initial_data': []
    },
    '依頼_経理': {
        'headers': ['送信日時', '依頼者氏名', 'ブランド', '依頼先', '緊急度', '対応希望日', '世帯ID', '生徒番号', 
                   '選考番号', '依頼内容種別', '依頼内容詳細', '関連URL', 'ファイル添付', 'ステータス', 
                   '担当者', '完了日', '備考', 'ファイルURL', '通知送信日時', '更新日時'],
        'initial_data': []
    },
    '依頼_統合管理': {
        'headers': ['依頼ID', '受付日', '依頼元', 'ブランド', '依頼者', '要約', '元データURL', '担当者', '状態', 
                   '優先度', '期限', '重要メモ', 'SlackChannelId', 'SlackThreadUrl', 'SlackThreadTs', 
                   '最終通知日時', '手動通知テキスト', '手動通知送信', '最終更新者', '最終更新日時'],
        'initial_data': []
    },
    '依頼_統合管理_公開': {
        'headers': ['依頼ID', '受付日', '依頼元', 'ブランド', '依頼者', '要約', '担当者', '状態', '優先度', '期限'],
        'initial_data': []
    },
    'ダッシュボード_集計': {
        'headers': ['統計項目', '数値', '最終更新日時', '備考'],
        'initial_data': [
            ['総リクエスト数', '0', '', ''],
            ['処理中', '0', '', ''],
            ['完了', '0', '', ''],
            ['完了率', '0', '', '%'],
            ['緊急依頼数', '0', '', ''],
            ['システムチーム依頼数', '0', '', ''],
            ['経理依頼数', '0', '', ''],
            ['今日の依頼数', '0', '', ''],
            ['今週の依頼数', '0', '', '']
        ]
    },
    'Data Studio用エクスポート': {
        'headers': ['送信日時', '依頼ID', '依頼種別', 'ブランド', '依頼者', '緊急度', 'ステータス', '担当者', 
                   '処理時間_時間', '処理時間_日'],
        'initial_data': []
    },
    'お知らせ': {
        'headers': ['タイトル', '本文', 'リンク', '掲載開始', '掲載終了', '固定'],
        'initial_data': []
    },
    'FAQ_公開インデックス': {
        'headers': ['タイトル', '説明', 'リンク', 'タグ', '更新日', '公開'],
        'initial_data': []
    }
}

def get_credentials():
    """認証情報を取得"""
    # OAuth2認証（token.json）
    token_path = PROJECT_ROOT / 'token.json'
    credentials_path = PROJECT_ROOT / 'credentials.json'
    service_account_path = PROJECT_ROOT / 'service_account.json'
    
    if token_path.exists():
        # OAuth2認証
        SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
        return creds
    elif service_account_path.exists():
        # サービスアカウント認証
        SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
        creds = service_account.Credentials.from_service_account_file(
            str(service_account_path), scopes=SCOPES)
        return creds
    else:
        print("⚠ 警告: 認証ファイルが見つかりません")
        print("   以下のいずれかの認証方法を設定してください:")
        print("   1. OAuth2認証: token.jsonファイル")
        print("   2. サービスアカウント: service_account.jsonファイル")
        return None

def setup_spreadsheet():
    """スプレッドシートのセットアップ"""
    print("=" * 60)
    print("スプレッドシートのセットアップを開始します")
    print("=" * 60)
    print(f"スプレッドシートID: {SPREADSHEET_ID}")
    
    if not GOOGLE_API_AVAILABLE:
        print("\n✗ エラー: Google APIライブラリがインストールされていません")
        return False
    
    # 認証情報を取得
    creds = get_credentials()
    if not creds:
        print("\n✗ エラー: 認証情報を取得できませんでした")
        print("   認証ファイルを設定してから再実行してください")
        return False
    
    try:
        # Google Sheets APIサービスを構築
        service = build('sheets', 'v4', credentials=creds)
        spreadsheet = service.spreadsheets()
        
        # 既存のシート一覧を取得
        print("\n[1/4] 既存のシートを確認...")
        sheet_metadata = spreadsheet.get(spreadsheetId=SPREADSHEET_ID).execute()
        existing_sheets = {sheet['properties']['title']: sheet['properties']['sheetId'] 
                          for sheet in sheet_metadata.get('sheets', [])}
        print(f"✓ 既存のシート数: {len(existing_sheets)}")
        
        # 必要なシートを作成
        print("\n[2/4] 必要なシートを作成...")
        sheet_requests = []
        for sheet_name in SHEETS_DEFINITION.keys():
            if sheet_name not in existing_sheets:
                sheet_requests.append({
                    'addSheet': {
                        'properties': {
                            'title': sheet_name,
                            'gridProperties': {
                                'rowCount': 1000,
                                'columnCount': 20
                            }
                        }
                    }
                })
        
        if sheet_requests:
            batch_update_request = {'requests': sheet_requests}
            spreadsheet.batchUpdate(
                spreadsheetId=SPREADSHEET_ID,
                body=batch_update_request
            ).execute()
            print(f"✓ {len(sheet_requests)}個のシートを作成しました")
        else:
            print("✓ すべてのシートが既に存在します")
        
        # 各シートにヘッダー行と初期データを設定
        print("\n[3/4] 各シートにヘッダー行と初期データを設定...")
        for sheet_name, definition in SHEETS_DEFINITION.items():
            print(f"  - {sheet_name}シートを設定中...")
            
            # ヘッダー行を設定
            values = [definition['headers']]
            body = {'values': values}
            spreadsheet.values().update(
                spreadsheetId=SPREADSHEET_ID,
                range=f'{sheet_name}!A1',
                valueInputOption='RAW',
                body=body
            ).execute()
            
            # 初期データを設定
            if definition['initial_data']:
                values = definition['initial_data']
                body = {'values': values}
                start_row = 2
                end_row = start_row + len(values) - 1
                spreadsheet.values().update(
                    spreadsheetId=SPREADSHEET_ID,
                    range=f'{sheet_name}!A{start_row}:D{end_row}',
                    valueInputOption='RAW',
                    body=body
                ).execute()
                print(f"    ✓ ヘッダー行と{len(values)}行の初期データを設定しました")
            else:
                print(f"    ✓ ヘッダー行を設定しました")
        
        # 完了
        print("\n[4/4] セットアップ完了")
        print("=" * 60)
        print("スプレッドシートのセットアップが完了しました")
        print("=" * 60)
        return True
        
    except HttpError as error:
        print(f"\n✗ エラー: Google Sheets APIでエラーが発生しました: {error}")
        return False
    except Exception as e:
        print(f"\n✗ エラー: 予期しないエラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = setup_spreadsheet()
    if success:
        print("\n✓ すべての処理が正常に完了しました")
    else:
        print("\n✗ 一部の処理でエラーが発生しました")
        print("\n注意: 認証が必要な場合は、以下の手順を実行してください:")
        print("1. Google Cloud Consoleでプロジェクトを作成")
        print("2. Google Sheets APIを有効化")
        print("3. OAuth2認証またはサービスアカウント認証を設定")
        print("4. 認証ファイル（token.jsonまたはservice_account.json）をプロジェクトルートに配置")
        exit(1)

