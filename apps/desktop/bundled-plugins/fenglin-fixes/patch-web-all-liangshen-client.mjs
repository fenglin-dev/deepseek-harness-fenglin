/** Fenglin: keep web-all's stock LiangShen lever visible and switchable. */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function patchWebAllLiangShenClient(webAllClientPath) {
  let source
  try {
    source = await readFile(webAllClientPath, 'utf8')
  } catch {
    console.warn('fenglin-web-all-liangshen: client.js missing, skip')
    return false
  }
  let next = source
  next = next.replace(
    'if (state === "locked" || state === "missing") return null;',
    '/* Fenglin: keep lever visible so missing/locked rows stay debuggable. */',
  )
  next = next.replace(
    'if (!facts.blank) return "locked";',
    '/* Fenglin: only lock when the session is explicitly non-blank. */\n\t\t\tif (facts.blank === false) return "locked";',
  )
  next = next.replace(
    'const available = this.rows.filter((row) => row.broken === void 0).map((row) => row.id);',
    'let available = this.rows.filter((row) => row.broken === void 0).map((row) => row.id);\n\t\t\t\tif (available.length === 0) available = ["liangshen"];',
  )
  next = next.replace(
    'blank: summary?.blank === true,',
    'blank: summary === void 0 || summary.blank === true,',
  )
  if (!next.includes('resolveSessionId()')) {
    next = next.replace(
      'currentSessionId() {\n\t\t\t\tconst current = this.sessions?.list.getSnapshot().current;\n\t\t\t\treturn current === void 0 ? void 0 : String(current);\n\t\t\t}',
      `currentSessionId() {
				const current = this.sessions?.list.getSnapshot().current;
				return current === void 0 ? void 0 : String(current);
			}
			mainBlankSessionId() {
				try {
					const state = this.sessions?.list.getSnapshot();
					if (state === void 0 || state.byId === void 0) return void 0;
					const rows = Object.values(state.byId).filter(function(row) { return row != null; });
					const mainBlank = rows.find(function(row) {
						return row.blank === true && ((row.retainedBy && row.retainedBy.mainView || 0) > 0);
					});
					if (mainBlank !== void 0 && mainBlank.id !== void 0) return String(mainBlank.id);
					const anyBlank = rows.find(function(row) { return row.blank === true && row.id !== void 0; });
					return anyBlank === void 0 ? void 0 : String(anyBlank.id);
				} catch {
					return void 0;
				}
			}
			resolveSessionId() {
				return this.currentSessionId() ?? this.mainBlankSessionId();
			}`,
    )
  }
  next = next.replace(
    'const sessionId = this.currentSessionId();\n\t\t\t\tif (target === void 0 || sessionId === void 0) return;',
    'const sessionId = this.resolveSessionId();\n\t\t\t\tif (target === void 0 || sessionId === void 0) return;',
  )
  if (next === source) {
    console.log('fenglin-web-all-liangshen: already patched')
    return true
  }
  await writeFile(webAllClientPath, next, 'utf8')
  console.log('fenglin-web-all-liangshen: patched', webAllClientPath)
  return true
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('patch-web-all-liangshen-client.mjs')) {
  const target = process.argv[2] ?? join(
    process.cwd(),
    'node_modules/@linxin666/dsh-web-all/lib/client.js',
  )
  await patchWebAllLiangShenClient(target)
}
