"""
Slack問い合わせ分析CSVを分析して、フォーム項目の改善案を生成
"""
import csv
import collections
import json
from pathlib import Path

# CSVファイルのパス（ワークスペースルートからの相対パス）
# ワークスペースルート: C:\Users\N0099_202312\Documents\projects
workspace_root = Path(r'C:\Users\N0099_202312\Documents\projects')
csv_path = workspace_root / 'work' / 'pe_portalsite' / 'docs' / 'slack問い合わせ分析.csv'

# カテゴリの集計
categories = collections.Counter()
subcategories = collections.Counter()
channels = collections.Counter()
request_types = collections.Counter()

# キーワード分析用
keywords_system = collections.Counter()
keywords_accounting = collections.Counter()

# システムチーム関連キーワード
system_keywords = ['エラー', 'ログイン', 'Filemaker', 'FM', '貼り付け', '権限', 'VPN', 'リモート', '面接', '選考', '教師', '生徒', 'PC', '設定', 'セッティング', 'システム', '不具合', 'トラブル', '修正', '改修']

# 経理関連キーワード
accounting_keywords = ['請求', '報酬', '振込', '決済', '費用', '金額', '支払', '領収', '経理', '会計', 'クレカ', 'カード', '口座', '銀行']

print("CSVファイルを読み込み中...")
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # 大カテゴリの集計
        if row['大カテゴリ']:
            categories[row['大カテゴリ']] += 1
        
        # 小カテゴリの集計
        if row['小カテゴリ']:
            subcategories[row['小カテゴリ']] += 1
        
        # チャンネルの集計
        if row['チャンネル']:
            channels[row['チャンネル']] += 1
        
        # メッセージ本文の分析
        message = row.get('メッセージ本文（元）', '')
        channel = row.get('チャンネル', '')
        
        # システムチームチャンネルまたはシステム関連キーワード
        if 'システム' in channel or any(kw in message for kw in system_keywords):
            request_types['システムチーム'] += 1
            # キーワード抽出
            for kw in system_keywords:
                if kw in message:
                    keywords_system[kw] += 1
        
        # 経理チャンネルまたは経理関連キーワード
        if '経理' in channel or any(kw in message for kw in accounting_keywords):
            request_types['経理'] += 1
            # キーワード抽出
            for kw in accounting_keywords:
                if kw in message:
                    keywords_accounting[kw] += 1

print("\n=== チャンネル分布 ===")
for channel, count in channels.most_common(10):
    print(f"{channel}: {count}")

print("\n=== 大カテゴリ分布 ===")
for cat, count in categories.most_common(20):
    print(f"{cat}: {count}")

print("\n=== 小カテゴリ分布 ===")
for subcat, count in subcategories.most_common(30):
    print(f"{subcat}: {count}")

print("\n=== 依頼先推定 ===")
for req_type, count in request_types.most_common():
    print(f"{req_type}: {count}")

print("\n=== システムチーム関連キーワード（上位20） ===")
for kw, count in keywords_system.most_common(20):
    print(f"{kw}: {count}")

print("\n=== 経理関連キーワード（上位20） ===")
for kw, count in keywords_accounting.most_common(20):
    print(f"{kw}: {count}")

# 分析結果をJSONファイルに保存
analysis_result = {
    'channels': dict(channels.most_common(10)),
    'categories': dict(categories.most_common(20)),
    'subcategories': dict(subcategories.most_common(30)),
    'request_types': dict(request_types.most_common()),
    'system_keywords': dict(keywords_system.most_common(20)),
    'accounting_keywords': dict(keywords_accounting.most_common(20))
}

output_path = Path(__file__).parent.parent / 'docs' / 'slack問い合わせ分析結果.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(analysis_result, f, ensure_ascii=False, indent=2)

print(f"\n分析結果を保存しました: {output_path}")

