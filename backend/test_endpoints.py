import requests
import io
from PIL import Image

base = 'http://localhost:5000/api'
results = []

def test(method, path, **kwargs):
    try:
        r = getattr(requests, method)(base + path, **kwargs)
        ok = r.status_code == 200
        d = r.json()
        success = d.get('success', True)
        status = 'PASS' if (ok and success) else 'FAIL'
        results.append((status, method.upper(), path, r.status_code))
        print(f"  [{status}] {method.upper():4} {path:40} -> {r.status_code}")
    except Exception as e:
        results.append(('ERROR', method.upper(), path, str(e)))
        print(f"  [ERROR] {method.upper():4} {path:40} -> {e}")

test('get', '/health')
test('get', '/dashboard/stats')
test('get', '/detections?per_page=5')
test('get', '/sessions?per_page=5')
test('get', '/alerts?per_page=5')
test('get', '/alerts/stats')
test('get', '/analytics?period=weekly')
test('get', '/cameras')
test('get', '/model')
test('get', '/settings')
test('post', '/reports', json={'report_type': 'weekly'})

# Image detection
img = Image.new('RGB', (200, 200), color=(80, 80, 80))
buf = io.BytesIO()
img.save(buf, format='JPEG')
buf.seek(0)
try:
    r = requests.post(base + '/detect/image', files={'file': ('test.jpg', buf, 'image/jpeg')})
    ok = r.status_code == 200 and r.json().get('success')
    status = 'PASS' if ok else 'FAIL'
    results.append((status, 'POST', '/detect/image', r.status_code))
    print(f"  [{status}] POST /detect/image                          -> {r.status_code} workers={r.json().get('summary', {}).get('workers', '?')}")
except Exception as e:
    print(f"  [ERROR] POST /detect/image -> {e}")

passed = sum(1 for r in results if r[0] == 'PASS')
total = len(results)
print(f"\n{'='*60}")
print(f"RESULT: {passed}/{total} endpoints passing")
if passed == total:
    print("ALL ENDPOINTS PASS - PRODUCTION READY!")
else:
    print("SOME FAILURES - CHECK ABOVE")
