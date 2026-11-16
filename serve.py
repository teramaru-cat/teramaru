# 開発用サーバー（ブラウザに古いファイルを使わせない）
# 使い方: python3 serve.py [ポート番号]   → http://localhost:8123
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
http.server.ThreadingHTTPServer(('', port), NoCache).serve_forever()
