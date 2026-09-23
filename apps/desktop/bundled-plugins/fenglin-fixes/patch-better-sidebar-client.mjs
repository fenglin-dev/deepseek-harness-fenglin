/** Fenglin: keep Better Sidebar bottom workbench + terminal session ids healthy. */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SESSION_BIND = `// Fenglin: always bind a REAL session id — terminal WS rejects "current".
			try {
				SidebarStore.resolveCurrentSessionId = () => {
					try {
						return ctx.sessions?.list?.getSnapshot()?.current;
					} catch {
						return void 0;
					}
				};
				globalThis.__dshBetterSidebarSessionId = SidebarStore.resolveCurrentSessionId;
				const bindStoreSession = () => {
					try {
						const cur = ctx.sessions?.list?.getSnapshot()?.current;
						if (cur !== void 0 && cur !== null && String(cur) !== "" && String(cur) !== "current") {
							sidebarStore.setSession(String(cur));
						}
					} catch {}
				};
				bindStoreSession();
				const sessList = ctx.sessions?.list;
				if (sessList !== void 0 && typeof sessList.subscribe === "function") {
					ctx.effect(() => sessList.subscribe(bindStoreSession), "dsh-better-sidebar: bind store session");
				}
			} catch {}`

const SKILL_CSS = `// Fenglin: unify skill-center sidebar entry with task-board / SSH rows.
			try {
				if (typeof document !== "undefined" && document.getElementById("fenglin-skill-entry-ensure") === null) {
					const skillCss = document.createElement("style");
					skillCss.id = "fenglin-skill-entry-ensure";
					skillCss.textContent = [
						"[data-dsh-skill-explorer-entry]{box-sizing:border-box!important;width:100%!important;max-width:none!important;height:36px!important;min-height:36px!important;margin:0!important;padding:0 10px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;border:none!important;border-radius:8px!important;background:0 0!important;color:var(--dsw-alias-label-secondary)!important;font-size:13px!important;font-weight:400!important;text-align:left!important;cursor:pointer!important;float:none!important;position:static!important;transform:none!important;white-space:nowrap!important}",
						"[data-dsh-skill-explorer-entry]:hover{background:var(--dsw-alias-interactive-bg-hover)!important;color:var(--dsw-alias-label-primary)!important}",
						"[data-dsh-skill-explorer-entry] .cBrkua_entryIcon,[data-dsh-skill-explorer-entry] [class*=\\\"entryIcon\\\"]{flex:none!important;width:24px!important;height:24px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;margin:0!important;padding:0!important}",
						"[data-dsh-skill-explorer-entry] svg{width:18px!important;height:18px!important;display:block!important}"
					].join("");
					document.head.appendChild(skillCss);
				}
			} catch {}`

export async function patchBetterSidebarClient(pkgRoot) {
  const clientPath = join(pkgRoot, 'lib', 'client.js')
  // 0.21.x folded terminal helpers into client.js; keep the legacy path for 0.19.x.
  const terminalPath = join(pkgRoot, 'lib', 'client-terminal.js')
  let changed = false
  try {
    let client = await readFile(clientPath, 'utf8')
    if (!client.includes('__dshBetterSidebarSessionId')) {
      client = client.replace(
        'const sidebarStore = createSidebarStore();\n\t\t\tconst service = createBetterSidebarService(sidebarStore);',
        `const sidebarStore = createSidebarStore();\n\t\t\t${SESSION_BIND}\n\t\t\t${SKILL_CSS}\n\t\t\tconst service = createBetterSidebarService(sidebarStore);`,
      )
      // Expand never no-ops; terminal still refuses synthetic "current".
      client = client.replace(
        /reduce\(reducer\) \{\s*const sessionId = this\.snapshot\.sessionId;\s*const state = this\.snapshot\.state;\s*if \(sessionId === void 0 \|\| state === void 0\) return;/,
        `reduce(reducer) {
				let sessionId = this.snapshot.sessionId;
				let state = this.snapshot.state;
				if (sessionId === void 0 || state === void 0 || sessionId === "current") {
					let resolved = void 0;
					try {
						if (typeof SidebarStore.resolveCurrentSessionId === "function") {
							const raw = SidebarStore.resolveCurrentSessionId();
							if (raw !== void 0 && raw !== null && String(raw) !== "" && String(raw) !== "current") resolved = String(raw);
						}
					} catch {}
					const keys = [...this.bySession.keys()].filter((k) => k !== "current");
					const existing = sessionId !== void 0 && sessionId !== "current" ? sessionId : void 0;
					const fallback = existing ?? resolved ?? keys[keys.length - 1] ?? "__fenglin_bottom__";
					state = this.bySession.get(fallback) ?? loadState(fallback);
					if (state === void 0 || state === null || typeof state !== "object") state = makeDefaultState();
					sessionId = fallback;
					this.bySession.set(sessionId, state);
					this.snapshot = { sessionId, state, prefs: this.prefs };
				}`,
      )
      // setSession(undefined) must not wipe an open workbench.
      if (!client.includes('__fenglin_bottom__')) {
        client = client.replace(
          'setSession(sessionId) {\n\t\t\t\tif (this.snapshot.sessionId === sessionId) return;',
          `setSession(sessionId) {
				if (sessionId === "current") {
					try {
						const raw = typeof SidebarStore.resolveCurrentSessionId === "function" ? SidebarStore.resolveCurrentSessionId() : void 0;
						if (raw !== void 0 && raw !== null && String(raw) !== "" && String(raw) !== "current") sessionId = String(raw);
					} catch {}
				}
				if (sessionId === void 0 || sessionId === null || sessionId === "current") {
					if (this.snapshot.sessionId !== void 0 && this.snapshot.sessionId !== "current" && this.snapshot.state !== void 0) return;
					sessionId = "__fenglin_bottom__";
				}
				if (this.snapshot.sessionId === sessionId) return;`,
        )
      }
      await writeFile(clientPath, client, 'utf8')
      changed = true
      console.log('fenglin-better-sidebar: patched client.js')
    } else {
      console.log('fenglin-better-sidebar: client.js already patched')
    }
  } catch (error) {
    console.warn('fenglin-better-sidebar: client.js skip', error?.message ?? error)
  }
  const resolveSessionExpr = `(() => { let sid = scope.sessionId; const syn = (v) => v === void 0 || v === null || v === "" || String(v) === "current" || String(v).startsWith("__fenglin"); if (syn(sid)) { try { if (typeof globalThis.__dshBetterSidebarSessionId === "function") { const r = globalThis.__dshBetterSidebarSessionId(); if (!syn(r)) sid = String(r); } } catch {} } return sid ?? ""; })()`
  for (const termFile of [clientPath, terminalPath]) {
    try {
      let term = await readFile(termFile, 'utf8')
      if (term.includes('fenglinRealSessionId')) {
        console.log('fenglin-better-sidebar: already patched', termFile)
        continue
      }
      const before = term
      term = term.replace(
        'sessionId: scope.sessionId,\n\t\t\t\t\t\ttab: tabId',
        `sessionId: ${resolveSessionExpr},\n\t\t\t\t\t\ttab: tabId`,
      )
      term = term.replace(
        'sessionId: scope.sessionId,\n\t\t\t\tdir,',
        `sessionId: ${resolveSessionExpr},\n\t\t\t\tdir,`,
      )
      term = term.replace(
        '\t\t\tsessionId: scope.sessionId,\n\t\t\t...scope.cwd',
        `\t\t\tsessionId: ${resolveSessionExpr},\n\t\t\t...scope.cwd`,
      )
      if (term === before) continue
      await writeFile(termFile, term, 'utf8')
      changed = true
      console.log('fenglin-better-sidebar: patched terminal session ids', termFile)
    } catch (error) {
      if (termFile === terminalPath && (error?.code === 'ENOENT' || /no such file/i.test(String(error?.message ?? error)))) {
        continue
      }
      console.warn('fenglin-better-sidebar: terminal skip', termFile, error?.message ?? error)
    }
  }
  return changed
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('patch-better-sidebar-client.mjs')) {
  const target = process.argv[2] ?? join(process.cwd(), 'node_modules/dsh-better-sidebar')
  await patchBetterSidebarClient(target)
}
