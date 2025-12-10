"""
GASプロジェクトのセットアップスクリプト
Cursor AIエージェントが自動生成・実行
"""

import json
import subprocess
import os
from pathlib import Path
from datetime import datetime

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent
GAS_DIR = PROJECT_ROOT / 'gas'

# GASプロジェクトスクリプトID（実験用）
GAS_SCRIPT_ID = '1czGmHa0Zyz1QCS9VfTYBIpNZSIMJY2lACGtvbTv8fVHcWAekPM_fqFfT'

# 既存プロジェクトのID（使用禁止）
EXISTING_GAS_SCRIPT_ID = '1CZwdtE0-pWP7cUxGTJUIQctCq1DBTRac7gkhci5NddnBJsjm3T1l7qLY'

# 安全対策: 既存プロジェクトのIDを使用しようとした場合はエラー
if GAS_SCRIPT_ID == EXISTING_GAS_SCRIPT_ID:
    raise ValueError("既存プロジェクトのGASスクリプトIDを使用しようとしています。実験用のIDを使用してください。")

def create_appsscript_json():
    """appsscript.jsonを作成"""
    appsscript = {
        "timeZone": "Asia/Tokyo",
        "dependencies": {},
        "exceptionLogging": "STACKDRIVER",
        "runtimeVersion": "V8"
    }
    
    appsscript_path = GAS_DIR / 'appsscript.json'
    with open(appsscript_path, 'w', encoding='utf-8') as f:
        json.dump(appsscript, f, indent=2, ensure_ascii=False)
    print("  ✓ appsscript.jsonを作成しました")

def create_clasp_json():
    """.clasp.jsonを作成"""
    clasp = {
        "scriptId": GAS_SCRIPT_ID,
        "rootDir": "."
    }
    
    clasp_path = GAS_DIR / '.clasp.json'
    with open(clasp_path, 'w', encoding='utf-8') as f:
        json.dump(clasp, f, indent=2, ensure_ascii=False)
    print("  ✓ .clasp.jsonを作成しました")

def create_gas_script_files():
    """GASスクリプトファイルを作成"""
    gas_files = {
        'Config.gs': '''/**
 * PEポータルサイト - 設定管理
 * 
 * システム全体の設定値を管理します。
 */

function getConfig() {
  const spreadsheetId = '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('システム設定');
  const data = sheet.getDataRange().getValues();
  
  const config = {};
  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }
  
  return config;
}
''',
        'Main.gs': '''/**
 * PEポータルサイト - メイン処理
 * 
 * メイン処理を管理します。
 */

function onOpen() {
  // メニューを追加（必要に応じて）
}

function main() {
  // メイン処理
  Logger.log('PEポータルサイト - メイン処理を開始');
}
''',
        'BatchProcessor.gs': '''/**
 * PEポータルサイト - バッチ処理
 * 
 * 夜間バッチ処理を管理します。
 */

function dailyDataAggregation() {
  // 夜間バッチ処理（毎日 02:00実行）
  Logger.log('PEポータルサイト - 夜間バッチ処理を開始');
}
''',
        'TriggerManager.gs': '''/**
 * PEポータルサイト - トリガー管理
 * 
 * トリガーの設定・管理を行います。
 */

function setupTriggers() {
  // トリガーを設定
  Logger.log('PEポータルサイト - トリガーを設定');
}
'''
    }
    
    for filename, content in gas_files.items():
        file_path = GAS_DIR / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ {filename}を作成しました")

def create_html_files():
    """HTMLファイルを作成"""
    html_files = {
        'index.html': '''<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>PEポータルサイト - ホーム</title>
</head>
<body>
  <h1>PEポータルサイト</h1>
  <!-- コンテンツ -->
</body>
</html>
''',
        'system-team-request.html': '''<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>システムチームへの依頼</title>
</head>
<body>
  <h1>システムチームへの依頼</h1>
  <!-- コンテンツ -->
</body>
</html>
''',
        'accounting-request.html': '''<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>経理への依頼</title>
</head>
<body>
  <h1>経理への依頼</h1>
  <!-- コンテンツ -->
</body>
</html>
''',
        'request-status.html': '''<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>依頼状況確認</title>
</head>
<body>
  <h1>依頼状況確認</h1>
  <!-- コンテンツ -->
</body>
</html>
''',
        'faq-help.html': '''<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <title>FAQ・ヘルプ</title>
</head>
<body>
  <h1>FAQ・ヘルプ</h1>
  <!-- コンテンツ -->
</body>
</html>
'''
    }
    
    for filename, content in html_files.items():
        file_path = GAS_DIR / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ {filename}を作成しました")

def create_javascript_files():
    """JavaScriptファイルを作成"""
    js_files = {
        'embed-config.js': '''/**
 * PEポータルサイト - 埋め込みURL/CSVの一元設定
 */

const EMBED_CONFIG = {
  spreadsheetId: '1mivDNOXpZsE7oW7gF10Rq3NvnYjxjfiVQWp4LHIorL0',
  // 設定を追加
};
''',
        'dashboard.js': '''/**
 * PEポータルサイト - ダッシュボード用JavaScript
 */

function loadDashboard() {
  // ダッシュボードデータを読み込む
  console.log('ダッシュボードを読み込み中...');
}
''',
        'form-handler.js': '''/**
 * PEポータルサイト - フォーム処理用JavaScript
 */

function handleFormSubmit() {
  // フォーム送信処理
  console.log('フォームを送信中...');
}
''',
        'status-filter.js': '''/**
 * PEポータルサイト - ステータスフィルター用JavaScript
 */

function filterByStatus(status) {
  // ステータスでフィルター
  console.log(`ステータスでフィルター: ${status}`);
}
'''
    }
    
    for filename, content in js_files.items():
        file_path = GAS_DIR / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ {filename}を作成しました")

def create_css_files():
    """CSSファイルを作成"""
    css_files = {
        'common.css': '''/**
 * PEポータルサイト - 共通CSS
 */

body {
  font-family: 'Noto Sans JP', sans-serif;
  margin: 0;
  padding: 0;
}

h1 {
  color: #333;
  font-size: 24px;
}
'''
    }
    
    for filename, content in css_files.items():
        file_path = GAS_DIR / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ {filename}を作成しました")

def clasp_push():
    """clasp pushでGASプロジェクトに反映"""
    print("\n[5/5] clasp pushでGASプロジェクトに反映...")
    os.chdir(GAS_DIR)
    
    try:
        # claspがインストールされているか確認
        result = subprocess.run(['clasp', '--version'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("⚠ 警告: claspがインストールされていません")
            print("   以下のコマンドでインストールしてください:")
            print("   npm install -g @google/clasp")
            print("   その後、clasp loginを実行して認証してください")
            return False
        
        # clasp pushを実行
        result = subprocess.run(['clasp', 'push'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ clasp pushが成功しました")
            print(result.stdout)
            return True
        else:
            print("⚠ 警告: clasp pushに失敗しました")
            print(result.stderr)
            print("\n注意: clasp loginを実行して認証してください")
            return False
    except FileNotFoundError:
        print("⚠ 警告: claspコマンドが見つかりません")
        print("   以下のコマンドでインストールしてください:")
        print("   npm install -g @google/clasp")
        return False
    except Exception as e:
        print(f"⚠ 警告: clasp pushでエラーが発生しました: {e}")
        return False

def setup_gas_project():
    """GASプロジェクトのセットアップ"""
    print("=" * 60)
    print("GASプロジェクトのセットアップを開始します")
    print("=" * 60)
    print(f"GASスクリプトID: {GAS_SCRIPT_ID}")
    
    # gasディレクトリが存在しない場合は作成
    GAS_DIR.mkdir(exist_ok=True)
    
    # 1. 設定ファイルを作成
    print("\n[1/5] 設定ファイルを作成...")
    create_appsscript_json()
    create_clasp_json()
    
    # 2. GASスクリプトファイルを作成
    print("\n[2/5] GASスクリプトファイルを作成...")
    create_gas_script_files()
    
    # 3. HTMLファイルを作成
    print("\n[3/5] HTMLファイルを作成...")
    create_html_files()
    
    # 4. JavaScript/CSSファイルを作成
    print("\n[4/5] JavaScript/CSSファイルを作成...")
    create_javascript_files()
    create_css_files()
    
    # 5. clasp pushでGASプロジェクトに反映
    clasp_success = clasp_push()
    
    print("\n" + "=" * 60)
    print("GASプロジェクトのセットアップが完了しました")
    if not clasp_success:
        print("⚠ 注意: clasp pushは失敗しましたが、ファイルは作成されました")
        print("   後で手動でclasp pushを実行してください")
    print("=" * 60)
    return True

if __name__ == '__main__':
    success = setup_gas_project()
    if success:
        print("\n✓ すべての処理が正常に完了しました")
    else:
        print("\n✗ 一部の処理でエラーが発生しました")
        exit(1)

