"""
Slack問い合わせ分析とフォーム設定更新スクリプト

slack問い合わせ分析.csvを分析して、課題点を洗い出し、
フォーム設定_システムチームとフォーム設定_経理を更新する
"""

import csv
import json
import re
from pathlib import Path
from collections import Counter, defaultdict
from typing import Dict, List, Tuple

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    GOOGLE_API_AVAILABLE = True
except ImportError:
    GOOGLE_API_AVAILABLE = False
    print("警告: Google APIライブラリがインストールされていません")
    print("スプレッドシートへの書き込みはスキップされます")

# 設定
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
CSV_PATH = Path(r'C:\Users\N0099_202312\Documents\projects\work\pe_portalsite\docs\slack問い合わせ分析.csv')
SPREADSHEET_ID = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0'

# 対象ユーザーID
TARGET_USERS = {
    '吉子': 'U63UJ2CSW',
    '渡邊': 'U060HCVM1PF'
}

# システム系キーワード
SYSTEM_KEYWORDS = [
    'エラー', '不具合', 'ログイン', '権限', '設定', '修正', '生徒', '教師', 
    '面接', '選考', 'FM', 'Filemaker', '貼り付け', 'PC', 'VPN', 'リモート',
    'システム', '改修', '動作', '起動', '接続', '画面', '表示', 'データ'
]

# 経理系キーワード
ACCOUNTING_KEYWORDS = [
    '請求', '口座', 'クレカ', 'クレジットカード', '決済', '振込', '振り込み',
    '報酬', '支払', '支払い', '金額', '経理', '銀行', 'カード', '領収',
    '費用', '精算', '入金', '出金', '残高', '明細'
]


def load_csv_data(csv_path: Path) -> List[Dict]:
    """CSVファイルを読み込む"""
    data = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data


def analyze_messages(data: List[Dict]) -> Dict:
    """メッセージを分析して課題点を洗い出す"""
    analysis = {
        'total_messages': len(data),
        'system_team_messages': [],
        'accounting_messages': [],
        'issues': {
            'urgency_priority_mixed': 0,  # 緊急度・重要度がごちゃまぜ
            'unstructured': 0,  # 構造化されていない
            'repetitive': 0,  # 繰り返しの問い合わせ
            'missing_info': 0,  # 情報不足
        },
        'categories': defaultdict(int),
        'common_patterns': []
    }
    
    # システムチームと経理への問い合わせを分類
    for row in data:
        message = row.get('メッセージ本文（元）', '')
        channel = row.get('チャンネル', '')
        sender = row.get('送信者（ユーザーID）', '')
        mention = row.get('送信先（メンション）', '')
        
        # 空のメッセージはスキップ
        if not message or len(message.strip()) < 5:
            continue
        
        # システムチーム関連
        if 'システムチーム' in channel or any(uid in mention for uid in TARGET_USERS.values()):
            analysis['system_team_messages'].append({
                'message': message,
                'sender': sender,
                'channel': channel,
                'date': row.get('日時', '')
            })
        
        # 経理関連
        if '経理' in channel:
            analysis['accounting_messages'].append({
                'message': message,
                'sender': sender,
                'channel': channel,
                'date': row.get('日時', '')
            })
    
    return analysis


def extract_common_patterns(messages: List[Dict]) -> List[Dict]:
    """共通パターンを抽出"""
    patterns = []
    
    # エラーパターン
    error_patterns = [
        r'エラー',
        r'不具合',
        r'できません',
        r'できない',
        r'動かない',
        r'起動しない',
        r'ログインできない',
        r'権限',
    ]
    
    # 修正依頼パターン
    fix_patterns = [
        r'修正',
        r'変更',
        r'更新',
        r'追加',
        r'削除',
    ]
    
    # 確認依頼パターン
    confirm_patterns = [
        r'確認',
        r'教えて',
        r'どうすれば',
        r'方法',
    ]
    
    for msg_data in messages:
        message = msg_data['message']
        
        # エラーパターン
        if any(re.search(p, message) for p in error_patterns):
            patterns.append({
                'type': 'error',
                'message': message[:100],
                'category': 'システム不具合'
            })
        
        # 修正依頼パターン
        if any(re.search(p, message) for p in fix_patterns):
            patterns.append({
                'type': 'fix_request',
                'message': message[:100],
                'category': 'データ修正'
            })
        
        # 確認依頼パターン
        if any(re.search(p, message) for p in confirm_patterns):
            patterns.append({
                'type': 'confirmation',
                'message': message[:100],
                'category': '確認依頼'
            })
    
    return patterns


def design_system_team_form(analysis: Dict) -> List[List]:
    """システムチームフォームの設計"""
    form_items = []
    order = 1
    
    # 1. 依頼種別（必須）
    form_items.append([
        'request_type',  # 項目ID
        '依頼種別',  # 項目名
        'select',  # タイプ
        'TRUE',  # 必須
        'システム不具合,データ修正,権限設定,新規機能要望,その他',  # 選択肢
        '依頼の種類を選択してください',  # 説明
        '',  # バリデーションルール
        order  # 表示順序
    ])
    order += 1
    
    # 2. 緊急度（必須）
    form_items.append([
        'urgency',
        '緊急度',
        'select',
        'TRUE',
        '緊急（1時間以内）,高（当日中）,中（3営業日以内）,低（1週間以内）',
        '対応の緊急度を選択してください',
        '',
        order
    ])
    order += 1
    
    # 3. 重要度（必須）
    form_items.append([
        'priority',
        '重要度',
        'select',
        'TRUE',
        '高（業務停止）,中（業務に支障あり）,低（業務に支障なし）',
        '重要度を選択してください',
        '',
        order
    ])
    order += 1
    
    # 4. 依頼者情報（必須）
    form_items.append([
        'requester_name',
        '依頼者氏名',
        'text',
        'TRUE',
        '',
        '依頼者の氏名を入力してください',
        '',
        order
    ])
    order += 1
    
    # 5. ブランド（必須）
    form_items.append([
        'brand',
        'ブランド',
        'select',
        'TRUE',
        'EB,TKT,その他',
        '対象ブランドを選択してください',
        '',
        order
    ])
    order += 1
    
    # 6. 発生している問題（必須）
    form_items.append([
        'issue_description',
        '発生している問題',
        'textarea',
        'TRUE',
        '',
        '発生している問題を具体的に記述してください（エラーメッセージ、症状など）',
        '',
        order
    ])
    order += 1
    
    # 7. 発生頻度
    form_items.append([
        'frequency',
        '発生頻度',
        'select',
        'FALSE',
        '常に発生,時々発生,初めて発生,不明',
        '問題の発生頻度を選択してください',
        '',
        order
    ])
    order += 1
    
    # 8. エラー文・URL
    form_items.append([
        'error_message',
        'エラー文・URL',
        'textarea',
        'FALSE',
        '',
        'エラーメッセージや関連URLがあれば入力してください',
        '',
        order
    ])
    order += 1
    
    # 9. 希望の対応
    form_items.append([
        'desired_action',
        '希望の対応',
        'textarea',
        'FALSE',
        '',
        '希望する対応内容があれば入力してください',
        '',
        order
    ])
    order += 1
    
    # 10. 関連する生徒・教師情報
    form_items.append([
        'related_student_teacher',
        '関連する生徒・教師情報',
        'text',
        'FALSE',
        '',
        '世帯ID、生徒番号、選考番号、教師IDなどがあれば入力してください（カンマ区切り可）',
        '',
        order
    ])
    order += 1
    
    # 11. ファイル添付
    form_items.append([
        'file_attachment',
        'ファイル添付',
        'file',
        'FALSE',
        '',
        'エラー画面のスクリーンショットや関連ファイルがあれば添付してください',
        '',
        order
    ])
    order += 1
    
    # 12. 対応希望日
    form_items.append([
        'desired_date',
        '対応希望日',
        'date',
        'FALSE',
        '',
        '対応希望日があれば選択してください',
        '',
        order
    ])
    order += 1
    
    # 13. 担当者指定（拡張性のため）
    form_items.append([
        'assigned_to',
        '担当者指定（任意）',
        'select',
        'FALSE',
        '吉子,渡邊,自動割り当て',
        '特定の担当者を指定する場合は選択してください（未指定の場合は自動割り当て）',
        '',
        order
    ])
    order += 1
    
    return form_items


def design_accounting_form(analysis: Dict) -> List[List]:
    """経理フォームの設計（締日対応版）"""
    form_items = []
    order = 1
    
    # 1. 依頼種別（必須）
    form_items.append([
        'request_type',
        '依頼種別',
        'select',
        'TRUE',
        '請求関連,支払関連,口座・決済関連,報酬関連,その他',
        '依頼の種類を選択してください',
        '',
        order
    ])
    order += 1
    
    # 2. 締日種別（請求関連の場合に重要）
    form_items.append([
        'deadline_type',
        '締日種別',
        'select',
        'FALSE',
        '当月15日,翌月15日,指定日',
        '請求関連の場合は締日を選択してください（毎月15日が締日）',
        '',
        order
    ])
    order += 1
    
    # 3. 締日（自動計算または手動指定）
    form_items.append([
        'deadline_date',
        '締日',
        'date',
        'FALSE',
        '',
        '締日（締日種別を選択すると自動計算されます）',
        '',
        order
    ])
    order += 1
    
    # 2. 緊急度（必須）
    form_items.append([
        'urgency',
        '緊急度',
        'select',
        'TRUE',
        '緊急（1時間以内）,高（当日中）,中（3営業日以内）,低（1週間以内）',
        '対応の緊急度を選択してください',
        '',
        order
    ])
    order += 1
    
    # 3. 重要度（必須）
    form_items.append([
        'priority',
        '重要度',
        'select',
        'TRUE',
        '高（業務停止）,中（業務に支障あり）,低（業務に支障なし）',
        '重要度を選択してください',
        '',
        order
    ])
    order += 1
    
    # 4. 依頼者情報（必須）
    form_items.append([
        'requester_name',
        '依頼者氏名',
        'text',
        'TRUE',
        '',
        '依頼者の氏名を入力してください',
        '',
        order
    ])
    order += 1
    
    # 5. ブランド（必須）
    form_items.append([
        'brand',
        'ブランド',
        'select',
        'TRUE',
        'EB,TKT,その他',
        '対象ブランドを選択してください',
        '',
        order
    ])
    order += 1
    
    # 6. 依頼内容詳細（必須）
    form_items.append([
        'request_details',
        '依頼内容詳細',
        'textarea',
        'TRUE',
        '',
        '依頼内容を具体的に記述してください',
        '',
        order
    ])
    order += 1
    
    # 7. 金額（該当する場合）
    form_items.append([
        'amount',
        '金額（該当する場合）',
        'number',
        'FALSE',
        '',
        '金額が該当する場合は入力してください',
        'number,min:0',
        order
    ])
    order += 1
    
    # 8. 関連URL
    form_items.append([
        'related_url',
        '関連URL',
        'url',
        'FALSE',
        '',
        '関連するURLがあれば入力してください',
        'url',
        order
    ])
    order += 1
    
    # 9. 関連する生徒・教師情報
    form_items.append([
        'related_student_teacher',
        '関連する生徒・教師情報',
        'text',
        'FALSE',
        '',
        '世帯ID、生徒番号、選考番号、教師IDなどがあれば入力してください（カンマ区切り可）',
        '',
        order
    ])
    order += 1
    
    # 10. ファイル添付
    form_items.append([
        'file_attachment',
        'ファイル添付',
        'file',
        'FALSE',
        '',
        '関連ファイルがあれば添付してください',
        '',
        order
    ])
    order += 1
    
    # 11. 対応希望日
    form_items.append([
        'desired_date',
        '対応希望日',
        'date',
        'FALSE',
        '',
        '対応希望日があれば選択してください',
        '',
        order
    ])
    order += 1
    
    # 12. 担当者指定（拡張性のため）
    form_items.append([
        'assigned_to',
        '担当者指定（任意）',
        'select',
        'FALSE',
        '吉子,渡邊,自動割り当て',
        '特定の担当者を指定する場合は選択してください（未指定の場合は自動割り当て）',
        '',
        order
    ])
    order += 1
    
    return form_items


def update_spreadsheet_form_settings(service, sheet_name: str, form_items: List[List]):
    """スプレッドシートのフォーム設定シートを更新"""
    spreadsheet_id = SPREADSHEET_ID
    
    # ヘッダー行
    headers = [
        '項目ID',
        '項目名',
        'タイプ',
        '必須',
        '選択肢',
        '説明',
        'バリデーションルール',
        '表示順序'
    ]
    
    # データ行（ヘッダー + フォーム項目）
    rows = [headers] + form_items
    
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
    
    print(f"✓ {sheet_name} を更新しました（{len(form_items)}項目）")


def get_sheets_service():
    """Google Sheets APIのサービスオブジェクトを取得"""
    if not GOOGLE_API_AVAILABLE:
        return None
    
    PROJECT_ROOT = Path(__file__).parent.parent
    
    # 認証方法を試行
    creds = None
    
    # md-csv-autodl-ed1adb38de50.json（既存のサービスアカウントファイル）
    existing_service_account_path = PROJECT_ROOT / 'md-csv-autodl-ed1adb38de50.json'
    if existing_service_account_path.exists():
        try:
            creds = service_account.Credentials.from_service_account_file(
                str(existing_service_account_path),
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            print(f"既存のサービスアカウントファイルを使用: {existing_service_account_path}")
            return build('sheets', 'v4', credentials=creds)
        except Exception as e:
            print(f"警告: {existing_service_account_path} の読み込みに失敗しました: {e}")
    
    raise Exception("Google認証情報が見つかりません。")


def main():
    """メイン処理"""
    print("Slack問い合わせ分析とフォーム設定更新を開始します...")
    
    # CSVファイルを読み込む
    print(f"CSVファイルを読み込み中: {CSV_PATH}")
    if not CSV_PATH.exists():
        print(f"エラー: {CSV_PATH} が見つかりません")
        return
    
    data = load_csv_data(CSV_PATH)
    print(f"{len(data)}件のメッセージを読み込みました")
    
    # メッセージを分析
    print("メッセージを分析中...")
    analysis = analyze_messages(data)
    print(f"システムチーム関連: {len(analysis['system_team_messages'])}件")
    print(f"経理関連: {len(analysis['accounting_messages'])}件")
    
    # 共通パターンを抽出
    print("共通パターンを抽出中...")
    system_patterns = extract_common_patterns(analysis['system_team_messages'])
    accounting_patterns = extract_common_patterns(analysis['accounting_messages'])
    print(f"システムチーム共通パターン: {len(system_patterns)}件")
    print(f"経理共通パターン: {len(accounting_patterns)}件")
    
    # フォーム設計
    print("フォームを設計中...")
    system_form_items = design_system_team_form(analysis)
    accounting_form_items = design_accounting_form(analysis)
    
    print(f"\nシステムチームフォーム: {len(system_form_items)}項目")
    print(f"経理フォーム: {len(accounting_form_items)}項目")
    
    # スプレッドシートに書き込み
    if GOOGLE_API_AVAILABLE:
        print("\nスプレッドシートに書き込み中...")
        try:
            service = get_sheets_service()
            
            # システムチームフォーム設定を更新
            update_spreadsheet_form_settings(
                service,
                'フォーム設定_システムチーム',
                system_form_items
            )
            
            # 経理フォーム設定を更新
            update_spreadsheet_form_settings(
                service,
                'フォーム設定_経理',
                accounting_form_items
            )
            
            print("\nフォーム設定の更新が完了しました！")
        except Exception as e:
            print(f"エラー: スプレッドシートへの書き込みに失敗しました")
            print(f"詳細: {e}")
            print("\nフォーム設計は完了していますが、スプレッドシートへの書き込みはスキップされました。")
    else:
        print("\nGoogle APIライブラリがインストールされていないため、スプレッドシートへの書き込みはスキップされました。")
        print("フォーム設計結果:")
        print("\n=== システムチームフォーム ===")
        for item in system_form_items:
            print(f"  {item[1]} ({item[0]})")
        print("\n=== 経理フォーム ===")
        for item in accounting_form_items:
            print(f"  {item[1]} ({item[0]})")


if __name__ == '__main__':
    main()

