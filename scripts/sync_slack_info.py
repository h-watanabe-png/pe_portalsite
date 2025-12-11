"""
PEポータルサイト - Slack情報同期スクリプト（Python版）

Slack APIからユーザー情報とチャンネル情報を取得してスプレッドシートに書き込む
"""

import json
import os
import sys
from pathlib import Path

try:
    import requests
    from google.oauth2.credentials import Credentials
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from google.auth.transport.requests import Request
except ImportError as e:
    print(f"必要なライブラリがインストールされていません: {e}")
    print("以下のコマンドでインストールしてください:")
    print("pip install requests google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
    sys.exit(1)

# 設定ファイルのパス
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
SLACK_CONFIG_PATH = PROJECT_ROOT / 'slack_config.json'
SPREADSHEET_ID = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0'

# Slack APIのエンドポイント
SLACK_API_BASE = 'https://slack.com/api'


def load_slack_config():
    """Slack設定をslack_config.jsonから読み込む（コード内にトークンは記述しない）"""
    if not SLACK_CONFIG_PATH.exists():
        print(f"エラー: {SLACK_CONFIG_PATH} が見つかりません")
        print(f"プロジェクトルートに {SLACK_CONFIG_PATH} を作成し、以下の形式で設定してください：")
        print('{')
        print('  "slack_bot_token": "xoxb-your-token-here",')
        print('  "s-hometutor_id": "T01234567"')
        print('}')
        sys.exit(1)
    
    try:
        with open(SLACK_CONFIG_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        print(f"エラー: {SLACK_CONFIG_PATH} のJSON形式が正しくありません")
        print(f"詳細: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"エラー: {SLACK_CONFIG_PATH} の読み込みに失敗しました")
        print(f"詳細: {e}")
        sys.exit(1)
    
    # slack_config.jsonからキーを取得
    bot_token = config.get('slack_bot_token', '')
    workspace_id = config.get('s-hometutor_id', '')
    
    if not bot_token or bot_token == 'xxx' or bot_token.strip() == '':
        print("エラー: slack_bot_token が設定されていません")
        print(f"{SLACK_CONFIG_PATH} の slack_bot_token に実際のSlack Bot Tokenを設定してください。")
        sys.exit(1)
    
    if not workspace_id or workspace_id == 'xxx' or workspace_id.strip() == '':
        print("エラー: s-hometutor_id が設定されていません")
        print(f"{SLACK_CONFIG_PATH} の s-hometutor_id に実際のSlackワークスペースIDを設定してください。")
        sys.exit(1)
    
    return bot_token, workspace_id


def get_slack_users(bot_token):
    """Slackユーザー一覧を取得"""
    url = f'{SLACK_API_BASE}/users.list'
    headers = {
        'Authorization': f'Bearer {bot_token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    data = response.json()
    
    if not data.get('ok'):
        raise Exception(f"Slack API エラー: {data.get('error', 'Unknown error')}")
    
    return data.get('members', [])


def get_slack_channels(bot_token):
    """Slackチャンネル一覧を取得"""
    url = f'{SLACK_API_BASE}/conversations.list'
    headers = {
        'Authorization': f'Bearer {bot_token}',
        'Content-Type': 'application/json'
    }
    
    # まずパブリックチャンネルのみを取得
    params = {
        'types': 'public_channel',
        'exclude_archived': True,
        'limit': 1000
    }
    
    all_channels = []
    cursor = None
    
    # パブリックチャンネルを取得
    while True:
        if cursor:
            params['cursor'] = cursor
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if not data.get('ok'):
            error = data.get('error', 'Unknown error')
            needed = data.get('needed', '')
            provided = data.get('provided', '')
            if error == 'missing_scope':
                error_msg = f"Slack API エラー: {error}"
                if needed:
                    error_msg += f" (必要なスコープ: {needed})"
                if provided:
                    error_msg += f" (現在のスコープ: {provided})"
                raise Exception(error_msg)
            raise Exception(f"Slack API エラー: {error}")
        
        channels = data.get('channels', [])
        all_channels.extend(channels)
        
        cursor = data.get('response_metadata', {}).get('next_cursor')
        if not cursor:
            break
    
    # プライベートチャンネルを取得（エラーが発生しても続行）
    try:
        params_private = {
            'types': 'private_channel',
            'exclude_archived': True,
            'limit': 1000
        }
        cursor_private = None
        
        while True:
            if cursor_private:
                params_private['cursor'] = cursor_private
            
            response = requests.get(url, headers=headers, params=params_private)
            response.raise_for_status()
            
            data = response.json()
            
            if not data.get('ok'):
                error = data.get('error', 'Unknown error')
                if error == 'missing_scope':
                    needed = data.get('needed', 'unknown')
                    provided = data.get('provided', '')
                    print(f"警告: プライベートチャンネルの取得に必要なスコープが不足しています")
                    if needed:
                        print(f"  必要なスコープ: {needed}")
                    if provided:
                        print(f"  現在のスコープ: {provided}")
                    print("プライベートチャンネルはスキップします。")
                    break
                raise Exception(f"Slack API エラー: {error}")
            
            channels = data.get('channels', [])
            all_channels.extend(channels)
            
            cursor_private = data.get('response_metadata', {}).get('next_cursor')
            if not cursor_private:
                break
    except Exception as e:
        print(f"警告: プライベートチャンネルの取得中にエラーが発生しました: {e}")
        print("パブリックチャンネルのみを取得します。")
    
    return all_channels


def get_sheets_service():
    """Google Sheets APIのサービスオブジェクトを取得"""
    # 認証方法を試行
    creds = None
    
    # 方法1: token.json（OAuth2）
    token_path = PROJECT_ROOT / 'token.json'
    if token_path.exists():
        try:
            from google.oauth2.credentials import Credentials
            creds = Credentials.from_authorized_user_file(str(token_path), 
                ['https://www.googleapis.com/auth/spreadsheets'])
            if creds.valid:
                print("token.json を使用して認証しました")
                return build('sheets', 'v4', credentials=creds)
        except Exception as e:
            print(f"token.json の読み込みに失敗: {e}")
    
    # 方法2: service_account.json（サービスアカウント）
    service_account_path = PROJECT_ROOT / 'service_account.json'
    if service_account_path.exists():
        try:
            creds = service_account.Credentials.from_service_account_file(
                str(service_account_path),
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            print("service_account.json を使用して認証しました")
            return build('sheets', 'v4', credentials=creds)
        except Exception as e:
            print(f"service_account.json の読み込みに失敗: {e}")
    
    # 方法3: md-csv-autodl-ed1adb38de50.json（既存のサービスアカウントファイル）
    existing_service_account_path = PROJECT_ROOT / 'md-csv-autodl-ed1adb38de50.json'
    if existing_service_account_path.exists():
        try:
            creds = service_account.Credentials.from_service_account_file(
                str(existing_service_account_path),
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            print("md-csv-autodl-ed1adb38de50.json を使用して認証しました")
            return build('sheets', 'v4', credentials=creds)
        except Exception as e:
            print(f"md-csv-autodl-ed1adb38de50.json の読み込みに失敗: {e}")
    
    # 方法4: 環境変数からサービスアカウント情報を取得
    service_account_info = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if service_account_info:
        try:
            creds = service_account.Credentials.from_service_account_info(
                json.loads(service_account_info),
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            print("環境変数からサービスアカウント情報を読み込みました")
            return build('sheets', 'v4', credentials=creds)
        except Exception as e:
            print(f"環境変数の読み込みに失敗: {e}")
    
    # すべての認証方法が失敗した場合
    raise Exception("Google認証情報が見つかりません。token.json、service_account.json、md-csv-autodl-ed1adb38de50.json、または環境変数を設定してください。")


def create_slack_sheets(service):
    """Slack情報用のシートを作成"""
    spreadsheet_id = SPREADSHEET_ID
    
    # 既存のシートを確認
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    existing_sheets = {sheet['properties']['title'] for sheet in spreadsheet.get('sheets', [])}
    
    requests = []
    
    # Slack_ユーザーシートを作成
    if 'Slack_ユーザー' not in existing_sheets:
        requests.append({
            'addSheet': {
                'properties': {
                    'title': 'Slack_ユーザー',
                    'gridProperties': {
                        'rowCount': 1000,
                        'columnCount': 10
                    }
                }
            }
        })
    
    # Slack_チャンネルシートを作成
    if 'Slack_チャンネル' not in existing_sheets:
        requests.append({
            'addSheet': {
                'properties': {
                    'title': 'Slack_チャンネル',
                    'gridProperties': {
                        'rowCount': 1000,
                        'columnCount': 10
                    }
                }
            }
        })
    
    if requests:
        body = {'requests': requests}
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body=body
        ).execute()
        print("Slack情報用のシートを作成しました")


def write_users_to_sheet(service, users):
    """ユーザー情報をスプレッドシートに書き込む"""
    spreadsheet_id = SPREADSHEET_ID
    sheet_name = 'Slack_ユーザー'
    
    # ヘッダー行
    headers = [
        'ユーザーID',
        '表示名',
        '実名',
        'メールアドレス',
        'ステータス',
        '削除済み',
        'ボット',
        'タイムゾーン',
        '最終更新日時'
    ]
    
    # データ行
    rows = [headers]
    
    for user in users:
        profile = user.get('profile', {})
        row = [
            user.get('id', ''),
            profile.get('display_name', '') or profile.get('real_name', ''),
            profile.get('real_name', ''),
            profile.get('email', ''),
            user.get('presence', ''),
            'はい' if user.get('deleted', False) else 'いいえ',
            'はい' if user.get('is_bot', False) else 'いいえ',
            user.get('tz', ''),
            user.get('updated', 0)
        ]
        rows.append(row)
    
    # スプレッドシートに書き込み
    range_name = f'{sheet_name}!A1'
    body = {
        'values': rows
    }
    
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_name,
        valueInputOption='RAW',
        body=body
    ).execute()
    
    print(f"{len(users)}件のユーザー情報を書き込みました")


def write_channels_to_sheet(service, channels):
    """チャンネル情報をスプレッドシートに書き込む"""
    spreadsheet_id = SPREADSHEET_ID
    sheet_name = 'Slack_チャンネル'
    
    # ヘッダー行
    headers = [
        'チャンネルID',
        'チャンネル名',
        '説明',
        '作成日時',
        'メンバー数',
        'プライベート',
        'アーカイブ済み',
        '共有チャンネル',
        '最終更新日時'
    ]
    
    # データ行
    rows = [headers]
    
    for channel in channels:
        row = [
            channel.get('id', ''),
            channel.get('name', ''),
            channel.get('topic', {}).get('value', '') or channel.get('purpose', {}).get('value', ''),
            channel.get('created', 0),
            channel.get('num_members', 0),
            'はい' if channel.get('is_private', False) else 'いいえ',
            'はい' if channel.get('is_archived', False) else 'いいえ',
            'はい' if channel.get('is_shared', False) else 'いいえ',
            channel.get('updated', 0)
        ]
        rows.append(row)
    
    # スプレッドシートに書き込み
    range_name = f'{sheet_name}!A1'
    body = {
        'values': rows
    }
    
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_name,
        valueInputOption='RAW',
        body=body
    ).execute()
    
    print(f"{len(channels)}件のチャンネル情報を書き込みました")


def main():
    """メイン処理"""
    print("Slack情報同期を開始します...")
    
    # Google Sheets APIのサービスを取得
    print("Google Sheets APIに接続中...")
    try:
        service = get_sheets_service()
    except Exception as e:
        print(f"エラー: Google Sheets APIへの接続に失敗しました")
        print(f"詳細: {e}")
        print("\n認証ファイル（token.json または service_account.json）を確認してください。")
        sys.exit(1)
    
    # シートを作成（トークンがなくてもシート作成は可能）
    print("シートを作成中...")
    try:
        create_slack_sheets(service)
        print("シートの作成が完了しました")
    except Exception as e:
        print(f"エラー: シートの作成に失敗しました")
        print(f"詳細: {e}")
        sys.exit(1)
    
    # Slack設定を読み込む（トークンが設定されていない場合はここで終了）
    try:
        bot_token, workspace_id = load_slack_config()
        print(f"ワークスペースID: {workspace_id}")
    except SystemExit:
        print("\nシートの作成は完了しました。")
        print("Slack情報を取得するには、slack_config.jsonにトークンを設定してから再度実行してください。")
        return
    
    # Slack APIから情報を取得
    users = []
    channels = []
    
    print("Slackユーザー情報を取得中...")
    try:
        users = get_slack_users(bot_token)
        print(f"{len(users)}件のユーザーを取得しました")
    except Exception as e:
        print(f"エラー: Slackユーザー情報の取得に失敗しました")
        print(f"詳細: {e}")
        print("ユーザー情報の取得をスキップします。")
    
    print("Slackチャンネル情報を取得中...")
    try:
        channels = get_slack_channels(bot_token)
        print(f"{len(channels)}件のチャンネルを取得しました")
    except Exception as e:
        error_msg = str(e)
        print(f"エラー: Slackチャンネル情報の取得に失敗しました")
        print(f"詳細: {e}")
        if 'missing_scope' in error_msg:
            print("\nスコープが不足している可能性があります。")
            print("確認事項:")
            print("1. Slack Appの設定で、OAuth & Permissions に以下が設定されているか確認:")
            print("   - channels:read (パブリックチャンネル)")
            print("   - groups:read (プライベートチャンネル)")
            print("2. スコープを追加した後、ワークスペースに再インストールが必要です")
            print("3. トークンが最新のものか確認してください")
        print("チャンネル情報の取得をスキップします。")
    
    # スプレッドシートに書き込み
    success_count = 0
    
    if users:
        print("ユーザー情報を書き込み中...")
        try:
            write_users_to_sheet(service, users)
            print(f"✓ {len(users)}件のユーザー情報を書き込みました")
            success_count += 1
        except Exception as e:
            print(f"エラー: ユーザー情報の書き込みに失敗しました")
            print(f"詳細: {e}")
    
    if channels:
        print("チャンネル情報を書き込み中...")
        try:
            write_channels_to_sheet(service, channels)
            print(f"✓ {len(channels)}件のチャンネル情報を書き込みました")
            success_count += 1
        except Exception as e:
            print(f"エラー: チャンネル情報の書き込みに失敗しました")
            print(f"詳細: {e}")
    
    if success_count > 0:
        print(f"\nSlack情報同期が完了しました！（{success_count}件のデータを書き込みました）")
    else:
        print("\nデータの書き込みは行われませんでした。")


if __name__ == '__main__':
    main()

