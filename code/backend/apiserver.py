"""apiserver.py
Simple post grabber
"""
import gzip, json, base64, csv
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler, HTTPServer

DEBUG_SERVER_PORT = 8080 # Use env variables instead of changing this value

CONDITIONS = [
  'face-fitz-dl-g-0.json',
  'face-fitz-ld-g-0.json',
  'face-monk-dl-g-0.json',
  'face-monk-ld-g-0.json',
  'skin-fitz-dl-g-0.json',
  'skin-fitz-ld-g-0.json',
  'skin-monk-dl-g-0.json',
  'skin-monk-ld-g-0.json',
  'face-fitz-dl-g-1.json',
  'face-fitz-ld-g-1.json',
  'face-monk-dl-g-1.json',
  'face-monk-ld-g-1.json',
  'skin-fitz-dl-g-1.json',
  'skin-fitz-ld-g-1.json',
  'skin-monk-dl-g-1.json',
  'skin-monk-ld-g-1.json'
]

FOUR_OH_FOUR = """<html><head><title>404 - Not found</title></head><body><h2>404 - Not found</h2><p>Resource not found.</p></body><html>"""

def parse_cond(workerId = ''):
  try:
    values = base64.b64decode(workerId.strip()).decode('utf-8')
    return CONDITIONS[int(values.split('|')[1])]
  except Exception as e:
    return 'unknown'

def write_result(data = None):
  if not os.path.exists('results.csv'):
    with open('results.csv', 'w', newline='') as f:
      w = csv.writer(f, dialect = 'excel')
      w.writerow(["WorkerId", "AssignmentStatus", "Input.CONFIG", "Answer.annotations", "Answer.feedback"])
  if data != None:
    with open('results.csv', 'a', newline='') as f:
      w = csv.writer(f, dialect = 'excel')
      workerId = ''.join(data['assignmentId'])
      w.writerow([workerId, 'Submitted', parse_cond(workerId), ''.join(data['annotations']), ''.join(data['feedback']) if 'feedback' in data else '{}'])

class ApiServer(BaseHTTPRequestHandler):
  _cors_age = 86400

  def _respond_json(self, data, code = 200):
    self.send_response(code)
    self.send_header('content-type', 'application/json')
    self.send_header('access-control-max-age', f'{self._cors_age}')
    self.send_header('access-control-allow-origin', '*')
    self.send_header('access-control-allow-headers', '*')
    self.end_headers()
    self.wfile.write(bytes(json.dumps(data), 'utf-8'))

  def do_GET(self):
    if self.path == '/data/results.csv':
      self.send_response(200)
      self.send_header('content-type', 'text/plain')
      self.end_headers()
      write_result()
      with open('results.csv', 'r') as f:
        self.wfile.write(bytes(f.read(), "utf-8"))
    else:
      self.send_response(404)
      self.send_header('content-type', 'text/html')
      self.end_headers()
      self.wfile.write(bytes(FOUR_OH_FOUR, 'utf-8'))

  def do_POST(self):
    if self.path.startswith('/mturk/externalSubmit'):
      code, resp = 200, None
      try:
        # Get the body
        body_len = int(self.headers.get('Content-Length'))
        body = parse_qs(self.rfile.read(body_len).decode('utf-8'))
        if (not ('assignmentId' in body)) or (not ('annotations' in body)):
          resp = {
            'error': 'Malformed input data. Please contact admins.',
            'source': str(body)
          }
        else:
          write_result(body)
          resp = {
            'message': 'Submission successful',
            'participantId': ''.join(body['assignmentId'])
          }
      except Exception as e:
        code = 500
        print(e)
        resp = { 'error': str(e) }
      self.send_response(code)
      self.send_header("content-type", "application/json")
      self.end_headers()
      self.wfile.write(bytes(json.dumps(resp), 'utf-8'))
    else:
      self.send_response(404)
      self.send_header('content-type', 'text/html')
      self.end_headers()
      self.wfile.write(bytes(FOUR_OH_FOUR, 'utf-8'))

if __name__ == '__main__':
  import os
  import socketserver

  port = int(os.environ['PORT']) if 'PORT' in os.environ else DEBUG_SERVER_PORT

  with socketserver.TCPServer(("", port), ApiServer) as httpd:
    print(f'Serving HTTP debug console on port {port}')
    httpd.serve_forever()
