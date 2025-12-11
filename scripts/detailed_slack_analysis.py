"""
詳細なSlack問い合わせ分析スクリプト

CSVのメッセージを詳細に分析し、イシュー化の精度を向上させる
"""

import csv
import json
import re
from pathlib import Path
from collections import Counter, defaultdict
from typing import Dict, List, Tuple
from datetime import datetime

# 設定
CSV_PATH = Path(r'C:\Users\N0099_202312\Documents\projects\work\pe_portalsite\docs\slack問い合わせ分析.csv')
OUTPUT_PATH = Path(__file__).parent.parent / 'docs' / 'slack問い合わせ詳細分析結果.json'

# 対象ユーザーID
TARGET_USERS = {
    '吉子': 'U63UJ2CSW',
    '渡邊': 'U060HCVM1PF'
}

# システム系の詳細キーワード
SYSTEM_ISSUE_PATTERNS = {
    'ログインエラー': [
        r'ログイン.*(できない|エラー|失敗)',
        r'ログイン.*(できません|できませんでした)',
        r'ログイン.*(問題|不具合)',
    ],
    '権限エラー': [
        r'権限',
        r'アクセス.*(できない|拒否)',
        r'許可.*(されていない|されません)',
    ],
    'データ修正': [
        r'修正',
        r'変更',
        r'更新',
        r'追加',
        r'削除',
        r'編集',
    ],
    'システム不具合': [
        r'エラー',
        r'不具合',
        r'動かない',
        r'起動しない',
        r'動作.*(しない|おかしい)',
        r'表示.*(されない|おかしい)',
    ],
    'Filemaker関連': [
        r'Filemaker',
        r'FM',
        r'選考.*(ファイル|F)',
        r'面接.*(ファイル|F|S)',
        r'生徒.*(ファイル|F)',
        r'教師.*(ファイル|F)',
    ],
    'VPN・リモート': [
        r'VPN',
        r'リモート',
        r'接続.*(できない|失敗)',
    ],
    '貼り付け問題': [
        r'貼り付け',
        r'貼付',
        r'コピー.*(できない|失敗)',
    ],
}

# 経理系の詳細キーワード
ACCOUNTING_ISSUE_PATTERNS = {
    '請求関連': [
        r'請求',
        r'請求書',
        r'発行',
        r'作成',
    ],
    '支払関連': [
        r'支払',
        r'支払い',
        r'振込',
        r'振り込み',
        r'送金',
    ],
    '口座・決済': [
        r'口座',
        r'銀行',
        r'クレカ',
        r'クレジットカード',
        r'決済',
        r'カード',
    ],
    '報酬関連': [
        r'報酬',
        r'給与',
        r'時給',
        r'単価',
    ],
    '金額確認': [
        r'金額',
        r'費用',
        r'料金',
        r'価格',
    ],
    '締日関連': [
        r'締日',
        r'締切',
        r'15日',
        r'月末',
    ],
}


def load_csv_data(csv_path: Path) -> List[Dict]:
    """CSVファイルを読み込む"""
    data = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data


def extract_issues_from_message(message: str, patterns: Dict[str, List[str]]) -> List[str]:
    """メッセージからイシューを抽出"""
    issues = []
    message_lower = message.lower()
    
    for issue_type, pattern_list in patterns.items():
        for pattern in pattern_list:
            if re.search(pattern, message, re.IGNORECASE):
                if issue_type not in issues:
                    issues.append(issue_type)
                break
    
    return issues


def analyze_message_structure(message: str) -> Dict:
    """メッセージの構造を分析"""
    analysis = {
        'has_urgency': False,
        'has_priority': False,
        'has_error_message': False,
        'has_student_info': False,
        'has_teacher_info': False,
        'has_file_mention': False,
        'is_question': False,
        'is_request': False,
        'word_count': len(message.split()),
        'has_structured_info': False,
    }
    
    # 緊急度のキーワード
    urgency_keywords = ['緊急', '急ぎ', '至急', 'すぐ', '今すぐ', '早急', '急いで']
    analysis['has_urgency'] = any(keyword in message for keyword in urgency_keywords)
    
    # 重要度のキーワード
    priority_keywords = ['重要', '大事', '必須', '必要', '要']
    analysis['has_priority'] = any(keyword in message for keyword in priority_keywords)
    
    # エラーメッセージ
    analysis['has_error_message'] = 'エラー' in message or 'error' in message.lower()
    
    # 生徒情報
    student_keywords = ['生徒', '世帯', '選考', 'ゲスト']
    analysis['has_student_info'] = any(keyword in message for keyword in student_keywords)
    
    # 教師情報
    teacher_keywords = ['教師', '面接官', '先生']
    analysis['has_teacher_info'] = any(keyword in message for keyword in teacher_keywords)
    
    # ファイル言及
    file_keywords = ['ファイル', '画像', 'スクリーンショット', '添付', '貼り付け']
    analysis['has_file_mention'] = any(keyword in message for keyword in file_keywords)
    
    # 質問形式
    question_markers = ['？', '?', 'ですか', 'でしょうか', 'どうすれば', '方法', '教えて']
    analysis['is_question'] = any(marker in message for marker in question_markers)
    
    # 依頼形式
    request_markers = ['お願い', '依頼', '対応', '処理', '修正', '変更', '追加']
    analysis['is_request'] = any(marker in message for marker in request_markers)
    
    # 構造化された情報があるか
    structured_markers = ['ID', '番号', '日時', '金額', 'URL']
    analysis['has_structured_info'] = any(marker in message for marker in structured_markers)
    
    return analysis


def categorize_message(message: str, channel: str, mention: str) -> Dict:
    """メッセージをカテゴリ化"""
    category = {
        'type': 'unknown',
        'subtype': 'unknown',
        'issues': [],
        'confidence': 0.0,
    }
    
    # システムチーム関連
    if 'システムチーム' in channel or any(uid in mention for uid in TARGET_USERS.values()):
        system_issues = extract_issues_from_message(message, SYSTEM_ISSUE_PATTERNS)
        if system_issues:
            category['type'] = 'system_team'
            category['subtype'] = system_issues[0] if system_issues else 'general'
            category['issues'] = system_issues
            category['confidence'] = min(len(system_issues) * 0.3, 1.0)
        else:
            category['type'] = 'system_team'
            category['subtype'] = 'general'
            category['confidence'] = 0.5
    
    # 経理関連
    elif '経理' in channel:
        accounting_issues = extract_issues_from_message(message, ACCOUNTING_ISSUE_PATTERNS)
        if accounting_issues:
            category['type'] = 'accounting'
            category['subtype'] = accounting_issues[0] if accounting_issues else 'general'
            category['issues'] = accounting_issues
            category['confidence'] = min(len(accounting_issues) * 0.3, 1.0)
        else:
            category['type'] = 'accounting'
            category['subtype'] = 'general'
            category['confidence'] = 0.5
    
    return category


def analyze_all_messages(data: List[Dict]) -> Dict:
    """全メッセージを分析"""
    analysis = {
        'total_messages': len(data),
        'system_team': {
            'total': 0,
            'by_issue': defaultdict(int),
            'by_structure': defaultdict(int),
            'messages': []
        },
        'accounting': {
            'total': 0,
            'by_issue': defaultdict(int),
            'by_structure': defaultdict(int),
            'messages': []
        },
        'issues': {
            'missing_urgency_priority': 0,
            'unstructured': 0,
            'missing_info': 0,
            'repetitive_patterns': defaultdict(int),
        },
        'recommendations': []
    }
    
    # メッセージパターンの記録
    message_patterns = defaultdict(int)
    
    for row in data:
        message = row.get('メッセージ本文（元）', '')
        channel = row.get('チャンネル', '')
        mention = row.get('送信先（メンション）', '')
        
        if not message or len(message.strip()) < 5:
            continue
        
        # メッセージ構造を分析
        structure = analyze_message_structure(message)
        
        # カテゴリ化
        category = categorize_message(message, channel, mention)
        
        # メッセージパターンを記録（簡易版：最初の50文字）
        message_pattern = message[:50].strip()
        message_patterns[message_pattern] += 1
        
        if category['type'] == 'system_team':
            analysis['system_team']['total'] += 1
            for issue in category['issues']:
                analysis['system_team']['by_issue'][issue] += 1
            
            # 構造分析
            if not structure['has_urgency'] and not structure['has_priority']:
                analysis['issues']['missing_urgency_priority'] += 1
            if not structure['has_structured_info']:
                analysis['issues']['unstructured'] += 1
            if not structure['has_student_info'] and not structure['has_teacher_info']:
                analysis['issues']['missing_info'] += 1
            
            analysis['system_team']['messages'].append({
                'message': message[:200],
                'category': category,
                'structure': structure
            })
        
        elif category['type'] == 'accounting':
            analysis['accounting']['total'] += 1
            for issue in category['issues']:
                analysis['accounting']['by_issue'][issue] += 1
            
            # 構造分析
            if not structure['has_urgency'] and not structure['has_priority']:
                analysis['issues']['missing_urgency_priority'] += 1
            if not structure['has_structured_info']:
                analysis['issues']['unstructured'] += 1
            
            analysis['accounting']['messages'].append({
                'message': message[:200],
                'category': category,
                'structure': structure
            })
    
    # 繰り返しパターンを抽出（3回以上出現）
    for pattern, count in message_patterns.items():
        if count >= 3:
            analysis['issues']['repetitive_patterns'][pattern] = count
    
    # 推奨事項を生成
    if analysis['issues']['missing_urgency_priority'] > analysis['total_messages'] * 0.5:
        analysis['recommendations'].append({
            'issue': '緊急度・重要度が不明確',
            'count': analysis['issues']['missing_urgency_priority'],
            'percentage': round(analysis['issues']['missing_urgency_priority'] / analysis['total_messages'] * 100, 1),
            'solution': 'フォームで緊急度・重要度を必須項目として選択させる'
        })
    
    if analysis['issues']['unstructured'] > analysis['total_messages'] * 0.5:
        analysis['recommendations'].append({
            'issue': '構造化されていない情報が多い',
            'count': analysis['issues']['unstructured'],
            'percentage': round(analysis['issues']['unstructured'] / analysis['total_messages'] * 100, 1),
            'solution': 'フォームで構造化された入力項目を提供する'
        })
    
    if len(analysis['issues']['repetitive_patterns']) > 0:
        analysis['recommendations'].append({
            'issue': '繰り返しの問い合わせが多い',
            'count': len(analysis['issues']['repetitive_patterns']),
            'solution': 'FAQ機能やナレッジベースを充実させる'
        })
    
    return analysis


def main():
    """メイン処理"""
    print("詳細なSlack問い合わせ分析を開始します...")
    
    # CSVファイルを読み込む
    print(f"CSVファイルを読み込み中: {CSV_PATH}")
    if not CSV_PATH.exists():
        print(f"エラー: {CSV_PATH} が見つかりません")
        return
    
    data = load_csv_data(CSV_PATH)
    print(f"{len(data)}件のメッセージを読み込みました")
    
    # 詳細分析
    print("メッセージを詳細分析中...")
    analysis = analyze_all_messages(data)
    
    # 結果を表示
    print("\n=== 分析結果 ===")
    print(f"総メッセージ数: {analysis['total_messages']}")
    print(f"\nシステムチーム関連: {analysis['system_team']['total']}件")
    print("  イシュー別:")
    for issue, count in sorted(analysis['system_team']['by_issue'].items(), key=lambda x: -x[1]):
        print(f"    - {issue}: {count}件")
    
    print(f"\n経理関連: {analysis['accounting']['total']}件")
    print("  イシュー別:")
    for issue, count in sorted(analysis['accounting']['by_issue'].items(), key=lambda x: -x[1]):
        print(f"    - {issue}: {count}件")
    
    print(f"\n=== 課題点 ===")
    print(f"緊急度・重要度が不明確: {analysis['issues']['missing_urgency_priority']}件")
    print(f"構造化されていない: {analysis['issues']['unstructured']}件")
    print(f"情報不足: {analysis['issues']['missing_info']}件")
    print(f"繰り返しパターン: {len(analysis['issues']['repetitive_patterns'])}件")
    
    print(f"\n=== 推奨事項 ===")
    for rec in analysis['recommendations']:
        print(f"- {rec['issue']}: {rec.get('count', 'N/A')}件 ({rec.get('percentage', 'N/A')}%)")
        print(f"  解決策: {rec['solution']}")
    
    # 結果をJSONファイルに保存
    output_path = OUTPUT_PATH
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # JSONシリアライズ可能な形式に変換
    output_data = {
        'total_messages': analysis['total_messages'],
        'system_team': {
            'total': analysis['system_team']['total'],
            'by_issue': dict(analysis['system_team']['by_issue']),
        },
        'accounting': {
            'total': analysis['accounting']['total'],
            'by_issue': dict(analysis['accounting']['by_issue']),
        },
        'issues': {
            'missing_urgency_priority': analysis['issues']['missing_urgency_priority'],
            'unstructured': analysis['issues']['unstructured'],
            'missing_info': analysis['issues']['missing_info'],
            'repetitive_patterns': dict(analysis['issues']['repetitive_patterns']),
        },
        'recommendations': analysis['recommendations']
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n分析結果を保存しました: {output_path}")
    print("\n分析完了！")


if __name__ == '__main__':
    main()

