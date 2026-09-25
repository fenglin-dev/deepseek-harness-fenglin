from pathlib import Path
p = Path(r'D:\10140\deepseek-harness-v2-wt-clean\tsconfig.host.json')
t = p.read_text(encoding='utf-8')
needle = '"packages/api/gateway/tests/stream-server.host.spec.ts"'
if needle in t and 'gateway/tests/**' not in t:
    t = t.replace(needle, '"packages/api/gateway/tests/**"')
    p.write_text(t, encoding='utf-8')
    print('excluded all gateway tests')
else:
    print('state', 'gateway/tests/**' in t)
