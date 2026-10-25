#!/usr/bin/env python3
import http.server
import os
import socketserver
import sys

PORT = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 8080))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class PortfolioHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    # Explicit types: some computers report the wrong type for .js files, and browsers then refuse to run modules.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".txt": "text/plain; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?")[0].split("#")[0]
        if path == "/" or path == "":
            self.path = "/index.html"
        elif not os.path.splitext(path)[1]:
            candidate = os.path.join(DIRECTORY, path.lstrip("/") + ".html")
            if os.path.isfile(candidate):
                self.path = path + ".html"
        return super().do_GET()

    def log_message(self, format, *args):
        pass


class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 128


if __name__ == "__main__":
    with ThreadedServer(("0.0.0.0", PORT), PortfolioHandler) as httpd:
        print(f"idk portfolio server running at http://0.0.0.0:{PORT}")
        httpd.serve_forever()
