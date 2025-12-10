"""
ローカル開発サーバー（簡易版）
HTML/CSS/JavaScriptの動作確認用

注意: GASの関数（google.script.runなど）はローカルでは動作しません
"""

import http.server
import socketserver
import os
from pathlib import Path
import webbrowser
import threading
import time

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent.parent
GAS_DIR = PROJECT_ROOT / 'gas'
PORT = 8080

class GASHandler(http.server.SimpleHTTPRequestHandler):
    """GASのローカル開発用HTTPハンドラー"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(GAS_DIR), **kwargs)
    
    def end_headers(self):
        # CORSヘッダーを追加（開発用）
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        # ログを簡潔に
        print(f"[{self.address_string()}] {args[0]}")

def start_local_server():
    """ローカル開発サーバーを起動"""
    print("=" * 60)
    print("ローカル開発サーバーを起動します")
    print("=" * 60)
    
    os.chdir(GAS_DIR)
    
    try:
        with socketserver.TCPServer(("", PORT), GASHandler) as httpd:
            url = f"http://localhost:{PORT}"
            print(f"\n✓ ローカル開発サーバーが起動しました")
            print(f"   URL: {url}")
            print(f"\n【注意事項】")
            print("  - GASの関数（google.script.runなど）はローカルでは動作しません")
            print("  - HTML/CSS/JavaScriptの見た目とロジックのみ確認可能です")
            print("  - 実際の動作確認はデプロイ後にWeb Appで行ってください")
            print(f"\n【使い方】")
            print(f"  - ブラウザで {url}/index.html にアクセス")
            print(f"  - Ctrl+C でサーバーを停止")
            print("\nブラウザを自動的に開きます...")
            
            # 3秒後にブラウザを開く
            def open_browser():
                time.sleep(3)
                webbrowser.open(url)
            
            threading.Thread(target=open_browser, daemon=True).start()
            
            # サーバーを起動
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\nサーバーを停止しました")
    except OSError as e:
        if e.errno == 10048:  # Windows: ポートが使用中
            print(f"\n✗ エラー: ポート {PORT} が既に使用されています")
            print("   別のポートを使用するか、既存のサーバーを停止してください")
        else:
            print(f"\n✗ エラー: {e}")

if __name__ == '__main__':
    start_local_server()

