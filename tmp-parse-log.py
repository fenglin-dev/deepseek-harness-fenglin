from pathlib import Path
from collections import Counter

p = Path(r'D:\10140\deepseek-harness-v2-wt-clean\batch-restore.log')
raw = p.read_bytes()
for enc in ('utf-8', 'utf-16', 'utf-16-le', 'latin-1'):
    try:
        t = raw.decode(enc)
        break
    except Exception:
        continue
t = t.replace('\x00', '')
errs = [ln for ln in t.splitlines() if 'error TS' in ln]
print('count', len(errs))
files = Counter(ln.split('(')[0].strip() for ln in errs)
for f, c in files.most_common(15):
    print(c, f)
print('--- sample ---')
for e in errs[:8]:
    print(e[:200])
