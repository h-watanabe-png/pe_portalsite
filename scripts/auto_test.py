"""
PEポータルサイト - 自動テストスクリプト
Cursor AIエージェントが自動生成・実行

仮想環境やテスト環境を用意せず、出力結果のみで動作確認
本番データに影響を与えない安全なテスト実行

段階的実行と進捗管理機能付き
"""

import subprocess
import json
import time
import re
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent
GAS_DIR = PROJECT_ROOT / 'gas'

# テスト結果の保存先
TEST_RESULTS_DIR = PROJECT_ROOT / 'test_results'
TEST_RESULTS_DIR.mkdir(exist_ok=True)

# 進捗ファイルの保存先
PROGRESS_FILE = TEST_RESULTS_DIR / 'test_progress.json'


def find_clasp_command():
    """claspコマンドのパスを取得（Windows対応）"""
    import shutil
    # まず通常のclaspを試す
    clasp_path = shutil.which('clasp')
    if clasp_path:
        return clasp_path
    
    # Windowsの場合、clasp.cmdを試す
    if os.name == 'nt':
        clasp_cmd = shutil.which('clasp.cmd')
        if clasp_cmd:
            return clasp_cmd
        
        # npmのグローバルパスを確認
        npm_path = shutil.which('npm')
        if npm_path:
            npm_dir = os.path.dirname(npm_path)
            clasp_cmd = os.path.join(npm_dir, 'clasp.cmd')
            if os.path.exists(clasp_cmd):
                return clasp_cmd
    
    return 'clasp'  # フォールバック


def check_clasp():
    """claspがインストールされているか確認"""
    clasp_cmd = find_clasp_command()
    try:
        # Windowsではshell=Trueを使用
        result = subprocess.run(
            [clasp_cmd, '--version'] if os.name != 'nt' else f'{clasp_cmd} --version',
            capture_output=True,
            text=True,
            check=True,
            shell=(os.name == 'nt')
        )
        return True, result.stdout.strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False, None


def check_clasp_json():
    """`.clasp.json`が存在するか確認"""
    clasp_json_path = GAS_DIR / '.clasp.json'
    if not clasp_json_path.exists():
        return False, None
    
    with open(clasp_json_path, 'r', encoding='utf-8') as f:
        clasp_config = json.load(f)
    return True, clasp_config.get('scriptId', '')


def run_gas_function(function_name: str) -> Tuple[bool, str]:
    """
    GAS関数を実行
    
    Args:
        function_name: 実行する関数名
        
    Returns:
        (成功フラグ, 出力メッセージ)
    """
    clasp_cmd = find_clasp_command()
    original_dir = os.getcwd()
    os.chdir(GAS_DIR)
    
    try:
        print(f"  → {function_name} を実行中...")
        # Windowsではshell=Trueを使用
        cmd = [clasp_cmd, 'run', function_name] if os.name != 'nt' else f'{clasp_cmd} run {function_name}'
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5分のタイムアウト
            shell=(os.name == 'nt')
        )
        
        if result.returncode == 0:
            return True, result.stdout
        else:
            return False, result.stderr or result.stdout
    except subprocess.TimeoutExpired:
        return False, "タイムアウト: 5分以内に完了しませんでした"
    except Exception as e:
        return False, f"実行エラー: {str(e)}"
    finally:
        os.chdir(original_dir)


def get_gas_logs(wait_seconds: int = 5) -> str:
    """
    GASの実行ログを取得
    
    Args:
        wait_seconds: ログが反映されるまでの待機時間
        
    Returns:
        ログの内容
    """
    clasp_cmd = find_clasp_command()
    original_dir = os.getcwd()
    os.chdir(GAS_DIR)
    
    # ログが反映されるまで待機
    if wait_seconds > 0:
        print(f"  → ログ反映待機中 ({wait_seconds}秒)...")
        time.sleep(wait_seconds)
    
    try:
        # Windowsではshell=Trueを使用
        cmd = [clasp_cmd, 'logs'] if os.name != 'nt' else f'{clasp_cmd} logs'
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            shell=(os.name == 'nt')
        )
        
        if result.returncode == 0:
            return result.stdout
        else:
            return result.stderr or result.stdout
    except Exception as e:
        return f"ログ取得エラー: {str(e)}"
    finally:
        os.chdir(original_dir)


def parse_test_results(logs: str) -> Dict:
    """
    テストログを解析して結果を抽出
    
    Args:
        logs: GASの実行ログ
        
    Returns:
        解析結果の辞書
    """
    results = {
        'total_tests': 0,
        'passed': 0,
        'failed': 0,
        'errors': [],
        'warnings': [],
        'test_details': [],
        'raw_logs': logs
    }
    
    # テスト結果のパターンを検出
    passed_pattern = r'成功:\s*(\d+)件'
    failed_pattern = r'失敗:\s*(\d+)件'
    
    passed_match = re.search(passed_pattern, logs)
    failed_match = re.search(failed_pattern, logs)
    
    if passed_match:
        results['passed'] = int(passed_match.group(1))
    if failed_match:
        results['failed'] = int(failed_match.group(1))
    
    results['total_tests'] = results['passed'] + results['failed']
    
    # エラーメッセージを抽出
    error_pattern = r'✗\s+(.+?)(?:\n|$)'
    errors = re.findall(error_pattern, logs)
    results['errors'] = errors
    
    # 警告メッセージを抽出
    warning_pattern = r'⚠\s+(.+?)(?:\n|$)'
    warnings = re.findall(warning_pattern, logs)
    results['warnings'] = warnings
    
    # 成功メッセージを抽出
    success_pattern = r'✓\s+(.+?)(?:\n|$)'
    successes = re.findall(success_pattern, logs)
    results['test_details'] = successes
    
    # エラーパターンを検出
    error_keywords = ['エラー', 'Error', 'Exception', '失敗', 'Failed']
    for line in logs.split('\n'):
        if any(keyword in line for keyword in error_keywords):
            if line.strip() and '✗' not in line:
                results['errors'].append(line.strip())
    
    return results


def detect_code_issues(logs: str) -> List[Dict]:
    """
    ログからコードの問題を検出
    
    Args:
        logs: GASの実行ログ
        
    Returns:
        検出された問題のリスト
    """
    issues = []
    
    # よくあるエラーパターン
    error_patterns = {
        'ReferenceError': r'ReferenceError:\s*(.+?)(?:\n|$)',
        'TypeError': r'TypeError:\s*(.+?)(?:\n|$)',
        'SyntaxError': r'SyntaxError:\s*(.+?)(?:\n|$)',
        '未定義': r'未定義[^:]*:\s*(.+?)(?:\n|$)',
        'is not defined': r'(\w+)\s+is not defined',
        'is not a function': r'(\w+)\s+is not a function',
    }
    
    for error_type, pattern in error_patterns.items():
        matches = re.findall(pattern, logs, re.IGNORECASE)
        for match in matches:
            issues.append({
                'type': error_type,
                'message': match.strip() if isinstance(match, str) else str(match),
                'severity': 'error'
            })
    
    return issues


def generate_test_report(results: Dict, issues: List[Dict], output_file: str):
    """
    テストレポートを生成
    
    Args:
        results: テスト結果
        issues: 検出された問題
        output_file: 出力ファイルパス
    """
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    report = f"""# PEポータルサイト 自動テストレポート

**実行日時**: {timestamp}

## テスト結果サマリー

- **総テスト数**: {results['total_tests']}件
- **成功**: {results['passed']}件
- **失敗**: {results['failed']}件
- **成功率**: {(results['passed'] / results['total_tests'] * 100) if results['total_tests'] > 0 else 0:.1f}%

## テスト詳細

### 成功したテスト
"""
    
    if results['test_details']:
        for detail in results['test_details']:
            report += f"- ✓ {detail}\n"
    else:
        report += "- なし\n"
    
    report += "\n### 失敗したテスト\n"
    if results['errors']:
        for i, error in enumerate(results['errors'], 1):
            report += f"{i}. ✗ {error}\n"
    else:
        report += "- なし\n"
    
    if results['warnings']:
        report += "\n### 警告\n"
        for warning in results['warnings']:
            report += f"- ⚠ {warning}\n"
    
    if issues:
        report += "\n## 検出されたコード問題\n\n"
        for issue in issues:
            report += f"### {issue['type']}\n"
            report += f"- **メッセージ**: {issue['message']}\n"
            report += f"- **重要度**: {issue['severity']}\n\n"
    
    report += "\n## ログ全文\n\n"
    report += "```\n"
    report += results['raw_logs']
    report += "\n```\n"
    
    # ファイルに保存
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\n✓ テストレポートを保存しました: {output_file}")


def load_progress() -> Optional[Dict]:
    """進捗ファイルを読み込む"""
    if PROGRESS_FILE.exists():
        try:
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠ 進捗ファイルの読み込みエラー: {e}")
    return None


def save_progress(progress: Dict):
    """進捗ファイルに保存"""
    try:
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            json.dump(progress, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"⚠ 進捗ファイルの保存エラー: {e}")


def clear_progress():
    """進捗ファイルを削除"""
    if PROGRESS_FILE.exists():
        try:
            PROGRESS_FILE.unlink()
        except Exception as e:
            print(f"⚠ 進捗ファイルの削除エラー: {e}")


def print_progress_bar(current: int, total: int, width: int = 40):
    """進捗バーを表示"""
    if total == 0:
        return
    
    filled = int(width * current / total)
    bar = '█' * filled + '░' * (width - filled)
    percentage = (current / total) * 100
    print(f"\r[{bar}] {current}/{total} ({percentage:.1f}%)", end='', flush=True)


def run_test_with_progress(test_name: str, test_index: int, total_tests: int) -> Tuple[bool, Dict, float]:
    """
    テストを実行して進捗を表示
    
    Returns:
        (成功フラグ, 結果辞書, 実行時間)
    """
    start_time = time.time()
    
    print(f"\n[{test_index}/{total_tests}] {test_name} を実行中...")
    print_progress_bar(test_index - 1, total_tests)
    
    # テスト関数を実行
    success, output = run_gas_function(test_name)
    
    # ログを取得
    logs = get_gas_logs(wait_seconds=3)
    
    # 結果を解析
    results = parse_test_results(logs)
    issues = detect_code_issues(logs)
    
    elapsed_time = time.time() - start_time
    
    # 進捗バーを更新
    print_progress_bar(test_index, total_tests)
    
    result = {
        'test_name': test_name,
        'success': success,
        'passed': results['passed'],
        'failed': results['failed'],
        'errors': results['errors'],
        'issues': issues,
        'elapsed_time': elapsed_time,
        'timestamp': datetime.now().isoformat()
    }
    
    if success and results['failed'] == 0:
        print(f" ✓ 成功 ({elapsed_time:.1f}秒)")
    else:
        print(f" ✗ 失敗 ({elapsed_time:.1f}秒)")
        if results['errors']:
            print(f"   エラー: {results['errors'][0][:50]}...")
    
    return success and results['failed'] == 0, result, elapsed_time


def run_tests_staged(test_functions: List[str], resume: bool = False):
    """
    テストを段階的に実行
    
    Args:
        test_functions: 実行するテスト関数名のリスト
        resume: 前回の続きから再開するか
    """
    print("=" * 60)
    print("PEポータルサイト 自動テスト実行（段階的実行）")
    print("=" * 60)
    print(f"実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 進捗を読み込む
    progress = load_progress() if resume else None
    
    if progress and resume:
        print("📂 前回の進捗を読み込みました")
        print(f"   開始時刻: {progress.get('start_time', 'N/A')}")
        print(f"   完了テスト: {len(progress.get('completed_tests', []))}/{len(test_functions)}")
        
        # 未完了のテストのみ実行
        completed = [t['test_name'] for t in progress.get('completed_tests', [])]
        test_functions = [t for t in test_functions if t not in completed]
        
        if not test_functions:
            print("✓ すべてのテストが完了しています")
            return True
        
        print(f"\n続きから実行します: {len(test_functions)}件のテストが残っています\n")
    else:
        # 新しい進捗を初期化
        progress = {
            'start_time': datetime.now().isoformat(),
            'test_functions': test_functions,
            'completed_tests': [],
            'total_elapsed_time': 0.0
        }
        save_progress(progress)
    
    total_tests = len(test_functions)
    all_results = []
    total_elapsed = 0.0
    
    try:
        for index, test_func in enumerate(test_functions, 1):
            # テストを実行
            success, result, elapsed = run_test_with_progress(
                test_func, 
                len(progress['completed_tests']) + index, 
                len(progress['test_functions'])
            )
            
            all_results.append(result)
            total_elapsed += elapsed
            
            # 進捗を更新
            progress['completed_tests'].append(result)
            progress['total_elapsed_time'] += elapsed
            progress['last_update'] = datetime.now().isoformat()
            save_progress(progress)
            
            # 短い待機時間（API制限対策）
            if index < total_tests:
                time.sleep(2)
        
        # 進捗ファイルを削除（完了）
        clear_progress()
        
        # 結果サマリーを表示
        print("\n" + "=" * 60)
        print("テスト結果サマリー")
        print("=" * 60)
        
        total_passed = sum(1 for r in all_results if r['success'])
        total_failed = total_tests - total_passed
        
        print(f"総テスト数: {total_tests}件")
        print(f"成功: {total_passed}件")
        print(f"失敗: {total_failed}件")
        print(f"総実行時間: {total_elapsed:.1f}秒")
        print(f"平均実行時間: {total_elapsed / total_tests:.1f}秒/テスト")
        
        if total_failed > 0:
            print("\n失敗したテスト:")
            for result in all_results:
                if not result['success']:
                    print(f"  ✗ {result['test_name']}")
                    if result['errors']:
                        print(f"    エラー: {result['errors'][0][:60]}...")
        
        # レポートを生成
        timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = TEST_RESULTS_DIR / f"test_report_{timestamp_str}.md"
        generate_staged_test_report(all_results, report_file, total_elapsed)
        
        print(f"\n✓ 詳細レポート: {report_file}")
        
        return total_failed == 0
        
    except KeyboardInterrupt:
        print("\n\n⚠ テストが中断されました")
        print(f"進捗は保存されています: {PROGRESS_FILE}")
        print("続きから再開するには: python scripts/auto_test.py --resume")
        return False
    except Exception as e:
        print(f"\n\n✗ エラーが発生しました: {e}")
        print(f"進捗は保存されています: {PROGRESS_FILE}")
        return False


def generate_staged_test_report(results: List[Dict], output_file: str, total_elapsed: float):
    """
    段階的テストのレポートを生成
    
    Args:
        results: テスト結果のリスト
        output_file: 出力ファイルパス
        total_elapsed: 総実行時間
    """
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    total_tests = len(results)
    total_passed = sum(1 for r in results if r['success'])
    total_failed = total_tests - total_passed
    
    report = f"""# PEポータルサイト 自動テストレポート（段階的実行）

**実行日時**: {timestamp}  
**総実行時間**: {total_elapsed:.1f}秒  
**平均実行時間**: {total_elapsed / total_tests:.1f}秒/テスト

## テスト結果サマリー

- **総テスト数**: {total_tests}件
- **成功**: {total_passed}件
- **失敗**: {total_failed}件
- **成功率**: {(total_passed / total_tests * 100) if total_tests > 0 else 0:.1f}%

## テスト詳細

"""
    
    for i, result in enumerate(results, 1):
        status = "✓ 成功" if result['success'] else "✗ 失敗"
        report += f"### {i}. {result['test_name']} - {status}\n\n"
        report += f"- **実行時間**: {result['elapsed_time']:.1f}秒\n"
        report += f"- **成功テスト数**: {result['passed']}件\n"
        report += f"- **失敗テスト数**: {result['failed']}件\n"
        
        if result['errors']:
            report += f"\n**エラー**:\n"
            for error in result['errors'][:5]:  # 最初の5件のみ
                report += f"- {error}\n"
        
        if result['issues']:
            report += f"\n**検出された問題**:\n"
            for issue in result['issues'][:3]:  # 最初の3件のみ
                report += f"- {issue['type']}: {issue['message'][:100]}\n"
        
        report += "\n"
    
    # ファイルに保存
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(report)


def auto_test(test_function: str = 'runAllTests', auto_fix: bool = False, 
              staged: bool = False, resume: bool = False):
    """
    自動テストを実行
    
    Args:
        test_function: 実行するテスト関数名（単一関数の場合）
        auto_fix: 自動修正を試みるかどうか
        staged: 段階的実行モード
        resume: 前回の続きから再開
    """
    if staged:
        # 段階的実行モード
        # テスト関数のリストを定義
        test_functions = [
            'quickTest',  # 簡易テスト（高速）
            'testAuthentication',  # 認証テスト
            'testConfig',  # 設定テスト
            'testFileSearch',  # ファイル検索テスト
            'testKnowledgeSearch',  # ナレッジ検索テスト
            'testDataManager',  # データ管理テスト
            'testPerformance'  # パフォーマンステスト（時間がかかる）
        ]
        
        # カスタムテスト関数が指定されている場合
        if test_function != 'runAllTests':
            test_functions = [test_function]
        
        return run_tests_staged(test_functions, resume=resume)
    
    # 従来の一括実行モード
    print("=" * 60)
    print("PEポータルサイト 自動テスト実行")
    print("=" * 60)
    print(f"実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 1. claspの確認
    print("[1/5] claspの確認...")
    clasp_ok, clasp_version = check_clasp()
    if not clasp_ok:
        print("✗ エラー: claspがインストールされていません")
        print("   以下のコマンドでインストールしてください:")
        print("   npm install -g @google/clasp")
        return False
    print(f"✓ claspがインストールされています: {clasp_version}")
    
    # 2. .clasp.jsonの確認
    print("\n[2/5] 設定ファイルの確認...")
    clasp_json_ok, script_id = check_clasp_json()
    if not clasp_json_ok:
        print("✗ エラー: .clasp.jsonが見つかりません")
        return False
    print(f"✓ .clasp.jsonが存在します (Script ID: {script_id})")
    
    # 3. テスト関数の実行
    print(f"\n[3/5] テスト関数の実行 ({test_function})...")
    success, output = run_gas_function(test_function)
    
    if not success:
        print(f"⚠ 警告: 関数実行でエラーが発生しました")
        print(f"   出力: {output[:200]}...")
    else:
        print("✓ 関数実行が完了しました")
    
    # 4. ログの取得
    print("\n[4/5] 実行ログの取得...")
    logs = get_gas_logs(wait_seconds=5)
    
    if not logs or len(logs.strip()) == 0:
        print("⚠ 警告: ログが取得できませんでした")
        print("   GASエディタで直接確認してください: clasp open")
        return False
    
    print(f"✓ ログを取得しました ({len(logs)}文字)")
    
    # 5. ログの解析
    print("\n[5/5] ログの解析...")
    results = parse_test_results(logs)
    issues = detect_code_issues(logs)
    
    # 結果の表示
    print("\n" + "=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)
    print(f"総テスト数: {results['total_tests']}件")
    print(f"成功: {results['passed']}件")
    print(f"失敗: {results['failed']}件")
    
    if results['total_tests'] > 0:
        success_rate = (results['passed'] / results['total_tests']) * 100
        print(f"成功率: {success_rate:.1f}%")
    
    if results['errors']:
        print(f"\nエラー: {len(results['errors'])}件")
        for i, error in enumerate(results['errors'][:5], 1):  # 最初の5件のみ表示
            print(f"  {i}. {error}")
        if len(results['errors']) > 5:
            print(f"  ... 他 {len(results['errors']) - 5}件")
    
    if issues:
        print(f"\n検出されたコード問題: {len(issues)}件")
        for issue in issues[:5]:  # 最初の5件のみ表示
            print(f"  - {issue['type']}: {issue['message'][:50]}")
    
    # レポートの生成
    timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = TEST_RESULTS_DIR / f"test_report_{timestamp_str}.md"
    generate_test_report(results, issues, report_file)
    
    # 結果の判定
    if results['failed'] == 0 and len(issues) == 0:
        print("\n" + "=" * 60)
        print("✓ すべてのテストが成功しました！")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("⚠ 一部のテストが失敗しました")
        print("=" * 60)
        print(f"詳細はレポートを確認してください: {report_file}")
        return False


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='PEポータルサイト 自動テストスクリプト',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  # すべてのテストを一括実行
  python scripts/auto_test.py
  
  # 段階的に実行（推奨）
  python scripts/auto_test.py --staged
  
  # 前回の続きから再開
  python scripts/auto_test.py --staged --resume
  
  # 特定のテスト関数のみ実行
  python scripts/auto_test.py quickTest
  
  # 段階的実行で特定のテストのみ
  python scripts/auto_test.py --staged quickTest
        """
    )
    
    parser.add_argument(
        'test_function',
        nargs='?',
        default='runAllTests',
        help='実行するテスト関数名（デフォルト: runAllTests）'
    )
    
    parser.add_argument(
        '--staged',
        action='store_true',
        help='段階的に実行（推奨）'
    )
    
    parser.add_argument(
        '--resume',
        action='store_true',
        help='前回の続きから再開（--stagedと併用）'
    )
    
    parser.add_argument(
        '--auto-fix',
        action='store_true',
        help='自動修正を試みる（将来の拡張用）'
    )
    
    parser.add_argument(
        '--clear-progress',
        action='store_true',
        help='保存された進捗をクリア'
    )
    
    args = parser.parse_args()
    
    # 進捗をクリア
    if args.clear_progress:
        clear_progress()
        print("✓ 進捗ファイルをクリアしました")
        sys.exit(0)
    
    # テストを実行
    success = auto_test(
        test_function=args.test_function,
        auto_fix=args.auto_fix,
        staged=args.staged,
        resume=args.resume
    )
    
    sys.exit(0 if success else 1)

