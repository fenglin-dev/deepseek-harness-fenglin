window.__ModuleLoader__.load({
	id: "dsh-better-sidebar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_dom_client = require("react-dom/client");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		// Fenglin: React #130 guard — never createElement(undefined).
		// Missing primitive exports or half-initialized descriptors render as null
		// instead of tearing down the whole sidebar on new conversations.
		try {
			const __fenglinNull = () => null;
			const __wrapJsx = (fn) => {
				if (typeof fn !== "function") return fn;
				return function fenglinJsxGuard(type, props, key) {
					if (type === void 0 || type === null) {
						console.warn("[dsh-better-sidebar] skip undefined element type");
						return null;
					}
					return fn(type, props, key);
				};
			};
			if (react_jsx_runtime && typeof react_jsx_runtime === "object") {
				try {
					react_jsx_runtime.jsx = __wrapJsx(react_jsx_runtime.jsx);
					react_jsx_runtime.jsxs = __wrapJsx(react_jsx_runtime.jsxs);
					if (typeof react_jsx_runtime.jsxDEV === "function") react_jsx_runtime.jsxDEV = __wrapJsx(react_jsx_runtime.jsxDEV);
				} catch {}
			}
			if (react && typeof react.createElement === "function") {
				const __ce = react.createElement;
				try {
					react.createElement = function fenglinCreateElementGuard(type) {
						if (type === void 0 || type === null) {
							console.warn("[dsh-better-sidebar] skip undefined element type (createElement)");
							return null;
						}
						return __ce.apply(this, arguments);
					};
				} catch {}
			}
			if (_deepseek_ai_dsh_client_ui_primitives && typeof _deepseek_ai_dsh_client_ui_primitives === "object") {
				try {
					const __raw = _deepseek_ai_dsh_client_ui_primitives;
					_deepseek_ai_dsh_client_ui_primitives = new Proxy(__raw, {
						get(target, prop, receiver) {
							const value = Reflect.get(target, prop, receiver);
							if (value === void 0 && typeof prop === "string" && prop.length > 0) {
								const first = prop.charAt(0);
								if (first === first.toUpperCase() && first !== first.toLowerCase()) return __fenglinNull;
							}
							return value;
						}
					});
				} catch {}
			}
		} catch {}
		/** The title-bar / shell compatibility schemes (see {@link SidebarPrefs.titleBarScheme}). */
		const TITLE_BAR_SCHEMES = [
			"auto",
			"web",
			"preset",
			"custom"
		];
		/** Fallback prefs used whenever the settings document is unreachable or malformed. */
		const SIDEBAR_PREFS_DEFAULTS = {
			// Fenglin: do not auto-expand side tools on refresh/new subagent/jobs.
			autoOpenSubagent: false,
			autoOpenJobs: false,
			agentTerminalTools: false,
			agentOpenTools: false,
			bottomPanelAutoTerminal: true,
			terminalFontFamily: "",
			terminalFontSize: 13,
			editorExplorer: false,
			workspaceFence: true,
			terminalShell: "",
			terminalShellArgs: "",
			titleBarScheme: "auto",
			titleBarPresetId: "",
			customCss: "",
			titleBarCompat: false,
			titleBarStripPx: 40,
			htmlViewerNoSandbox: false,
			htmlViewerDefaultUnsafe: false,
			browserNoSandbox: false,
			browserInterceptLinks: true,
			browserInterceptHttp: true,
			browserInterceptHttps: false,
			browserAllowedLoopback: "",
			tabsEnabled: {},
			viewersEnabled: {},
			pluginSettings: {}
		};
		/** Clamp one terminal font size into the contract range (shared by schema and client reads). */
		function clampTerminalFontSize(value) {
			return Math.min(32, Math.max(9, Math.round(value)));
		}
		/** Clamp one title-bar strip height into the contract range (shared by schema and client reads). */
		function clampTitleBarStrip(value) {
			return Math.min(120, Math.max(0, Math.round(value)));
		}
		let nextIdCounter = 0;
		/** Unique pane/tab id within one state instance. */
		function uid(prefix) {
			nextIdCounter += 1;
			return `${prefix}:${nextIdCounter}`;
		}
		/** Mint a fresh uid-based tab id. The `'editor:' + path` convention only
		*  covers openSidebarFile opens (per-path dedupe); opens that must not
		*  dedupe (the tree's "open to the side") mint through here. */
		function mintTabId() {
			return uid("tab");
		}
		/**
		* The largest numeric suffix across a raw persisted state's counter ids
		* (`pane:N` / `tab:N` / `split:N`). The uid counter is module-global and
		* resets on every reload, so a split minted AFTER a reload would collide
		* with the persisted ids (a fresh "pane:1" beside the persisted "pane:1");
		* mapLeaf would then visit BOTH leaves and every open would land in both
		* panes of the split. Seeding the counter past the persisted ids keeps
		* fresh ids disjoint.
		*/
		function maxCounterId(parsed) {
			let max = 0;
			const consider = (id) => {
				if (typeof id !== "string") return;
				const match = /^(?:pane|tab|split):(\d+)$/.exec(id);
				if (match !== null) max = Math.max(max, Number(match[1]));
			};
			const walk = (node) => {
				if (node === null || typeof node !== "object") return;
				const record = node;
				consider(record.id);
				if (Array.isArray(record.tabs)) {
					for (const tab of record.tabs) if (tab !== null && typeof tab === "object") consider(tab.id);
				}
				if (Array.isArray(record.children)) for (const child of record.children) walk(child);
			};
			walk(parsed?.bottomSplits);
			return max;
		}
		/**
		* A fresh default state: one empty pane in the bottom workbench, closed.
		* (The right column belongs to DSH's native Sidebar, so this plugin's own
		* layout has nothing to seed — its welcome cards offer the openable types on
		* first expansion.)
		*/
		function makeDefaultState() {
			const bottomLeaf = {
				kind: "leaf",
				id: uid("pane"),
				tabs: [],
				active: null
			};
			return {
				activePane: bottomLeaf.id,
				nextTerminal: 1,
				nextBrowser: 1,
				expanded: [],
				revealed: [],
				bottomOpen: false,
				bottomHeight: 220,
				bottomOpenedOnce: false,
				bottomSplits: bottomLeaf,
				agentWaits: {}
			};
		}
		/** Walk the tree and apply `visit` to the leaf with the given id. */
		function mapLeaf(node, paneId, visit) {
			if (node.kind === "leaf") {
				if (node.id === paneId) {
					const copy = {
						...node,
						tabs: [...node.tabs]
					};
					visit(copy);
					return copy;
				}
				return node;
			}
			const split = node;
			return {
				...split,
				sizes: [...split.sizes],
				children: split.children.map((child) => mapLeaf(child, paneId, visit))
			};
		}
		/** The first leaf of the tree (fallback pane when activePane is gone). */
		function firstLeaf(node) {
			if (node.kind === "leaf") return node;
			return firstLeaf(node.children[0]);
		}
		/** Find the leaf containing a tab id, if any. */
		function leafWithTab(node, tabId) {
			if (node.kind === "leaf") return node.tabs.some((tab) => tab.id === tabId) ? node : void 0;
			for (const child of node.children) {
				const found = leafWithTab(child, tabId);
				if (found !== void 0) return found;
			}
		}
		/** All leaves of the tree, depth-first. */
		function allLeaves(node) {
			if (node.kind === "leaf") return [node];
			return node.children.flatMap(allLeaves);
		}
		/** Whether a tab is open anywhere in the session's workbench. */
		function tabOpenIn(state, tabId) {
			return allLeaves(state.bottomSplits).some((leaf) => leaf.tabs.some((tab) => tab.id === tabId));
		}
		/**
		* Split a leaf by inserting a fresh leaf holding `tab` beside it — the
		* VSCode drag-to-edge gesture. `dir` is the split direction ('row' for
		* left/right, 'col' for up/down); `front` places the new leaf first (left/
		* up) or second (right/down).
		* @returns the new tree plus the fresh leaf's id (the drop's active pane).
		*/
		function insertLeafAt(node, paneId, dir, tab, front) {
			const fresh = {
				kind: "leaf",
				id: uid("pane"),
				tabs: [tab],
				active: tab.id
			};
			const leafId = fresh.id;
			return {
				node: mapLeaf(node, paneId, (leaf) => {
					const target = { ...leaf };
					const split = {
						kind: "split",
						id: uid("split"),
						dir,
						sizes: [.5, .5],
						children: front ? [fresh, target] : [target, fresh]
					};
					Object.assign(leaf, split);
				}),
				leafId
			};
		}
		/**
		* The VSCode drag gesture: move a tab out of its pane and either merge it
		* into the target pane (center) or split the target pane with the tab in a
		* fresh leaf (edge). The source pane collapses when it empties.
		*/
		function moveTabToEdge(state, fromPane, tabId, toPane, zone) {
			if (fromPane === toPane && zone === "center") return moveTab(state, fromPane, tabId, toPane, -1);
			const node = state.bottomSplits;
			const source = leafWithTab(node, tabId);
			if (source === void 0) return state;
			const tab = source.tabs.find((candidate) => candidate.id === tabId);
			let emptied = false;
			let splits = mapLeaf(node, source.id, (leaf) => {
				leaf.tabs = leaf.tabs.filter((candidate) => candidate.id !== tabId);
				if (leaf.active === tabId) leaf.active = leaf.tabs[leaf.tabs.length - 1]?.id ?? null;
				if (leaf.tabs.length === 0) emptied = true;
			});
			if (emptied) splits = removeLeafAt(splits, source.id);
			if (zone === "center") {
				splits = mapLeaf(splits, toPane, (leaf) => {
					leaf.tabs = [...leaf.tabs, tab];
					leaf.active = tab.id;
				});
				return {
					...state,
					bottomSplits: splits,
					activePane: toPane
				};
			}
			const result = insertLeafAt(splits, toPane, zone === "left" || zone === "right" ? "row" : "col", tab, zone === "left" || zone === "up");
			return {
				...state,
				bottomSplits: result.node,
				activePane: result.leafId
			};
		}
		/**
		* Remove a leaf from the tree. A split left with one child promotes that
		* child; removing the last leaf yields an empty leaf.
		*/
		function removeLeafAt(node, paneId) {
			if (node.kind === "leaf") return node.id === paneId ? {
				...node,
				tabs: [],
				active: null
			} : node;
			const children = node.children.filter((child) => !(child.kind === "leaf" && child.id === paneId));
			if (children.length === node.children.length) return {
				...node,
				sizes: [...node.sizes],
				children: node.children.map((child) => removeLeafAt(child, paneId))
			};
			if (children.length === 1) return children[0];
			return {
				...node,
				sizes: [...node.sizes],
				children
			};
		}
		/** Close a tab; an emptied leaf is removed (unless it is the only pane). */
		function closeTab(state, paneId, tabId) {
			const key = "bottomSplits";
			let emptied = false;
			const splits = mapLeaf(state[key], paneId, (leaf) => {
				leaf.tabs = leaf.tabs.filter((tab) => tab.id !== tabId);
				if (leaf.active === tabId) leaf.active = leaf.tabs[leaf.tabs.length - 1]?.id ?? null;
				if (leaf.tabs.length === 0) emptied = true;
			});
			return {
				...state,
				[key]: emptied ? removeLeafAt(splits, paneId) : splits
			};
		}
		/** Activate a tab in its pane (the pane's own tree). */
		function activateTab(state, paneId, tabId) {
			const key = "bottomSplits";
			return {
				...state,
				activePane: paneId,
				[key]: mapLeaf(state[key], paneId, (leaf) => {
					if (leaf.tabs.some((tab) => tab.id === tabId)) leaf.active = tabId;
				})
			};
		}
		/** Update the display fields of one open tab (title / path / meta) without
		*  re-opening it. The browser tab persists its current URL and hostname
		*  title through this reducer so a reload restores the visited page. A
		*  missing tab id is a no-op. The tab may live in either tree or a free
		*  window. */
		function patchTab(state, tabId, patch) {
			let changed = false;
			const apply = (tab) => {
				changed = true;
				return {
					...tab,
					...patch.title !== void 0 ? { title: patch.title } : {},
					...patch.path !== void 0 ? { path: patch.path } : {},
					...patch.meta !== void 0 ? { meta: patch.meta } : {}
				};
			};
			const walk = (node) => {
				if (node.kind === "leaf") {
					const tabs = node.tabs.map((tab) => tab.id === tabId ? apply(tab) : tab);
					return tabs === node.tabs ? node : {
						...node,
						tabs
					};
				}
				const children = node.children.map(walk);
				return children === node.children ? node : {
					...node,
					children
				};
			};
			const bottomSplits = walk(state.bottomSplits);
			return changed ? {
				...state,
				bottomSplits
			} : state;
		}
		/**
		* Set or clear the pin marker on one open tab (v0.17.0+). A pin marker is
		* structural metadata (NOT display fields like title/path), so it walks
		* the workbench's split tree exactly like {@link patchTab}. Passing `null` clears the pin
		* (the tab stays open in its home session); passing a `{ scope, homeCwd }`
		* object sets it. An unknown tab id is a strict no-op (same reference
		* returned) so a stale pin request never churns the state or rewrites
		* localStorage.
		* @param state - the current per-session sidebar state.
		* @param tabId - the tab to pin/unpin.
		* @param pin - the pin marker to set, or null to clear.
		* @returns the next state (or the same reference when the tab is missing
		*          or the pin marker is already the requested value).
		*/
		function setTabPin(state, tabId, pin) {
			let changed = false;
			const apply = (tab) => {
				if (tab.type !== "terminal") return tab;
				if (pin === null) {
					if (tab.pin === void 0) return tab;
				} else if (tab.pin !== void 0 && tab.pin.scope === pin.scope && tab.pin.homeCwd === pin.homeCwd) return tab;
				changed = true;
				const { pin: _omit, ...rest } = tab;
				return pin === null ? rest : {
					...rest,
					pin
				};
			};
			const walk = (node) => {
				if (node.kind === "leaf") {
					const idx = node.tabs.findIndex((tab) => tab.id === tabId);
					if (idx < 0) return node;
					const oldTab = node.tabs[idx];
					const newTab = apply(oldTab);
					if (newTab === oldTab) return node;
					const tabs = node.tabs.slice();
					tabs[idx] = newTab;
					return {
						...node,
						tabs
					};
				}
				const children = node.children.map(walk);
				if (children.every((child, i) => child === node.children[i])) return node;
				return {
					...node,
					children
				};
			};
			const bottomSplits = walk(state.bottomSplits);
			return changed ? {
				...state,
				bottomSplits
			} : state;
		}
		/**
		* Land a tab in the workbench's first pane — the plugin's own opens (its
		* bottom-panel + menu, the auto-terminal, and every open when no native
		* surface is installed): the plugin owns no right column any more (DSH's
		* native sidebar is the right one), so the bottom workbench is the only tree.
		* @param state - the session state.
		* @param tab - the tab to land.
		* @returns the next state, with the bottom panel open.
		*/
		function openTabInBottomPane(state, tab) {
			const targetId = firstLeaf(state.bottomSplits).id;
			for (const leaf of allLeaves(state.bottomSplits)) {
				const existing = leaf.tabs.find((candidate) => candidate.id === tab.id);
				if (existing !== void 0) return activateTab(state, leaf.id, existing.id);
			}
			return {
				...state,
				bottomOpen: true,
				activePane: targetId,
				bottomSplits: mapLeaf(state.bottomSplits, targetId, (leaf) => {
					leaf.tabs = [...leaf.tabs, tab];
					leaf.active = tab.id;
				})
			};
		}
		/** Move a tab from one pane to another (insert at index; -1 appends).
		*  The panes may live in DIFFERENT trees — dragging a tab between the two
		*  panels removes it from its own tree and lands it in the other one. */
		function moveTab(state, fromPane, tabId, toPane, index = -1) {
			const fromKey = "bottomSplits";
			let moved;
			let emptied = false;
			let splits = mapLeaf(state[fromKey], fromPane, (leaf) => {
				const found = leaf.tabs.find((tab) => tab.id === tabId);
				if (found === void 0) return;
				moved = found;
				leaf.tabs = leaf.tabs.filter((tab) => tab.id !== tabId);
				if (leaf.active === tabId) leaf.active = leaf.tabs[leaf.tabs.length - 1]?.id ?? null;
				if (leaf.tabs.length === 0) emptied = true;
			});
			if (moved === void 0) return state;
			if (emptied) splits = removeLeafAt(splits, fromPane);
			splits = mapLeaf(splits, toPane, (leaf) => {
				const insertAt = index >= 0 && index <= leaf.tabs.length ? index : leaf.tabs.length;
				leaf.tabs = [
					...leaf.tabs.slice(0, insertAt),
					moved,
					...leaf.tabs.slice(insertAt)
				];
				leaf.active = moved.id;
			});
			return {
				...state,
				[fromKey]: splits,
				activePane: toPane
			};
		}
		/**
		* Open a diff tab the VSCode way: an existing instance of the same change is
		* focused wherever it lives; otherwise the tab joins the first pane that
		* already holds diff tabs (diff panes are sticky — repeated clicks stack
		* there); on the FIRST diff of a layout the source pane splits vertically so
		* the diff lands in a fresh pane below it ("默认在下半栏新增一个").
		*
		* This is split-tree placement surgery, not registry dispatch: the diff tab
		* descriptor's `dedupeKey` is `(tab) => tab.id`, and the existing-instance
		* check below is exactly that rule — the two agree by construction (asserted
		* in tests). Diff tabs minted by the Git view carry change-derived ids, so
		* the id check is the per-change dedupe.
		* @returns the new state, with the diff pane active.
		*/
		function openDiffTab(state, sourcePaneId, tab) {
			const existingLeaf = leafWithTab(state.bottomSplits, tab.id);
			if (existingLeaf !== void 0) return activateTab(state, existingLeaf.id, tab.id);
			const diffLeaf = allLeaves(state.bottomSplits).find((leaf) => leaf.tabs.some((candidate) => candidate.type === "diff"));
			if (diffLeaf !== void 0) return {
				...state,
				activePane: diffLeaf.id,
				bottomSplits: mapLeaf(state.bottomSplits, diffLeaf.id, (leaf) => {
					leaf.tabs = [...leaf.tabs, tab];
					leaf.active = tab.id;
				})
			};
			if (!allLeaves(state.bottomSplits).some((leaf) => leaf.id === sourcePaneId)) return openTabInBottomPane(state, tab);
			const result = insertLeafAt(state.bottomSplits, sourcePaneId, "col", tab, false);
			return {
				...state,
				bottomSplits: result.node,
				activePane: result.leafId
			};
		}
		/** Expand/collapse the bottom workbench. */
		function toggleBottomPanel(state) {
			return {
				...state,
				bottomOpen: !state.bottomOpen
			};
		}
		/** Set the bottom workbench height (clamped to the contract range). The
		* upper bound leaves the conversation column at least {@link CONVERSATION_MIN}
		* tall — without the cap the workbench could swallow the whole viewport and
		* squeeze the conversation to zero height. */
		function setBottomHeight(state, height) {
			const viewport = typeof window !== "undefined" ? window.innerHeight : Infinity;
			const max = Math.max(120, viewport - 280);
			return {
				...state,
				bottomHeight: Math.min(max, Math.max(120, Math.round(height)))
			};
		}
		/** Toggle a directory in the explorer expansion set. */
		function toggleExpanded(state, path) {
			const expanded = state.expanded.includes(path) ? state.expanded.filter((item) => item !== path) : [...state.expanded, path];
			return {
				...state,
				expanded
			};
		}
		/**
		* Reveal files in the explorer: expand every ancestor directory between the
		* explorer root and each file (so the lazy tree actually shows the row) and
		* record the paths for highlighting. The reveal set is transient —
		* sanitizeState never restores it, so a reload starts unhighlighted.
		* @param state - current sidebar state.
		* @param cwd - the explorer's root (session working directory).
		* @param files - absolute paths to highlight (parent dirs are expanded).
		* @returns the next state, or the same reference when nothing is revealed.
		*/
		function revealPaths(state, cwd, files) {
			const expanded = new Set(state.expanded);
			const revealed = [];
			const rootParts = (cwd ?? "").split(/[\\/]+/).filter((part) => part !== "");
			for (const file of files) {
				if (typeof file !== "string" || file === "") continue;
				revealed.push(file);
				const parts = file.split(/[\\/]+/).filter((part) => part !== "" && part !== ".");
				const separator = file.includes("\\") ? "\\" : "/";
				const prefix = file.startsWith("/") ? "/" : file.startsWith("\\\\") ? "\\\\" : file.startsWith("\\") ? "\\" : "";
				for (let i = rootParts.length; i < parts.length - 1; i++) expanded.add(prefix + parts.slice(0, i + 1).join(separator));
			}
			if (revealed.length === 0) return state;
			return {
				...state,
				expanded: [...expanded],
				revealed
			};
		}
		/** Adjust one split divider: `i` is the left/top child index, delta in fractions. */
		function resizeSplit(node, splitId, index, delta) {
			if (node.kind === "leaf") return node;
			if (node.id === splitId) {
				const sizes = [...node.sizes];
				const left = Math.min(.92, Math.max(.08, sizes[index] + delta));
				const right = Math.min(.92, Math.max(.08, sizes[index + 1] - delta));
				sizes[index] = left;
				sizes[index + 1] = right;
				return {
					...node,
					sizes
				};
			}
			return {
				...node,
				sizes: [...node.sizes],
				children: node.children.map((child) => resizeSplit(child, splitId, index, delta))
			};
		}
		/** State-level {@link resizeSplit} route: the divider may live in either
		*  tree (split ids are globally unique). */
		function resizeSplitIn(state, splitId, index, delta) {
			const key = "bottomSplits";
			return {
				...state,
				[key]: resizeSplit(state[key], splitId, index, delta)
			};
		}
		/** Prefix marking a tab id as an agent-owned terminal (suffix is the uuid). */
		const AGENT_TAB_PREFIX = "agent:";
		/** Whether a tab id refers to an agent-owned terminal. */
		function isAgentTabId(tabId) {
			return tabId.startsWith(AGENT_TAB_PREFIX);
		}
		/** Extract the agent terminal uuid from an `agent:<uuid>` tab id. */
		function agentUuidOf(tabId) {
			return tabId.slice(6);
		}
		/** Build the sidebar tab id for one agent terminal uuid. */
		function agentTabId(uuid) {
			return `${AGENT_TAB_PREFIX}${uuid}`;
		}
		/** Shallow equality of two agent-wait maps (same keys, same needle+since). */
		function sameAgentWaits(a, b) {
			if (a === void 0) return Object.keys(b).length === 0;
			const aKeys = Object.keys(a);
			if (aKeys.length !== Object.keys(b).length) return false;
			for (const key of aKeys) {
				const av = a[key];
				const bv = b[key];
				if (av === void 0 || bv === void 0) return false;
				if (av.needle !== bv.needle || av.since !== bv.since) return false;
			}
			return true;
		}
		/** Fold the pushed terminal snapshots into the authoritative wait map. */
		function serverWaitsOf(agentTerminals) {
			const serverWaits = {};
			for (const terminal of agentTerminals) if (terminal.waiting !== void 0 && terminal.waiting !== null) serverWaits[terminal.uuid] = {
				needle: terminal.waiting.needle,
				since: terminal.waiting.since
			};
			return serverWaits;
		}
		/**
		* Reconcile the sidebar's agent-terminal tabs with the host's live list.
		* The host pushes the current list of agent terminals (created by the model
		* through the `terminal_create` tool) over a dedicated WebSocket; this
		* reducer mirrors that list into tabs: new uuids get a tab, vanished uuids
		* lose theirs. The agent owns the lifetime — the user closing a tab sends a
		* WS close frame that kills the pty, which fires a change, which converges
		* the view. Idempotent: a no-op when the lists already match.
		* @param state - the current per-session sidebar state.
		* @param agentTerminals - the live agent terminal snapshots from the host.
		* @returns the next state (or the same reference if no change was needed).
		*/
		function reconcileAgentTerminals(state, agentTerminals) {
			const existingAgentTabs = allLeaves(state.bottomSplits).flatMap((leaf) => leaf.tabs).filter((tab) => isAgentTabId(tab.id));
			const existingUuids = new Set(existingAgentTabs.map((tab) => agentUuidOf(tab.id)));
			const serverUuids = new Set(agentTerminals.map((t) => t.uuid));
			const toAdd = agentTerminals.filter((t) => !existingUuids.has(t.uuid));
			const toRemove = existingAgentTabs.filter((tab) => !serverUuids.has(agentUuidOf(tab.id)) && tab.pin === void 0);
			const serverWaits = serverWaitsOf(agentTerminals);
			if (toAdd.length === 0 && toRemove.length === 0 && sameAgentWaits(state.agentWaits, serverWaits)) return state;
			let bottomSplits = state.bottomSplits;
			for (const tab of toRemove) {
				const leaf = leafWithTab(bottomSplits, tab.id);
				if (leaf !== void 0) bottomSplits = closeTab({
					...state,
					bottomSplits
				}, leaf.id, tab.id).bottomSplits;
			}
			let next = {
				...state,
				bottomSplits
			};
			for (const terminal of toAdd) {
				const tab = {
					id: agentTabId(terminal.uuid),
					type: "terminal",
					title: terminal.title
				};
				next = openTabInBottomPane(next, tab);
			}
			return {
				...next,
				agentWaits: serverWaits
			};
		}
		/**
		* Mirror ONLY the authoritative agent-wait map from a push — no tab
		* add/remove reconciliation. Used while the `terminal` tab type is disabled:
		* the tab surface is frozen, but a wait that resolves during that window
		* must still clear its banner state, or a re-enabled terminal keeps a stale
		* banner/⏳ until some unrelated host event fires the next full reconcile.
		* Idempotent: a no-op when the map already matches.
		*/
		function mirrorAgentWaits(state, agentTerminals) {
			const serverWaits = serverWaitsOf(agentTerminals);
			if (sameAgentWaits(state.agentWaits, serverWaits)) return state;
			return {
				...state,
				agentWaits: serverWaits
			};
		}
		const STORAGE_PREFIX = "dsh-sidebar:v1";
		/**
		* URL escape hatch (#369): loading the app with `?dsh-sidebar-reset` drops
		* the persisted layout for the session instead of restoring it. When a
		* restored tab hangs the page on mount (the #369 freeze loop), reloading
		* into the same state replays the hang forever; this param starts from the
		* default layout and clears the stored copy, breaking the loop. Persisting
		* resumes as soon as the param is gone from the URL.
		*/
		const RESET_PARAM = "dsh-sidebar-reset";
		/** Whether the current page load asked for a persisted-state reset. */
		function resetRequested() {
			try {
				return new URLSearchParams(window.location.search).has(RESET_PARAM);
			} catch {
				return false;
			}
		}
		function loadState(sessionId) {
			const reset = resetRequested();
			if (reset) try {
				localStorage.removeItem(`${STORAGE_PREFIX}:${sessionId}`);
			} catch {}
			if (!reset) try {
				const raw = localStorage.getItem(`${STORAGE_PREFIX}:${sessionId}`);
				if (raw !== null) {
					const parsed = JSON.parse(raw);
					nextIdCounter = maxCounterId(parsed);
					const sanitized = sanitizeState(parsed);
					if (sanitized !== void 0) return sanitized;
				}
			} catch {}
			return makeDefaultState();
		}
		/**
		* Structural validation of one persisted state. A malformed or stale shape
		* (older layouts, hand-edited storage) must fall back to the default instead
		* of crashing the panel on every reload; the restored width is also clamped
		* to the current viewport so a stale fullscreen width can never crush the
		* app shell (margin-right larger than the window) or cover the whole screen.
		* @returns a clean state, or undefined to fall back to the default.
		*/
		function sanitizeState(parsed) {
			if (parsed === null || typeof parsed !== "object") return void 0;
			const record = parsed;
			if (typeof record.nextTerminal !== "number" || !Number.isInteger(record.nextTerminal) || record.nextTerminal < 1) return;
			const nextBrowser = typeof record.nextBrowser === "number" && Number.isInteger(record.nextBrowser) && record.nextBrowser >= 1 ? record.nextBrowser : 1;
			if (typeof record.activePane !== "string" && record.activePane !== null) return void 0;
			if (!Array.isArray(record.expanded) || record.expanded.some((item) => typeof item !== "string")) return void 0;
			const seen = /* @__PURE__ */ new Set();
			const reid = /* @__PURE__ */ new Map();
			// Fenglin: refresh must not auto-expand the bottom workbench.
			const bottomOpen = false;
			const maxHeight = typeof window !== "undefined" ? window.innerHeight : Infinity;
			const bottomCap = Math.max(120, maxHeight - 280);
			const rawHeight = typeof record.bottomHeight === "number" && Number.isFinite(record.bottomHeight) ? record.bottomHeight : 220;
			const bottomHeight = Math.min(bottomCap, Math.max(120, Math.round(rawHeight)));
			const bottomSplits = pruneEmptyPanes(sanitizeNode(record.bottomSplits, seen, reid) ?? {
				kind: "leaf",
				id: uid("pane"),
				tabs: [],
				active: null
			});
			const requestedActivePane = typeof record.activePane === "string" ? reid.get(record.activePane) ?? record.activePane : null;
			return {
				activePane: requestedActivePane === null ? null : allLeaves(bottomSplits).some((leaf) => leaf.id === requestedActivePane) ? requestedActivePane : firstLeaf(bottomSplits).id,
				nextTerminal: record.nextTerminal,
				nextBrowser,
				expanded: record.expanded,
				revealed: [],
				bottomOpen,
				bottomHeight,
				bottomOpenedOnce: record.bottomOpenedOnce === true,
				bottomSplits,
				agentWaits: {}
			};
		}
		/** Collapse persisted split panes left empty after ephemeral diff tabs are dropped. */
		function pruneEmptyPanes(node) {
			const leaves = allLeaves(node);
			if (!leaves.some((leaf) => leaf.tabs.length > 0)) return node;
			return leaves.reduce((tree, leaf) => leaf.tabs.length === 0 ? removeLeafAt(tree, leaf.id) : tree, node);
		}
		/**
		* One tree node id, deduplicated against the ids already seen in this
		* state. Duplicates are exactly the pre-seeding counter-reset corruption
		* (a "pane:1"/"split:1" minted after a reload beside the persisted ones):
		* keeping both would make mapLeaf visit two leaves at once and every open
		* would land in both panes, so the repeat gets a fresh id.
		* @returns the id to use (the original, or a fresh uid for repeats).
		*/
		function uniqueNodeId(id, seen, reid) {
			if (!seen.has(id)) {
				seen.add(id);
				return id;
			}
			const fresh = uid(/^split:\d+$/.test(id) ? "split" : "pane");
			seen.add(fresh);
			reid.set(id, fresh);
			return fresh;
		}
		/**
		* Validate one persisted tab record. @returns the clean tab, `'diff'` for an
		* ephemeral diff tab (dropped everywhere — diff tabs never survive a reload),
		* or undefined when the record is malformed (structural corruption when it
		* comes from a split-tree leaf; a malformed FLOAT tab only drops the window).
		*/
		function sanitizePersistedTab(tab) {
			if (tab === null || typeof tab !== "object") return void 0;
			const candidate = tab;
			if (typeof candidate.id !== "string" || typeof candidate.title !== "string") return void 0;
			if (candidate.type === "diff") return "diff";
			if (typeof candidate.type !== "string") return void 0;
			if (candidate.type === "explorer") {
				const meta = candidate.meta !== null && typeof candidate.meta === "object" && !Array.isArray(candidate.meta) ? candidate.meta : void 0;
				return {
					id: candidate.id,
					type: "editor",
					title: "Files",
					meta: {
						treeOpen: true,
						...meta
					}
				};
			}
			const result = {
				id: candidate.id,
				type: candidate.type,
				title: candidate.title,
				...typeof candidate.path === "string" ? { path: candidate.path } : {},
				...candidate.meta !== void 0 ? { meta: candidate.meta } : {}
			};
			const pin = candidate.pin;
			if (pin !== null && typeof pin === "object" && !Array.isArray(pin) && result.type === "terminal") {
				const pinRecord = pin;
				if (pinRecord.scope === "workspace" || pinRecord.scope === "global") {
					const homeCwd = pinRecord.homeCwd;
					result.pin = homeCwd === void 0 || typeof homeCwd === "string" ? {
						scope: pinRecord.scope,
						...typeof homeCwd === "string" ? { homeCwd } : {}
					} : { scope: pinRecord.scope };
				}
			}
			return result;
		}
		/** Validate one split-tree node (leaf or split) and rebuild it cleanly. */
		function sanitizeNode(node, seen, reid) {
			if (node === null || typeof node !== "object") return void 0;
			const record = node;
			if (record.kind === "leaf") {
				if (typeof record.id !== "string" || !Array.isArray(record.tabs)) return void 0;
				const tabs = [];
				let droppedDiff = false;
				for (const tab of record.tabs) {
					const clean = sanitizePersistedTab(tab);
					if (clean === void 0) return void 0;
					if (clean === "diff") {
						droppedDiff = true;
						continue;
					}
					tabs.push(clean);
				}
				const active = typeof record.active === "string" ? record.active : null;
				if (active !== null && !tabs.some((tab) => tab.id === active) && !droppedDiff) return void 0;
				return {
					kind: "leaf",
					id: uniqueNodeId(record.id, seen, reid),
					tabs,
					active: active !== null && tabs.some((tab) => tab.id === active) ? active : null
				};
			}
			if (record.kind === "split") {
				if (typeof record.id !== "string" || record.dir !== "row" && record.dir !== "col") return void 0;
				if (!Array.isArray(record.children) || !Array.isArray(record.sizes)) return void 0;
				const children = [];
				for (const child of record.children) {
					const clean = sanitizeNode(child, seen, reid);
					if (clean === void 0) return void 0;
					children.push(clean);
				}
				if (children.length < 2) return void 0;
				if (record.sizes.length !== children.length || record.sizes.some((size) => typeof size !== "number" || !Number.isFinite(size) || size <= 0)) return;
				return {
					kind: "split",
					id: uniqueNodeId(record.id, seen, reid),
					dir: record.dir,
					sizes: record.sizes,
					children
				};
			}
		}
		/** The session-scoped store: one state per conversation, localStorage-backed. */
		var SidebarStore = class {
			bySession = /* @__PURE__ */ new Map();
			snapshot = {
				sessionId: void 0,
				state: void 0,
				prefs: { ...SIDEBAR_PREFS_DEFAULTS }
			};
			listeners = /* @__PURE__ */ new Set();
			/** Per-session persist debounce timers (v0.12.0+: one per session, so a
			*  targeted open never cancels another session's pending write). */
			persistTimers = /* @__PURE__ */ new Map();
			/** User-facing side card prefs seeding brand-new session states (defaults until the settings RPC resolves). */
			prefs = { ...SIDEBAR_PREFS_DEFAULTS };
			/**
			* External disable (the dsh-web-ui family's aionui-panel provider choice):
			* while true the sidebar must not mount at all. Not part of the snapshot —
			* nothing renders on it; the mount gate and the intercept predicates read
			* it directly.
			*/
			suspended = false;
			/**
			* Set the external-disable flag (from the settings route) and remember it
			* for the mount gate and the intercept predicates.
			*/
			setSuspended(suspended) {
				this.suspended = suspended;
			}
			/** Whether the sidebar is externally disabled (aionui-panel chosen). */
			getSuspended() {
				return this.suspended;
			}
			/**
			* Replace the side card prefs (the settings RPC result / settings page
			* write). Notifies like any store change: the snapshot carries the prefs,
			* so consumers that gate on enable switches (the + menu, derived flows)
			* re-render with the new values immediately.
			*/
			setPrefs(prefs) {
				this.prefs = { ...prefs };
				this.snapshot = {
					...this.snapshot,
					prefs: this.prefs
				};
				this.notify();
			}
			/** The current side card prefs (seeds new sessions; persisted states win). */
			getPrefs() {
				return { ...this.prefs };
			}
			/** Select a session (or none); loads its persisted state. */
			setSession(sessionId) {
				try {
					if (sessionId === "current" || sessionId === void 0 || sessionId === null || (typeof sessionId === "string" && sessionId.startsWith("__fenglin"))) {
						const real = typeof fenglinRealSid === "function" ? fenglinRealSid(sessionId) : void 0;
						if (real !== void 0 && String(real) !== "current" && !String(real).startsWith("__fenglin")) sessionId = String(real);
					}
				} catch {}
				if (sessionId === void 0 || sessionId === null || sessionId === "current") {
					if (this.snapshot.sessionId !== void 0 && this.snapshot.state !== void 0 && !String(this.snapshot.sessionId).startsWith("__fenglin") && this.snapshot.sessionId !== "current") return;
					if (sessionId === void 0 || sessionId === null || sessionId === "current") {
						if (this.snapshot.sessionId !== void 0 && this.snapshot.state !== void 0 && !String(this.snapshot.sessionId).startsWith("__fenglin") && this.snapshot.sessionId !== "current") return;
						sessionId = "__fenglin_bottom__";
					}
				}
				if (this.snapshot.sessionId === sessionId) return;
				if (sessionId === void 0) this.snapshot = {
					sessionId: void 0,
					state: void 0,
					prefs: this.prefs
				};
				else {
					let state = this.bySession.get(sessionId);
					if (state === void 0) {
						state = loadState(sessionId);
						this.bySession.set(sessionId, state);
					} else nextIdCounter = maxCounterId(state);
					this.snapshot = {
						sessionId,
						state,
						prefs: this.prefs
					};
				}
				this.notify();
			}
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			getSnapshot() {
				return this.snapshot;
			}
			/** Mutate the current session's state (no-op without a session). */
			update(mutator) {
				const sessionId = this.snapshot.sessionId;
				const state = this.snapshot.state;
				if (sessionId === void 0 || state === void 0) return;
				const draft = structuredClone(state);
				mutator(draft);
				this.bySession.set(sessionId, draft);
				this.snapshot = {
					sessionId,
					state: draft,
					prefs: this.prefs
				};
				this.schedulePersist(sessionId, draft);
				this.notify();
			}
			/**
			* Whether a tab still exists in its session's state. Views use this on
			* unmount to tell "the tab was closed" (release the terminal now) from
			* "the tree re-rendered / the conversation switched" (the tab is still
			* open — keep the terminal alive through the host's reconnect grace).
			* Checks the session's own map entry (the current snapshot may already
			* point at another session when a conversation switch unmounts the old
			* one's tabs).
			*/
			tabOpen(sessionId, tabId) {
				const state = this.bySession.get(sessionId) ?? (this.snapshot.sessionId === sessionId ? this.snapshot.state : void 0);
				return state !== void 0 && tabOpenIn(state, tabId);
			}
			/**
			* Read-only view of EVERY cached session's state (v0.17.0+). The
			* PinnedRail uses this to collect pinned terminals across sessions
			* without each render reading private fields. The map is the live
			* `bySession` reference — callers MUST treat it as read-only (mutations
			* go through {@link reduce} / {@link reduceFor}). A session that has
			* never been visited in this run is absent (its pinned tabs are not
			* visible until first load — accepted as YAGNI by the design).
			*/
			getSessionStates() {
				return new Map(this.bySession);
			}
			/** Apply a pure reducer (returns the next state). */
			reduce(reducer) {
				let sessionId = this.snapshot.sessionId;
				let state = this.snapshot.state;
				if (sessionId === void 0 || state === void 0 || String(sessionId) === "current" || String(sessionId).startsWith("__fenglin")) {
					const real = typeof fenglinRealSid === "function" ? fenglinRealSid(sessionId) : sessionId;
					const syn = (v) => v === void 0 || v === null || v === "" || String(v) === "current" || String(v).startsWith("__fenglin");
					const keys = [...this.bySession.keys()].filter((k) => !syn(k));
					const fallback = !syn(real) ? String(real) : (!syn(sessionId) ? String(sessionId) : keys[keys.length - 1] ?? "__fenglin_bottom__");
					state = this.bySession.get(fallback) ?? loadState(fallback);
					if (state === void 0 || state === null || typeof state !== "object") state = makeDefaultState();
					sessionId = fallback;
					this.bySession.set(sessionId, state);
					this.snapshot = { sessionId, state, prefs: this.prefs };
				}
				const next = reducer(state);
				if (next === state) return;
				this.bySession.set(sessionId, next);
				this.snapshot = {
					sessionId,
					state: next,
					prefs: this.prefs
				};
				this.schedulePersist(sessionId, next);
				this.notify();
			}
			/**
			* Apply a pure reducer to a TARGET session's state (not the active one),
			* loading it on demand and persisting the result — WITHOUT switching the
			* active snapshot or notifying (the UI must not follow along). Used by the
			* service's targeted `openTab(seed, scope)`: the open lands in the target
			* session's layout and is visible whenever the user switches to it.
			*/
			reduceFor(sessionId, reducer) {
				const counterBefore = nextIdCounter;
				let state = this.bySession.get(sessionId);
				if (state === void 0) {
					state = loadState(sessionId);
					this.bySession.set(sessionId, state);
				} else nextIdCounter = maxCounterId(state);
				const next = reducer(state);
				nextIdCounter = Math.max(nextIdCounter, counterBefore);
				if (next === state) return;
				this.bySession.set(sessionId, next);
				this.schedulePersist(sessionId, next);
			}
			schedulePersist(sessionId, state) {
				const existing = this.persistTimers.get(sessionId);
				if (existing !== void 0) window.clearTimeout(existing);
				const timer = window.setTimeout(() => {
					this.persistTimers.delete(sessionId);
					try {
						localStorage.setItem(`${STORAGE_PREFIX}:${sessionId}`, JSON.stringify(state));
					} catch {}
				}, 200);
				this.persistTimers.set(sessionId, timer);
			}
			notify() {
				for (const listener of [...this.listeners]) listener();
			}
		};
		/**
		* Create one sidebar store instance. Production code calls this only from
		* the client plugin's `apply` (the instance is handed to components as a
		* prop); tests call it directly. No module-level singleton: the store's
		* lifetime belongs to the plugin activation, exactly like the official
		* `createXXXStore()` factory rule.
		*/
		function createSidebarStore() {
			return new SidebarStore();
		}
		//#endregion
		//#region src/client/paths.ts
		/**
		* Path projection helpers shared by the explorer rows: a path relative to
		* the session cwd (for the @-reference button and "copy relative path").
		* The fs-tree joins with '/' even on Windows, so both separators normalize
		* to '/' before comparison.
		*
		* This module is dependency-free (no node:path in the client bundle): the
		* host is the authority for path semantics, so this mirror deliberately
		* accepts a SUPERSET of absolute forms — anything a Windows host would emit
		* (drive letters, UNC) plus POSIX roots. A form the host would reject
		* (e.g. a backslash UNC path on a POSIX host) passes through here and then
		* fails loudly in the host's requireAbsolute instead of being silently
		* joined onto the cwd.
		*/
		/**
		* Mirror of the host's absolute-path notion (see fs-tree.requireAbsolute):
		* POSIX roots, Windows drive letters, and Windows UNC network shares in
		* both backslash (`\\server\share\...`) and forward-slash
		* (`//server/share/...`) form. Deliberately a superset — see the module
		* comment — so a produced UNC path is never joined onto the cwd.
		*/
		function isAbsolutePath$1(path) {
			return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path) || /^[\\/]{2}[^\\/]/.test(path);
		}
		/**
		* The path relative to the session's working directory.
		* @param cwd - the explorer root (absolute).
		* @param path - an absolute entry path from the fs-tree.
		* @returns the relative path with '/' separators ('.' for the cwd itself),
		* or `path` unchanged when it lies outside the cwd.
		*
		* The prefix test is case-insensitive: Windows paths (and macOS's
		* case-insensitive volumes) may arrive with different casing than the cwd
		* row, and the containment decision must not depend on it. The returned
		* relative text keeps the caller's own casing.
		*/
		function relativeTo(cwd, path) {
			const base = cwd.replace(/[\\/]+$/, "");
			const norm = (value) => value.replace(/\\/g, "/");
			const nBase = norm(base);
			const nPath = norm(path);
			if (nPath === nBase) return ".";
			if (nPath.toLowerCase().startsWith(`${nBase.toLowerCase()}/`)) return nPath.slice(nBase.length + 1);
			return path;
		}
		/**
		* Whether `target` lies under `base` (or equals it), tolerant of separator
		* style and — on Windows-style drive paths — of letter case. A client-side
		* mirror of the host's `isWithin` (fs-tree.ts) used to decide whether a
		* git-derived path can be opened in the editor (a linked worktree outside
		* the session workspace cannot: the host's workspace fence would reject it).
		*/
		function isWithinWorkspace(base, target) {
			const norm = (value) => value.replace(/[\\/]+/g, "/").replace(/\/$/, "");
			const b = norm(base);
			const t = norm(target);
			const lb = b.toLowerCase();
			const lt = t.toLowerCase();
			return lt === lb || lt.startsWith(`${lb}/`);
		}
		/**
		* The last path segment of a '/'- or '\'-separated path (a diff tab title,
		* a worktree label). Returns the whole string when no separator is present.
		*/
		function baseName$1(path) {
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return at === -1 ? path : path.slice(at + 1);
		}
		/**
		* The lowercased file extension of a path ('' when none). The dot must sit
		* inside the last segment — a dot in a directory name is not an extension.
		* Shared by the editor language mapping (lang.ts) and the viewer registry's
		* extension matching (service.ts), which both live in the core bundle.
		*/
		function extOf(path) {
			const at = path.lastIndexOf(".");
			if (at === -1) return "";
			const base = path.slice(at + 1).toLowerCase();
			return base.includes("/") || base.includes("\\") ? "" : base;
		}
		//#endregion
		//#region src/client/file-icons.tsx
		/**
		* A file row: the host's own classifier and artwork for any path. Unknown
		* extensions land on the generic document glyph, exactly like the host's
		* explorer.
		* @param path - the row's path (any separator; the classifier reads the basename).
		* @param size - the square edge in px.
		* @returns the host's file-type glyph.
		*/
		function builtinFileIcon(path, size) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
				path,
				size
			});
		}
		/**
		* A directory row: the host's folder glyph.
		*
		* The host ships ONE folder drawing (`kind: 'folder'` resolves to its
		* monochrome `IconFolderClose16`, which rides `currentColor` and therefore
		* still follows the skin), and the classifier never returns a folder kind of
		* its own. The expansion state is already legible from the tree's own chevron
		* and row affordances, so this deliberately does not invent a second folder
		* drawing.
		* @param _open - whether the row is expanded (accepted for API compatibility).
		* @param size - the square edge in px.
		* @returns the host's folder glyph.
		*/
		function builtinFolderIcon(_open, size) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
				kind: "folder",
				size
			});
		}
		//#endregion
		//#region src/client/service.ts
		/**
		* Reserved `exts` values that claim DIRECTORY rows instead of file
		* extensions: `'folder'` matches a closed directory, `'folder-open'` an
		* expanded one (`folderIcon(path, open)` resolves them). They are filtered out of
		* real-extension matching, so a file literally named `x.folder` is NOT
		* claimed by a folder registration.
		*/
		const FOLDER_EXT = "folder";
		const FOLDER_OPEN_EXT = "folder-open";
		/** The file name of a path (both separators). */
		function baseNameOf(path) {
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return at === -1 ? path : path.slice(at + 1);
		}
		/**
		* Find the tab type that claims an intercepted external-link URL (v0.13.0+).
		* Walks the descriptors in REGISTRATION order and returns the first one
		* that declares `urlTarget` and matches `url`; a throwing predicate is
		* swallowed (console.error, type skipped) so one broken plugin can never
		* break the whole link pipeline. The caller passes the ENABLED tab
		* descriptors (enablement is the caller's prefs domain — filter
		* `service.getTabs()` through `tabsEnabled` before matching) and falls
		* back to the built-in browser tab when nothing claims the URL (the
		* browser never declares `urlTarget` itself, so it can never shadow a
		* plugin claim).
		*/
		function matchUrlTarget(tabs, url) {
			for (const tab of tabs) {
				if (tab.urlTarget === void 0) continue;
				let claimed;
				try {
					claimed = tab.urlTarget(url) === true;
				} catch (error) {
					console.error("[dsh-better-sidebar] urlTarget error:", error);
					continue;
				}
				if (claimed) return tab;
			}
		}
		/**
		* The plugin version this service instance reports. Keep in lockstep with
		* `package.json`'s version — `tests/service.spec.ts` asserts the pair.
		*/
		const SIDEBAR_SERVICE_VERSION = "0.19.1";
		/**
		* Monotonic capability list consumers use to gate new API usage (features
		* are never removed). Each string names a v0.12.0+ capability:
		* - 'badge': TabDescriptor.badge
		* - 'tabLifecycle': TabDescriptor.onOpen/onActivate/onClose
		* - 'updateTab': BetterSidebarService.updateTab
		* - 'openFile': BetterSidebarService.openFile
		* - 'targetedOpen': BetterSidebarService.openTab(seed, scope?)
		* - 'stateSubscription': getSnapshot/subscribeState
		* - 'tabMeta': SidebarTab.meta (seeds, createTab, updateTab, persistence)
		* - 'pluginSettings': SidebarSettingsDeclaration.pluginToggles/render
		* - 'urlTarget' (v0.13.0): TabDescriptor.urlTarget (external-link claims)
		* - 'settingSelect': SidebarSettingToggle type 'select' (options/multi)
		* - 'fileIcons' (v0.19.0): registerFileIcon/getFileIcons/matchFileIcon —
		*   external file-tree icons overriding the built-in glyphs, matched by
		*   extension (`exts`), exact file name (`names`), or directory name
		*   (`folderNames`).
		*
		* v0.19.0 REMOVED 'floatWindows': the free-window feature is gone (DSH 0.1.5
		* owns the right column, so the plugin keeps only its bottom workbench).
		* Consumers must not gate on it any more.
		*/
		const SIDEBAR_FEATURES = [
			"badge",
			"tabLifecycle",
			"updateTab",
			"openFile",
			"targetedOpen",
			"stateSubscription",
			"tabMeta",
			"pluginSettings",
			"urlTarget",
			"settingSelect",
			"fileIcons"
		];
		/** Run one plugin callback; a throw is logged and never breaks the caller. */
		function safeCall(fn) {
			try {
				fn();
			} catch (error) {
				console.error("[dsh-better-sidebar] plugin callback error:", error);
			}
		}
		/**
		* Create one BetterSidebar service bound to a store. The service owns the
		* tab/viewer registries (Map + listener set) and proxies openTab/closeTab
		* to the store's reducer. One instance per client plugin activation.
		*/
		function createBetterSidebarService(store) {
			const tabs = /* @__PURE__ */ new Map();
			const viewers = /* @__PURE__ */ new Map();
			const fileIcons = /* @__PURE__ */ new Map();
			const listeners = /* @__PURE__ */ new Set();
			/** The native right-Sidebar write face, installed by the client half. */
			let surface;
			const notify = () => {
				for (const fn of [...listeners]) fn();
			};
			const subscribe = (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			};
			const registerTab = (descriptor) => {
				if (tabs.has(descriptor.id)) throw new Error(`[dsh-better-sidebar] tab type "${descriptor.id}" already registered`);
				const safe = typeof descriptor.component === "function" ? descriptor : { ...descriptor, component: () => null };
				tabs.set(descriptor.id, safe);
				notify();
				return () => {
					if (tabs.get(descriptor.id) === safe || tabs.get(descriptor.id) === descriptor) {
						tabs.delete(descriptor.id);
						notify();
					}
				};
			};
			const registerFileViewer = (descriptor) => {
				if (viewers.has(descriptor.id)) throw new Error(`[dsh-better-sidebar] file viewer "${descriptor.id}" already registered`);
				viewers.set(descriptor.id, descriptor);
				notify();
				return () => {
					if (viewers.get(descriptor.id) === descriptor) {
						viewers.delete(descriptor.id);
						notify();
					}
				};
			};
			const getTabs = () => Array.from(tabs.values());
			const getFileViewers = () => Array.from(viewers.values());
			const getFileIcons = () => Array.from(fileIcons.values());
			const getTab = (id) => tabs.get(id);
			const registerFileIcon = (descriptor) => {
				if (fileIcons.has(descriptor.id)) throw new Error(`[dsh-better-sidebar] file icons "${descriptor.id}" already registered`);
				fileIcons.set(descriptor.id, descriptor);
				notify();
				return () => {
					if (fileIcons.get(descriptor.id) === descriptor) {
						fileIcons.delete(descriptor.id);
						notify();
					}
				};
			};
			const rankedFileIcons = () => Array.from(fileIcons.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
			const matchFileIcon = (path) => {
				const ext = extOf(path);
				const reserved = ext === "folder" || ext === "folder-open";
				const name = baseName$1(path).toLowerCase();
				const ranked = rankedFileIcons();
				for (const d of ranked) if (d.names?.some((entry) => entry.toLowerCase() === name) === true) return d;
				if (reserved) return void 0;
				for (const d of ranked) if (d.exts?.includes(ext) === true) return d;
			};
			const matchFolderIcon = (open, name) => {
				const ranked = rankedFileIcons();
				if (name !== void 0) {
					const wanted = name.toLowerCase();
					for (const d of ranked) if (d.folderNames?.some((entry) => entry.toLowerCase() === wanted) === true) return d;
				}
				const want = open ? FOLDER_OPEN_EXT : FOLDER_EXT;
				for (const d of ranked) if (d.exts?.includes(want) === true) return d;
			};
			/** Run one registered factory; a throw is logged and returns undefined. */
			const safeIcon = (d, path, size, open) => {
				try {
					return d.icon(path, size, open);
				} catch (error) {
					console.error(`[dsh-better-sidebar] file icon factory "${d.id}" error:`, error);
					return;
				}
			};
			const fileIcon = (path, size) => {
				const specific = matchFileIcon(path);
				if (specific !== void 0) {
					const icon = safeIcon(specific, path, size);
					if (icon !== void 0) return icon;
				}
				for (const d of rankedFileIcons()) if (d.exts !== void 0 && d.exts.length === 0) {
					const icon = safeIcon(d, path, size);
					if (icon !== void 0) return icon;
				}
				return builtinFileIcon(path, size);
			};
			const folderIcon = (path, open, size) => {
				const registered = matchFolderIcon(open, baseName$1(path));
				if (registered !== void 0) {
					const icon = safeIcon(registered, path, size, open);
					if (icon !== void 0) return icon;
				}
				return builtinFolderIcon(open, size);
			};
			const isTabEnabled = (id) => store.getPrefs().tabsEnabled[id] !== false;
			const isViewerEnabled = (id) => store.getPrefs().viewersEnabled[id] !== false;
			const matchFileViewer = (path, head) => {
				const ext = extOf(path);
				for (const v of Array.from(viewers.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))) {
					if (!isViewerEnabled(v.id)) continue;
					if (head !== void 0 && v.detect !== void 0) {
						if (v.detect(path, head)) return v;
						if (v.exts.length === 0) continue;
					} else if (v.exts.length === 0) {
						if (v.detect === void 0) return v;
						continue;
					}
					if (v.exts.includes(ext)) return v;
				}
			};
			const openTab = (seed, scope) => {
				if (!isTabEnabled(seed.type)) {
					console.warn(`[dsh-better-sidebar] tab type "${seed.type}" is disabled in the side card settings`);
					return;
				}
				const descriptor = tabs.get(seed.type);
				if (descriptor === void 0) return;
				let targetSessionId = scope?.sessionId ?? store.getSnapshot().sessionId;
				const syn = (v) => v === void 0 || v === null || v === "" || String(v) === "current" || String(v).startsWith("__fenglin");
				const real = fenglinRealSid(targetSessionId);
				if (!syn(real)) {
					targetSessionId = real;
					try { if (store.getSnapshot().sessionId !== real) store.setSession(real); } catch {}
				} else if (targetSessionId === void 0) {
					targetSessionId = store.getSnapshot().sessionId ?? "__fenglin_bottom__";
				}
				const callbackScope = { ...(scope ?? {}), sessionId: syn(targetSessionId) ? fenglinRealSid(targetSessionId) : String(targetSessionId) };
				if (surface !== void 0 && seed.target !== "bottom") {
					const state = store.getSnapshot().state;
					const minted = descriptor.createTab === void 0 || state === void 0 ? void 0 : descriptor.createTab(state);
					if (minted === null) return;
					const title = seed.title ?? minted?.tab.title ?? (typeof descriptor.title === "function" ? descriptor.title() : descriptor.title);
					const revealIfOpened = descriptor.createTab === void 0;
					const synthetic = {
						id: seed.id ?? minted?.tab.id ?? seed.type,
						type: seed.type,
						title,
						...seed.path === void 0 ? {} : { path: seed.path },
						...seed.diff === void 0 ? {} : { diff: seed.diff },
						...seed.meta === void 0 && minted?.tab.meta === void 0 ? {} : { meta: seed.meta ?? minted?.tab.meta }
					};
					if (seed.path !== void 0) surface.openResource({
						sessionId: targetSessionId,
						address: surface.fileAddress(targetSessionId, scope?.cwd, seed.path),
						revealIfOpened: true
					});
					else if (seed.type === "editor") surface.openTab({
						sessionId: targetSessionId,
						kind: "files",
						params: {},
						revealIfOpened: true
					});
					else surface.openTab({
						sessionId: targetSessionId,
						kind: seed.type,
						params: {
							title,
							...seed.url === void 0 ? {} : { url: seed.url },
							...seed.diff === void 0 ? {} : { diff: seed.diff },
							...synthetic.meta === void 0 ? {} : { meta: synthetic.meta }
						},
						revealIfOpened
					});
					safeCall(() => descriptor.onOpen?.(synthetic, callbackScope));
					return;
				}
				const activeSessionId = store.getSnapshot().sessionId;
				const targetsInactiveSession = scope !== void 0 && scope.sessionId !== activeSessionId;
				let created;
				let activated;
				const land = openTabInBottomPane;
				const reducer = (state) => {
					let tab;
					let next;
					if (descriptor.createTab !== void 0) {
						const result = descriptor.createTab(state);
						if (result === null) return state;
						tab = result.tab;
						next = applyDedupe(state, result.tab, descriptor, land);
						if (result.patch !== void 0) next = {
							...next,
							...result.patch
						};
					} else {
						tab = {
							id: seed.id ?? seed.type,
							type: seed.type,
							title: seed.title ?? (typeof descriptor.title === "function" ? descriptor.title() : descriptor.title),
							...seed.path !== void 0 ? { path: seed.path } : {},
							...seed.diff !== void 0 ? { diff: seed.diff } : {},
							...seed.meta !== void 0 ? { meta: seed.meta } : {}
						};
						next = applyDedupe(state, tab, descriptor, land);
					}
					const dedupeKey = descriptor.dedupeKey ?? (descriptor.single === true ? () => descriptor.id : void 0);
					const key = dedupeKey?.(tab);
					const inputTabs = allLeaves(state.bottomSplits).flatMap((leaf) => leaf.tabs);
					const existedByKey = key !== void 0 && inputTabs.some((candidate) => candidate.type === tab.type && dedupeKey(candidate) === key);
					const existedById = tabOpenIn(state, tab.id);
					const isCreation = !existedByKey && !existedById;
					let landed = next;
					if (seed.url !== void 0 && isCreation) landed = patchTab(next, tab.id, {
						path: seed.url,
						...seed.title !== void 0 ? { title: seed.title } : {}
					});
					if (isCreation) created = allLeaves(landed.bottomSplits).flatMap((leaf) => leaf.tabs).find((candidate) => candidate.id === tab.id) ?? tab;
					else {
						const candidates = allLeaves(landed.bottomSplits).flatMap((leaf) => leaf.tabs);
						activated = key !== void 0 ? candidates.find((candidate) => candidate.type === tab.type && dedupeKey(candidate) === key) : candidates.find((candidate) => candidate.id === tab.id);
						activated ??= tab;
					}
					return landed.bottomOpen ? landed : {
						...landed,
						bottomOpen: true
					};
				};
				if (targetsInactiveSession) store.reduceFor(scope.sessionId, reducer);
				else store.reduce(reducer);
				if (created !== void 0) safeCall(() => descriptor.onOpen?.(created, callbackScope));
				else if (activated !== void 0) safeCall(() => descriptor.onActivate?.(activated, callbackScope));
			};
			const closeTab$1 = (tabId, scope) => {
				const sessionId = scope?.sessionId ?? store.getSnapshot().sessionId;
				if (surface !== void 0 && sessionId !== void 0) {
					const closedNative = surface.close(sessionId, tabId);
					if (closedNative !== void 0) {
						const descriptor = tabs.get(closedNative.type);
						if (descriptor !== void 0) safeCall(() => descriptor.onClose?.({
							id: tabId,
							type: closedNative.type,
							title: closedNative.title
						}, scope ?? { sessionId }));
						return;
					}
				}
				let closed;
				store.reduce((state) => {
					if (!tabOpenIn(state, tabId)) return state;
					const paneId = findPaneIdOf(state, tabId);
					closed = leafWithTab(state.bottomSplits, tabId)?.tabs.find((tab) => tab.id === tabId);
					return closeTab(state, paneId, tabId);
				});
				if (closed !== void 0) {
					const sessionId = scope?.sessionId ?? store.getSnapshot().sessionId;
					if (sessionId !== void 0) {
						const descriptor = tabs.get(closed.type);
						safeCall(() => descriptor?.onClose?.(closed, scope ?? { sessionId }));
					}
				}
			};
			/** The snapshot the store publishes (state/prefs carry the active session). */
			const getSnapshot = () => store.getSnapshot();
			/** Store changes: session switch, state mutations, prefs writes. */
			const subscribeState = (listener) => store.subscribe(listener);
			/** Patch an open tab's display fields (a missing tab id is a no-op). */
			const updateTab = (tabId, patch) => {
				if (surface?.update(tabId, patch) === true) return;
				store.reduce((state) => patchTab(state, tabId, {
					...patch.title !== void 0 ? { title: patch.title } : {},
					...patch.path !== void 0 ? { path: patch.path } : {},
					...patch.meta !== void 0 ? { meta: patch.meta } : {}
				}));
			};
			/** Activate an open tab (the tab-bar activation path; fires onActivate). */
			const activateTab$1 = (tabId, scope) => {
				if (surface?.activate(tabId) === true) return;
				let activated;
				store.reduce((state) => {
					if (!tabOpenIn(state, tabId)) return state;
					const paneId = findPaneIdOf(state, tabId);
					activated = leafWithTab(state.bottomSplits, tabId)?.tabs.find((tab) => tab.id === tabId);
					return activateTab(state, paneId, tabId);
				});
				if (activated !== void 0) {
					const sessionId = scope?.sessionId ?? store.getSnapshot().sessionId;
					if (sessionId !== void 0) {
						const descriptor = tabs.get(activated.type);
						safeCall(() => descriptor?.onActivate?.(activated, scope ?? { sessionId }));
					}
				}
			};
			/** Open a file in the sidebar editor of `scope`'s session (title defaults
			*  to the file name; the tab id is path-derived, like the internal
			*  open-path interception, so distinct files open side by side). */
			const openFile = (scope, path, title) => {
				openTab({
					type: "editor",
					title: title ?? baseNameOf(path),
					path,
					id: `editor:${path}`
				}, scope);
			};
			return {
				registerTab,
				registerFileViewer,
				registerFileIcon,
				getTabs,
				getFileViewers,
				getFileIcons,
				matchFileIcon,
				matchFolderIcon,
				fileIcon,
				folderIcon,
				getTab,
				isTabEnabled,
				isViewerEnabled,
				matchFileViewer,
				openTab,
				closeTab: closeTab$1,
				subscribe,
				version: SIDEBAR_SERVICE_VERSION,
				features: SIDEBAR_FEATURES,
				getSnapshot,
				subscribeState,
				updateTab,
				activateTab: activateTab$1,
				openFile,
				setSurface: (next) => {
					surface = next;
				}
			};
		}
		/**
		* Apply dedup: if a tab whose `dedupeKey` matches an existing tab of the
		* same type exists, focus it; otherwise land the tab through `land` (the id
		* safety net + landing are that reducer's job — not re-implemented here).
		* `single: true` resolves to the id-key sugar when no explicit key is given.
		*/
		function applyDedupe(state, tab, descriptor, land = openTabInBottomPane) {
			const dedupeKey = descriptor.dedupeKey ?? (descriptor.single === true ? () => descriptor.id : void 0);
			const key = dedupeKey?.(tab);
			if (key !== void 0) for (const leaf of allLeaves(state.bottomSplits)) {
				const existing = leaf.tabs.find((t) => t.type === tab.type && dedupeKey(t) === key);
				if (existing !== void 0) return activateTab(state, leaf.id, existing.id);
			}
			return land(state, tab);
		}
		/** Find which pane hosts a tab id ('' if none). */
		function findPaneIdOf(state, tabId) {
			for (const leaf of allLeaves(state.bottomSplits)) if (leaf.tabs.some((t) => t.id === tabId)) return leaf.id;
			return state.activePane ?? "";
		}
		//#endregion
		//#region src/client/chunk-loader.ts
		/**
		* The platform externals a chunk bundle may require (mirror of
		* CLIENT_EXTERNALS in tsdown.config.ts — the chunk builds keep these
		* external and the loader resolves them here). A superset is safe: the
		* require only answers what the chunk actually asks for. The shell's static
		* module table seeds React, Cordis, and the UI libraries (primitives/slots).
		* `@deepseek-ai/dsh-client-runtime` was removed upstream in DSH 0.1.2-alpha
		* (its seed row became bare-name `@deepseek-ai/dsh-client-store`) and no
		* chunk ever required it, so its row is gone; so are dsh-client-web-react /
		* dsh-client-schema-form, dropped back in DSH 0.1.0-rc.8.
		*/
		const CHUNK_EXTERNALS = [
			"react",
			"react/jsx-runtime",
			"react-dom",
			"react-dom/client",
			"cordis",
			"@deepseek-ai/dsh-client-ui-slots",
			"@deepseek-ai/dsh-client-ui-primitives"
		];
		/** Chunk script endpoint served by the plugin host half (src/bundle-route.ts). */
		const CHUNK_URL = (name) => `/sidebar/bundle/${name}.js`;
		/** Bound on the revalidation HEAD round-trip. A timeout fails open (drop +
		*  re-fetch on the next open) so a stuck bundle route can never wedge lazy
		*  chunk loads behind the revalidation barrier. */
		const CHUNK_REVALIDATE_TIMEOUT_MS = 5e3;
		/** The module system injected by the client half at activation (rc.8+). */
		let injectedModuleSystem;
		/**
		* Plugin-owned page global carrying the injected module system across
		* bundle copies: the lazy chunk bundles (client-editor.js etc.) inline their
		* own chunk-loader instance, and rc.8 no longer exposes the shell module
		* system as a page global — so the core bundle's injection must be visible
		* to the chunk copies through a namespace of our own.
		*/
		const MODULE_SYSTEM_GLOBAL = "__dshSidebarModuleSystem__";
		/**
		* Inject the client module system the chunk externals resolve through.
		* Called by the client half's apply() with `ctx.modules` (rc.8+); pass
		* undefined to clear (tests). Survives {@link resetChunks} — the module
		* system is shell state, not chunk state, and stays live across HMR.
		*/
		function setChunkModuleSystem(system) {
			injectedModuleSystem = system;
			const g = globalThis;
			if (system === void 0) delete g[MODULE_SYSTEM_GLOBAL];
			else g[MODULE_SYSTEM_GLOBAL] = system;
		}
		/** Resolve the shell-installed module system (injected, then the plugin
		*  global shared with chunk-bundle copies). */
		function moduleSystem() {
			return injectedModuleSystem ?? globalThis[MODULE_SYSTEM_GLOBAL];
		}
		function chunkRegistry() {
			const g = globalThis;
			return g.__dshChunks__ ??= {};
		}
		const defaultScriptLoader = (src) => new Promise((resolve, reject) => {
			const el = document.createElement("script");
			el.async = true;
			el.src = src;
			el.addEventListener("load", () => {
				el.remove();
				resolve();
			}, { once: true });
			el.addEventListener("error", () => {
				el.remove();
				reject(/* @__PURE__ */ new Error(`[dsh-better-sidebar] chunk script ${src} failed to load`));
			}, { once: true });
			document.head.append(el);
		});
		let scriptLoader = defaultScriptLoader;
		/** Test/dev hook: resolve a chunk without fetching a script (e.g. vitest). */
		const testLoaders = /* @__PURE__ */ new Map();
		/** Memoized externals require, resolved once per page from the seed table. */
		let externalsRequire;
		async function buildExternalsRequire(modules) {
			if (externalsRequire !== void 0) return externalsRequire;
			const entries = await Promise.all(CHUNK_EXTERNALS.map(async (spec) => {
				try {
					return [spec, await modules.import(spec)];
				} catch {
					return [spec, void 0];
				}
			}));
			const table = new Map(entries);
			externalsRequire = (spec) => {
				if (!table.has(spec)) throw new Error(`[dsh-better-sidebar] chunk require('${spec}') missed the module table`);
				return table.get(spec);
			};
			return externalsRequire;
		}
		/** In-flight/memoized chunk loads; a failure removes its entry so a retry re-fetches. */
		const cache = /* @__PURE__ */ new Map();
		/** Chunk names whose exports are currently cached (loaded successfully). */
		const loadedChunks = /* @__PURE__ */ new Set();
		/** ETags observed for loaded chunks (HEAD revalidation, see
		*  {@link revalidateChunksOnReactivate}). */
		const chunkEtags = /* @__PURE__ */ new Map();
		/** Pending revalidation barrier: while set, {@link loadChunk} awaits it
		*  before serving cache (see revalidateChunksOnReactivate). */
		let revalidation = null;
		/** Best-effort ETag capture for revalidation. The script tag itself exposes
		*  no response headers, so after a successful load we HEAD the bundle route
		*  once. Failures (including a stuck route — bounded by the timeout) are
		*  ignored — revalidation then fails open (re-fetch). */
		async function recordEtag(name) {
			try {
				const etag = (await fetch(CHUNK_URL(name), {
					method: "HEAD",
					cache: "no-cache",
					signal: AbortSignal.timeout(CHUNK_REVALIDATE_TIMEOUT_MS)
				})).headers.get("etag");
				if (etag !== null && etag !== "") chunkEtags.set(name, etag);
			} catch {
				chunkEtags.delete(name);
			}
		}
		/**
		* Load (once) and materialize a lazy chunk, returning its module exports.
		* Concurrent callers share one in-flight load; a failure clears the cache
		* entry so the next call retries (the script re-executes and overwrites its
		* global registry slot — assignments are idempotent).
		* @param name - the chunk to load.
		*/
		async function loadChunk(name) {
			if (revalidation !== null) await revalidation;
			const cached = cache.get(name);
			if (cached !== void 0) return cached;
			const task = (async () => {
				const test = testLoaders.get(name);
				if (test !== void 0) return test();
				const modules = moduleSystem();
				if (modules === void 0) throw new Error(`[dsh-better-sidebar] chunk "${name}": client module system unavailable`);
				await scriptLoader(CHUNK_URL(name));
				const factory = chunkRegistry()[name];
				if (typeof factory !== "function") throw new Error(`[dsh-better-sidebar] chunk "${name}" script did not register its factory`);
				const exports = factory(await buildExternalsRequire(modules));
				if (cache.get(name) !== void 0) {
					loadedChunks.add(name);
					recordEtag(name);
				}
				return exports;
			})();
			cache.set(name, task);
			task.catch(() => {
				cache.delete(name);
				loadedChunks.delete(name);
				chunkEtags.delete(name);
			});
			return task;
		}
		/**
		* HMR-safe re-activation hook (index.tsx calls this instead of a full
		* reset): keep the resolved exports of every loaded chunk and drop only the
		* ones whose script changed on disk — the bundle route revalidates every
		* request (cache-control: no-cache + ETag), so an unchanged chunk keeps its
		* memory cache and the next lazy open skips the re-inject / re-execute.
		* Fail-open: an unreachable, ETag-less, or timed-out chunk is dropped
		* (re-fetch on next open). Test-registry entries are always cleared
		* (per-test fixtures).
		* A page refresh remains the authoritative reset (the HMR poll watches only
		* client.js; chunk-only edits surface here on the next core re-activation).
		*
		* The returned promise is also a BARRIER for {@link loadChunk}: while a
		* revalidation is pending, every chunk load awaits it before serving cache,
		* so a lazy tab opening mid-revalidation can never render stale exports
		* that the sweep is about to invalidate (CR #232 P1).
		*/
		function revalidateChunksOnReactivate() {
			testLoaders.clear();
			const task = (async () => {
				for (const name of [...cache.keys()]) if (!loadedChunks.has(name)) cache.delete(name);
				if (loadedChunks.size === 0) return;
				const stale = [];
				await Promise.all([...loadedChunks].map(async (name) => {
					try {
						const etag = (await fetch(CHUNK_URL(name), {
							method: "HEAD",
							cache: "no-cache",
							signal: AbortSignal.timeout(CHUNK_REVALIDATE_TIMEOUT_MS)
						})).headers.get("etag");
						if (etag !== null && etag !== "" && chunkEtags.get(name) === etag) return;
					} catch {}
					stale.push(name);
				}));
				for (const name of stale) {
					cache.delete(name);
					loadedChunks.delete(name);
					chunkEtags.delete(name);
				}
			})();
			revalidation = task;
			task.finally(() => {
				if (revalidation === task) revalidation = null;
			});
			return task;
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/DSH-better-sidebar/DSH-better-sidebar/src/client/builtins/tab-icons.module.css.mjs
		const css$8 = ".SyUHSa_files{color:var(--dsw-alias-brand-primary,var(--dsw-alias-label-primary))}.SyUHSa_changes{color:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary,var(--dsw-alias-label-primary)))}.SyUHSa_tasks{color:var(--dsw-alias-state-warn-primary,var(--dsw-alias-label-primary))}.SyUHSa_sidechat{color:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary,var(--dsw-alias-label-primary)))}.SyUHSa_terminal{color:var(--dsw-alias-label-primary)}.SyUHSa_browser{color:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary,var(--dsw-alias-label-primary)))}";
		const tagId$7 = "dsh-better-sidebar/tab-icons.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$8;
			document.head.appendChild(tag);
		}
		var tab_icons_module_css_default = {
			"browser": "SyUHSa_browser",
			"tasks": "SyUHSa_tasks",
			"changes": "SyUHSa_changes",
			"sidechat": "SyUHSa_sidechat",
			"terminal": "SyUHSa_terminal",
			"files": "SyUHSa_files"
		};
		//#endregion
		//#region node_modules/.pnpm/react-icons@5.7.0_react@18.2.0/node_modules/react-icons/lib/iconContext.mjs
		var DefaultContext = {
			color: void 0,
			size: void 0,
			className: void 0,
			style: void 0,
			attr: void 0
		};
		var IconContext = react.default.createContext && /*#__PURE__*/ react.default.createContext(DefaultContext);
		//#endregion
		//#region node_modules/.pnpm/react-icons@5.7.0_react@18.2.0/node_modules/react-icons/lib/iconBase.mjs
		var _excluded = [
			"attr",
			"size",
			"title"
		];
		function _objectWithoutProperties(e, t) {
			if (null == e) return {};
			var o, r, i = _objectWithoutPropertiesLoose(e, t);
			if (Object.getOwnPropertySymbols) {
				var n = Object.getOwnPropertySymbols(e);
				for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
			}
			return i;
		}
		function _objectWithoutPropertiesLoose(r, e) {
			if (null == r) return {};
			var t = {};
			for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
				if (-1 !== e.indexOf(n)) continue;
				t[n] = r[n];
			}
			return t;
		}
		function _extends() {
			return _extends = Object.assign ? Object.assign.bind() : function(n) {
				for (var e = 1; e < arguments.length; e++) {
					var t = arguments[e];
					for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
				}
				return n;
			}, _extends.apply(null, arguments);
		}
		function ownKeys(e, r) {
			var t = Object.keys(e);
			if (Object.getOwnPropertySymbols) {
				var o = Object.getOwnPropertySymbols(e);
				r && (o = o.filter(function(r) {
					return Object.getOwnPropertyDescriptor(e, r).enumerable;
				})), t.push.apply(t, o);
			}
			return t;
		}
		function _objectSpread(e) {
			for (var r = 1; r < arguments.length; r++) {
				var t = null != arguments[r] ? arguments[r] : {};
				r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
					_defineProperty(e, r, t[r]);
				}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
					Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
				});
			}
			return e;
		}
		function _defineProperty(e, r, t) {
			return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
				value: t,
				enumerable: !0,
				configurable: !0,
				writable: !0
			}) : e[r] = t, e;
		}
		function _toPropertyKey(t) {
			var i = _toPrimitive(t, "string");
			return "symbol" == typeof i ? i : i + "";
		}
		function _toPrimitive(t, r) {
			if ("object" != typeof t || !t) return t;
			var e = t[Symbol.toPrimitive];
			if (void 0 !== e) {
				var i = e.call(t, r || "default");
				if ("object" != typeof i) return i;
				throw new TypeError("@@toPrimitive must return a primitive value.");
			}
			return ("string" === r ? String : Number)(t);
		}
		function Tree2Element(tree) {
			return tree && tree.map((node, i) => {
				if (!node || typeof node.tag !== "string" || node.tag === "") return null;
				return /*#__PURE__*/ react.default.createElement(node.tag, _objectSpread({ key: i }, node.attr), Tree2Element(node.child));
			});
		}
		function GenIcon(data) {
			return (props) => /*#__PURE__*/ react.default.createElement(IconBase, _extends({ attr: _objectSpread({}, data.attr) }, props), Tree2Element(data.child));
		}
		function IconBase(props) {
			var elem = (conf) => {
				var attr = props.attr, size = props.size, title = props.title, svgProps = _objectWithoutProperties(props, _excluded);
				var computedSize = size || conf.size || "1em";
				var className;
				if (conf.className) className = conf.className;
				if (props.className) className = (className ? className + " " : "") + props.className;
				return /*#__PURE__*/ react.default.createElement("svg", _extends({
					stroke: "currentColor",
					fill: "currentColor",
					strokeWidth: "0"
				}, conf.attr, attr, svgProps, {
					className,
					style: _objectSpread(_objectSpread({ color: props.color || conf.color }, conf.style), props.style),
					height: computedSize,
					width: computedSize,
					xmlns: "http://www.w3.org/2000/svg"
				}), title && /*#__PURE__*/ react.default.createElement("title", null, title), props.children);
			};
			return IconContext !== void 0 ? /*#__PURE__*/ react.default.createElement(IconContext.Consumer, null, (conf) => elem(conf)) : elem(DefaultContext);
		}
		//#endregion
		//#region node_modules/.pnpm/react-icons@5.7.0_react@18.2.0/node_modules/react-icons/vsc/index.mjs
		function VscTerminal(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 24 24",
					"fill": "currentColor"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M18.75 1.5H5.25C3.1815 1.5 1.5 3.183 1.5 5.25V18.75C1.5 20.8185 3.1815 22.5 5.25 22.5H18.75C20.8185 22.5 22.5 20.8185 22.5 18.75V5.25C22.5 3.183 20.8185 1.5 18.75 1.5ZM21 18.75C21 19.9905 19.9905 21 18.75 21H5.25C4.0095 21 3 19.9905 3 18.75V5.25C3 4.0095 4.0095 3 5.25 3H18.75C19.9905 3 21 4.0095 21 5.25V18.75ZM10.281 13.281L5.781 17.781C5.634 17.928 5.442 18 5.25 18C5.058 18 4.866 17.9265 4.719 17.781C4.4265 17.4885 4.4265 17.013 4.719 16.7205L8.688 12.7515L4.719 8.7825C4.4265 8.49 4.4265 8.0145 4.719 7.722C5.0115 7.4295 5.487 7.4295 5.7795 7.722L10.2795 12.222C10.572 12.5145 10.572 12.99 10.2795 13.2825L10.281 13.281ZM19.5 17.25C19.5 17.664 19.164 18 18.75 18H11.25C10.836 18 10.5 17.664 10.5 17.25C10.5 16.836 10.836 16.5 11.25 16.5H18.75C19.164 16.5 19.5 16.836 19.5 17.25Z" },
					"child": []
				}]
			})(props);
		}
		function VscPinned(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 16 16",
					"fill": "currentColor"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M10.0589 2.44511C9.34701 1.73063 8.14697 1.90829 7.67261 2.79839L5.6526 6.58878L2.8419 7.52568C2.6775 7.58048 2.5532 7.71649 2.51339 7.88514C2.47357 8.0538 2.52392 8.23104 2.64646 8.35357L4.79291 10.5L2.14645 13.1465L2 14L2.85356 13.8536L5.50002 11.2071L7.64646 13.3536C7.76899 13.4761 7.94623 13.5265 8.11489 13.4866C8.28354 13.4468 8.41955 13.3225 8.47435 13.1581L9.41143 10.3469L13.1897 8.32423C14.0759 7.84982 14.2538 6.6551 13.5443 5.94305L10.0589 2.44511ZM8.55511 3.2687C8.71323 2.972 9.11324 2.91278 9.35055 3.15094L12.836 6.64889C13.0725 6.88624 13.0131 7.28448 12.7178 7.44262L8.76403 9.55921C8.65137 9.61952 8.56608 9.72068 8.52567 9.84191L7.7815 12.0744L3.92562 8.21853L6.15812 7.47436C6.27966 7.43385 6.38101 7.34823 6.44126 7.23518L8.55511 3.2687Z" },
					"child": []
				}]
			})(props);
		}
		function VscPin(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 16 16",
					"fill": "currentColor"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M13.5 3C13.303 3 13.109 3.038 12.923 3.114L8.481 4.967L5.659 4.026C5.505 3.976 5.339 4.001 5.209 4.095C5.078 4.189 5.001 4.339 5.001 4.5V7H1.257L0.5 7.5L1.257 8H5V10.5C5 10.661 5.077 10.812 5.208 10.905C5.338 11 5.504 11.023 5.658 10.974L8.48 10.033L12.925 11.887C13.109 11.962 13.302 12 13.499 12C14.326 12 14.999 11.327 14.999 10.5V4.5C14.999 3.673 14.326 3 13.499 3H13.5ZM14 10.5C14 10.843 13.615 11.09 13.308 10.962L8.693 9.038C8.631 9.013 8.566 9 8.501 9C8.447 9 8.395 9.009 8.343 9.025L6.001 9.806V5.193L8.343 5.974C8.457 6.011 8.581 6.007 8.694 5.961L13.306 4.038C13.629 3.902 14.001 4.156 14.001 4.499V10.499L14 10.5Z" },
					"child": []
				}]
			})(props);
		}
		function VscLinkExternal(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 16 16",
					"fill": "currentColor"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M15 9.5V12.5C15 13.879 13.879 15 12.5 15H3.5C2.121 15 1 13.879 1 12.5V3.5C1 2.121 2.121 1 3.5 1H6.5C6.776 1 7 1.224 7 1.5C7 1.776 6.776 2 6.5 2H3.5C2.673 2 2 2.673 2 3.5V12.5C2 13.327 2.673 14 3.5 14H12.5C13.327 14 14 13.327 14 12.5V9.5C14 9.224 14.224 9 14.5 9C14.776 9 15 9.224 15 9.5ZM14.5 1H9.5C9.224 1 9 1.224 9 1.5C9 1.776 9.224 2 9.5 2H13.293L9.147 6.146C8.952 6.341 8.952 6.658 9.147 6.853C9.245 6.951 9.373 6.999 9.501 6.999C9.629 6.999 9.757 6.95 9.855 6.853L14.001 2.707V6.5C14.001 6.776 14.225 7 14.501 7C14.777 7 15.001 6.776 15.001 6.5V1.5C15.001 1.224 14.777 1 14.501 1H14.5Z" },
					"child": []
				}]
			})(props);
		}
		function VscLayers(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 16 16",
					"fill": "currentColor"
				},
				"child": [
					{
						"tag": "path",
						"attr": { "d": "M8 8.99993C7.819 8.99993 7.643 8.95093 7.486 8.85793L2.486 5.85693C2.186 5.67793 2 5.34893 2 4.99993C2 4.65093 2.187 4.32093 2.486 4.14193L7.486 1.14293C7.789 0.95693 8.207 0.95493 8.517 1.14493L13.513 4.14293C13.813 4.32293 13.999 4.65093 13.999 4.99993C13.999 5.34893 13.812 5.67893 13.513 5.85793L8.513 8.85693C8.357 8.95093 8.181 8.99993 8 8.99993ZM8 1.99993L3 4.99993L8 7.99993L13 4.99993L8 1.99993Z" },
						"child": []
					},
					{
						"tag": "path",
						"attr": { "d": "M2.146 6.9873L8 10.5003L13.854 6.9873C13.946 7.1413 14 7.3173 14 7.5003C14 7.8493 13.814 8.1783 13.514 8.3583L8.514 11.3573C8.357 11.4513 8.181 11.5003 8 11.5003C7.819 11.5003 7.642 11.4513 7.486 11.3583L2.486 8.35731C2.187 8.17931 2 7.8503 2 7.5003C2 7.3163 2.054 7.1403 2.146 6.9873Z" },
						"child": []
					},
					{
						"tag": "path",
						"attr": { "d": "M2.146 9.4873L8 13.0003L13.854 9.4873C13.946 9.6413 14 9.8173 14 10.0003C14 10.3493 13.814 10.6783 13.514 10.8583L8.514 13.8573C8.357 13.9513 8.181 14.0003 8 14.0003C7.819 14.0003 7.642 13.9513 7.486 13.8583L2.486 10.8573C2.187 10.6793 2 10.3503 2 10.0003C2 9.8163 2.054 9.6403 2.146 9.4873Z" },
						"child": []
					}
				]
			})(props);
		}
		function VscGlobe(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 16 16",
					"fill": "currentColor"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M8 1C4.141 1 1 4.141 1 8C1 11.859 4.141 15 8 15C11.859 15 15 11.859 15 8C15 4.141 11.859 1 8 1ZM8 14C7.422 14 6.686 12.906 6.288 11H9.713C9.315 12.906 8.579 14 8.001 14H8ZM6.121 10C6.044 9.392 6 8.723 6 8C6 7.277 6.044 6.608 6.121 6H9.878C9.955 6.608 9.999 7.277 9.999 8C9.999 8.723 9.955 9.392 9.878 10H6.121ZM2 8C2 7.299 2.121 6.626 2.343 6H5.121C5.041 6.656 5 7.332 5 8C5 8.668 5.041 9.344 5.121 10H2.343C2.121 9.374 2 8.701 2 8ZM8 2C8.578 2 9.314 3.094 9.712 5H6.287C6.685 3.094 7.422 2 8 2ZM10.879 6H13.657C13.879 6.626 14 7.299 14 8C14 8.701 13.879 9.374 13.657 10H10.879C10.959 9.344 11 8.668 11 8C11 7.332 10.959 6.656 10.879 6ZM13.195 5H10.722C10.516 3.938 10.199 2.98 9.775 2.268C11.228 2.719 12.446 3.707 13.195 5ZM6.226 2.268C5.802 2.98 5.484 3.938 5.279 5H2.806C3.556 3.707 4.774 2.718 6.226 2.268ZM2.805 11H5.278C5.484 12.062 5.801 13.02 6.225 13.732C4.772 13.281 3.554 12.293 2.805 11ZM9.774 13.732C10.198 13.02 10.516 12.062 10.721 11H13.194C12.444 12.293 11.226 13.282 9.774 13.732Z" },
					"child": []
				}]
			})(props);
		}
		function VscGitCommit(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 16 16",
					"fill": "currentColor"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M11.5 8C11.5 6.24 10.194 4.779 8.5 4.536V1.5C8.5 1.224 8.276 1 8 1C7.724 1 7.5 1.224 7.5 1.5V4.536C5.806 4.779 4.5 6.24 4.5 8C4.5 9.76 5.806 11.221 7.5 11.464V14.5C7.5 14.776 7.724 15 8 15C8.276 15 8.5 14.776 8.5 14.5V11.464C10.194 11.221 11.5 9.76 11.5 8ZM8 10.5C6.621 10.5 5.5 9.378 5.5 8C5.5 6.622 6.621 5.5 8 5.5C9.379 5.5 10.5 6.622 10.5 8C10.5 9.378 9.379 10.5 8 10.5Z" },
					"child": []
				}]
			})(props);
		}
		function VscFolderOpened(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 16 16",
					"fill": "currentColor"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M2 4.5V9.10022L2.92389 7.5C3.45979 6.5718 4.45017 6 5.52196 6L11.9146 6C11.7087 5.4174 11.1531 5 10.5 5H7C6.86739 5 6.74021 4.94732 6.64645 4.85355L4.93934 3.14645C4.84557 3.05268 4.71839 3 4.58579 3H3.5C2.67157 3 2 3.67157 2 4.5ZM7.06895 13.9953C7.04641 13.9984 7.02339 14 7 14H3.5C2.11929 14 1 12.8807 1 11.5V4.5C1 3.11929 2.11929 2 3.5 2H4.58579C4.98361 2 5.36514 2.15804 5.64645 2.43934L7.20711 4H10.5C11.724 4 12.7426 4.87965 12.958 6.04127C14.605 6.34148 15.5443 8.22106 14.6616 9.75L13.0766 12.4953C12.5407 13.4235 11.5503 13.9953 10.4785 13.9953H7.06895ZM5.52196 7C4.80743 7 4.14718 7.3812 3.78991 8L2.20492 10.7453C1.62757 11.7453 2.34926 12.9953 3.50396 12.9953L10.4785 12.9953C11.193 12.9953 11.8533 12.6141 12.2105 11.9953L13.7955 9.25C14.3729 8.25 13.6512 7 12.4965 7L5.52196 7Z" },
					"child": []
				}]
			})(props);
		}
		function VscCommentDiscussion(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"viewBox": "0 0 16 16",
					"fill": "currentColor"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M14.56 7.44049C14.28 7.16049 13.9 7.00049 13.5 7.00049H13V4.00049C13 2.90049 12.1 2.00049 11 2.00049H3C1.9 2.00049 1 2.90049 1 4.00049V9.00049C1 10.1005 1.9 11.0005 3 11.0005V12.0005C3 12.8205 3.93 13.2905 4.59 12.8105L7 11.0505V11.5005C7 11.9005 7.16 12.2805 7.44 12.5605C7.72 12.8405 8.1 13.0005 8.5 13.0005H10.29L12.15 14.8505C12.19 14.9005 12.25 14.9405 12.31 14.9605C12.37 14.9905 12.43 15.0005 12.5 15.0005C12.57 15.0005 12.63 14.9905 12.69 14.9605C12.78 14.9205 12.86 14.8605 12.92 14.7805C12.97 14.7005 13 14.6005 13 14.5005V13.0005H13.5C13.9 13.0005 14.28 12.8405 14.56 12.5605C14.84 12.2805 15 11.9005 15 11.5005V8.50049C15 8.10049 14.84 7.72049 14.56 7.44049ZM6.75 10.0005L4 12.0005V10.0005H3C2.45 10.0005 2 9.55049 2 9.00049V4.00049C2 3.45049 2.45 3.00049 3 3.00049H11C11.55 3.00049 12 3.45049 12 4.00049V7.00049H8.5C8.1 7.00049 7.72 7.16049 7.44 7.44049C7.16 7.72049 7 8.10049 7 8.50049V10.0005H6.75ZM14 11.5005C14 11.6305 13.95 11.7605 13.85 11.8505C13.76 11.9505 13.63 12.0005 13.5 12.0005H12.5C12.37 12.0005 12.24 12.0505 12.15 12.1505C12.05 12.2405 12 12.3705 12 12.5005V13.2905L10.85 12.1505C10.81 12.1005 10.75 12.0605 10.69 12.0405C10.63 12.0105 10.57 12.0005 10.5 12.0005H8.5C8.37 12.0005 8.24 11.9505 8.15 11.8505C8.05 11.7605 8 11.6305 8 11.5005V8.50049C8 8.37049 8.05 8.24049 8.15 8.15049C8.24 8.05049 8.37 8.00049 8.5 8.00049H13.5C13.63 8.00049 13.76 8.05049 13.85 8.15049C13.95 8.24049 14 8.37049 14 8.50049V11.5005Z" },
					"child": []
				}]
			})(props);
		}
		//#endregion
		//#region src/client/builtins/tab-icons.tsx
		/** The styled wrapper classes; typed so a renamed rule fails the build. */
		const css$7 = tab_icons_module_css_default;
		/** Surround a glyph with the class that hands it its token-driven color. */
		function themed(className, glyph) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className,
				children: glyph
			});
		}
		/** The Files tab: the host's folder artwork, like the rows it opens. */
		const filesTabIcon = (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: css$7.files,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
				kind: "folder",
				size
			})
		});
		/** Changes / diff: the commit glyph, green like the diff affordances. */
		const changesTabIcon = (size) => themed(css$7.changes, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscGitCommit, { size }));
		/**
		* Tasks (subagents and background jobs) — the live-activity amber. The glyph
		* is layered sheets, not a checklist: this page lists RUNNING work (subagent
		* sessions plus the host's background jobs), not a to-do list.
		*/
		const tasksTabIcon = (size) => themed(css$7.tasks, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscLayers, { size }));
		/** Side chat — the conversational/secondary accent. */
		const sidechatTabIcon = (size) => themed(css$7.sidechat, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscCommentDiscussion, { size }));
		/**
		* Terminal — primary ink, the shell is text. Rendered one step down from the
		* strip's 14px: the VSCodicon terminal is a wide filled rectangle and read
		* heavier than its neighbours at full size.
		*/
		const terminalTabIcon = (size) => themed(css$7.terminal, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscTerminal, { size: Math.max(10, Math.round(size * .85)) }));
		/** Browser — the same secondary accent as the side chat's sibling surfaces. */
		const browserTabIcon = (size) => themed(css$7.browser, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscGlobe, { size }));
		//#endregion
		//#region src/client/locales.ts
		/**
		* Minimal zh/en/ja copy for the sidebar. The copy follows the DSH i18n system:
		* the client apply attaches the locale service (`ctx.locale`, provided by
		* `@deepseek-ai/dsh-client-locale`) through {@link attachLocale}, and
		* `t()`/`isZh()` resolve the active locale from it — the Host-backed
		* `locale.preference` wins over the raw browser language and switches live.
		* Without an attached service (standalone/test compositions) the browser
		* language is used, matching the previous behavior. The dictionaries are
		* also registered into the DSH locale registry under {@link LOCALE_NS}.
		*
		* ja (Japanese) is opt-in through `@huanlin/dsh-plugin-better-locale`: when
		* that plugin is installed, the client apply also calls
		* {@link attachBetterLocale} with the override store. `t()` then consults
		* the store's active override id first; if it is `'ja'` (or any id whose
		* dict has the requested key) the ja text wins, otherwise the existing
		* zh/en chain runs unchanged. better-locale itself patches
		* `LocaleRuntime.prototype.lookup` so DSH's own translate chain also
		* returns ja where the `betterSidebar` namespace has a ja entry — that
		* path covers external callers of `ctx.locale.bind('betterSidebar')`,
		* while the override-aware `t()` here covers better-sidebar's own
		* components (which bypass `ctx.locale` and call `t()` directly).
		*/
		/** The zh dictionary (also registered into the DSH locale registry under {@link LOCALE_NS}). */
		const zh = {
			files: "文件",
			guideDescFiles: "浏览工作区文件树，点开即预览或编辑",
			guideDescGit: "Git 变更与本轮文件改动，双视角合一",
			guideDescSubagent: "子代理拓扑与后台任务，实时状态",
			guideDescSidechat: "继承当前会话上下文的独立追问线程",
			guideDescTerminal: "真实 shell 终端（xterm + pty），断线重连",
			guideDescBrowser: "内嵌网页浏览器，可接管聊天里的外链",
			changesSessionEmpty: "本会话还没有文件操作",
			changesRead: "读取",
			changesMdReading: "阅读",
			changesMdRaw: "原文",
			changesHtmlRender: "渲染",
			changesHtmlRaw: "原文",
			changesPdfRender: "渲染",
			changesPdfRaw: "原文",
			changesWrite: "写入",
			changesEdit: "编辑",
			changesRunning: "执行中",
			changesError: "出错",
			changesRedactOn: "已开启脱敏：敏感内容以 [REDACTED] 显示；点击关闭（自担风险）",
			changesRedactOff: "脱敏已关闭：将原样显示文件内容；点击开启",
			changesRedactOnLabel: "脱敏中",
			changesRedactOffLabel: "脱敏关",
			changesRedactBanner: "已脱敏",
			changesFold: "{count} 行…点击展开",
			changesFoldLoading: "展开中…",
			changesFoldUnavailable: "上下文未加载",
			changesContext: "上下文",
			changesPriorUnknown: "变更前的内容不在窗口内，显示为全新增",
			explorer: "资源管理器",
			terminal: "终端",
			editor: "编辑器",
			editorExplorer: "文件打开方式",
			editorExplorerDesc: "控制文件打开方式",
			editorExplorerMerged: "合并",
			editorExplorerMergedDesc: "文件在同一窗口内原地切换；新窗口默认展开文件树",
			editorExplorerSplit: "独立",
			editorExplorerSplitDesc: "无路径窗口即资源管理器（仅文件树）；文件各自新开窗口（带文件树，默认收起）",
			editorTreeToggle: "文件树面板",
			editorPathPlaceholder: "输入文件路径（相对会话目录或绝对路径），Enter 打开",
			editorSearchPlaceholder: "按文件名搜索…",
			editorSearchNoResults: "无匹配文件",
			editorSearchTruncated: "结果过多，仅显示部分匹配",
			editorEmptyHint: "从右侧文件树或上方路径输入框选择文件开始预览",
			openFileNewTab: "在新 Tab 中打开",
			openFileSide: "在侧边打开",
			openWithMenu: "在应用中打开",
			openWithSshSuffix: " (SSH)",
			pinOpenWith: "固定到菜单",
			unpinOpenWith: "取消固定",
			openWithExplorer: "资源管理器",
			openWithVscode: "VS Code",
			openWithCursor: "Cursor",
			openWithZed: "Zed",
			openWithSettingsSshTitle: "SSH 远端主机",
			openWithSettingsSshDesc: "留空为本地工作区；填入 user@host 或 SSH 别名后，VSCode 系打开方式将改用 vscode-remote/ssh-remote 协议，资源管理器 / Zed / 非 VSCode 系自定义编辑器将从菜单隐藏",
			openWithSettingsSshPlaceholder: "user@host 或 SSH 别名",
			openWithSettingsCustomTitle: "自定义编辑器",
			openWithSettingsCustomDesc: "名称 + URL 模板（{path} 占位符）+ 是否 VSCode 系；SSH 模式下仅 VSCode 系可打开远端",
			openWithSettingsAdd: "添加",
			openWithSettingsName: "名称",
			openWithSettingsTemplate: "如 cursor://file/{path}",
			openWithSettingsFamily: "VSCode 系",
			openWithSettingsFamilyDesc: "该编辑器使用 VSCode 的 URL 协议（支持 SSH 远端打开）",
			openWithSettingsRemove: "删除",
			openWithSettingsInvalidHint: "名称或模板（需含 {path} 且以 scheme:// 开头）未填写的编辑器不会出现在菜单中",
			newTab: "新建标签页",
			openExplorer: "资源管理器",
			brokenSymlink: "失效的软链接",
			openGit: "Git 面板",
			newTerminal: "新终端",
			terminalLimit: "终端数量已达上限 (3)",
			close: "关闭",
			closeOtherTabs: "关闭其他页签",
			closeLeftTabs: "关闭左侧页签",
			closeRightTabs: "关闭右侧页签",
			floatDropHint: "松开以在自由窗口中打开",
			dockToSidebar: "回到侧边栏",
			pinTerminal: "固定终端",
			pinAgentTerminal: "固定 Agent 终端",
			pinToWorkspace: "固定到工作区",
			pinToGlobal: "固定到全局",
			unpinTerminal: "取消固定",
			pinnedTerminalTooltip: "{kind} · {scope} · {cwd}",
			pinnedTerminalKindUi: "UI 终端",
			pinnedTerminalKindAgent: "Agent 终端",
			pinnedTerminalScopeWorkspace: "固定到工作区",
			pinnedTerminalScopeGlobal: "固定到全局",
			pinnedRailLabel: "固定终端",
			closePinnedTerminal: "关闭终端",
			collapseBottomPanel: "折叠底部面板",
			expandBottomPanel: "展开底部面板",
			terminalError: "终端连接失败",
			terminalConnectFailed: "终端多次连接失败",
			terminalRetry: "重试",
			terminalWaitBanner: "Agent 正在等待 {needle}",
			terminalSkipWait: "跳过等待",
			terminalDepsFailed: "终端依赖 node-pty 加载失败",
			terminalDepsHint: "在 DSH 所在环境的终端或 cmd 中执行以下命令修复，然后点重试（node-pty 与 DSH 核心保持同一版本）：",
			terminalDepsProfile: "（检测到 profile：{profile}）",
			terminalShellNotFound: "未找到配置的 Shell：{name}，请到 设置 → 侧边卡片 → 终端 检查 Shell 路径",
			preview: "预览",
			toc: "目录",
			edit: "编辑",
			mermaidError: "Mermaid 渲染失败",
			mermaidZoomIn: "放大",
			mermaidZoomOut: "缩小",
			mermaidZoomReset: "重置",
			mermaidZoomHint: "滚轮缩放 · 拖拽平移 · Esc 关闭",
			refresh: "刷新",
			refreshUnsavedConfirm: "文件已在磁盘更新，刷新将丢弃未保存编辑。继续吗？",
			save: "保存",
			saved: "已保存",
			unsaved: "未保存",
			saveFailed: "保存失败",
			truncation: "文件过大，仅显示前 512KB",
			binary: "二进制文件，无法预览",
			loading: "加载中…",
			error: "加载失败",
			retry: "重试",
			splitLeft: "向左分栏",
			splitRight: "向右分栏",
			splitUp: "向上分栏",
			splitDown: "向下分栏",
			notRepo: "当前目录不是 git 仓库",
			noChanges: "没有变更",
			statusTruncated: "变更过多，仅显示前 2000 条",
			stage: "暂存",
			unstage: "取消暂存",
			stageAll: "全部暂存",
			unstageAll: "全部取消暂存",
			commitPlaceholder: "提交信息 (Ctrl+Enter)",
			commit: "提交",
			commitError: "提交失败",
			branch: "分支",
			worktree: "工作树",
			checkoutError: "切换分支失败",
			history: "历史",
			changes: "文件变动",
			changesGitLens: "Git",
			changesSessionLens: "本轮文件",
			changesFilterAll: "全部",
			changesFilterEmpty: "没有此类操作",
			changesOpenDiffTab: "在独立页签中打开",
			changesClosePreview: "关闭预览",
			changesResizePreview: "调整预览高度",
			changesLoadError: "会话文件记录暂不可用",
			staged: "已暂存",
			unstaged: "未暂存",
			cancel: "取消",
			diffEmpty: "没有文本差异",
			diffLoadError: "加载差异失败",
			diffBinary: "二进制",
			diffAdded: "新增",
			diffDeleted: "删除",
			diffRenamed: "重命名",
			diffExpand: "展开其余 {count} 行",
			diffCollapse: "收起",
			discard: "放弃更改",
			discardTitle: "放弃更改",
			discardDesc: "将丢弃「{path}」的工作区修改（不可恢复）。",
			viewCommitDiff: "查看提交差异",
			copyShortHash: "复制短哈希",
			copyFullHash: "复制完整哈希",
			copySubject: "复制提交信息",
			revertCommit: "还原此提交",
			revertTitle: "还原此提交",
			revertDesc: "将在当前分支创建一个反转「{subject}」的新提交。",
			cherryPickCommit: "捡取此提交",
			cherryPickTitle: "捡取此提交",
			cherryPickDesc: "将「{subject}」的更改应用到当前分支。",
			timeJustNow: "刚刚",
			timeMinutesAgo: "{n} 分钟前",
			timeHoursAgo: "{n} 小时前",
			timeYesterday: "昨天",
			loadMore: "加载更多",
			historyLoadError: "加载更多历史失败",
			produced: "本次产出",
			producedOpen: "在侧边栏中打开",
			showInFolder: "在文件夹中显示",
			disconnected: "终端连接断开，重连中…",
			exited: "终端进程已退出",
			noSession: "选择一个会话以使用侧边栏",
			pluginNotLoaded: "插件未加载，标签页暂不可用：",
			hiddenFiles: "隐藏文件",
			parent: "上级目录",
			copied: "已复制",
			copy: "复制",
			newFile: "新文件",
			openEditor: "打开编辑器",
			gitDetail: "查看变更详情",
			referenceFile: "@文件",
			addToConversation: "添加到对话",
			copyRelative: "复制相对地址",
			copyAbsolute: "复制绝对地址",
			rename: "重命名",
			renameInvalid: "名称不能为空，且不能包含路径分隔符。",
			delete: "删除",
			deleteTitle: "删除「{name}」？",
			deleteDescFile: "将永久删除该文件，此操作不可撤销。",
			deleteDescDir: "将永久删除该目录及其全部内容，此操作不可撤销。",
			dismiss: "关闭",
			download: "下载",
			uploadFiles: "上传文件",
			uploadFolder: "上传文件夹",
			uploadHere: "上传到此处",
			uploadDropHint: "拖拽文件/文件夹到此处上传",
			uploadDropChat: "拖放到聊天区：添加图片到对话",
			uploadTo: "上传到 {dir}",
			uploadingTo: "正在上传到 {dir}…",
			uploadProgress: "正在上传 {done}/{total}: {name}",
			uploadDone: "已上传 {count} 个文件",
			uploadFailed: "上传失败：{error}",
			uploadFailedUnknown: "未知错误",
			uploadTooLarge: "文件过大，超出上传上限",
			uploadCancelled: "上传已取消",
			settingsNav: "侧边卡片",
			settingsIntro: "管理侧边卡片的显示内容与默认行为",
			settingsPopupDesc: "为「{feature}」配置相关选项",
			settingsDone: "完成",
			settingsOpenToolsTitle: "为模型注入侧边栏打开工具",
			settingsOpenToolsDesc: "开启后，模型可通过 sidebar_open 工具在侧边栏主动打开文件、文件夹和 HTTP(S) 网页（默认关闭）",
			settingsTitleBarTitle: "位置兼容模式",
			settingsTitleBarDesc: "选择顶栏兼容方案：自动检测（默认，保守）/ DSH官方Web / 已知桌面壳 / 自定义方案（下移距离 + 自定义 CSS）",
			settingsTitleBarStripTitle: "下移距离",
			settingsTitleBarStripDesc: "标题栏条带高度：侧边栏按钮与内容下移的像素数（0–120，默认 40；自定义方案下生效）",
			settingsSchemeAutoTitle: "自动检测",
			settingsSchemeAutoDesc: "保守方案：仅在 Window Controls Overlay 标准 API 可用时按真实标题栏高度让位；网页环境下不做任何修改",
			settingsSchemeWebTitle: "DSH官方Web",
			settingsSchemeWebDesc: "显式声明运行在官方网页版：不做任何适配（连标准 WCO 几何也不适用）",
			settingsSchemeCustomTitle: "自定义方案",
			settingsSchemeCustomDesc: "完全由你控制：注入自定义 CSS（可覆盖内置样式），并指定标题栏下移距离",
			settingsSchemeDetectedSuffix: "已检测",
			settingsCustomCssTitle: "自定义 CSS",
			settingsCustomCssDesc: "追加到页面末尾的样式（同优先级下后写胜出；覆盖 JS 内联变量需用 !important）",
			settingsCustomCssPlaceholder: "/* 例：为自绘标题栏的壳预留 36px */\nhtml[data-dsh-title-bar-height=\"36\"] {\n  --dsh-title-bar-strip: 36px !important;\n}",
			settingsSaveFailed: "保存失败",
			settingsConflict: "设置已被其他窗口修改，请重试",
			binaryNoPreview: "此文件类型不支持预览",
			downloadToView: "下载查看",
			settingsSubagentTitle: "检测到子代理时自动激活任务管理页",
			settingsSubagentDesc: "当前会话产生新的子代理时，自动激活任务管理页；宽屏同时展开侧边栏，窄屏不强制展开全屏抽屉；关闭后需手动打开",
			settingsJobsTitle: "有新后台任务时自动激活任务管理页",
			settingsJobsDesc: "当前会话出现新的后台任务时，自动激活任务管理页（每个新任务都会触发）；宽屏同时展开侧边栏，窄屏不强制展开全屏抽屉；关闭后需手动打开",
			settingsToolsTitle: "为模型注入终端工具",
			settingsToolsDesc: "开启后，模型可通过 terminal_create 等 8 个工具创建并操作侧边栏终端（默认关闭）",
			settingsFenceTitle: "工作区路径检测",
			settingsFenceDesc: "开启后，侧栏的文件功能仅能访问会话工作区内的路径（默认）；关闭后可访问主机上任意文件——关闭期间页面内脚本也将获得同等访问能力",
			fenceErrorReason: "此路径在会话工作区之外，已被工作区检测拦截",
			fenceDisableAction: "关闭工作区检测",
			settingsBottomTerminalTitle: "底部面板首次展开自动开终端",
			settingsBottomTerminalDesc: "每次会话中第一次展开底部面板时，尝试在底部面板自动打开一个新终端标签（终端数量上限仍会限制；默认开启）",
			settingsFontFamilyTitle: "终端字体",
			settingsFontFamilyDesc: "自定义终端字体族（CSS font-family，如 \"JetBrains Mono\", monospace；留空跟随主题等宽字体）",
			settingsFontFamilyPlaceholder: "\"JetBrains Mono\", monospace",
			settingsFontSizeTitle: "终端字号",
			settingsFontSizeDesc: "终端字号（9–32，默认 13）",
			settingsFontSizeSuffix: "px",
			settingsShellTitle: "Shell 路径",
			settingsShellDesc: "UI 与模型终端启动的 shell（绝对路径或可执行名）。留空按既有顺序解析：yaml 的 config.shell → $SHELL / 登录 shell / Windows 的 powershell.exe。对之后打开的终端生效",
			settingsShellPlaceholder: "如 /bin/zsh（留空自动解析）",
			settingsShellArgsTitle: "Shell 参数",
			settingsShellArgsDesc: "显式 shell 启动参数，空格分隔；非空时完全替换默认参数（与 yaml 的 shellArgs 契约一致）",
			settingsShellArgsPlaceholder: "如 -l（留空用默认参数）",
			settingsTabsTitle: "侧边栏内容",
			settingsViewersTitle: "文件预览",
			settingsGeneralTitle: "常规",
			settingsPopup: "功能设置",
			settingsViewerCatchAll: "兜底：任意文件",
			viewerImage: "图片",
			viewerPdf: "PDF",
			viewerMarkdown: "Markdown",
			viewerCode: "代码",
			viewerBinary: "二进制下载",
			viewerHtml: "HTML",
			browser: "浏览器",
			browserPlaceholder: "输入网址，例如 example.com",
			browserGo: "前往",
			browserBack: "后退",
			browserForward: "前进",
			browserStart: "输入网址开始浏览（沙箱模式）",
			browserBlockedScheme: "已阻止：仅支持 http/https 链接",
			browserBlockedLoopback: "已阻止：不允许在浏览器中访问本机或内部地址",
			browserInvalid: "无效的网址",
			browserNoSandboxWarning: "沙箱已关闭：当前页面与界面同源，拥有完整会话权限（可在设置中恢复）",
			htmlNoSandboxWarning: "沙箱已关闭：此 HTML 与界面同源，可读取会话文件与内部接口（可在设置中恢复）",
			sandboxStatusOn: "沙箱模式：已启用 · 页面无法访问界面数据与本地文件，登录态与第三方 Cookie 可能不可用",
			sandboxUnlock: "临时解锁（不安全）",
			sandboxRestore: "恢复沙箱",
			settingsHtmlDefaultUnsafeTitle: "HTML 预览默认以非沙箱模式打开（不安全）",
			settingsHtmlDefaultUnsafeDesc: "开启后，每次打开 HTML 文件时预览默认处于非沙箱状态（与界面同源，可读取会话文件与内部接口）；可在状态行临时恢复沙箱",
			settingsHtmlSandboxTitle: "关闭 HTML 预览沙箱（不安全）",
			settingsHtmlSandboxDesc: "关闭后，预览的 HTML 将与界面同源运行，可读取会话文件、本地存储并调用内部接口。仅对完全可信的文件开启",
			settingsBrowserSandboxTitle: "关闭浏览器沙箱（不安全）",
			settingsBrowserSandboxDesc: "关闭后，访问的任何网站都将与界面同源运行，可读取会话数据并冒充你的登录状态。仅对完全可信的站点开启",
			settingsBrowserLinksTitle: "聊天区外链在侧边栏打开",
			settingsBrowserLinksDesc: "开启后，点击聊天或界面中的外链时在侧边栏打开，不再弹出新窗口；HTTP 与 HTTPS 可分别通过下方开关控制；Ctrl/Cmd 点击可临时放行",
			settingsBrowserHttpTitle: "侧边打开HTTP网页",
			settingsBrowserHttpDesc: "开启后，点击聊天或界面中的 HTTP 外链时在侧边栏打开（声明了 urlTarget 的插件页面优先）；Ctrl/Cmd 点击可临时放行",
			settingsBrowserHttpsTitle: "侧边打开HTTPS网页",
			settingsBrowserHttpsDesc: "开启后，点击聊天或界面中的 HTTPS 外链时在侧边栏打开。默认关闭：多数 HTTPS 站点拒绝被嵌入，走系统浏览器更顺畅",
			settingsBrowserLoopbackTitle: "允许访问的本机地址",
			settingsBrowserLoopbackDesc: "逗号分隔的本地回环地址白名单（如 localhost:5174 或 127.0.0.1:8080），侧边栏浏览器可访问这些本地服务；默认留空则本机地址全部拦截。沙箱隔离仍然生效，页面无法读取界面数据",
			settingsBrowserLoopbackPlaceholder: "例如 localhost:5174, 127.0.0.1:8080",
			browserOpenExternal: "在浏览器中打开",
			browserEmbedBlocked: "{host} 拒绝了嵌入请求",
			browserEmbedBlockedDesc: "该站点通过 X-Frame-Options / frame-ancestors 禁止在其它页面中显示，无法在侧边栏内加载。可在浏览器中直接打开",
			browserEmbedAnyway: "仍然加载",
			subagent: "任务管理",
			openSubagent: "任务管理",
			subagentMainAgent: "主代理",
			subagentEmpty: "暂无子代理",
			subagentEmptyDesc: "当前主代理派生的子代理将显示在这里",
			subagentRunning: "运行中",
			subagentInactive: "空闲",
			subagentModeOneShot: "一次性",
			subagentModeContinuable: "可续接",
			subagentCount: "{count} 个子代理",
			subagentCountRunning: "{count} 个子代理 · {running} 运行中",
			subagentDiagCorrupt: "目录损坏",
			subagentDiagUnsupported: "不支持的条目",
			subagentDiagUnavailable: "不可用",
			subagentThinking: "思考中…",
			sideChat: "侧边对话(beta)",
			sideChatNew: "新建对话",
			sideChatUntitled: "新对话",
			sideChatEmpty: "暂无侧边对话",
			sideChatEmptyDesc: "每个侧边对话是标签栏里的独立 Tab，继承当前会话的上下文运行，不会进入主会话",
			sideChatCreating: "正在创建侧边对话…",
			sideChatRetry: "重试",
			sideChatThreads: "切换线程 / 新建",
			sideChatSave: "保存为新会话",
			sideChatSaveTitle: "把该线程提升为顶层会话，出现在主会话列表中",
			sideChatSaved: "已保存为新会话",
			sideChatNoTurn: "至少完成一轮对话后才能保存",
			sideChatPendingDrop: "最后一条未完成的追问不会包含在新会话中",
			sideChatFirstPlaceholder: "输入第一个问题，已继承当前会话上下文…",
			sideChatComposerPlaceholder: "追问…",
			sideChatThinking: "正在深入…",
			sideChatThink: "思考过程",
			sideChatInjection: "已注入上下文",
			sideChatSend: "发送",
			sideChatCancel: "停止",
			sideChatCancelTitle: "中止当前回合（保留队列）",
			sideChatClose: "关闭线程",
			sideChatCloseTitle: "释放线程的 agent（历史保留）",
			sideChatError: "侧边对话出错：{message}",
			sideChatTurnUsage: "输入 {input} tok · 输出 {output} tok",
			sideChatBlockCollapse: "收起",
			sideChatBlockCollapseAria: "收起",
			sideChatBlockExpand: "展开 {hidden} 行",
			sideChatBlockExpandAria: "展开其余 {hidden} 行",
			sideChatBlockSignal: "信号终止：{signal}",
			sideChatBlockExitCode: "退出码 {code}",
			sideChatBlockRunning: "运行中",
			sideChatBlockFailed: "失败",
			sideChatBlockDone: "完成",
			sideChatBlockNoOutput: "（无输出）",
			sideChatBlockFiles: "{count} 个文件",
			sideChatBlockWindow: "共 {total} 行 · 显示 {shown} 行",
			sideChatConnDisconnected: "连接已断开",
			sideChatConnReconnect: "重新连接",
			sideChatConnConnecting: "正在重连…",
			sideChatConnRecovered: "连接已恢复",
			sideChatConnReconnectAction: "立即重连",
			sideChatConnRestartAction: "重新发起连接",
			jobs: "后台任务",
			jobsCount: "{count} 个后台任务",
			jobsCountRunning: "{count} 个后台任务 · {running} 运行中",
			jobStatusRunning: "运行中",
			jobStatusStopping: "终止中",
			jobStatusCompleted: "已完成",
			jobStatusKilled: "已终止",
			jobStatusFailed: "失败",
			jobDurationSeconds: "{seconds} 秒",
			jobDurationMinutes: "{minutes} 分 {seconds} 秒",
			jobDurationHours: "{hours} 小时 {minutes} 分",
			jobViewOutput: "查看输出",
			jobHideOutput: "收起输出",
			jobNoOutput: "暂无输出",
			jobNotReadYet: "等待模型读取该任务的输出（模型执行 job_output 后，输出会显示在这里）",
			jobOutputTruncated: "输出过长，已截断显示",
			jobOutputError: "输出读取失败",
			jobKill: "终止",
			jobKillConfirm: "再次点击确认终止",
			jobKillError: "终止失败",
			addPluginsTabCard: "添加 Tab 插件",
			addPluginsTabCardDesc: "注册新的侧边栏页面",
			addPluginsViewerCard: "添加预览插件",
			addPluginsViewerCardDesc: "注册新的文件类型预览",
			addPluginsTabDesc: "侧边栏页面（Tab）可以由插件扩展。插件通过 ctx.betterSidebar 服务注册；点击「安装」复制安装命令，粘贴到 DSH 所在环境的终端执行。",
			addPluginsViewerDesc: "文件预览器可以由插件扩展。插件通过 ctx.betterSidebar 服务注册；点击「安装」复制安装命令，粘贴到 DSH 所在环境的终端执行。",
			addPluginsBrowseMore: "在 GitHub 上浏览更多插件（topic: dsh-better-sidebar）",
			addPluginsSearch: "搜索插件名称 / 描述…",
			addPluginsNoMatch: "没有匹配的插件",
			addPluginsRecommended: "推荐插件",
			addPluginsEmpty: "暂未收录插件，欢迎在 GitHub topic 下发布你的插件",
			openPlugin: "跳转",
			copyInstall: "复制安装命令",
			pluginMdExportDesc: "在 better-sidebar 的 Markdown 工具栏上新增「导出」按钮：一键把当前 .md 渲染为独立 HTML（表格/代码块/Mermaid 图表内联，布局跟随预览主题）直接保存到同目录，或通过打印对话框导出为 PDF",
			pluginOfficeDesc: "为 better-sidebar 编辑器提供 Office 三件套预览（.docx / .xlsx / .pptx），把重型 Office 渲染库拆出主包、按需安装",
			pluginFlowglassDesc: "实时会话流程图：三列泳道展示用户、助手与工具调用，支持并行分组、子代理支线、逐层钻取和实时状态；安装 better-sidebar 后注册原生「流镜」Tab，未安装时保留独立抽屉",
			pluginGitForgeDesc: "better-sidebar「Git 凭据」Tab：GitHub/Gitea 等 Forge 账号库 + 按项目授权 + push 策略硬拦；token 仅存本地 secrets，不进模型上下文；提供只读 GitForge 工具与 agent HTTPS credential helper",
			pluginGithubWorkbenchDesc: "better-sidebar「GitHub 工作台」Tab：远端仓库目录树 + Issues / Pull requests / Actions 页签，读之外支持新建 Issue/PR、评论、编辑、关闭重开、squash·merge·rebase 合并（强确认）与重跑/取消 CI；仓库弹层自动拉取有权限列表并支持公开仓搜索；未装 better-sidebar 时自动降级为独立右侧面板",
			pluginSuhuangScrollDesc: "把本地苏黄共阅 Runtime 接入 DSH 设置与 better-sidebar，支持模型配置、连接测试和连续阅卷控制；使用前需安装 Suhuang Scroll Runtime 与 dsh-better-sidebar",
			pluginBetterOverleafDesc: "better-sidebar 的 Overleaf 标签页：直连 CDP 浏览器登录（支持第三方 Chromium），项目列表/切换，<workspace>/overleaf/ 本地 git 镜像，git 双向同步（API 只读兜底），文件预览走侧边栏工作台",
			pluginGitRemotesDesc: "better-sidebar Git 远程 Tab：看分支/上游/ahead-behind，fetch（可 prune）、ff-only pull、确认后才 push。不替换内置 Git 的暂存/提交，也不提供 force-push 或模型自动推送",
			pluginSentinelDesc: "条件驱动的 agent 唤醒系统：文件/进程/端口/HTTP/命令/webhook 传感器，条件达成自动唤醒休眠会话；注册「哨兵」Tab 展示服务器全局监控表",
			pluginServerDeckDesc: "服务器卡片仪表盘：每台服务器一张卡片，展示在线状态、OS、运行时长、CPU/内存/磁盘用量与延迟；点卡片进入 xterm.js 交互终端，支持 ~/.ssh/config 一键导入（自动跳过 Git 托管别名）；安装 better-sidebar 后注册原生「服务器」Tab，未安装时保留独立抽屉",
			pluginSidebarQaDesc: "基于 better-sidebar 的划选提问tab分页: 对话划选 → 右侧面板提问 → 同工作区独立追问会话（❓追问·主题）：快速无思考模型压缩主对话上下文后与引文一起注入，不打断主对话；追问可嵌套、可继续、可归档",
			pluginSidenoteDesc: "Codex 风格侧边聊天与划选注释：从当前会话 fork 出独立侧边会话（归档隐藏、多实例并存、/side 命令、刷新/重启后恢复、模型跟随主会话）；assistant 消息划选 → 编号角标 + 注解编辑器 →「N 条注释」chip 随消息发出，也可直接进入侧边聊天提问",
			pluginSshTunnelDesc: "better-sidebar「SSH 隧道」Tab：多机主机清单 + 按项目授权 + 密钥本地保管；模型工具 SSHManager（exec/SFTP/会话策略）；中央交互终端与双栏 SFTP",
			pluginTurnReviewDesc: "对「刚刚这一回合」的 diff 做 Approve / Request changes 的人闸门：只审上一回合，不 fork 会话；文件按主会话/子代理/未归因分组，按文件勾选打回 + 可选评语，点文件先看回合开始快照 vs 现在的 diff。不是 /rewind",
			pluginVideoPreviewDesc: "在 better-sidebar 编辑器内联预览视频文件（.mp4/.webm/.mov/.mkv/.avi 等），自带支持 HTTP Range（206）的 /video 宿主路由，可拖动进度条、不受 20MB mediaLimit 限制",
			pluginCodeNavDesc: "代码预览导航：按文件类型自动识别语言并高亮语法，符号大纲（类/方法/变量筛选 + 一键跳转），文件内查找（全部匹配高亮、上/下一处、区分大小写），接管 better-sidebar 的代码文件预览",
			pluginDocsPanelDesc: "DSH 侧边栏里的「全局文档」：全局 Markdown 笔记，任何工作区随时可读——列表点选阅读、悬浮大纲跳转、Chrome / VS Code 外部打开、代码复制，目录可配置（默认 ~/.dsh/docs）",
			pluginEgoBrowserDesc: "把 CitroLabs/ego-lite 接进 DeepSeek Harness 的 agent 浏览器：32 个 ego_* 工具驱动真实 Chromium，侧边栏原生「ego 浏览器」Tab 实时观察 agent 逛的每个页面，可直接点击/拖拽/输入接管；装 better-sidebar 时自动注册 Tab，没装则退回浮动浮窗",
			pluginBilingualReaderDesc: "在 DSH 侧边栏读论文 PDF：原生 PDF 显示，选中一段文字即用大模型划词翻译，结合上下文、完全隔离主对话，只作阅读辅助",
			pluginSentinelName: "dsh-sentinel 唤醒系统",
			pluginEgoBrowserName: "ego-browser Agent 浏览器",
			pluginBetterOverleafName: "dsh-better-overleaf Overleaf 标签页",
			pluginDocsPanelName: "dsh-docs-panel 全局文档",
			pluginFlowglassName: "dsh-flowglass 流镜",
			pluginGitForgeName: "dsh-git-forge Git 凭据",
			pluginGitRemotesName: "dsh-git-remotes Git 远程",
			pluginGithubWorkbenchName: "dsh-github-workbench GitHub 工作台",
			pluginSidebarQaName: "dsh-sidebar-qa 划选追问",
			pluginSidenoteName: "dsh-sidenote 侧边聊天",
			pluginServerDeckName: "dsh-server-deck 服务器甲板",
			pluginSuhuangScrollName: "dsh-suhuang-scroll 苏黄共阅",
			pluginSshTunnelName: "dsh-ssh-tunnel SSH 隧道",
			pluginTurnReviewName: "dsh-turn-review 本轮审查",
			pluginBilingualReaderName: "dsh-bilingual-reader 双语阅读",
			pluginOfficeName: "Office 预览插件",
			pluginMdExportName: "Markdown 导出插件",
			pluginCodeNavName: "代码预览导航",
			pluginVideoPreviewName: "视频预览插件",
			presetDshDesktopDesc: "Electron 高级模式（无边框）：macOS 顶栏 20px、Windows 无 WCO 时 32px 标题栏让位"
		};
		/** The en dictionary (key-set-equal to zh, enforced by the type annotation). */
		const en = {
			files: "Files",
			guideDescFiles: "Browse the workspace tree; click a file to preview or edit",
			guideDescGit: "Git changes and this session's file edits, in one tab",
			guideDescSubagent: "Subagent topology and background jobs, live",
			guideDescSidechat: "An independent follow-up thread inheriting this session's context",
			guideDescTerminal: "A real shell (xterm + pty) with reconnect",
			guideDescBrowser: "An embedded browser that can take over chat links",
			changesSessionEmpty: "No file operations in this session yet",
			changesRead: "Read",
			changesMdReading: "Reading",
			changesMdRaw: "Raw",
			changesHtmlRender: "Render",
			changesHtmlRaw: "Raw",
			changesPdfRender: "Render",
			changesPdfRaw: "Raw",
			changesWrite: "Write",
			changesEdit: "Edit",
			changesRunning: "running",
			changesError: "error",
			changesRedactOn: "Redaction on: secrets render as [REDACTED]; click to disable (at your own risk)",
			changesRedactOff: "Redaction off: file content renders verbatim; click to enable",
			changesRedactOnLabel: "Redacting",
			changesRedactOffLabel: "Redaction off",
			changesRedactBanner: "Redacted",
			changesFold: "{count} lines…click to expand",
			changesFoldLoading: "Expanding…",
			changesFoldUnavailable: "Context unavailable",
			changesContext: "context",
			changesPriorUnknown: "Prior content is outside the loaded window; shown as all-added",
			explorer: "Explorer",
			terminal: "Terminal",
			editor: "Editor",
			editorExplorer: "File open behavior",
			editorExplorerDesc: "Controls how files open",
			editorExplorerMerged: "Merged",
			editorExplorerMergedDesc: "Files switch in place in the same window; new windows start with the tree open",
			editorExplorerSplit: "Separate",
			editorExplorerSplitDesc: "Path-less windows are the standalone explorer (tree only); each file opens its own window (tree docked, closed by default)",
			editorTreeToggle: "File tree panel",
			editorPathPlaceholder: "File path (relative to the session directory or absolute), Enter to open",
			editorSearchPlaceholder: "Search files by name…",
			editorSearchNoResults: "No matching files",
			editorSearchTruncated: "Too many results — showing a partial list",
			editorEmptyHint: "Pick a file from the tree panel or the path input above to start previewing",
			openFileNewTab: "Open in New Tab",
			openFileSide: "Open to the Side",
			openWithMenu: "Open with",
			openWithSshSuffix: " (SSH)",
			pinOpenWith: "Pin to menu",
			unpinOpenWith: "Unpin",
			openWithExplorer: "File Manager",
			openWithVscode: "VS Code",
			openWithCursor: "Cursor",
			openWithZed: "Zed",
			openWithSettingsSshTitle: "SSH remote host",
			openWithSettingsSshDesc: "Empty = local workspace; with a user@host or SSH alias, VSCode-family openers switch to the vscode-remote/ssh-remote protocol and the File Manager / Zed / non-VSCode-family custom editors are hidden from the menu",
			openWithSettingsSshPlaceholder: "user@host or SSH alias",
			openWithSettingsCustomTitle: "Custom editors",
			openWithSettingsCustomDesc: "Name + URL template ({path} placeholder) + VSCode-family flag; in remote mode only VSCode-family editors can open a remote path",
			openWithSettingsAdd: "Add",
			openWithSettingsName: "Name",
			openWithSettingsTemplate: "e.g. cursor://file/{path}",
			openWithSettingsFamily: "VSCode-family",
			openWithSettingsFamilyDesc: "This editor speaks the VSCode URL dialect (supports SSH-remote opens)",
			openWithSettingsRemove: "Remove",
			openWithSettingsInvalidHint: "Editors with a missing name or a template without {path} / scheme:// are not shown in the menu",
			newTab: "New tab",
			openExplorer: "Explorer",
			brokenSymlink: "Broken symlink",
			openGit: "Git panel",
			newTerminal: "New terminal",
			terminalLimit: "Terminal limit reached (3)",
			close: "Close",
			closeOtherTabs: "Close Other Tabs",
			closeLeftTabs: "Close Tabs to the Left",
			closeRightTabs: "Close Tabs to the Right",
			floatDropHint: "Release to open in a free window",
			dockToSidebar: "Dock Back to Sidebar",
			pinTerminal: "Pin Terminal",
			pinAgentTerminal: "Pin Agent Terminal",
			pinToWorkspace: "Pin to Workspace",
			pinToGlobal: "Pin Globally",
			unpinTerminal: "Unpin",
			pinnedTerminalTooltip: "{kind} · {scope} · {cwd}",
			pinnedTerminalKindUi: "UI Terminal",
			pinnedTerminalKindAgent: "Agent Terminal",
			pinnedTerminalScopeWorkspace: "Pinned to workspace",
			pinnedTerminalScopeGlobal: "Pinned globally",
			pinnedRailLabel: "Pinned Terminals",
			closePinnedTerminal: "Close Terminal",
			collapseBottomPanel: "Collapse bottom panel",
			expandBottomPanel: "Expand bottom panel",
			terminalError: "Terminal connection failed",
			terminalConnectFailed: "Terminal failed to connect repeatedly",
			terminalRetry: "Retry",
			terminalWaitBanner: "Agent is waiting for {needle}",
			terminalSkipWait: "Skip wait",
			terminalDepsFailed: "Terminal dependency node-pty failed to load",
			terminalDepsHint: "Run the command below in a terminal or cmd on the DSH machine to repair it, then retry (node-pty stays in sync with the DSH core version):",
			terminalDepsProfile: " (detected profile: {profile})",
			terminalShellNotFound: "Configured shell not found: {name} — check the shell path under Settings → Side card → Terminal",
			preview: "Preview",
			toc: "Table of contents",
			edit: "Edit",
			mermaidError: "Mermaid render failed",
			mermaidZoomIn: "Zoom in",
			mermaidZoomOut: "Zoom out",
			mermaidZoomReset: "Reset",
			mermaidZoomHint: "Scroll to zoom · drag to pan · Esc to close",
			refresh: "Refresh",
			refreshUnsavedConfirm: "The file changed on disk. Refreshing will discard unsaved edits. Continue?",
			save: "Save",
			saved: "Saved",
			unsaved: "Unsaved",
			saveFailed: "Save failed",
			truncation: "File too large — showing the first 512KB",
			binary: "Binary file, preview unavailable",
			loading: "Loading…",
			error: "Failed to load",
			retry: "Retry",
			splitLeft: "Split left",
			splitRight: "Split right",
			splitUp: "Split up",
			splitDown: "Split down",
			notRepo: "This directory is not a git repository",
			noChanges: "No changes",
			statusTruncated: "Too many changes; showing the first 2,000 entries",
			stage: "Stage",
			unstage: "Unstage",
			stageAll: "Stage all",
			unstageAll: "Unstage all",
			commitPlaceholder: "Commit message (Ctrl+Enter)",
			commit: "Commit",
			commitError: "Commit failed",
			branch: "Branch",
			worktree: "Worktree",
			checkoutError: "Branch switch failed",
			history: "History",
			changes: "Changes",
			changesGitLens: "Git",
			changesSessionLens: "Session",
			changesFilterAll: "All",
			changesFilterEmpty: "No operations of this kind",
			changesOpenDiffTab: "Open in a diff tab",
			changesClosePreview: "Close preview",
			changesResizePreview: "Resize preview",
			changesLoadError: "Session file records are unavailable right now",
			staged: "Staged",
			unstaged: "Unstaged",
			cancel: "Cancel",
			diffEmpty: "No text changes",
			diffLoadError: "Failed to load diff",
			diffBinary: "Binary",
			diffAdded: "Added",
			diffDeleted: "Deleted",
			diffRenamed: "Renamed",
			diffExpand: "Expand {count} more rows",
			diffCollapse: "Collapse",
			discard: "Discard changes",
			discardTitle: "Discard changes",
			discardDesc: "This discards the worktree changes of \"{path}\" (not recoverable).",
			viewCommitDiff: "View commit diff",
			copyShortHash: "Copy short hash",
			copyFullHash: "Copy full hash",
			copySubject: "Copy subject",
			revertCommit: "Revert commit",
			revertTitle: "Revert commit",
			revertDesc: "Create a new commit on the current branch that reverts \"{subject}\".",
			cherryPickCommit: "Cherry-pick commit",
			cherryPickTitle: "Cherry-pick commit",
			cherryPickDesc: "Apply the changes of \"{subject}\" to the current branch.",
			timeJustNow: "just now",
			timeMinutesAgo: "{n} min ago",
			timeHoursAgo: "{n} h ago",
			timeYesterday: "yesterday",
			loadMore: "Load more",
			historyLoadError: "Failed to load more history",
			produced: "Produced",
			producedOpen: "Open in sidebar",
			showInFolder: "Show in folder",
			disconnected: "Terminal disconnected, reconnecting…",
			exited: "Terminal process exited",
			noSession: "Select a conversation to use the sidebar",
			pluginNotLoaded: "Plugin not loaded; tab unavailable:",
			hiddenFiles: "Hidden files",
			parent: "Parent directory",
			copied: "Copied",
			copy: "Copy",
			newFile: "New file",
			openEditor: "Open editor",
			gitDetail: "View change details",
			referenceFile: "@file",
			addToConversation: "Add to conversation",
			copyRelative: "Copy relative path",
			copyAbsolute: "Copy absolute path",
			rename: "Rename",
			renameInvalid: "The name cannot be empty or contain path separators.",
			delete: "Delete",
			deleteTitle: "Delete \"{name}\"?",
			deleteDescFile: "This permanently deletes the file. This cannot be undone.",
			deleteDescDir: "This permanently deletes the directory and everything inside it. This cannot be undone.",
			dismiss: "Dismiss",
			download: "Download",
			uploadFiles: "Upload files",
			uploadFolder: "Upload folder",
			uploadHere: "Upload here",
			uploadDropHint: "Drop files/folders here to upload",
			uploadDropChat: "Drop onto the chat to add images",
			uploadTo: "Upload into {dir}",
			uploadingTo: "Uploading into {dir}…",
			uploadProgress: "Uploading {done}/{total}: {name}",
			uploadDone: "Uploaded {count} file(s)",
			uploadFailed: "Upload failed: {error}",
			uploadFailedUnknown: "Unknown error",
			uploadTooLarge: "File too large (over the upload limit)",
			uploadCancelled: "Upload cancelled",
			settingsNav: "Side card",
			settingsIntro: "Manage what the side card shows and how it behaves",
			settingsPopupDesc: "Configure related options for {feature}",
			settingsDone: "Done",
			settingsOpenToolsTitle: "Inject the sidebar-open tool for the model",
			settingsOpenToolsDesc: "When enabled, the model can actively open files, folders, and HTTP(S) pages in the sidebar through the sidebar_open tool (off by default)",
			settingsTitleBarTitle: "Position compatibility mode",
			settingsTitleBarDesc: "Pick the title-bar compatibility scheme: auto-detect (default, conservative) / DSH official web / known desktop shells / custom (shift distance + custom CSS)",
			settingsTitleBarStripTitle: "Shift distance",
			settingsTitleBarStripDesc: "Title-bar strip height: how far the sidebar buttons and content move down in px (0–120, default 40; applies under the custom scheme)",
			settingsSchemeAutoTitle: "Auto-detect",
			settingsSchemeAutoDesc: "Conservative: only the standard Window Controls Overlay API contributes (real caption-overlay height); plain web environments get no modification",
			settingsSchemeWebTitle: "DSH official web",
			settingsSchemeWebDesc: "Explicitly declare the official web UI: no adaptation at all (not even standard WCO geometry)",
			settingsSchemeCustomTitle: "Custom",
			settingsSchemeCustomDesc: "Full control: inject custom CSS (can override built-in styles) and set the title-bar shift distance",
			settingsSchemeDetectedSuffix: "detected",
			settingsCustomCssTitle: "Custom CSS",
			settingsCustomCssDesc: "Styles appended at the end of the page (later in the cascade wins ties; use !important to override JS-written inline variables)",
			settingsCustomCssPlaceholder: "/* e.g. reserve 36px for a shell with a custom-drawn title bar */\nhtml[data-dsh-title-bar-height=\"36\"] {\n  --dsh-title-bar-strip: 36px !important;\n}",
			settingsSaveFailed: "Failed to save",
			settingsConflict: "The setting changed in another window — please retry",
			binaryNoPreview: "This file type cannot be previewed",
			downloadToView: "Download to view",
			settingsSubagentTitle: "Auto-activate the Tasks page when a subagent appears",
			settingsSubagentDesc: "Activate the Tasks page when the current conversation spawns a new subagent; wide viewports also expand the side card, while narrow full-screen drawers are not forced open; turn off to open it manually",
			settingsJobsTitle: "Auto-activate the Tasks page on a new background job",
			settingsJobsDesc: "Activate the Tasks page whenever a new background job appears for the current conversation (every new job triggers); wide viewports also expand the side card, while narrow full-screen drawers are not forced open; turn off to open it manually",
			settingsToolsTitle: "Inject terminal tools for the model",
			settingsToolsDesc: "When enabled, the model can create and drive sidebar terminals through the 8 terminal_* tools (off by default)",
			settingsFenceTitle: "Workspace path fence",
			settingsFenceDesc: "On, the sidebar's file features only reach paths inside the session workspace (default); off, any file on the host is reachable — page scripts gain the same reach while it is off",
			fenceErrorReason: "This path is outside the session workspace and was blocked by the workspace fence",
			fenceDisableAction: "Turn off the workspace fence",
			settingsBottomTerminalTitle: "Auto-open a terminal on the bottom panel's first expansion",
			settingsBottomTerminalDesc: "When the bottom panel is expanded for the first time in a session, try to open a fresh terminal tab there (the terminal quota still applies; on by default)",
			settingsFontFamilyTitle: "Terminal font family",
			settingsFontFamilyDesc: "Custom terminal font family (a CSS font-family stack like \"JetBrains Mono\", monospace; leave empty to follow the theme's monospace font)",
			settingsFontFamilyPlaceholder: "\"JetBrains Mono\", monospace",
			settingsFontSizeTitle: "Terminal font size",
			settingsShellTitle: "Shell path",
			settingsShellDesc: "Shell spawned for UI and model terminals (absolute path or bare executable). Empty keeps the legacy order: yaml config.shell → $SHELL / login shell / Windows powershell.exe. Applies to terminals opened afterwards",
			settingsShellPlaceholder: "e.g. /bin/zsh (empty = auto)",
			settingsShellArgsTitle: "Shell arguments",
			settingsShellArgsDesc: "Explicit shell arguments, space-separated; when non-empty they fully replace the defaults (same contract as the yaml shellArgs)",
			settingsShellArgsPlaceholder: "e.g. -l (empty = defaults)",
			settingsFontSizeDesc: "Terminal font size in px (9–32, default 13)",
			settingsFontSizeSuffix: "px",
			settingsTabsTitle: "Sidebar content",
			settingsViewersTitle: "File viewers",
			settingsGeneralTitle: "General",
			settingsPopup: "Feature settings",
			settingsViewerCatchAll: "Catch-all: any file",
			viewerImage: "Image",
			viewerPdf: "PDF",
			viewerMarkdown: "Markdown",
			viewerCode: "Code",
			viewerBinary: "Binary download",
			viewerHtml: "HTML",
			browser: "Browser",
			browserPlaceholder: "Enter a URL, e.g. example.com",
			browserGo: "Go",
			browserBack: "Back",
			browserForward: "Forward",
			browserStart: "Enter a URL to start browsing (sandbox mode)",
			browserBlockedScheme: "Blocked: only http/https URLs are allowed",
			browserBlockedLoopback: "Blocked: local and internal addresses cannot be browsed here",
			browserInvalid: "Invalid URL",
			browserNoSandboxWarning: "Sandbox off: the current page runs with full GUI privileges (re-enable in settings)",
			htmlNoSandboxWarning: "Sandbox off: this HTML runs with full GUI privileges (re-enable in settings)",
			sandboxStatusOn: "Sandbox mode: on · pages cannot access the GUI's data or local files; logins and third-party cookies may not work",
			sandboxUnlock: "Temporarily disable (unsafe)",
			sandboxRestore: "Restore sandbox",
			settingsHtmlDefaultUnsafeTitle: "Open HTML previews unsandboxed by default (unsafe)",
			settingsHtmlDefaultUnsafeDesc: "When on, every newly opened HTML preview starts in the unsandboxed state (same origin as the GUI — it can read session files and internal APIs); the status row still offers a one-tap restore",
			settingsHtmlSandboxTitle: "Disable HTML preview sandbox (unsafe)",
			settingsHtmlSandboxDesc: "With the sandbox off, previewed HTML runs with the same origin as the GUI: it can read session files, local storage and call internal APIs. Only enable for fully trusted files",
			settingsBrowserSandboxTitle: "Disable browser sandbox (unsafe)",
			settingsBrowserSandboxDesc: "With the sandbox off, any visited site runs with the same origin as the GUI: it can read session data and act as your logged-in session. Only enable for fully trusted sites",
			settingsBrowserLinksTitle: "Open chat external links in the sidebar",
			settingsBrowserLinksDesc: "When on, clicking an external link in the chat or GUI opens the sidebar instead of a new window; HTTP and HTTPS are controlled separately by the switches below; Ctrl/Cmd+click always bypasses",
			settingsBrowserHttpTitle: "Open HTTP pages in the sidebar",
			settingsBrowserHttpDesc: "When on, clicking an HTTP external link in the chat or GUI opens the sidebar (plugin pages declaring urlTarget win); Ctrl/Cmd+click always bypasses",
			settingsBrowserHttpsTitle: "Open HTTPS pages in the sidebar",
			settingsBrowserHttpsDesc: "When on, clicking an HTTPS external link in the chat or GUI opens the sidebar. Off by default: most HTTPS sites refuse to be embedded, so the system browser is the smoother default",
			settingsBrowserLoopbackTitle: "Allowed local addresses",
			settingsBrowserLoopbackDesc: "Comma-separated allowlist of loopback addresses (e.g. localhost:5174 or 127.0.0.1:8080) the sidebar browser may visit; empty blocks all local addresses by default. The sandbox still applies — pages cannot read GUI data",
			settingsBrowserLoopbackPlaceholder: "e.g. localhost:5174, 127.0.0.1:8080",
			browserOpenExternal: "Open in browser",
			browserEmbedBlocked: "{host} refused to be embedded",
			browserEmbedBlockedDesc: "The site forbids being displayed inside other pages (X-Frame-Options / frame-ancestors), so it cannot load in the sidebar. Open it directly in your browser instead.",
			browserEmbedAnyway: "Load anyway",
			subagent: "Tasks",
			openSubagent: "Tasks",
			subagentMainAgent: "Main agent",
			subagentEmpty: "No subagents",
			subagentEmptyDesc: "Subagents spawned under the main agent will appear here",
			subagentRunning: "Running",
			subagentInactive: "Inactive",
			subagentModeOneShot: "One-shot",
			subagentModeContinuable: "Continuable",
			subagentCount: "{count} subagents",
			subagentCountRunning: "{count} subagents · {running} running",
			subagentDiagCorrupt: "Corrupt",
			subagentDiagUnsupported: "Unsupported",
			subagentDiagUnavailable: "Unavailable",
			subagentThinking: "Thinking…",
			sideChat: "Side Chat (beta)",
			sideChatNew: "New thread",
			sideChatUntitled: "New thread",
			sideChatEmpty: "No side conversations",
			sideChatEmptyDesc: "Every side conversation is its own tab in the tab strip — it inherits the current session's context and never enters the main conversation",
			sideChatCreating: "Creating side conversation…",
			sideChatRetry: "Retry",
			sideChatThreads: "Switch thread / new",
			sideChatSave: "Save as new session",
			sideChatSaveTitle: "Promote this thread to a top-level session in the main session list",
			sideChatSaved: "Saved as a new session",
			sideChatNoTurn: "Save is available after the first completed turn",
			sideChatPendingDrop: "The last unanswered follow-up will not be included in the saved session",
			sideChatFirstPlaceholder: "Ask the first question — context inherited…",
			sideChatComposerPlaceholder: "Ask a follow-up…",
			sideChatThinking: "Deep diving…",
			sideChatThink: "Thinking",
			sideChatInjection: "Context injected",
			sideChatSend: "Send",
			sideChatCancel: "Stop",
			sideChatCancelTitle: "Abort the running turn (queued work is kept)",
			sideChatClose: "Close thread",
			sideChatCloseTitle: "Release the thread's agent (history is kept)",
			sideChatError: "Side Chat error: {message}",
			sideChatTurnUsage: "Input {input} tok · Output {output} tok",
			sideChatBlockCollapse: "Collapse",
			sideChatBlockCollapseAria: "Collapse",
			sideChatBlockExpand: "Expand {hidden} lines",
			sideChatBlockExpandAria: "Expand {hidden} more lines",
			sideChatBlockSignal: "Killed by signal: {signal}",
			sideChatBlockExitCode: "Exit code {code}",
			sideChatBlockRunning: "Running",
			sideChatBlockFailed: "Failed",
			sideChatBlockDone: "Done",
			sideChatBlockNoOutput: "(no output)",
			sideChatBlockFiles: "{count} files",
			sideChatBlockWindow: "{shown} of {total} lines",
			sideChatConnDisconnected: "Connection lost",
			sideChatConnReconnect: "Reconnect",
			sideChatConnConnecting: "Reconnecting…",
			sideChatConnRecovered: "Connection restored",
			sideChatConnReconnectAction: "Reconnect now",
			sideChatConnRestartAction: "Restart connection",
			jobs: "Background jobs",
			jobsCount: "{count} background jobs",
			jobsCountRunning: "{count} background jobs · {running} running",
			jobStatusRunning: "Running",
			jobStatusStopping: "Stopping",
			jobStatusCompleted: "Completed",
			jobStatusKilled: "Killed",
			jobStatusFailed: "Failed",
			jobDurationSeconds: "{seconds}s",
			jobDurationMinutes: "{minutes}m {seconds}s",
			jobDurationHours: "{hours}h {minutes}m",
			jobViewOutput: "View output",
			jobHideOutput: "Hide output",
			jobNoOutput: "No output yet",
			jobNotReadYet: "Waiting for the model to read this job; its output appears here once the model runs job_output",
			jobOutputTruncated: "Output truncated",
			jobOutputError: "Failed to read output",
			jobKill: "Kill",
			jobKillConfirm: "Click again to confirm kill",
			jobKillError: "Kill failed",
			addPluginsTabCard: "Add tab plugins",
			addPluginsTabCardDesc: "Register a new sidebar page",
			addPluginsViewerCard: "Add preview plugins",
			addPluginsViewerCardDesc: "Register a file-type preview",
			addPluginsTabDesc: "Sidebar pages (tabs) can be extended by plugins. Plugins register through the ctx.betterSidebar service; clicking Install copies the install command — paste it into a terminal where your DSH profile lives and run it.",
			addPluginsViewerDesc: "File previewers can be extended by plugins. Plugins register through the ctx.betterSidebar service; clicking Install copies the install command — paste it into a terminal where your DSH profile lives and run it.",
			addPluginsBrowseMore: "Browse more plugins on GitHub (topic: dsh-better-sidebar)",
			addPluginsSearch: "Search by plugin name or description…",
			addPluginsNoMatch: "No plugins match",
			addPluginsRecommended: "Recommended plugins",
			addPluginsEmpty: "No plugins curated yet — publish yours under the GitHub topic",
			openPlugin: "Open",
			copyInstall: "Copy install command",
			pluginMdExportDesc: "Adds an \"Export\" button to the Markdown toolbar in better-sidebar: one click renders the current .md into standalone HTML (tables / code blocks / Mermaid diagrams inlined, layout follows the preview theme) and saves it next to the .md, or exports to PDF via the print dialog",
			pluginOfficeDesc: "Office-suite preview (.docx / .xlsx / .pptx) for the better-sidebar editor, keeping the heavy Office render libraries out of the core bundle",
			pluginFlowglassDesc: "Live session flowgraph with three lanes for user, assistant, and tool calls, plus parallel groups, sub-agent branches, drill-down, and live status; registers a native Flowglass tab when better-sidebar is installed and keeps its standalone drawer as a fallback",
			pluginGitForgeDesc: "Git Forge tab: GitHub/Gitea (and other forge) account library + per-project grants + hard push policy; tokens stay in local secrets (never in model context); read-only GitForge tool and agent HTTPS credential helper",
			pluginGithubWorkbenchDesc: "GitHub Workbench tab: remote repo tree + Issues / Pull requests / Actions with full write support — create Issue/PR, comment, edit, close/reopen, squash·merge·rebase merge (strong confirm), re-run/cancel CI; the repo switcher auto-lists accessible repos and searches public ones; falls back to a standalone right-side panel without better-sidebar",
			pluginGitRemotesDesc: "Git Remotes tab: branch/upstream/ahead-behind, fetch (optional prune), ff-only pull, and push only after an in-tab confirm. Does not replace the built-in Git stage/commit tab, and does not offer force-push or a model auto-push tool",
			pluginServerDeckDesc: "Server card dashboard: one card per host showing online status, OS, uptime and CPU/mem/disk usage with latency; click a card to open an interactive xterm.js terminal; one-click ~/.ssh/config import (git-hosting aliases auto-skipped). Registers a native \"Servers\" tab when better-sidebar is installed and keeps its standalone drawer as a fallback",
			pluginSentinelDesc: "Condition-driven agent wakeup: file/process/port/http/command/webhook sensors wake dormant sessions when conditions fire; registers a \"Sentinel\" tab with the server-wide watch table",
			pluginSidebarQaDesc: "Select-and-ask: Select conversation text → ask in the right-side panel → a dedicated follow-up session (❓追问) in the same workspace; a fast no-thinking model compresses the main context and injects it with the quote, without interrupting the main conversation. Follow-ups nest, continue, and archive",
			pluginSidenoteDesc: "Codex-style side chat + selection annotations: fork the current session into a persistent side panel (archived out of the session list, multi-instance, /side command, survives reload, model follows the main session); select assistant text → numbered badge + note editor → an \"N annotations\" chip that rides your next message, or ask straight into a side chat",
			pluginSshTunnelDesc: "SSH Tunnel tab: multi-host inventory + per-project grants + local secrets; SSHManager tool (exec/SFTP/session strategies); center interactive terminal and dual-pane SFTP",
			pluginSuhuangScrollDesc: "Connect the local Suhuang Scroll Runtime to DSH settings and better-sidebar for model configuration, connection tests, and continuous grading controls; requires Suhuang Scroll Runtime and dsh-better-sidebar",
			pluginTurnReviewDesc: "A human gate on the just-finished turn: Approve / Request changes per path with an optional comment; paths grouped by main session / subagent / unattributed; inline snapshot-vs-now diff before you decide. No fork, no /rewind",
			pluginVideoPreviewDesc: "Inline video preview (.mp4/.webm/.mov/.mkv/.avi etc.) for the better-sidebar editor, backed by a dedicated /video host route with HTTP Range (206) support — scrubbing works and files are not capped by the 20MB mediaLimit",
			pluginCodeNavDesc: "Code preview navigator: detects the language by file type and highlights syntax, symbol outline (class / method / variable filters + one-click jump), and in-file search (highlight all matches, prev/next, match case) — takes over code file preview in the better-sidebar editor",
			pluginDocsPanelDesc: "Global docs in the DSH sidebar: read your own Markdown notes from any workspace — a file list, an outline, open in Chrome / VS Code, and copy buttons; the docs directory is configurable (default ~/.dsh/docs)",
			pluginEgoBrowserDesc: "The agent browser for DeepSeek Harness: 32 ego_* tools drive a real Chromium, with a native sidebar \"ego browser\" tab giving a live view of every page the agent visits — you can click, drag, and type to take over. Registers the tab automatically when better-sidebar is present, otherwise falls back to a floating bubble",
			pluginBetterOverleafDesc: "Overleaf tab for better-sidebar: direct-CDP browser login (third-party Chromium supported), project list/switch, local git mirrors under <workspace>/overleaf/, two-way git sync with read-only API fallback, and file preview through the sidebar workbench",
			pluginBilingualReaderDesc: "Read paper PDFs in the DSH sidebar: native PDF rendering, select text to translate it with the LLM, using context while staying fully isolated from the main conversation — a reading aid only",
			pluginSentinelName: "dsh-sentinel Wake-up System",
			pluginEgoBrowserName: "ego-browser Agent Browser",
			pluginBetterOverleafName: "dsh-better-overleaf Overleaf Tab",
			pluginDocsPanelName: "dsh-docs-panel Global Docs",
			pluginFlowglassName: "dsh-flowglass Flowglass",
			pluginGitForgeName: "dsh-git-forge Git Credentials",
			pluginGitRemotesName: "dsh-git-remotes Git Remotes",
			pluginGithubWorkbenchName: "dsh-github-workbench GitHub Workbench",
			pluginSidebarQaName: "dsh-sidebar-qa Select & Ask",
			pluginSidenoteName: "dsh-sidenote Side Chat",
			pluginServerDeckName: "dsh-server-deck Server Deck",
			pluginSuhuangScrollName: "dsh-suhuang-scroll Suhuang Scroll",
			pluginSshTunnelName: "dsh-ssh-tunnel SSH Tunnel",
			pluginTurnReviewName: "dsh-turn-review Turn Review",
			pluginBilingualReaderName: "dsh-bilingual-reader Bilingual Reader",
			pluginOfficeName: "Office Preview",
			pluginMdExportName: "Markdown Export",
			pluginCodeNavName: "Code Preview Navigator",
			pluginVideoPreviewName: "Video Preview",
			presetDshDesktopDesc: "Electron advanced (frameless) mode: macOS reserves a 20px top strip; Windows reserves a 32px title bar when WCO is unavailable"
		};
		/**
		* The dictionary namespace this plugin owns in the DSH locale registry
		* (`'sidebar'` is taken by DSH's own ui-sidebar, hence this distinct name).
		*/
		const LOCALE_NS = "betterSidebar";
		/** The DSH locale service attached by the client apply (absent → browser detection). */
		let localeService;
		/**
		* The better-locale override store attached by the client apply
		* (absent → no override; the zh/en chain runs). The store's `active`
		* field holds the user's chosen override id (e.g. `'ja'`); `undefined`
		* means "no override, use DSH native zh/en".
		*
		* The override only takes effect when DSH's active locale is `'en'`
		* (it borrows DSH's English slot to render a third language). While
		* DSH is on `'zh'` the override is inert — `getOverride` returns
		* `undefined` and `isOverrideActive` returns `false` — so `t()` and
		* `isZh()` fall through to the native zh/en chain unchanged.
		*/
		let betterLocaleStore;
		/**
		* Attach (or detach, with undefined) the DSH locale service. The sidebar
		* mounts its own React root outside the slot system's locale seat, so the
		* service rides this module-level holder: components keep calling the plain
		* `t()` function, and the Sidebar root's locale subscription re-renders the
		* whole tree on switches.
		*/
		function attachLocale(service) {
			localeService = service;
		}
		/**
		* Attach (or detach, with undefined) the better-locale override store.
		* When attached with an active override, `t()` consults the store's
		* `getOverride(active, LOCALE_NS, key)` first; if it returns a string,
		* that text wins over the zh/en chain. Detaching (or the store's active
		* being `undefined`) restores the zh/en chain unchanged.
		*
		* The Sidebar root subscribes to the store separately (see Sidebar.tsx)
		* so an override change re-renders the whole tree — the locale service's
		* own revision bump (which better-locale triggers via `publish(active, true)`)
		* does NOT fire the existing `localeRevision` uSES because that snapshot
		* reads `getSnapshot().active` (unchanged) rather than `revision`.
		*/
		function attachBetterLocale(store) {
			betterLocaleStore = store;
		}
		/**
		* The active locale id ('zh' | 'en'): the DSH locale service's snapshot when
		* attached, else the browser language.
		*/
		function activeLocale() {
			return localeService?.getSnapshot().active ?? (typeof navigator !== "undefined" ? navigator.language : "") ?? "en";
		}
		/** Translate a copy key; `{name}` placeholders interpolate from `params`. */
		function t(key, params) {
			const dshActive = localeService?.getSnapshot().active ?? "";
			let text = betterLocaleStore?.getOverride(dshActive, LOCALE_NS, key);
			if (text === void 0) text = (activeLocale().toLowerCase().startsWith("zh") ? zh : en)[key];
			if (text === void 0) text = key;
			if (params !== void 0) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		}
		/** Format an ISO 8601 author date relative to now (刚刚 / N 分钟前 / N 小时前 / 昨天 / date). */
		function relativeTime(iso) {
			const then = Date.parse(iso);
			if (Number.isNaN(then)) return iso;
			const seconds = Math.floor((Date.now() - then) / 1e3);
			if (seconds < 60) return t("timeJustNow");
			if (seconds < 3600) return t("timeMinutesAgo", { n: Math.floor(seconds / 60) });
			if (seconds < 86400) return t("timeHoursAgo", { n: Math.floor(seconds / 3600) });
			if (seconds < 172800) return t("timeYesterday");
			const date = new Date(then);
			const pad = (value) => String(value).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		}
		//#endregion
		//#region src/client/produced-files.ts
		/**
		* Pure derivation of one turn's produced files from finalized conversation
		* nodes — a structural replica of ui-deliverables' `producedForClosing`
		* (the mutation tools' follow-along `locations`, by render intent: a diff
		* card or a generic edit card; reads/deletes/failures produce nothing).
		* Kept dependency-free so the takeover logic is unit-testable and the
		* replica is easy to diff against upstream when it drifts.
		*/
		/** Paths a tool-result view reports as produced, by render intent. */
		function producedPaths(view) {
			if (view === null || typeof view !== "object") return [];
			const record = view;
			if (!(record.card === "diff" || record.card === "generic" && record.kind === "edit")) return [];
			if (!Array.isArray(record.locations)) return [];
			const paths = [];
			for (const location of record.locations) if (location !== null && typeof location === "object" && typeof location.path === "string") paths.push(location.path);
			return paths;
		}
		/**
		* Files produced by the turn the assistant at `seq` closes. Accumulation
		* resets on turn boundaries (a user message, or a node reporting a different
		* turn number); paths keep first-seen order and appear once.
		* @param nodes - snapshot nodes in surface order (structural, unknown-safe).
		* @param seq - the closing assistant's seq (the render site's anchor).
		* @returns produced paths; empty when the turn wrote nothing.
		*/
		function producedForClosing(nodes, seq) {
			let pending = [];
			let seen = /* @__PURE__ */ new Set();
			let turn;
			for (const node of nodes) {
				if (node === null || typeof node !== "object") continue;
				const record = node;
				if (record.kind === "tool-result") {
					if (record.isError === true) continue;
					for (const path of producedPaths(record.callView)) {
						if (seen.has(path)) continue;
						seen.add(path);
						pending.push(path);
					}
					continue;
				}
				if (record.kind === "user") {
					turn = void 0;
					pending = [];
					seen = /* @__PURE__ */ new Set();
				} else if (typeof record.turn === "number") {
					if (turn !== void 0 && record.turn !== turn) {
						pending = [];
						seen = /* @__PURE__ */ new Set();
					}
					turn = record.turn;
				}
				if (record.kind === "assistant" && record.seq === seq) return pending;
			}
			return [];
		}
		/**
		* Claim the turn-tail chain only when the closing turn produced files.
		*
		* The authoritative source is the engine Turn data — the same value
		* ui-deliverables reads (`owner.turn.data.get('deliverables')`): a
		* `{ produced: [{ seq, path }, ...] }` record accumulated per Turn. The
		* node-based replica below stays as a fallback for compositions that do not
		* publish it.
		* @param owner - the turn-tail owner currency ({turn, seq, openFile}).
		* @returns produced paths as the matched value, or null to decline.
		*/
		function selectProducedFiles(owner) {
			const record = owner;
			if (record === null || typeof record !== "object") return null;
			const seq = typeof record.seq === "number" ? record.seq : Number.POSITIVE_INFINITY;
			const data = record.turn?.data?.get?.("deliverables");
			if (data !== null && typeof data === "object" && Array.isArray(data.produced)) {
				const paths = [];
				const seen = /* @__PURE__ */ new Set();
				for (const item of data.produced) {
					if (item === null || typeof item !== "object") continue;
					const produced = item;
					if (typeof produced.path !== "string" || produced.path === "") continue;
					if (typeof produced.seq === "number" && produced.seq > seq) continue;
					if (seen.has(produced.path)) continue;
					seen.add(produced.path);
					paths.push(produced.path);
				}
				return paths.length === 0 ? null : paths;
			}
			if (!Array.isArray(record.nodes)) return null;
			const paths = producedForClosing(record.nodes, seq);
			return paths.length === 0 ? null : paths;
		}
		/**
		* Resolve a (possibly relative) path against the session cwd for the sidebar.
		* Absolute detection mirrors the host (see client/paths.isAbsolutePath):
		* POSIX roots, drive letters and UNC shares must not be joined onto the cwd.
		*/
		function resolveSidebarPath(cwd, path) {
			if (isAbsolutePath$1(path)) return path;
			const base = cwd ?? "";
			if (base === "") return path;
			const separator = base.includes("\\") ? "\\" : "/";
			return `${base.replace(/[\\/]+$/, "")}${separator}${path}`;
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/DSH-better-sidebar/DSH-better-sidebar/src/client/sidebar.module.css.mjs
		const css$6 = "[data-dsh-panel-host]{z-index:25;pointer-events:none;position:fixed;inset:0;overflow:clip}[data-dsh-panel-host][data-dsh-panel-host-degraded]{position:absolute;top:0;left:0}.nArs4W_toggleButton{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background var(--ds-transition-duration-slow) var(--ds-ease-in-out), color var(--ds-transition-duration-slow) var(--ds-ease-in-out);background:0 0;border:none;border-radius:50%;justify-content:center;align-items:center;display:flex}.nArs4W_toggleButton:hover:not(:disabled):not([aria-disabled=true]){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_toggleButton:disabled,.nArs4W_toggleButton[aria-disabled=true]{opacity:.4;cursor:default}.nArs4W_panelBody{flex:1;min-width:0;min-height:0;display:flex}.nArs4W_bottomPanel{z-index:40;background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l2);pointer-events:auto;padding-bottom:env(safe-area-inset-bottom);transition:transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), height var(--ds-transition-duration-slow) var(--ds-ease-in-out);flex-direction:column;display:flex;position:absolute;bottom:0}.nArs4W_bottomPanelHidden{pointer-events:none;visibility:hidden;transition:transform var(--ds-transition-duration-slow) var(--ds-ease-in-out), height var(--ds-transition-duration-slow) var(--ds-ease-in-out), visibility 0s linear var(--ds-transition-duration-slow);transform:translateY(102%)}.nArs4W_bottomPanel[data-dragging]{transition:none}.nArs4W_bottomPanel{contain:layout style}body[data-dsh-sidebar-dragging] .nArs4W_panel,body[data-dsh-sidebar-dragging] .nArs4W_bottomPanel{will-change:transform}.nArs4W_bottomResize{cursor:row-resize;z-index:2;touch-action:none;height:8px;position:absolute;top:-4px;left:0;right:0}.nArs4W_bottomResizeActive{background:var(--dsw-alias-interactive-bg-hover-accent)}.nArs4W_bottomClose{z-index:4;width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex;position:absolute;top:3px;right:6px}.nArs4W_bottomClose:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_bottomPanel .nArs4W_tabBar{padding-right:40px}.nArs4W_toggleButton,.nArs4W_tabBar{-webkit-app-region:no-drag}.nArs4W_iconButton{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.nArs4W_iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_iconButton:disabled{opacity:.4;cursor:default}.nArs4W_workbench,.nArs4W_split{flex:1;min-width:0;min-height:0;display:flex}.nArs4W_splitRow{flex-direction:row}.nArs4W_splitCol{flex-direction:column}.nArs4W_splitChild{display:flex;position:relative;overflow:hidden}.nArs4W_divider{z-index:3;touch-action:none;flex:none;position:relative}.nArs4W_dividerRow:after,.nArs4W_dividerCol:after{content:\"\";background:var(--dsw-alias-border-l2);transition:background var(--ds-transition-duration-slow) var(--ds-ease-in-out);position:absolute}.nArs4W_dividerRow{cursor:col-resize;width:7px;margin:0 -2px}.nArs4W_dividerRow:after{width:1px;top:0;bottom:0;left:50%;transform:translate(-50%)}.nArs4W_dividerCol{cursor:row-resize;height:7px;margin:-2px 0}.nArs4W_dividerCol:after{height:1px;top:50%;left:0;right:0;transform:translateY(-50%)}.nArs4W_divider:hover:after,.nArs4W_dividerActive:after{background:var(--dsw-alias-interactive-bg-hover-accent)}.nArs4W_pane{background:var(--dsw-alias-bg-base);flex-direction:column;flex:1;min-width:0;min-height:0;display:flex;position:relative}.nArs4W_paneDrop{outline:1px solid var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}.nArs4W_dropOverlay{z-index:6;pointer-events:none;background:var(--dsw-alias-interactive-bg-hover-accent);opacity:.5;position:absolute}.nArs4W_dropLeft{width:25%;top:0;bottom:0;left:0}.nArs4W_dropRight{width:25%;top:0;bottom:0;right:0}.nArs4W_dropUp{height:25%;top:0;left:0;right:0}.nArs4W_dropDown{height:25%;bottom:0;left:0;right:0}.nArs4W_dropCenter{outline:2px dashed var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-2px;background:0 0;inset:25%}.nArs4W_paneContent{flex-direction:column;flex:1;min-height:0;display:flex;overflow:hidden}.nArs4W_chipIcon{flex:none;align-items:center;margin-right:6px;display:inline-flex}.nArs4W_paneTab{flex-direction:column;flex:1;min-height:0;display:flex}.nArs4W_paneTabHidden{display:none}.nArs4W_paneEmptyCards{flex:1;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));align-content:start;gap:8px;min-height:0;padding:12px;display:grid;overflow:hidden}.nArs4W_paneCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-width:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-strong-12);cursor:pointer;text-align:center;border-radius:8px;flex-direction:column;justify-content:center;align-items:center;gap:6px;padding:12px 8px;display:flex}.nArs4W_paneCard:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}.nArs4W_paneCard:disabled{opacity:.45;cursor:default}.nArs4W_tabBar{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex:none;align-items:stretch;height:34px;display:flex}.nArs4W_tabBarDrop{outline:1px dashed var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}.nArs4W_tabList{scrollbar-width:none;flex:1;min-width:0;display:flex;overflow-x:auto}.nArs4W_tabList::-webkit-scrollbar{display:none}.nArs4W_tab{min-width:64px;max-width:160px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);border-right:1px solid var(--dsw-alias-border-l1);cursor:pointer;user-select:none;background:0 0;flex:none;align-items:center;gap:4px;padding:0 4px 0 10px;display:flex}.nArs4W_tab:hover{background:var(--dsw-alias-interactive-bg-hover)}.nArs4W_tabActive{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-active)}.nArs4W_tabTitle{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.nArs4W_tabBadge{min-width:16px;height:15px;font:var(--dsw-font-xxxs-strong-11);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary);border-radius:8px;flex:none;justify-content:center;align-items:center;padding:0 4px;display:inline-flex}.nArs4W_tabClose{width:18px;height:18px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.nArs4W_tabClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_tabBarPlus{background:var(--dsw-alias-bg-layer-1);width:22px;height:22px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:5px;flex:none;justify-content:center;align-self:center;align-items:center;margin:0 6px;padding:0;display:inline-flex;position:sticky;right:0}.nArs4W_tabBarPlus:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_pinnedTab{color:var(--dsw-alias-label-tertiary);font-style:italic}.nArs4W_pinnedTab:hover{color:var(--dsw-alias-label-secondary)}.nArs4W_explorer{flex-direction:column;flex:1;min-height:0;display:flex}.nArs4W_explorerHeader{flex:none;justify-content:space-between;align-items:center;gap:8px;height:36px;padding:0 8px 0 12px;display:flex}.nArs4W_explorerRoot{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.nArs4W_explorerBody{flex:1;min-height:0;padding:4px 8px 8px;overflow:hidden auto}.nArs4W_explorerRow{box-sizing:border-box;width:100%;max-width:100%;height:34px;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;white-space:nowrap;animation:nArs4W_dsh-row-in .15s var(--ds-ease-in-out);background:0 0;border:none;border-radius:8px;align-items:center;gap:6px;padding:0 8px;display:flex}.nArs4W_explorerRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.nArs4W_explorerRowRevealed{background:var(--dsw-alias-state-business-tertiary)}.nArs4W_explorerRowRevealed+.nArs4W_explorerRowRevealed{border-top-left-radius:0;border-top-right-radius:0}.nArs4W_explorerRowRevealed:has(+.nArs4W_explorerRowRevealed){border-bottom-right-radius:0;border-bottom-left-radius:0}.nArs4W_explorerDir{font:var(--dsw-font-s-strong-14)}.nArs4W_explorerHidden{opacity:.45}.nArs4W_explorerSymlink{color:var(--dsw-alias-label-tertiary);flex:none}.nArs4W_explorerBroken .nArs4W_explorerName{color:var(--dsw-alias-state-error-primary)}.nArs4W_explorerName{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.nArs4W_explorerRenaming{cursor:text}.nArs4W_explorerRenameInput{box-sizing:border-box;border:1px solid var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-1);min-width:0;height:24px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);border-radius:6px;flex:auto;padding:0 6px}.nArs4W_explorerRenameInput:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}.nArs4W_explorerActionError{box-sizing:border-box;border:1px solid var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-1);border-radius:8px;align-items:flex-start;gap:6px;width:100%;margin-bottom:4px;padding:6px 8px;display:flex}.nArs4W_explorerActionErrorText{overflow-wrap:anywhere;min-width:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);flex:auto}.nArs4W_explorerActionErrorClose{width:20px;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:5px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.nArs4W_explorerActionErrorClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_explorerConfirmDesc{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0}.nArs4W_explorerRef,.nArs4W_explorerCopied{margin-left:auto}.nArs4W_explorerRef{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);height:20px;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-strong-11);cursor:pointer;border-radius:999px;flex:none;align-items:center;padding:0 8px;display:none}.nArs4W_explorerRef:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_explorerRow:hover .nArs4W_explorerRef,.nArs4W_explorerRow:focus-within .nArs4W_explorerRef{display:inline-flex}.nArs4W_explorerCopied{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.nArs4W_explorerError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);cursor:default}@keyframes nArs4W_dsh-row-in{0%{opacity:0}}.nArs4W_explorerEmpty{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;padding:16px}.nArs4W_explorerRowDropTarget{background:var(--dsw-alias-interactive-bg-hover);outline:1px dashed var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}.nArs4W_uploadDropZone{z-index:1001;pointer-events:none;border:2px dashed var(--dsw-alias-interactive-bg-hover-accent);box-shadow:0 0 0 200vmax var(--dsw-alias-bg-mask-drop);animation:nArs4W_dsh-row-in .15s var(--ds-ease-in-out);border-radius:10px;justify-content:center;align-items:flex-start;padding:12px;display:flex;position:fixed}.nArs4W_uploadDropHero{flex-direction:column;align-items:center;gap:10px;max-width:100%;padding-top:8px;display:flex}.nArs4W_uploadDropZonePill{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);max-width:100%;box-shadow:var(--dsw-shadow-lv2);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-strong-12);border-radius:999px;align-items:center;gap:6px;padding:6px 12px;display:flex}.nArs4W_uploadDropZoneText{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.nArs4W_uploadDropChatHint{z-index:1002;pointer-events:none;animation:nArs4W_dsh-row-in .15s var(--ds-ease-in-out);justify-content:center;align-items:center;padding:24px;display:flex;position:fixed;top:0;bottom:0;left:0}.nArs4W_uploadDropChatCard{text-align:center;max-width:100%;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-strong-14);flex-direction:column;align-items:center;gap:12px;display:flex}.nArs4W_uploadOverlay{z-index:30;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);animation:nArs4W_dsh-row-in .15s var(--ds-ease-in-out);justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.nArs4W_uploadOverlayCard{border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-alias-bg-layer-2);min-width:280px;max-width:min(420px,100% - 48px);box-shadow:var(--dsw-shadow-lv3);border-radius:24px;flex-direction:column;gap:12px;padding:20px 24px;display:flex}.nArs4W_uploadOverlayTitle{font:var(--dsw-font-s-strong-14);color:var(--dsw-alias-label-primary);align-items:center;gap:8px;display:flex}.nArs4W_uploadOverlayTitle>svg{flex:none}.nArs4W_uploadOverlayTitle>span{white-space:nowrap;text-overflow:ellipsis;min-width:0;overflow:hidden}.nArs4W_uploadOverlayProgress{background:var(--dsw-alias-border-l2);border-radius:3px;height:6px;overflow:hidden}.nArs4W_uploadOverlayProgressFill{background:var(--dsw-alias-interactive-bg-hover-accent);height:100%;transition:width .15s var(--ds-ease-in-out);border-radius:3px}.nArs4W_uploadOverlayStatus{min-height:1em;font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.nArs4W_uploadOverlayCancel{border:1px solid var(--dsw-alias-border-l2);height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-strong-12);cursor:pointer;background:0 0;border-radius:8px;align-self:flex-end;padding:0 14px}.nArs4W_uploadOverlayCancel:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}.nArs4W_uploadOverlayCancel:disabled{opacity:.4;cursor:default}.nArs4W_editor{flex-direction:column;flex:1;min-height:0;display:flex}.nArs4W_editorHeader{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:6px;padding:6px 8px;display:flex}.nArs4W_editorTitle{min-width:0;font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.nArs4W_editorPathInput{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-width:0;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);border-radius:6px;flex:1;padding:0 10px}.nArs4W_editorPathInput:focus{border-color:var(--dsw-alias-border-l2);outline:none}.nArs4W_editorTreeToggleActive{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-active)}.nArs4W_editorBody{flex:1;min-height:0;display:flex}.nArs4W_editorMain{flex-direction:column;flex:1;min-width:0;min-height:0;display:flex}.nArs4W_editorTreeDock{border-left:1px solid var(--dsw-alias-border-l1);flex:none;min-height:0;display:flex;position:relative}.nArs4W_editorTreeResize{cursor:col-resize;touch-action:none;z-index:3;width:6px;position:absolute;top:0;bottom:0;left:0}.nArs4W_editorTreeResize:hover{background:var(--dsw-alias-border-l2)}.nArs4W_editorTreePanel{flex-direction:column;flex:1;min-width:0;min-height:0;display:flex;position:relative}.nArs4W_editorTreePanelFull{flex:1}.nArs4W_editorTreeSearch{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:6px;padding:6px 8px;display:flex}.nArs4W_editorSearchInput{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-width:0;height:26px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);border-radius:6px;flex:1;padding:0 10px}.nArs4W_editorSearchInput:focus{border-color:var(--dsw-alias-border-l2);outline:none}.nArs4W_editorSearchHint{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);padding:8px 12px}.nArs4W_editorSearchResult{width:100%;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);text-align:left;cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:none;border-radius:6px;padding:4px 8px;display:block;overflow:hidden}.nArs4W_editorSearchResult:hover{background:var(--dsw-alias-interactive-bg-hover)}.nArs4W_editorStatus{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.nArs4W_editorStatusError{color:var(--dsw-alias-state-error-primary)}.nArs4W_dirtyDot{background:var(--dsw-alias-state-warn-primary);border-radius:50%;flex:none;width:7px;height:7px}.nArs4W_editorPlaceholder{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;flex:1;justify-content:center;align-items:center;padding:16px;display:flex}.nArs4W_orphanedType{opacity:.7;overflow-wrap:anywhere;margin-top:8px;font-size:12px;display:block}.nArs4W_editorBinary{text-align:center;flex-direction:column;flex:1;justify-content:center;align-items:center;gap:12px;padding:24px 16px;display:flex}.nArs4W_editorBinaryNotice{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}.nArs4W_editorDownloadLink{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-strong-12);cursor:pointer;transition:background var(--ds-transition-duration-slow) var(--ds-ease-in-out), border-color var(--ds-transition-duration-slow) var(--ds-ease-in-out);border-radius:6px;align-items:center;gap:6px;padding:6px 14px;text-decoration:none;display:inline-flex}.nArs4W_editorDownloadLink:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}.nArs4W_editorError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);padding:12px 16px}.nArs4W_fenceError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);flex-wrap:wrap;align-items:center;gap:8px;padding:8px 16px;display:flex}.nArs4W_editorBanner{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);flex:none;padding:4px 8px}.nArs4W_sandboxStatus{font:var(--dsw-font-xxxs-11);flex:none;align-items:center;gap:8px;padding:4px 10px;display:flex}.nArs4W_sandboxStatusOn{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1)}.nArs4W_sandboxStatusOff{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent)}.nArs4W_sandboxDot{background:var(--dsw-alias-state-success-primary);border-radius:50%;flex:none;width:6px;height:6px}.nArs4W_sandboxStatusOff .nArs4W_sandboxDot{background:var(--dsw-alias-state-error-primary)}.nArs4W_sandboxStatusText{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.nArs4W_sandboxAction{border:1px solid var(--dsw-alias-border-l2);font:inherit;color:inherit;cursor:pointer;background:0 0;border-radius:6px;flex:none;padding:2px 8px}.nArs4W_sandboxAction:hover{background:var(--dsw-alias-interactive-bg-hover)}.nArs4W_editorHtml{background:var(--dsw-alias-bg-base);border:none;flex:1;width:100%;min-height:0}.nArs4W_browser{flex-direction:column;flex:1;min-height:0;display:flex}.nArs4W_browserBar{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:4px;padding:6px 8px;display:flex}.nArs4W_browserInput{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);min-width:0;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);border-radius:6px;flex:1;padding:0 10px}.nArs4W_browserInput:focus{border-color:var(--dsw-alias-border-l2);outline:none}.nArs4W_browserMessage{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);flex:none;padding:4px 12px}.nArs4W_browserFrame{background:var(--dsw-alias-bg-base);border:none;flex:1;width:100%;min-height:0}.nArs4W_browserStart{text-align:center;min-height:0;font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary);flex:1;justify-content:center;align-items:center;padding:20px;display:flex}.nArs4W_browserBlocked{text-align:center;min-height:0;color:var(--dsw-alias-state-warn-primary);flex-direction:column;flex:1;justify-content:center;align-items:center;gap:6px;padding:24px;display:flex}.nArs4W_browserBlockedTitle{font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-primary)}.nArs4W_browserBlockedDesc{max-width:280px;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary)}.nArs4W_browserBlockedActions{gap:8px;margin-top:6px;display:flex}.nArs4W_browserBlockedButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-11);cursor:pointer;border-radius:6px;padding:4px 12px}.nArs4W_browserBlockedButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.nArs4W_editorCm{background:0 0;flex:1;min-height:0;overflow:hidden}.nArs4W_editorCmHidden{display:none}.nArs4W_editorCm .cm-editor{height:100%}.nArs4W_editorCm .cm-scroller{padding:12px 16px}.nArs4W_editorCm .cm-editor.cm-focused{outline:none}.nArs4W_editorModeToggle{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;flex:none;align-items:center;gap:2px;padding:2px;display:inline-flex}.nArs4W_editorModeButton{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);cursor:pointer;background:0 0;border:none;border-radius:4px;padding:2px 8px}.nArs4W_editorModeButton:hover{color:var(--dsw-alias-label-primary)}.nArs4W_editorModeActive{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}.nArs4W_editorImageWrap{flex:1;justify-content:center;align-items:center;min-height:0;padding:12px;display:flex;overflow:auto}.nArs4W_editorImage{object-fit:contain;max-width:100%;max-height:100%}.nArs4W_editorMd{min-height:0;font:var(--dsw-font-xs-13);flex:1;padding:12px 16px;overflow-y:auto}.nArs4W_editorMd .md-code-block:not([data-mermaid-processed])>div:first-child{z-index:auto;position:static}.nArs4W_mermaidWrap{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;margin:6px 0;overflow:hidden}.nArs4W_mermaidHeader{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);justify-content:space-between;align-items:center;gap:6px;padding:4px 8px;display:flex}.nArs4W_mermaidInfo{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary)}.nArs4W_mermaidCopy{height:20px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer;background:0 0;border:none;border-radius:4px;align-items:center;gap:4px;padding:0 6px;display:inline-flex}.nArs4W_mermaidCopy:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_mermaidBody{cursor:zoom-in;justify-content:center;padding:10px;display:flex;overflow:auto}.nArs4W_mermaidBody svg{max-width:100%;height:auto}.nArs4W_mermaidError{border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxxs-11);padding:6px 10px}.nArs4W_mermaidCode{font:var(--dsw-font-xxxs-11);margin:0;padding:8px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow:auto}.nArs4W_mermaidMarkdown .md-code-block[data-mermaid-processed]{display:contents}.nArs4W_mermaidModal{z-index:1000;background:var(--dsw-alias-bg-mask-1);backdrop-filter:blur(2px);flex-direction:column;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.nArs4W_mermaidModalToolbar{z-index:10;gap:8px;display:flex;position:absolute;top:16px;right:16px}.nArs4W_mermaidModalButton{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:36px;height:36px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-strong-13);cursor:pointer;border-radius:8px;justify-content:center;align-items:center;display:inline-flex}.nArs4W_mermaidModalButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.nArs4W_mermaidModalStage{justify-content:center;align-items:center;width:90vw;height:80vh;display:flex;position:relative;overflow:hidden}.nArs4W_mermaidModalStage svg{cursor:grab;transform-origin:50%;user-select:none;-webkit-user-drag:none;background:var(--dsw-alias-bg-layer-1);border-radius:12px;max-width:none;max-height:none;padding:16px}.nArs4W_mermaidModalStage svg:active{cursor:grabbing}.nArs4W_mermaidModalHint{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);pointer-events:none;position:absolute;bottom:16px;left:50%;transform:translate(-50%)}.nArs4W_selectionPopup{z-index:60;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxxs-strong-11);white-space:nowrap;cursor:pointer;border-radius:6px;align-items:center;padding:0 10px;display:inline-flex;position:fixed;transform:translate(-50%,calc(-100% - 8px))}.nArs4W_selectionPopup:hover{background:var(--dsw-alias-interactive-bg-hover)}.nArs4W_editorPdf{background:var(--dsw-alias-bg-base);flex-direction:column;flex:1;min-height:0;display:flex}.nArs4W_editorPdfToolbar{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;justify-content:flex-end;padding:6px 8px;display:flex}.nArs4W_editorPdfStage{flex:1;min-height:0;display:flex;position:relative}.nArs4W_editorPdfFrame{background:var(--dsw-alias-bg-base);border:none;flex:1;width:100%;min-height:0}.nArs4W_editorPdfFrameBlocked{pointer-events:none}.nArs4W_editorPdfDragShield{z-index:4;pointer-events:none;background:0 0;position:absolute;inset:0}.nArs4W_editorPdfDragShieldActive{pointer-events:auto}body[data-dsh-tab-dragging] .nArs4W_editorPdfFrame{pointer-events:none!important}body[data-dsh-tab-dragging] .nArs4W_editorPdfDragShield{pointer-events:auto!important}.nArs4W_terminalWrap{background:var(--dsw-alias-bg-base);flex-direction:column;flex:1;min-height:0;display:flex;position:relative}.nArs4W_terminal{flex:1;min-height:0;padding:6px 4px 6px 8px}.nArs4W_terminal .xterm{height:100%}.nArs4W_terminalBanner{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);flex-wrap:wrap;flex:none;align-items:center;gap:8px;padding:3px 10px;display:flex}.nArs4W_terminalBannerUrl{word-break:break-all;opacity:.85;flex-basis:100%;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.nArs4W_terminalWaitBanner{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);flex:none;align-items:center;gap:8px;padding:3px 10px;display:flex}.nArs4W_terminalWaitNeedle{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.nArs4W_boundaryError{z-index:50;background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);flex-direction:column;align-items:flex-start;gap:8px;padding:16px;display:flex;position:fixed;top:0;bottom:0;right:0;overflow:auto}.nArs4W_terminalRetry{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-strong-11);cursor:pointer;border-radius:999px;flex:none;padding:1px 8px}.nArs4W_terminalRetry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_terminalDepsBanner{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-warn-label);background:var(--dsw-alias-state-warn-tertiary);flex-direction:column;flex:none;gap:6px;padding:10px;display:flex}.nArs4W_terminalDepsTitle{font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-state-warn-primary)}.nArs4W_terminalDepsHint{opacity:.9}.nArs4W_terminalDepsCommandRow{align-items:flex-start;gap:8px;display:flex}.nArs4W_terminalRepairCommand{white-space:pre-wrap;word-break:break-all;user-select:text;min-width:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:4px;flex:1;max-height:160px;margin:0;padding:6px 8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.5;overflow:auto}.nArs4W_terminalDepsNote{opacity:.85}.nArs4W_terminalDepsActions{align-items:center;gap:8px;display:flex}.nArs4W_tabBoundaryError{min-height:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);flex-direction:column;flex:1;align-items:flex-start;gap:8px;padding:12px 16px;display:flex;overflow:auto}.nArs4W_nativeTabHost{flex-direction:column;height:100%;min-height:0;display:flex}.nArs4W_gitEmpty{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);padding:4px 12px 8px}.nArs4W_gitPlaceholder{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;padding:16px}.nArs4W_gitError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;padding:8px 12px}.nArs4W_gitDiffTab{flex-direction:column;flex:1;min-width:0;min-height:0;display:flex;overflow:hidden auto}.nArs4W_gitDiffTabHeader{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:8px;height:36px;padding:0 8px 0 12px;display:flex}.nArs4W_gitDiffTabTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-xxs-strong-12);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.nArs4W_producedRow{flex-wrap:wrap;align-items:center;gap:8px;padding:4px 0;display:flex}.nArs4W_producedLabel{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}.nArs4W_producedChip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);max-width:200px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);cursor:pointer;border-radius:999px;align-items:center;gap:4px;padding:2px 8px;display:inline-flex;overflow:hidden}.nArs4W_producedChip:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_producedChip span{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.nArs4W_producedMore{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary)}.nArs4W_toggleButton:focus-visible,.nArs4W_bottomClose:focus-visible,.nArs4W_iconButton:focus-visible,.nArs4W_tab:focus-visible,.nArs4W_tabClose:focus-visible,.nArs4W_tabBarPlus:focus-visible,.nArs4W_paneCard:focus-visible,.nArs4W_explorerRow:focus-visible,.nArs4W_explorerRef:focus-visible,.nArs4W_terminalRetry:focus-visible,.nArs4W_editorModeButton:focus-visible,.nArs4W_editorDownloadLink:focus-visible,.nArs4W_editorPptxButton:focus-visible,.nArs4W_editorDocxZoomRange:focus-visible{outline:2px solid var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}@media (prefers-reduced-motion:reduce){.nArs4W_bottomPanel,.nArs4W_bottomPanelHidden,.nArs4W_toggleButton,.nArs4W_tab,.nArs4W_tabBarPlus,.nArs4W_paneCard,.nArs4W_explorerRow,.nArs4W_divider,.nArs4W_dividerRow:after,.nArs4W_dividerCol:after{transition:none;animation:none}}@media (width<=767px){.nArs4W_tab{min-width:48px;max-width:128px}}.nArs4W_openWithLabel{align-items:center;gap:8px;width:100%;min-width:0;display:flex}.nArs4W_openWithName{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}.nArs4W_openWithChevron{color:var(--dsw-alias-label-tertiary);flex:none}.nArs4W_openWithPin{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border-radius:5px;flex:none;justify-content:center;align-items:center;display:inline-flex}.nArs4W_openWithPin:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_openWithPinActive{color:var(--dsw-alias-state-business-primary)}.nArs4W_editorHtmlBlock{margin:8px 0}.nArs4W_editorHtmlBlock img,.nArs4W_editorHtmlBlock video{max-width:100%}.nArs4W_editorHtmlBlock details{margin:4px 0;padding:4px 0}.nArs4W_editorHtmlBlock summary{cursor:pointer}.nArs4W_tocBar{z-index:7;pointer-events:none;justify-content:flex-end;height:0;display:flex;position:sticky;top:0}.nArs4W_tocButton{pointer-events:auto;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:26px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:6px;justify-content:center;align-items:center;margin:4px 2px 0 0;padding:0;display:inline-flex}.nArs4W_tocButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_tocPanel{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);width:min(300px,82%);max-height:60vh;box-shadow:var(--dsw-shadow-lv2);pointer-events:auto;border-radius:8px;flex-direction:column;padding:4px;display:flex;position:absolute;top:32px;right:2px;overflow-y:auto}.nArs4W_tocItem{min-width:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);text-align:left;cursor:pointer;background:0 0;border:none;border-radius:6px;align-items:baseline;gap:8px;padding:4px 8px;display:flex}.nArs4W_tocItem:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.nArs4W_tocItem[data-level=\"2\"]{padding-left:18px}.nArs4W_tocItem[data-level=\"3\"]{padding-left:28px}.nArs4W_tocItem[data-level=\"4\"]{padding-left:38px}.nArs4W_tocItem[data-level=\"5\"]{padding-left:48px}.nArs4W_tocItem[data-level=\"6\"]{padding-left:58px}.nArs4W_tocItemLevel{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.nArs4W_tocItemText{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}@keyframes nArs4W_dsh-toc-flash{0%,60%{background:var(--dsw-alias-interactive-bg-hover)}to{background:0 0}}.nArs4W_tocFlash{border-radius:4px;animation:1.2s ease-out nArs4W_dsh-toc-flash}";
		const tagId$6 = "dsh-better-sidebar/sidebar.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		var sidebar_module_css_default = {
			"terminalWrap": "nArs4W_terminalWrap",
			"editorTreeSearch": "nArs4W_editorTreeSearch",
			"openWithChevron": "nArs4W_openWithChevron",
			"editorMain": "nArs4W_editorMain",
			"chipIcon": "nArs4W_chipIcon",
			"paneTabHidden": "nArs4W_paneTabHidden",
			"tabClose": "nArs4W_tabClose",
			"uploadOverlayProgress": "nArs4W_uploadOverlayProgress",
			"browser": "nArs4W_browser",
			"uploadOverlayCard": "nArs4W_uploadOverlayCard",
			"sandboxDot": "nArs4W_sandboxDot",
			"mermaidError": "nArs4W_mermaidError",
			"editorPdfFrameBlocked": "nArs4W_editorPdfFrameBlocked",
			"tabBarPlus": "nArs4W_tabBarPlus",
			"terminalWaitNeedle": "nArs4W_terminalWaitNeedle",
			"editorBody": "nArs4W_editorBody",
			"gitError": "nArs4W_gitError",
			"explorerRow": "nArs4W_explorerRow",
			"browserFrame": "nArs4W_browserFrame",
			"gitDiffTabTitle": "nArs4W_gitDiffTabTitle",
			"tocItem": "nArs4W_tocItem",
			"explorerActionError": "nArs4W_explorerActionError",
			"explorerBody": "nArs4W_explorerBody",
			"mermaidBody": "nArs4W_mermaidBody",
			"dropDown": "nArs4W_dropDown",
			"editorTreeToggleActive": "nArs4W_editorTreeToggleActive",
			"openWithLabel": "nArs4W_openWithLabel",
			"uploadDropZone": "nArs4W_uploadDropZone",
			"editorPdf": "nArs4W_editorPdf",
			"bottomClose": "nArs4W_bottomClose",
			"editorStatus": "nArs4W_editorStatus",
			"dividerCol": "nArs4W_dividerCol",
			"orphanedType": "nArs4W_orphanedType",
			"explorerName": "nArs4W_explorerName",
			"editorPdfFrame": "nArs4W_editorPdfFrame",
			"editorTreePanelFull": "nArs4W_editorTreePanelFull",
			"mermaidModalButton": "nArs4W_mermaidModalButton",
			"tabBar": "nArs4W_tabBar",
			"editorMd": "nArs4W_editorMd",
			"browserMessage": "nArs4W_browserMessage",
			"toggleButton": "nArs4W_toggleButton",
			"explorerEmpty": "nArs4W_explorerEmpty",
			"editorPdfDragShieldActive": "nArs4W_editorPdfDragShieldActive",
			"terminalWaitBanner": "nArs4W_terminalWaitBanner",
			"producedChip": "nArs4W_producedChip",
			"bottomResizeActive": "nArs4W_bottomResizeActive",
			"splitChild": "nArs4W_splitChild",
			"dropUp": "nArs4W_dropUp",
			"iconButton": "nArs4W_iconButton",
			"uploadDropHero": "nArs4W_uploadDropHero",
			"editorHeader": "nArs4W_editorHeader",
			"editorStatusError": "nArs4W_editorStatusError",
			"dropOverlay": "nArs4W_dropOverlay",
			"terminalBannerUrl": "nArs4W_terminalBannerUrl",
			"browserBlockedButton": "nArs4W_browserBlockedButton",
			"sandboxStatusOff": "nArs4W_sandboxStatusOff",
			"explorerRef": "nArs4W_explorerRef",
			"tabBarDrop": "nArs4W_tabBarDrop",
			"explorer": "nArs4W_explorer",
			"paneDrop": "nArs4W_paneDrop",
			"browserBlockedTitle": "nArs4W_browserBlockedTitle",
			"nativeTabHost": "nArs4W_nativeTabHost",
			"boundaryError": "nArs4W_boundaryError",
			"editorCm": "nArs4W_editorCm",
			"terminalRepairCommand": "nArs4W_terminalRepairCommand",
			"gitEmpty": "nArs4W_gitEmpty",
			"tabTitle": "nArs4W_tabTitle",
			"editorHtmlBlock": "nArs4W_editorHtmlBlock",
			"editorError": "nArs4W_editorError",
			"splitRow": "nArs4W_splitRow",
			"explorerRoot": "nArs4W_explorerRoot",
			"sandboxAction": "nArs4W_sandboxAction",
			"dividerActive": "nArs4W_dividerActive",
			"editorImage": "nArs4W_editorImage",
			"mermaidCode": "nArs4W_mermaidCode",
			"editorModeActive": "nArs4W_editorModeActive",
			"paneEmptyCards": "nArs4W_paneEmptyCards",
			"tabBadge": "nArs4W_tabBadge",
			"browserBlockedDesc": "nArs4W_browserBlockedDesc",
			"uploadOverlayStatus": "nArs4W_uploadOverlayStatus",
			"mermaidModal": "nArs4W_mermaidModal",
			"gitDiffTab": "nArs4W_gitDiffTab",
			"producedMore": "nArs4W_producedMore",
			"openWithPinActive": "nArs4W_openWithPinActive",
			"tabActive": "nArs4W_tabActive",
			"dropRight": "nArs4W_dropRight",
			"explorerRowRevealed": "nArs4W_explorerRowRevealed",
			"mermaidHeader": "nArs4W_mermaidHeader",
			"explorerHeader": "nArs4W_explorerHeader",
			"panelBody": "nArs4W_panelBody",
			"editorSearchHint": "nArs4W_editorSearchHint",
			"paneContent": "nArs4W_paneContent",
			"dirtyDot": "nArs4W_dirtyDot",
			"uploadOverlay": "nArs4W_uploadOverlay",
			"explorerRenaming": "nArs4W_explorerRenaming",
			"editorCmHidden": "nArs4W_editorCmHidden",
			"browserStart": "nArs4W_browserStart",
			"terminalDepsCommandRow": "nArs4W_terminalDepsCommandRow",
			"workbench": "nArs4W_workbench",
			"paneCard": "nArs4W_paneCard",
			"editorSearchInput": "nArs4W_editorSearchInput",
			"uploadDropChatCard": "nArs4W_uploadDropChatCard",
			"producedLabel": "nArs4W_producedLabel",
			"openWithName": "nArs4W_openWithName",
			"mermaidCopy": "nArs4W_mermaidCopy",
			"tocButton": "nArs4W_tocButton",
			"bottomPanelHidden": "nArs4W_bottomPanelHidden",
			"explorerHidden": "nArs4W_explorerHidden",
			"browserBlocked": "nArs4W_browserBlocked",
			"gitDiffTabHeader": "nArs4W_gitDiffTabHeader",
			"explorerActionErrorClose": "nArs4W_explorerActionErrorClose",
			"sandboxStatusOn": "nArs4W_sandboxStatusOn",
			"mermaidModalStage": "nArs4W_mermaidModalStage",
			"splitCol": "nArs4W_splitCol",
			"tocBar": "nArs4W_tocBar",
			"editorModeButton": "nArs4W_editorModeButton",
			"uploadDropChatHint": "nArs4W_uploadDropChatHint",
			"uploadOverlayTitle": "nArs4W_uploadOverlayTitle",
			"explorerSymlink": "nArs4W_explorerSymlink",
			"sandboxStatus": "nArs4W_sandboxStatus",
			"uploadOverlayCancel": "nArs4W_uploadOverlayCancel",
			"dsh-row-in": "nArs4W_dsh-row-in",
			"terminalDepsBanner": "nArs4W_terminalDepsBanner",
			"explorerDir": "nArs4W_explorerDir",
			"editorHtml": "nArs4W_editorHtml",
			"editorDownloadLink": "nArs4W_editorDownloadLink",
			"editorTreeResize": "nArs4W_editorTreeResize",
			"explorerError": "nArs4W_explorerError",
			"split": "nArs4W_split",
			"browserInput": "nArs4W_browserInput",
			"panel": "nArs4W_panel",
			"uploadOverlayProgressFill": "nArs4W_uploadOverlayProgressFill",
			"selectionPopup": "nArs4W_selectionPopup",
			"gitPlaceholder": "nArs4W_gitPlaceholder",
			"tabBoundaryError": "nArs4W_tabBoundaryError",
			"mermaidMarkdown": "nArs4W_mermaidMarkdown",
			"editorTreeDock": "nArs4W_editorTreeDock",
			"tocItemLevel": "nArs4W_tocItemLevel",
			"bottomPanel": "nArs4W_bottomPanel",
			"editorBinaryNotice": "nArs4W_editorBinaryNotice",
			"terminal": "nArs4W_terminal",
			"fenceError": "nArs4W_fenceError",
			"browserBlockedActions": "nArs4W_browserBlockedActions",
			"editorPdfStage": "nArs4W_editorPdfStage",
			"editorImageWrap": "nArs4W_editorImageWrap",
			"mermaidWrap": "nArs4W_mermaidWrap",
			"pinnedTab": "nArs4W_pinnedTab",
			"editorTitle": "nArs4W_editorTitle",
			"tab": "nArs4W_tab",
			"uploadDropZoneText": "nArs4W_uploadDropZoneText",
			"sandboxStatusText": "nArs4W_sandboxStatusText",
			"mermaidModalHint": "nArs4W_mermaidModalHint",
			"divider": "nArs4W_divider",
			"dividerRow": "nArs4W_dividerRow",
			"terminalDepsHint": "nArs4W_terminalDepsHint",
			"dsh-toc-flash": "nArs4W_dsh-toc-flash",
			"editorBanner": "nArs4W_editorBanner",
			"explorerBroken": "nArs4W_explorerBroken",
			"dropCenter": "nArs4W_dropCenter",
			"tabList": "nArs4W_tabList",
			"terminalDepsNote": "nArs4W_terminalDepsNote",
			"editorPdfDragShield": "nArs4W_editorPdfDragShield",
			"explorerConfirmDesc": "nArs4W_explorerConfirmDesc",
			"terminalBanner": "nArs4W_terminalBanner",
			"editorTreePanel": "nArs4W_editorTreePanel",
			"editorModeToggle": "nArs4W_editorModeToggle",
			"mermaidModalToolbar": "nArs4W_mermaidModalToolbar",
			"terminalDepsTitle": "nArs4W_terminalDepsTitle",
			"pane": "nArs4W_pane",
			"tocPanel": "nArs4W_tocPanel",
			"editorBinary": "nArs4W_editorBinary",
			"openWithPin": "nArs4W_openWithPin",
			"editorPathInput": "nArs4W_editorPathInput",
			"editorDocxZoomRange": "nArs4W_editorDocxZoomRange",
			"browserBar": "nArs4W_browserBar",
			"uploadDropZonePill": "nArs4W_uploadDropZonePill",
			"mermaidInfo": "nArs4W_mermaidInfo",
			"explorerRowDropTarget": "nArs4W_explorerRowDropTarget",
			"explorerCopied": "nArs4W_explorerCopied",
			"editorSearchResult": "nArs4W_editorSearchResult",
			"explorerActionErrorText": "nArs4W_explorerActionErrorText",
			"paneTab": "nArs4W_paneTab",
			"producedRow": "nArs4W_producedRow",
			"bottomResize": "nArs4W_bottomResize",
			"tocFlash": "nArs4W_tocFlash",
			"dropLeft": "nArs4W_dropLeft",
			"editorPdfToolbar": "nArs4W_editorPdfToolbar",
			"tocItemText": "nArs4W_tocItemText",
			"editorPlaceholder": "nArs4W_editorPlaceholder",
			"explorerRenameInput": "nArs4W_explorerRenameInput",
			"editor": "nArs4W_editor",
			"terminalRetry": "nArs4W_terminalRetry",
			"terminalDepsActions": "nArs4W_terminalDepsActions",
			"editorPptxButton": "nArs4W_editorPptxButton"
		};
		//#endregion
		//#region src/client/intercept.tsx
		/**
		* Interception of the chat's produced-files row: the turn-tail chain entry
		* that replaces ui-deliverables' row when the closing turn produced files.
		* The takeover looks identical (same chip row); the chips open the file in
		* the sidebar instead of the host OS. Priority -1 runs before the default-0
		* deliverables entry; when nothing was produced the selector returns null
		* and the original row renders unchanged.
		*/
		/** Open a file in the sidebar's editor (used by the intercepted row and the explorer). */
		function openSidebarFile(ctx, store, sessionId, path) {
			const summary = ctx.sessions.list.getSnapshot().byId[sessionId];
			const absolute = resolveSidebarPath(summary?.cwd, path);
			const at = Math.max(absolute.lastIndexOf("/"), absolute.lastIndexOf("\\"));
			const title = at === -1 ? absolute : absolute.slice(at + 1);
			ctx.get("betterSidebar")?.openTab({
				type: "editor",
				title,
				path: absolute,
				id: `editor:${absolute}`
			});
		}
		/**
		* Reveal the produced files in the sidebar explorer: expand their parent
		* directories, highlight the rows, and focus the explorer tab. Unknown
		* files fall back to revealing the workspace root itself.
		*/
		function revealInExplorer(ctx, store, sessionId, files) {
			const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
			const targets = files.length > 0 ? files.map((path) => resolveSidebarPath(cwd, path)) : cwd === void 0 ? [] : [cwd];
			store.reduce((state) => revealPaths(state, cwd, targets));
			ctx.get("betterSidebar")?.openTab({
				type: "editor",
				title: t("files")
			});
		}
		/** The intercepted produced-files row (visual twin of the deliverables chips). */
		function SidebarProducedFiles(props) {
			const { matched, openInSidebar, onShowInFolder } = props;
			const shown = matched.slice(0, 6);
			const hidden = matched.length - shown.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.producedRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.producedLabel,
						children: t("produced")
					}),
					shown.map((path) => {
						const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
						const name = at === -1 ? path : path.slice(at + 1);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: sidebar_module_css_default.producedChip,
							title: path,
							onClick: () => {
								openInSidebar(path);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 12 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: name })]
						}, path);
					}),
					hidden > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: sidebar_module_css_default.producedMore,
						children: ["+", hidden]
					}),
					hidden > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.producedMore,
						style: {
							cursor: "pointer",
							textDecoration: "underline",
							textUnderlineOffset: 2
						},
						onClick: () => {
							onShowInFolder(matched);
						},
						children: t("showInFolder")
					})
				]
			});
		}
		/**
		* Register the turn-tail interception (returns the disposer).
		*
		* The slot is a CHILD slot the host's ui-conversation declares in its
		* `conversation.chat.node` children table (kind: chain, scope: session).
		* Registering it directly races the declaration — the ui-slots core's
		* load-time validation throws "not declared (a parent entry's children
		* table must declare it)" when the parent entry is not on the ledger yet.
		* slots.inject waits for the declaration: the callback runs synchronously
		* when the slot is already declared, otherwise it runs inside the declaring
		* register() call once the declaration commits; declaration collapse
		* disposes the entry and a later declaration re-registers it. This mirrors
		* @deepseek-ai/dsh-client-ui-deliverables' registration of the same slot.
		*/
		function registerTurnTailInterception(ctx, store) {
			return ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				select: (owner) => {
					if (store.getSuspended()) return null;
					if (store.getPrefs().tabsEnabled["editor"] === false) return null;
					return selectProducedFiles(owner);
				},
				priority: -1,
				registrant: "dsh-better-sidebar",
				inject: (sessionId) => ({
					openInSidebar: (path) => {
						openSidebarFile(ctx, store, sessionId, path);
					},
					onShowInFolder: (files) => {
						revealInExplorer(ctx, store, sessionId, files);
					}
				})
			}, SidebarProducedFiles));
		}
		//#endregion
		//#region node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region src/html-route.ts
		/** The route prefix both encoders/decoders agree on. */
		const HTML_ROUTE_PREFIX = "/sidebar/html/";
		/** Build the route URL for one absolute file path (client + tests). */
		function encodeHtmlUrl(sessionId, path) {
			const unc = /^[\\/]{2}[^\\/]/.test(path);
			const segments = path.split(/[\\/]+/).filter((segment) => segment !== "");
			return `${HTML_ROUTE_PREFIX}${encodeURIComponent(sessionId)}/${unc ? "/" : ""}${segments.map(encodeURIComponent).join("/")}`;
		}
		//#endregion
		//#region src/client/api.ts
		/**
		* Typed fetch wrapper over the /sidebar JSON API. Every call posts to
		* `/sidebar/api/<method>` with the sessionId and — when known — the session's
		* cwd from the client's own list summary. The host prefers its attached
		* session header and uses the summary cwd only while the session is still
		* hydrating at page load (a detached session would otherwise fail the
		* request). Failures surface as {@link SidebarApiError} with the wire code.
		*/
		/** One wire failure. */
		var SidebarApiError = class extends Error {
			code;
			constructor(code, message) {
				super(message);
				this.code = code;
			}
		};
		/** Message-level variant for surfaces that stored the raw text (file-tree level errors). */
		function isOutsideWorkspaceMessage(message) {
			return message.includes("outside workspace");
		}
		/**
		* Parse one `/sidebar` JSON response envelope into its value. A non-ok
		* status, an unparseable body, or any shape other than `{ok: true, value}`
		* surfaces as {@link SidebarApiError} carrying the wire code (falling back
		* to the HTTP status). Shared by the JSON api route and the raw upload
		* route, whose envelopes are identical.
		*/
		async function readEnvelope(response) {
			const parsed = await response.json().catch(() => null);
			if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === void 0) throw new SidebarApiError(parsed?.error?.code ?? "http", parsed?.error?.message ?? `HTTP ${response.status}`);
			return parsed.value;
		}
		async function call(method, payload, signal) {
			try {
				if (payload !== null && typeof payload === "object" && "sessionId" in payload) {
					payload = { ...payload, sessionId: fenglinRealSid(payload.sessionId) };
				}
			} catch {}
			let response;
			try {
				response = await fetch(`/sidebar/api/${method}`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload),
					signal
				});
			} catch (error) {
				throw new SidebarApiError("network", error instanceof Error ? error.message : String(error));
			}
			return readEnvelope(response);
		}
		/**
		* Upload one file to the sidebar's raw upload route: the File goes straight
		* into the POST body (no JSON/base64 re-encoding — the host streams it into
		* the workspace). Failure surfaces as {@link SidebarApiError} with the wire
		* code, exactly like every `/sidebar/api` call. An aborted `signal` rejects
		* with the DOMException as-is (the caller decides whether that is an error).
		*/
		async function fetchUpload(scope, dir, relativePath, body, signal) {
			const params = new URLSearchParams({
				sessionId: fenglinRealSid(scope.sessionId),
				dir,
				relativePath
			});
			if (scope.cwd !== void 0 && scope.cwd !== "") params.set("cwd", scope.cwd);
			let response;
			try {
				response = await fetch(`/sidebar/upload?${params.toString()}`, {
					method: "POST",
					headers: { "content-type": "application/octet-stream" },
					body,
					signal
				});
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") throw error;
				throw new SidebarApiError("network", error instanceof Error ? error.message : String(error));
			}
			return readEnvelope(response);
		}
		/** Fold a scope into a JSON payload ({cwd} only when present). */
		function scopePayload(scope, extra) {
			return {
				sessionId: fenglinRealSid(scope.sessionId),
				...scope.cwd !== void 0 && scope.cwd !== "" ? { cwd: scope.cwd } : {},
				...scope.repoRoot !== void 0 && scope.repoRoot !== "" ? { repoRoot: scope.repoRoot } : {},
				...extra
			};
		}
		/** Add a linked-worktree selection to a scoped Git request. The host validates
		* membership before using it as a command cwd. */
		function gitPayload(scope, worktree, extra) {
			return scopePayload(scope, {
				...worktree !== void 0 && worktree !== "" ? { worktree } : {},
				...extra
			});
		}
		/**
		* Remote VSCode-family URLs must be consumed on the browser/client machine:
		* the DSH host can be a headless remote server with no editor or DISPLAY.
		* Local editor URLs and reveal actions still belong to the host opener.
		*/
		function shouldOpenExternalOnClient(payload) {
			if (payload.action !== "url") return false;
			let parsed;
			try {
				parsed = new URL(payload.url);
			} catch {
				return false;
			}
			return parsed.protocol !== "http:" && parsed.protocol !== "https:" && parsed.hostname === "vscode-remote" && parsed.pathname.startsWith("/ssh-remote+");
		}
		/**
		* Dispatch an external-open request to the correct machine. SSH remote-editor
		* URLs stay in the synchronous user-click chain and navigate the client so
		* its registered vscode:// / cursor:// handler can launch. Everything else
		* keeps using the DSH host route.
		*/
		function openExternal(payload) {
			if (!shouldOpenExternalOnClient(payload)) return call("open.external", payload);
			try {
				window.location.assign(payload.url);
				return Promise.resolve({ started: true });
			} catch (error) {
				return Promise.reject(error);
			}
		}
		/** The sidebar API surface (session scope threaded through every call). */
		const api = {
			sessionCwd: (scope, signal) => call("session.cwd", scopePayload(scope, {}), signal),
			fsTree: (scope, path, signal) => call("fs.tree", scopePayload(scope, { path }), signal),
			/** Global recursive file-name search rooted at the session cwd (the editor
			*  side panel's search box); matches are cwd-relative '/'-separated paths. */
			fsSearch: (scope, query, signal) => call("fs.search", scopePayload(scope, { query }), signal),
			fsRead: (scope, path, signal) => call("fs.read", scopePayload(scope, { path }), signal),
			fsWrite: (scope, path, content) => call("fs.write", scopePayload(scope, {
				path,
				content
			})),
			/** Rename one tree row within its directory (single-segment name; the
			*  server refuses existing destinations, the workspace root, and — while
			*  the fence is armed — anything resolving outside the workspace). */
			fsRename: (scope, path, name) => call("fs.rename", scopePayload(scope, {
				path,
				name
			})),
			/** Permanently delete one tree row (recursive for directories; a symlink
			*  row unlinks the link only). The UI confirms before calling this. */
			fsRemove: (scope, path) => call("fs.remove", scopePayload(scope, { path })),
			/** Upload one file's raw bytes into `dir` (keeps the folder tree via
			*  `relativePath`); the host streams it under the session workspace. */
			uploadFile: (scope, dir, relativePath, body, signal) => fetchUpload(scope, dir, relativePath, body, signal),
			gitWorktrees: (scope, signal) => call("git.worktrees", scopePayload(scope, {}), signal),
			gitStatus: (scope, worktree, signal) => call("git.status", gitPayload(scope, worktree, {}), signal),
			gitDiff: (scope, path, staged, worktree, signal) => call("git.diff", gitPayload(scope, worktree, {
				...path !== void 0 ? { path } : {},
				staged
			}), signal),
			gitStage: (scope, path, worktree) => call("git.stage", gitPayload(scope, worktree, { ...path !== void 0 ? { path } : {} })),
			gitUnstage: (scope, path, worktree) => call("git.unstage", gitPayload(scope, worktree, { ...path !== void 0 ? { path } : {} })),
			gitCommit: (scope, message, worktree) => call("git.commit", gitPayload(scope, worktree, { message })),
			gitBranch: (scope, worktree, signal) => call("git.branch", gitPayload(scope, worktree, {}), signal),
			gitCheckout: (scope, branch, worktree) => call("git.checkout", gitPayload(scope, worktree, { branch })),
			/** Recent commit history, lazily pageable (skip/count; defaults 0/30). */
			gitLog: (scope, count, skip, worktree, signal) => call("git.log", gitPayload(scope, worktree, {
				...count !== void 0 ? { count } : {},
				...skip !== void 0 ? { skip } : {}
			}), signal),
			/** Full patch text of one commit (diff display for the history rows). */
			gitCommitDiff: (scope, hash, worktree, signal) => call("git.commit-diff", gitPayload(scope, worktree, { hash }), signal),
			/** One file's content at a revision (`git show <rev>:<path>`); null when the
			*  revision has no such path. The diff views' on-demand hunk-fold expansion
			*  reads both sides' full contents through this. */
			gitShow: (scope, rev, path, worktree, signal) => call("git.show", gitPayload(scope, worktree, {
				rev,
				path
			}), signal),
			/** The session's file-tool events for the changes tab's session lens: the
			*  `tool/call` + `tool/result` rows past `afterSeq` (0 = whole window),
			*  capped to the recent window host-side. The client runtime exposes no
			*  event-log face, so the lens polls this delta route. */
			changesOps: (scope, afterSeq, signal) => call("changes.ops", scopePayload(scope, { ...afterSeq !== void 0 && afterSeq > 0 ? { afterSeq } : {} }), signal),
			/** Discard the worktree changes of one file (the index is untouched). */
			gitDiscard: (scope, path, worktree) => call("git.discard", gitPayload(scope, worktree, { path })),
			/** Revert one commit onto the current branch. */
			gitRevert: (scope, hash, worktree) => call("git.revert", gitPayload(scope, worktree, { hash })),
			/** Cherry-pick one commit onto the current branch. */
			gitCherryPick: (scope, hash, worktree) => call("git.cherry-pick", gitPayload(scope, worktree, { hash })),
			/** Release a terminal's process immediately (tab closed; the WS close frame
			*  may be unreachable while the socket is down, so the host also accepts
			*  this explicit route). */
			ptyClose: (scope, tab) => call("pty.close", scopePayload(scope, { tab })),
			/** Release an agent terminal by uuid (tab closed while WS was down). */
			agentPtyClose: (uuid) => call("agent-pty.close", { uuid }),
			/** Skip every active terminal_wait_for on one agent terminal (the wait
			*  banner's skip button). Idempotent: {skipped:0} when none is active. */
			agentSkipWait: (uuid) => call("agent-pty.skip-wait", { uuid }),
			/** Terminal dependency status (issue #140): after a WS close 1011 with
			*  reason `pty-deps-missing` the view fetches the full repair details here
			*  (the close reason itself is capped at 123 bytes). */
			terminalDeps: () => call("terminal.deps", {}),
			/**
			* The output the model has read so far for one background job (replayed
			* from the owner session's event log — never the model's job_output
			* cursor). The scope MUST be the job's OWNER session.
			*/
			jobOutput: (scope, id, signal) => call("jobs.output", scopePayload(scope, { id }), signal),
			/** Request cancellation of one background job (live jobs flip to stopping). */
			jobKill: (scope, id, reason) => call("jobs.kill", scopePayload(scope, {
				id,
				...reason !== void 0 ? { reason } : {}
			})),
			/**
			* One batch live-preview fetch for the whole Subagent tree. The payload is
			* the already-resolved topology ROOT (not a session scope); the host
			* enumerates descendants once and folds running children's activity.
			*/
			subagentsLive: (rootSessionId, signal) => call("subagents.live", { rootSessionId }, signal),
			/** Create a Side Chat thread: a child session seeded with the parent's
			*  full log up to now. Empty question = immediate create (Codex-style):
			*  the thread opens empty, the first prompt carries the boundary. */
			sidechatStart: (sessionId, question) => call("sidechat.start", {
				sessionId,
				question: question ?? ""
			}),
			/** Deliver one follow-up message to a Side Chat thread. */
			sidechatPrompt: (childId, text) => call("sidechat.prompt", {
				childId,
				text
			}),
			/** Abort a Side Chat thread's running turn (queued work is preserved). */
			sidechatCancel: (childId) => call("sidechat.cancel", { childId }),
			/** Release a Side Chat thread's live agent (history stays persisted). */
			sidechatDispose: (childId) => call("sidechat.dispose", { childId }),
			/** Live state + agent identity (provider/model/preset) of a thread. */
			sidechatInfo: (childId) => call("sidechat.info", { childId }),
			/** One transcript pull of a Side Chat thread: the thread's OWN events
			*  (the inherited seed is cut host-side and never crosses the wire).
			*  `afterSeq` narrows the response to the delta beyond it (poll tail).
			*  `live` is the thread's in-flight model deltas (DSH 0.1.5 publishes them
			*  outside the session log) — the CURRENT attempt on every pull, never a
			*  delta, so the caller replaces its live set instead of appending. */
			sidechatEvents: (childId, afterSeq, signal) => call("sidechat.events", {
				childId,
				...afterSeq !== void 0 ? { afterSeq } : {}
			}, signal),
			/** The effective terminal shell and its display name (plugin-global). */
			shellGet: () => call("shell.get", {}),
			/** Read the side card preferences (plugin-global, no session scope). */
			settingsGet: () => call("settings.get", {}),
			/** Merge a patch into the side card preferences (revision-guarded). */
			settingsUpdate: (patch, expectedRevision) => call("settings.update", {
				patch,
				...expectedRevision !== void 0 ? { expectedRevision } : {}
			}),
			/** Probe a URL's response headers (the sidebar browser's embeddability
			*  check; see the host's browser.probe route). */
			browserProbe: (url, signal) => call("browser.probe", { url }, signal),
			/** External open for the file tree's "open with" menu. Remote SSH editor
			*  URLs are launched on the browser/client machine; reveal and local URLs
			*  keep using the host's platform opener. */
			openExternal
		};
		/** Absolute URL of the media route for one path (images only). */
		function mediaUrl(scope, path) {
			return fileUrl(scope, path, false);
		}
		/** Absolute URL of the download route: serves raw bytes (binary-safe) with
		*  `Content-Disposition: attachment`, so the browser saves the file. */
		function downloadUrl(scope, path) {
			return fileUrl(scope, path, true);
		}
		/** Shared URL builder for the /sidebar/file route (media vs download). */
		function fileUrl(scope, path, download) {
			const params = new URLSearchParams({
				sessionId: scope.sessionId,
				path
			});
			if (scope.cwd !== void 0 && scope.cwd !== "") params.set("cwd", scope.cwd);
			if (download) params.set("download", "1");
			return `/sidebar/file?${params.toString()}`;
		}
		/**
		* Absolute URL of the HTML preview route (see html-route.ts): the path is
		* fully encoded so the previewed page's relative assets resolve back into
		* the same route with the session scope intact. The UNC marker is
		* platform-neutral — the host's requireAbsolute resolves the decoded
		* forward-slash `//server/share/...` form on both win32 and POSIX — so no
		* client-side platform signal is needed.
		*/
		function htmlUrl(scope, path) {
			return encodeHtmlUrl(scope.sessionId, path);
		}
		//#endregion
		//#region src/client/binary-download.tsx
		function BinaryDownload(props) {
			const { scope, path } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editorBinary,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: sidebar_module_css_default.editorBinaryNotice,
					children: t("binaryNoPreview")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
					className: sidebar_module_css_default.editorDownloadLink,
					href: downloadUrl(scope, path),
					download: true,
					children: t("downloadToView")
				})]
			});
		}
		//#endregion
		//#region src/client/prefs.ts
		/** Validate one raw resolved value into {@link SidebarPrefs}. Used for the
		* settings.get payload AND the settings.update response (both carry the
		* layered resolved value); any malformed field falls back to its default.
		* @param value - the raw resolved section from the settings wire.
		* @returns validated prefs (always well-formed).
		*/
		function parsePrefs(value) {
			if (value === null || typeof value !== "object") return { ...SIDEBAR_PREFS_DEFAULTS };
			const record = value;
			return {
				// Fenglin exclusive: never auto-expand the right sidebar from activity feeds.
				autoOpenSubagent: false,
				autoOpenJobs: false,
				agentTerminalTools: typeof record.agentTerminalTools === "boolean" ? record.agentTerminalTools : SIDEBAR_PREFS_DEFAULTS.agentTerminalTools,
				agentOpenTools: typeof record.agentOpenTools === "boolean" ? record.agentOpenTools : SIDEBAR_PREFS_DEFAULTS.agentOpenTools,
				bottomPanelAutoTerminal: typeof record.bottomPanelAutoTerminal === "boolean" ? record.bottomPanelAutoTerminal : SIDEBAR_PREFS_DEFAULTS.bottomPanelAutoTerminal,
				terminalFontFamily: typeof record.terminalFontFamily === "string" ? record.terminalFontFamily : SIDEBAR_PREFS_DEFAULTS.terminalFontFamily,
				terminalShell: typeof record.terminalShell === "string" ? record.terminalShell : SIDEBAR_PREFS_DEFAULTS.terminalShell,
				terminalShellArgs: typeof record.terminalShellArgs === "string" ? record.terminalShellArgs : SIDEBAR_PREFS_DEFAULTS.terminalShellArgs,
				terminalFontSize: typeof record.terminalFontSize === "number" && Number.isFinite(record.terminalFontSize) ? clampTerminalFontSize(record.terminalFontSize) : SIDEBAR_PREFS_DEFAULTS.terminalFontSize,
				editorExplorer: typeof record.editorExplorer === "boolean" ? record.editorExplorer : SIDEBAR_PREFS_DEFAULTS.editorExplorer,
				workspaceFence: typeof record.workspaceFence === "boolean" ? record.workspaceFence : SIDEBAR_PREFS_DEFAULTS.workspaceFence,
				titleBarScheme: isTitleBarScheme(record.titleBarScheme) ? record.titleBarScheme : record.titleBarCompat === true || hasLegacyStripValue(record.titleBarStripPx) ? "custom" : "auto",
				titleBarPresetId: typeof record.titleBarPresetId === "string" ? record.titleBarPresetId : SIDEBAR_PREFS_DEFAULTS.titleBarPresetId,
				customCss: typeof record.customCss === "string" ? record.customCss : SIDEBAR_PREFS_DEFAULTS.customCss,
				titleBarCompat: typeof record.titleBarCompat === "boolean" ? record.titleBarCompat : SIDEBAR_PREFS_DEFAULTS.titleBarCompat,
				titleBarStripPx: typeof record.titleBarStripPx === "number" && Number.isFinite(record.titleBarStripPx) ? clampTitleBarStrip(record.titleBarStripPx) : SIDEBAR_PREFS_DEFAULTS.titleBarStripPx,
				htmlViewerNoSandbox: typeof record.htmlViewerNoSandbox === "boolean" ? record.htmlViewerNoSandbox : SIDEBAR_PREFS_DEFAULTS.htmlViewerNoSandbox,
				htmlViewerDefaultUnsafe: typeof record.htmlViewerDefaultUnsafe === "boolean" ? record.htmlViewerDefaultUnsafe : SIDEBAR_PREFS_DEFAULTS.htmlViewerDefaultUnsafe,
				browserNoSandbox: typeof record.browserNoSandbox === "boolean" ? record.browserNoSandbox : SIDEBAR_PREFS_DEFAULTS.browserNoSandbox,
				browserInterceptLinks: typeof record.browserInterceptLinks === "boolean" ? record.browserInterceptLinks : SIDEBAR_PREFS_DEFAULTS.browserInterceptLinks,
				browserInterceptHttp: typeof record.browserInterceptHttp === "boolean" ? record.browserInterceptHttp : SIDEBAR_PREFS_DEFAULTS.browserInterceptHttp,
				browserInterceptHttps: typeof record.browserInterceptHttps === "boolean" ? record.browserInterceptHttps : SIDEBAR_PREFS_DEFAULTS.browserInterceptHttps,
				browserAllowedLoopback: typeof record.browserAllowedLoopback === "string" ? record.browserAllowedLoopback : SIDEBAR_PREFS_DEFAULTS.browserAllowedLoopback,
				tabsEnabled: booleanMapOf(record.tabsEnabled),
				viewersEnabled: booleanMapOf(record.viewersEnabled),
				pluginSettings: pluginSettingsMapOf(record.pluginSettings)
			};
		}
		/**
		* Validate the plugin-owned settings map (v0.12.0+): `{ descriptorId: { key:
		* value } }`, nested open maps. Any non-object value (or a malformed whole)
		* falls back to the empty map — the schema defaults already guard the wire
		* shape, this is the client's second line.
		*/
		function pluginSettingsMapOf(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const out = {};
			for (const [id, blob] of Object.entries(value)) if (blob !== null && typeof blob === "object" && !Array.isArray(blob)) out[id] = blob;
			return out;
		}
		/**
		* Validate one enable-switch map (per-tab / per-viewer). Only boolean values
		* survive; a non-object or a non-boolean entry falls back to the empty map /
		* drops the entry — an absent key means the feature stays enabled.
		*/
		function booleanMapOf(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const out = {};
			for (const [key, item] of Object.entries(value)) if (typeof item === "boolean") out[key] = item;
			return out;
		}
		/** Type guard for the title-bar scheme union (anything else falls back). */
		function isTitleBarScheme(value) {
			return typeof value === "string" && TITLE_BAR_SCHEMES.includes(value);
		}
		/**
		* Whether the legacy document carries an explicit strip value (only
		* reachable through the old gear popup): a stored number different from the
		* default counts as "the user already configured something" and migrates to
		* the `custom` scheme.
		*/
		function hasLegacyStripValue(value) {
			return typeof value === "number" && Number.isFinite(value) && value !== 40;
		}
		async function loadBootDecision(settings) {
			try {
				const view = await settings.settingsGet();
				return {
					prefs: parsePrefs(view.value),
					suspended: view.externalDisable === true
				};
			} catch {
				return {
					prefs: { ...SIDEBAR_PREFS_DEFAULTS },
					suspended: false
				};
			}
		}
		//#endregion
		//#region src/client/FenceErrorNotice.tsx
		/**
		* The workspace-fence refusal surface. The raw wire text (`path "..." is
		* outside workspace`) is never shown as-is: the editor / file-tree error
		* slots render the localized reason plus a one-click global off — the click
		* flips the `workspaceFence` pref through the settings route, adopts the
		* returned document into the store (so every prefs reader — the changes tab's open
		* guard, the settings page — flips with it), and calls `onDisabled` so the
		* caller retries the failed operation immediately.
		*/
		function FenceErrorNotice(props) {
			const { store, onDisabled } = props;
			const [busy, setBusy] = (0, react.useState)(false);
			const disable = () => {
				if (busy) return;
				setBusy(true);
				api.settingsUpdate({ workspaceFence: false }).then((view) => {
					store.setPrefs(parsePrefs(view.value));
					onDisabled();
				}).catch((error) => {
					console.error("workspace fence disable failed", error);
					setBusy(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.fenceError,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fenceErrorReason") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: busy,
					onClick: disable,
					children: t("fenceDisableAction")
				})]
			});
		}
		//#endregion
		//#region src/client/editor-load.ts
		/** Decode the host's base64 head bytes into the sniffing buffer. */
		function decodeHead(headBase64) {
			const binary = atob(headBase64);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
			return bytes;
		}
		/**
		* Dispatch one matched viewer's fetchStrategy. A missing viewer or a
		* `binary-download` strategy both mean "no client-side renderer" → the
		* download UI. `mediaUrlOf` builds the media URL for `mediaUrl`/`none`
		* strategies (pure, but scope-bound — injected by the host).
		*/
		function planFirstMatch(viewer, mediaUrlOf) {
			if (viewer === void 0 || viewer.fetchStrategy === "binary-download") return { kind: "binary" };
			switch (viewer.fetchStrategy) {
				case "mediaUrl":
				case "none": return {
					kind: "render",
					viewer,
					mediaUrl: mediaUrlOf()
				};
				case "custom": return {
					kind: "customLoad",
					viewer
				};
				case "fsRead": return {
					kind: "fetchFsRead",
					viewer
				};
			}
		}
		/**
		* Decide what an fsRead result means for the editor.
		* - Text: the first match stands (content is valid for any fsRead viewer).
		* - Binary: the host head bytes enable a re-match — a `detect` viewer (e.g.
		*   a plugin sniffing a binary format) may claim the file. `custom` viewers
		*   load their own bytes; `mediaUrl`/`none` viewers render the media route;
		*   an fsRead viewer or nothing cannot render binary → download UI.
		*/
		function planFsReadOutcome(viewer, result, rematch, mediaUrlOf) {
			if (!result.binary) return {
				kind: "render",
				viewer,
				content: result.content,
				truncated: result.truncated
			};
			const claimed = result.head === void 0 ? void 0 : rematch(decodeHead(result.head));
			if (claimed !== void 0 && claimed.fetchStrategy === "custom") return {
				kind: "customLoad",
				viewer: claimed
			};
			if (claimed !== void 0 && (claimed.fetchStrategy === "mediaUrl" || claimed.fetchStrategy === "none")) return {
				kind: "render",
				viewer: claimed,
				mediaUrl: mediaUrlOf()
			};
			return { kind: "binary" };
		}
		//#endregion
		//#region node_modules/.pnpm/react-icons@5.7.0_react@18.2.0/node_modules/react-icons/si/index.mjs
		function SiZedindustries(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"role": "img",
					"viewBox": "0 0 24 24"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M2.25 1.5a.75.75 0 0 0-.75.75v16.5H0V2.25A2.25 2.25 0 0 1 2.25 0h20.095c1.002 0 1.504 1.212.795 1.92L10.764 14.298h3.486V12.75h1.5v1.922a1.125 1.125 0 0 1-1.125 1.125H9.264l-2.578 2.578h11.689V9h1.5v9.375a1.5 1.5 0 0 1-1.5 1.5H5.185L2.562 22.5H21.75a.75.75 0 0 0 .75-.75V5.25H24v16.5A2.25 2.25 0 0 1 21.75 24H1.655C.653 24 .151 22.788.86 22.08L13.19 9.75H9.75v1.5h-1.5V9.375A1.125 1.125 0 0 1 9.375 8.25h5.314l2.625-2.625H5.625V15h-1.5V5.625a1.5 1.5 0 0 1 1.5-1.5h13.19L21.438 1.5z" },
					"child": []
				}]
			})(props);
		}
		function SiCursor(props) {
			return GenIcon({
				"tag": "svg",
				"attr": {
					"role": "img",
					"viewBox": "0 0 24 24"
				},
				"child": [{
					"tag": "path",
					"attr": { "d": "M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" },
					"child": []
				}]
			})(props);
		}
		//#endregion
		//#region src/client/icons.tsx
		/**
		* Bottom-panel toggle glyph (the "底栏" button): a frame with a filled strip
		* along its BOTTOM edge, in the app's outline style.
		*/
		const IconPanelBottomOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "1.5",
				y: "2",
				width: "13",
				height: "12",
				rx: "2.5",
				stroke: "currentColor",
				strokeWidth: "1.5"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "3.25",
				y: "10",
				width: "9.5",
				height: "2.75",
				rx: "1",
				fill: "currentColor",
				stroke: "none"
			})]
		});
		/**
		* Stop glyph for the background-job kill button: a filled square in the
		* app's outline scale (16), the universal "halt this work" mark.
		*/
		const IconStopOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "4",
				y: "4",
				width: "8",
				height: "8",
				rx: "1.5",
				fill: "currentColor",
				stroke: "none"
			})
		});
		/** Upload glyph in the app's outline style: an arrow rising into a tray
		*  (the file-manager "upload into the workspace" action). */
		const IconUploadOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M8 10V2.75M4.75 5.5 8 2.25 11.25 5.5",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M2.75 10.5v2.25A1.25 1.25 0 0 0 4 14h8a1.25 1.25 0 0 0 1.25-1.25V10.5",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round"
			})]
		});
		/**
		* Pin glyph in the app's outline style (1.5px stroke, currentColor): a pushpin
		* tilted to the lower-right. Used by the PinnedRail and the tab context menu's
		* pin entry (v0.17.0+).
		*/
		const IconPinOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M9.5 1.5 14.5 6.5 12.5 8.5 10 6 5.5 10.5 6 12 4.5 13.5 2.5 11.5 4 10 5.5 10.5 10 6 7.5 8.5 6.5Z",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinejoin: "round"
			})
		});
		/** Image viewer glyph: a picture frame with a sun and a mountain. */
		const IconImageOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "1.5",
					y: "2.5",
					width: "13",
					height: "11",
					rx: "2",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "5.5",
					cy: "6",
					r: "1.2",
					stroke: "currentColor",
					strokeWidth: "1.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m3.5 12 3-3 2.25 2.25L11.5 8.5 13 10.5",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			]
		});
		/** PDF viewer glyph: a document frame with the "PDF" label. */
		const IconPdfOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3.5 1.5h6.5L13.5 5v9.5h-10z",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M9.5 1.5V5h4",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M5 13.5v-3h1.4c.75 0 1.1.32 1.1.85 0 .54-.35.85-1.1.85H5.3",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8.3 13.5v-3h1.05c.8 0 1.35.5 1.35 1.5s-.55 1.5-1.35 1.5z",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M11.6 13.5v-3h1.3",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round"
				})
			]
		});
		/** Markdown viewer glyph: the classic "M with a down arrow" badge. */
		const IconMarkdownOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "1.5",
				y: "2.5",
				width: "13",
				height: "11",
				rx: "2",
				stroke: "currentColor",
				strokeWidth: "1.5"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M4 10.5V5.5l2 2.5 2-2.5v5M9.5 10.5v-5l2 2.5 2-2.5v5",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			})]
		});
		/** HTML viewer glyph: a document frame with a "‹/›" tag pair. */
		const IconHtmlOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M3.5 1.5h6.5L13.5 5v9.5h-10z",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M9.5 1.5V5h4",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M5.6 13.2 4.2 10l1.4-3.2M7.4 6.8 8.8 10l-1.4 3.2",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			]
		});
		/** History glyph (thread switcher): a clock with a counterclockwise arrow,
		*  in the app's outline style — the "past conversations" mark. */
		const IconHistoryOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.4 6.8A5.6 5.6 0 1 1 2.4 9.2",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.2 3.4v3.4h3.4",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8 5.4V8l1.9 1.2",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			]
		});
		/** Save glyph (save-as-new-session): the classic floppy disk, in the app's
		*  outline style. */
		const IconSaveOutline16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4.2 14.5h7.6a1.2 1.2 0 0 0 1.2-1.2V4.9L10.6 2.5H4.2A1.2 1.2 0 0 0 3 3.7v9.6a1.2 1.2 0 0 0 1.2 1.2z",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M10 2.5v2.6H5.6V2.5",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M5.4 14.5v-4.2h5.2v4.2",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinejoin: "round"
				})
			]
		});
		/**
		* Visual Studio Code brand mark for the file-tree "open with" menu. The
		* path is the Simple Icons `visualstudiocode` glyph (CC0 1.0,
		* simple-icons@11.0.0 — later releases dropped it over Microsoft's brand
		* policy, so it is inlined here rather than pulled from react-icons),
		* rendered monochrome via currentColor to follow the active skin.
		*/
		const IconVscode16 = ({ size = 16, className }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 24 24",
			fill: "currentColor",
			xmlns: "http://www.w3.org/2000/svg",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" })
		});
		//#endregion
		//#region src/client/ime-guard.ts
		/**
		* IME-composition key guard.
		*
		* While a Chinese/Japanese/Korean input method is composing (the user is
		* picking a candidate from the IME window), every pressed key BELONGS to the
		* input method: arrows move the candidate highlight, Enter/Space confirm the
		* composition, Escape cancels it. Page code must not process those keys —
		* a component that does (a number stepper calling preventDefault() on
		* ArrowUp/ArrowDown, a submit handler reacting to Enter, ...) silently
		* breaks the IME: candidates stop responding, the composition gets torn
		* apart, and only bare letters come out.
		*
		* This guard enforces that rule at the document boundary: a capture-phase
		* keydown/keyup listener that stops the event from propagating further
		* whenever a composition is in progress. Because it runs in the capture
		* phase on `document` — the outermost node — it fires BEFORE React's
		* delegated handlers (attached at the root container) and before any native
		* target/bubble listener, so an inlined third-party component (e.g. the
		* Univer office UI bundled into this plugin) can never intercept
		* composition keys. The browser's native IME processing is untouched:
		* stopPropagation only silences page JS, not the default action.
		*
		* The composition signal follows the DSH core convention (InputBar's IME
		* guard, issue #535): `isComposing` for modern engines, keyCode 229 as the
		* legacy signal engines emit without isComposing.
		*/
		/** The pure decision: is this keyboard event part of an IME composition?
		*  `isComposing` is optional on the input: React's synthetic KeyboardEvent
		*  type does not declare it (the DOM event always carries it), and the
		*  keyCode 229 fallback covers exactly those callers. */
		function isImeComposition(event) {
			return event.isComposing === true || event.keyCode === 229;
		}
		/**
		* Register the document-level capture guard. Returns the disposer
		* (HMR-safe; call through `ctx.effect`).
		*/
		function registerImeGuard() {
			const onKey = (event) => {
				if (isImeComposition(event)) event.stopPropagation();
			};
			document.addEventListener("keydown", onKey, true);
			document.addEventListener("keyup", onKey, true);
			return () => {
				document.removeEventListener("keydown", onKey, true);
				document.removeEventListener("keyup", onKey, true);
			};
		}
		//#endregion
		//#region src/client/menu-flip.ts
		/**
		* Submenu flip geometry for the portaled context menus.
		*
		* The primitives `Menu` clamps its main list into the viewport (portal mode,
		* 12px margin) but positions nested submenus with pure CSS — `bottom: -4px`
		* (grow UP from the parent row) and `left: calc(100% + 10px)` (open RIGHT of
		* the card) — with no viewport clamp at all. This sidebar lives docked on the
		* RIGHT edge of the window, so both defaults are the worst case here: a tall
		* "open with" submenu pokes past the viewport top when the row menu opens
		* near the top, and past the right edge whenever the panel is narrow.
		*
		* The host primitive is not ours to patch, so the fix is a body attribute
		* written while one of OUR submenu-bearing menus is open: layout.css flips
		* the submenu's growth direction per token. The attribute's lifetime IS the
		* scope — only our menus set it, and layout.css rules for
		* `div[role="menu"] div[role="menu"]` only apply while it exists, so
		* host-owned menus are never touched.
		*/
		/** body attribute carrying the flip tokens (whitespace-separated words). */
		const SUBMENU_FLIP_ATTR = "data-dsh-sidebar-submenu";
		/**
		* Mirror of the primitive's submenu geometry (Menu.module.css): card
		* min-width 218 + card-to-submenu gap 10 + submenu min-width 163..165 +
		* viewport margin 12 ≈ 400px of right-hand room a right-growing submenu
		* needs. If the cursor is within that of the right edge, open left instead.
		* The estimate is conservative (the primitive's own clamp can only move the
		* card further left), so a wrong guess flips left unnecessarily — never into
		* a new overflow — and drifting from future host metrics degrades the same
		* way, back to today's behavior at worst.
		*/
		const SUBMENU_RIGHT_ROOM = 400;
		/** Below the vertical midpoint the parent row usually has more room above. */
		function isUpperHalf(y, vh) {
			return y < vh / 2;
		}
		/**
		* The flip tokens for a menu opened at viewport coordinates (x, y):
		* `down` — open the submenu downward from the parent row (cursor in the
		* upper half; the sidebar's tab strip is always up there);
		* `left` — open the submenu leftward of the card (not enough right-hand
		* room). Empty string when the primitive's defaults already fit.
		*/
		function submenuFlipTokens(x, y, vw, vh) {
			const tokens = [];
			if (isUpperHalf(y, vh)) tokens.push("down");
			if (x + SUBMENU_RIGHT_ROOM > vw) tokens.push("left");
			return tokens.join(" ");
		}
		/**
		* Publish the flip tokens on <body> while the given cursor-anchored menu
		* state is open; clear them on close and on unmount (a menu left open by an
		* unmounting panel must not leave stale geometry on the shared body).
		* `menu` only needs the viewport coordinates the Menu anchored to.
		*/
		function useSubmenuFlip(menu) {
			(0, react.useEffect)(() => {
				if (menu === null) return;
				document.body.setAttribute(SUBMENU_FLIP_ATTR, submenuFlipTokens(menu.x, menu.y, window.innerWidth, window.innerHeight));
				return () => {
					document.body.removeAttribute(SUBMENU_FLIP_ATTR);
				};
			}, [menu]);
		}
		//#endregion
		//#region src/client/upload.ts
		/**
		* File-upload plumbing for the files window: turn a file picker or a drag-drop
		* into per-file raw-byte uploads through the sidebar's `/sidebar/upload` route.
		*
		* Folders keep their tree in both flows: the picker's `webkitdirectory`
		* selection arrives as Files with `webkitRelativePath` filled, and dropped
		* folders — which never surface in `dataTransfer.files` — are traversed via
		* `webkitGetAsEntry`, so the relative path is preserved for every nested file
		* and the host recreates the tree under the chosen directory. The File is
		* streamed straight into the POST body (no base64 inflation); uploads run
		* sequentially so one slow file cannot starve the others, and each result
		* reports its own outcome (the tree keeps going after a failure). An
		* optional `AbortSignal` stops the queue at the next item boundary and
		* aborts the in-flight request; the host cleans up its temp file when the
		* request stream dies.
		*/
		/** Sanitize a relative target: absolute paths, traversal, and empty segments
		*  are rejected (the host enforces the same rules with a 400). */
		function sanitizeRelativePath(rel) {
			if (rel === "" || isAbsolutePath$1(rel)) return void 0;
			if (rel.split(/[\\/]/).some((s) => s === "" || s === "." || s === "..")) return void 0;
			return rel;
		}
		/** The picker's relative path: webkitRelativePath when present, else the name. */
		function relativePathOf(file) {
			return sanitizeRelativePath(file.webkitRelativePath || file.name || "");
		}
		/** Collect a picker selection (webkitdirectory folders carry relative paths). */
		function uploadItemsFromFiles(files) {
			const items = [];
			for (const file of files) {
				const rel = relativePathOf(file);
				if (rel !== void 0) items.push({
					file,
					relativePath: rel
				});
			}
			return items;
		}
		/** Read one dropped file-system entry into upload items; directories
		*  recurse, prefixing their name onto every descendant's relative path. */
		async function itemsFromEntry(entry, prefix) {
			if (entry.isFile) {
				const file = await new Promise((resolve, reject) => {
					entry.file(resolve, reject);
				});
				const rel = sanitizeRelativePath(prefix + file.name);
				return rel === void 0 ? [] : [{
					file,
					relativePath: rel
				}];
			}
			if (entry.isDirectory) {
				const reader = entry.createReader();
				const entries = [];
				for (;;) {
					const batch = await new Promise((resolve, reject) => {
						reader.readEntries(resolve, reject);
					});
					if (batch.length === 0) break;
					entries.push(...batch);
				}
				return (await Promise.all(entries.map((child) => itemsFromEntry(child, `${prefix}${entry.name}/`)))).flat();
			}
			return [];
		}
		/**
		* Collect a drag-drop payload. Dropped folders do NOT surface in
		* `dataTransfer.files` — they arrive as directory items, so entries are
		* captured via `webkitGetAsEntry` and traversed (draining readEntries
		* batches), keeping each nested file's relative path. MUST be invoked
		* synchronously from the drop handler: the dataTransfer enters protected
		* mode once the event dispatch ends, while the captured entry handles stay
		* readable asynchronously. Falls back to the flat file list when the entry
		* API is unavailable; an entry that fails to read is skipped, not fatal.
		*/
		async function uploadItemsFromDrop(data) {
			if (data === void 0) return [];
			const entries = [...data.items].map((item) => item.kind === "file" ? item.webkitGetAsEntry() : null).filter((entry) => entry !== null);
			if (entries.length === 0) return uploadItemsFromFiles(data.files);
			return (await Promise.all(entries.map((entry) => itemsFromEntry(entry, "").catch(() => [])))).flat();
		}
		/** How long a success hint stays before fading (failures stay until the next action). */
		const UPLOAD_HINT_MS = 3500;
		/**
		* One-line upload progress text: 'Uploading into {dir}…' while no file is in
		* flight, then 'Uploading {done}/{total}: {name}' per file. Shared by the tree
		* hint and the full-window upload overlay.
		*/
		function uploadHintText(done, total, current, dir, t) {
			return current === "" ? t("uploadingTo", { dir }) : t("uploadProgress", {
				done,
				total,
				name: current
			});
		}
		/**
		* Upload every item into `dir` (absolute, inside the session workspace),
		* sequentially, reporting progress as `(done, total, currentRelativePath)`.
		* Resolves with one result per item — never rejects; `signal.aborted` stops
		* the queue at the next item boundary (completed items stay uploaded).
		*/
		async function uploadToDir(scope, dir, items, onProgress, signal) {
			const results = [];
			let done = 0;
			for (const item of items) {
				if (signal?.aborted) break;
				onProgress?.(done, items.length, item.relativePath);
				try {
					if (item.file.size > 134217728) results.push({
						relativePath: item.relativePath,
						ok: false,
						code: "too-large"
					});
					else {
						const res = await api.uploadFile(scope, dir, item.relativePath, item.file, signal);
						results.push({
							relativePath: item.relativePath,
							ok: true,
							path: res.path
						});
					}
				} catch (error) {
					if (error instanceof DOMException && error.name === "AbortError") break;
					results.push({
						relativePath: item.relativePath,
						ok: false,
						code: error instanceof SidebarApiError ? error.code : void 0,
						error: error instanceof Error ? error.message : String(error)
					});
				}
				done++;
			}
			onProgress?.(done, items.length, "");
			return results;
		}
		/** Fold a result list into a one-line status for the tree hint. */
		function summarizeResults(results, t) {
			const okCount = results.filter((r) => r.ok).length;
			const failed = results.find((r) => !r.ok);
			if (failed !== void 0) return t("uploadFailed", { error: failed.code === "too-large" ? t("uploadTooLarge") : failed.error ?? t("uploadFailedUnknown") });
			return t("uploadDone", { count: okCount });
		}
		//#endregion
		//#region src/client/FileTree.tsx
		/**
		* The controlled file tree behind the files window's tree panel (TreePanel
		* wraps it with the search box): a lazy VSCode-style tree rooted at the
		* session's working directory. Levels load on expansion (one API call per
		* directory), directories sort first, hidden entries render dimmed. The
		* expansion set lives in the per-session state (owned by the caller); the
		* caller also owns the refresh affordance — a `refreshTick` bump wipes the
		* level cache so the visible set reloads.
		*
		* Row actions: hovering a row reveals an @-reference button on the far
		* right (appends `@<relative path>` to the composer draft), and right-click
		* opens a context menu: file rows offer the caller's open escapes
		* (new tab / to the side, only when the callbacks exist) and a download
		* action (the host serves raw bytes, binary-safe); directory rows offer
		* "upload here"; every row can copy the relative or absolute path (with a
		* brief "copied" label replacing the button after a successful write).
		*
		* Uploads start here (drag-drop or the context menu picker) but run in the
		* caller: every request is reported through `onUploadRequest(dir, items)`
		* (VSCode semantics — a drop on a file row targets its parent directory),
		* and `busy` gates new drags while one upload is in flight.
		*/
		/** Root label: the last path segment (mirror of the host rootLabel). */
		function baseName(path) {
			const trimmed = path.replace(/[\\/]+$/, "");
			const at = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
			return at === -1 ? trimmed : trimmed.slice(at + 1);
		}
		/** The containing directory of an absolute row path (never the root edge here). */
		function parentOf(path) {
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return at <= 0 ? path : path.slice(0, at);
		}
		/** Only OS file drags belong to the upload surface; in-app drags (tab reorder,
		*  split zones) must pass through untouched to the pane's tab-drop handling
		*  (mirror of Sidebar.tsx's panel-host shield gate). */
		function isFileDrag(event) {
			return event.dataTransfer?.types.includes("Files") ?? false;
		}
		/** How long the row's "copied" label stays after a successful write. */
		const COPIED_MS = 1200;
		/**
		* The drop overlay's hero art: an arrow rising out of a notched tray
		* (upload zone — the same glyph family as the toolbar's upload icon) and a
		* tilted pair of photo cards (chat zone). Hand-drawn, colored in the
		* palette of DSH's own native drop illustration (#3964FE / #9CE5ED) so the
		* two zones read as one family; the drop overlay is this flow's one brand
		* moment, so it gets color the rest of the UI never does.
		*/
		const UploadDropIllustration = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: "64",
			height: "56",
			viewBox: "0 0 64 56",
			fill: "none",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M32 28V11",
					stroke: "#3964FE",
					strokeWidth: "5",
					strokeLinecap: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M23 20l9-9 9 9",
					stroke: "#3964FE",
					strokeWidth: "5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M10 40a4 4 0 0 1 4-4h7l3.2 4.6a5 5 0 0 0 4.1 2.2h7.4a5 5 0 0 0 4.1-2.2L43 36h7a4 4 0 0 1 4 4v2a10 10 0 0 1-10 10H20A10 10 0 0 1 10 42v-2z",
					fill: "#9CE5ED"
				})
			]
		});
		/** The chat zone's art: two tilted photo cards, each with its own
		*  sun-over-mountains motif (the back card carries detail too, so it never
		*  reads as a bare blob). */
		const ChatDropIllustration = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: "96",
			height: "76",
			viewBox: "0 0 96 76",
			fill: "none",
			"aria-hidden": "true",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
				transform: "rotate(-12 24 34)",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "6",
						y: "16",
						width: "36",
						height: "36",
						rx: "10",
						fill: "#9CE5ED"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "16",
						cy: "27",
						r: "3.5",
						fill: "white"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M11 44l8-9 6 6 4-4 8 9",
						stroke: "white",
						strokeWidth: "3",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
				transform: "rotate(8 61 35)",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "40",
						y: "12",
						width: "42",
						height: "46",
						rx: "10",
						fill: "#3964FE"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "55",
						cy: "27",
						r: "5",
						fill: "white"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M46 50l10-13 7 8 6-6 9 11",
						stroke: "white",
						strokeWidth: "3.5",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					})
				]
			})]
		});
		function FileTree(props) {
			const { sessionId, cwd, store, expanded, revealed, onToggle, onOpenFile, onOpenFileNewTab, onOpenFileSide, openWithTargets, openWithPinned, openWithSsh, onOpenWith, onToggleOpenWithPin, onReferenceFile, onPathRenamed, onPathDeleted, refreshTick, onUploadRequest, busy, service } = props;
			const [data, setData] = (0, react.useState)({});
			/**
			* Registry revision for the file-icon feature: bumps on ANY registry
			* change (register/dispose of tabs, viewers, or icons — one listener
			* set) so rows re-resolve their icons. The value itself is unread; the
			* state bump IS the re-render trigger.
			*/
			const [, setIconsVersion] = (0, react.useState)(0);
			(0, react.useEffect)(() => service?.subscribe(() => {
				setIconsVersion((version) => version + 1);
			}), [service]);
			/**
			* One file row's leading glyph. The service resolver owns the whole
			* chain (registered specific ext → built-in glyph map → registered
			* global default → stock VscFile, with per-factory crash isolation);
			* without a service the built-in map alone applies.
			*/
			const fileRowIcon = (path) => service !== void 0 ? service.fileIcon(path, 14) : builtinFileIcon(path, 14);
			/**
			* One directory row's leading glyph: the registered `'folder'` /
			* `'folder-open'` icon when present, else the built-in VSCodicons glyphs.
			*/
			const dirRowIcon = (path, open) => service !== void 0 ? service.folderIcon(path, open, 14) : builtinFolderIcon(open, 14);
			const dataRef = (0, react.useRef)(data);
			/** The row whose path was just copied ("copied" label replaces its button). */
			const [copiedPath, setCopiedPath] = (0, react.useState)(null);
			/** Open context menu: the row path (and whether it is a directory) plus the cursor position. */
			const [rowMenu, setRowMenu] = (0, react.useState)(null);
			useSubmenuFlip(rowMenu);
			/** The row being renamed inline: its path plus the edit buffer. */
			const [renaming, setRenaming] = (0, react.useState)(null);
			/** The delete awaiting the confirmation modal's yes. */
			const [confirmDelete, setConfirmDelete] = (0, react.useState)(null);
			/** The last mutation failure (dismissable strip above the tree). */
			const [actionError, setActionError] = (0, react.useState)(null);
			/** Whether a file drag hovers the tree (drives the portaled drop zone). */
			const [dropOver, setDropOver] = (0, react.useState)(false);
			/** The directory a drag is hovering right now (null = body, drop to root). */
			const [dropTarget, setDropTarget] = (0, react.useState)(null);
			/**
			* Enter/leave depth under the tree body. dragenter/dragleave fire per
			* element along the drag path (and bubble), so a counter — DSH InputBar's
			* own pattern — is the flicker-free signal; relatedTarget is unreliable
			* across engines for drag events.
			*/
			const dropDepth = (0, react.useRef)(0);
			/** Explorer body element; its viewport rect anchors the portaled drop zone. */
			const bodyRef = (0, react.useRef)(null);
			/** The body's viewport rect captured at drag entry (null = not measured). */
			const [dropRect, setDropRect] = (0, react.useState)(null);
			/** Context-menu "upload here" target directory. */
			const pendingUploadDir = (0, react.useRef)(void 0);
			const fileInputRef = (0, react.useRef)(null);
			/** Reset all drag state (drop landed, the drag left, or a new drag begins). */
			const resetDrop = () => {
				dropDepth.current = 0;
				setDropOver(false);
				setDropTarget(null);
				setDropRect(null);
			};
			/**
			* Drop handlers: always swallow the event (a dropped file must never open
			* in the browser), then report the target directory to the caller. A drop
			* ends the drag without further leave events, so the depth resets here.
			* The payload collection is async (dropped folders are traversed through
			* their entry handles — captured synchronously inside uploadItemsFromDrop
			* while the dataTransfer is still live), so the request rides a then.
			*/
			const reportDrop = (dir, data) => {
				if (busy) return;
				uploadItemsFromDrop(data).then((items) => {
					if (items.length > 0) onUploadRequest(dir, items);
				});
			};
			const handleBodyDrop = (event) => {
				if (!isFileDrag(event)) return;
				event.preventDefault();
				event.stopPropagation();
				resetDrop();
				if (cwd !== void 0) reportDrop(cwd, event.dataTransfer);
			};
			const handleDirDrop = (event, dir) => {
				if (!isFileDrag(event)) return;
				event.preventDefault();
				event.stopPropagation();
				resetDrop();
				reportDrop(dir, event.dataTransfer);
			};
			const handleFileDrop = (event, path) => {
				handleDirDrop(event, parentOf(path));
			};
			const handleBodyDragEnter = (event) => {
				if (!isFileDrag(event)) return;
				event.preventDefault();
				event.stopPropagation();
				dropDepth.current += 1;
				if (busy) return;
				if (dropDepth.current === 1) {
					const rect = bodyRef.current?.getBoundingClientRect();
					setDropRect(rect === void 0 ? null : {
						top: rect.top,
						left: rect.left,
						width: rect.width,
						height: rect.height
					});
				}
				setDropOver(true);
			};
			const handleBodyDragLeave = () => {
				dropDepth.current = Math.max(0, dropDepth.current - 1);
				if (dropDepth.current > 0) return;
				setDropOver(false);
				setDropTarget(null);
				setDropRect(null);
			};
			const handleBodyDragOver = (event) => {
				if (!isFileDrag(event)) return;
				event.preventDefault();
				event.stopPropagation();
				event.dataTransfer.dropEffect = busy ? "none" : "copy";
				if (busy) return;
				setDropTarget(null);
			};
			const handleRowDragOver = (event, dir) => {
				if (!isFileDrag(event)) return;
				event.preventDefault();
				event.stopPropagation();
				event.dataTransfer.dropEffect = busy ? "none" : "copy";
				if (busy) return;
				setDropTarget(dir);
			};
			const storeLevel = (0, react.useCallback)((path, level) => {
				dataRef.current = {
					...dataRef.current,
					[path]: level
				};
				setData(dataRef.current);
			}, []);
			const loadDir = (0, react.useCallback)((dir) => {
				if (dataRef.current[dir] !== void 0) return;
				storeLevel(dir, {});
				api.fsTree({
					sessionId,
					cwd
				}, dir).then((listing) => {
					storeLevel(dir, { entries: listing.entries });
				}).catch((error) => {
					storeLevel(dir, { error: error instanceof Error ? error.message : String(error) });
				});
			}, [
				sessionId,
				cwd,
				storeLevel
			]);
			/** Drop one level from the cache and reload it (the fence notice's retry). */
			const retryDir = (0, react.useCallback)((dir) => {
				delete dataRef.current[dir];
				setData({ ...dataRef.current });
				loadDir(dir);
			}, [loadDir]);
			/**
			* Settle the tree after one rename/delete landed at `prefix`: drop every
			* cached level at or under the old path, collapse the now-stale expanded
			* directories below it, and reload the immediate parent so the new shape
			* shows without a full refresh tick.
			*/
			const pruneTree = (prefix) => {
				const parent = parentOf(prefix);
				const under = (key) => key === prefix || key.startsWith(`${prefix}/`) || key.startsWith(`${prefix}\\`);
				for (const key of Object.keys(dataRef.current)) if (under(key)) delete dataRef.current[key];
				if (parent !== prefix) delete dataRef.current[parent];
				setData({ ...dataRef.current });
				for (const dir of expanded) if (under(dir)) onToggle(dir);
				if (parent !== prefix) retryDir(parent);
			};
			/** Client-side twin of the server's name rule (the server re-validates). */
			const validRename = (name) => name !== "" && name !== "." && name !== ".." && !name.includes("/") && !name.includes("\\");
			/** Commit the inline rename: trim, no-op guard, then fs.rename + settle. */
			const commitRename = (path, raw) => {
				setRenaming(null);
				const name = raw.trim();
				if (cwd === void 0 || name === baseName(path) || !validRename(name)) {
					if (name !== baseName(path) && !validRename(name)) setActionError(t("renameInvalid"));
					return;
				}
				api.fsRename({
					sessionId,
					cwd
				}, path, name).then((result) => {
					setActionError(null);
					pruneTree(path);
					onPathRenamed?.(path, result.path);
				}).catch((error) => {
					setActionError(error instanceof Error ? error.message : String(error));
				});
			};
			/** Run the confirmed delete: fs.remove + settle + close affected tabs. */
			const performDelete = (target) => {
				if (cwd === void 0) return;
				api.fsRemove({
					sessionId,
					cwd
				}, target.path).then(() => {
					setActionError(null);
					pruneTree(target.path);
					onPathDeleted?.(target.path, target.isDir);
				}).catch((error) => {
					setActionError(error instanceof Error ? error.message : String(error));
				});
			};
			const lastTick = (0, react.useRef)(refreshTick);
			(0, react.useEffect)(() => {
				if (lastTick.current === refreshTick) return;
				lastTick.current = refreshTick;
				dataRef.current = {};
				setData({});
			}, [refreshTick]);
			(0, react.useEffect)(() => {
				const root = cwd;
				if (root === void 0) return;
				loadDir(root);
				for (const dir of expanded) loadDir(dir);
			}, [
				cwd,
				expanded,
				refreshTick,
				loadDir
			]);
			(0, react.useEffect)(() => {
				if (revealed.length === 0) return;
				const body = bodyRef.current;
				if (body === null) return;
				const row = body.querySelector("[data-dsh-revealed]");
				if (row === null) return;
				const bodyTop = body.getBoundingClientRect().top;
				const rowRect = row.getBoundingClientRect();
				const target = body.scrollTop + (rowRect.top + rowRect.height / 2) - (bodyTop + body.clientHeight / 2);
				const max = Math.max(body.scrollHeight - body.clientHeight, 0);
				body.scrollTo({
					top: Math.min(Math.max(target, 0), max),
					behavior: "smooth"
				});
			}, [revealed, data]);
			/** Copy `text`; on success flip the row's copied label for a moment. */
			const copyPath = (0, react.useCallback)((text, path) => {
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(text).then((ok) => {
					if (!ok) return;
					setCopiedPath(path);
					window.setTimeout(() => {
						setCopiedPath((current) => current === path ? null : current);
					}, COPIED_MS);
				});
			}, []);
			/** The row's trailing actions: the @-reference button, or the copied label. */
			const rowActions = (entry) => {
				if (copiedPath === entry.path) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: sidebar_module_css_default.explorerCopied,
					children: t("copied")
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: sidebar_module_css_default.explorerRef,
					"aria-label": t("referenceFile"),
					title: t("referenceFile"),
					onClick: (event) => {
						event.stopPropagation();
						onReferenceFile(entry.path, entry.isDir);
					},
					children: t("referenceFile")
				});
			};
			const openRowMenu = (event, path, isDir) => {
				event.preventDefault();
				event.stopPropagation();
				setRowMenu({
					path,
					isDir,
					x: event.clientX,
					y: event.clientY
				});
			};
			/** Download a file through the host route (raw bytes, binary-safe). */
			const downloadFile = (path) => {
				const url = downloadUrl({
					sessionId,
					cwd
				}, path);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.style.display = "none";
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
			};
			/** The menu label of one open target: a locale key for the built-ins, the
			*  user's own name for custom editors, plus the SSH hint in remote mode. */
			const openWithLabelOf = (target) => {
				const name = target.nameKey !== void 0 ? t(target.nameKey) : target.name;
				return openWithSsh === true && !target.localOnly ? `${name}${t("openWithSshSuffix")}` : name;
			};
			/**
			* The "open with" menu entries: the pinned targets as DIRECT rows, then
			* the parent row with every target as a nested submenu. Both only render
			* when the caller wired the feature and at least one target is visible.
			*/
			const openWithEntries = () => {
				if (openWithTargets === void 0 || onOpenWith === void 0 || openWithTargets.length === 0) return [];
				const pinnedIds = openWithPinned ?? [];
				/** Brand marks for the built-ins (monochrome silhouettes, currentColor);
				*  reveal gets the folder glyph, custom editors a generic code mark.
				*  The compact menu's icon slot is 14px, so every mark renders at 14. */
				const itemIcon = (target) => {
					if (target.kind === "reveal") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscFolderOpened, { size: 14 });
					if (target.id === "vscode") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconVscode16, { size: 14 });
					if (target.id === "cursor") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SiCursor, { size: 14 });
					if (target.id === "zed") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SiZedindustries, { size: 14 });
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 });
				};
				const pinned = openWithTargets.filter((target) => pinnedIds.includes(target.id)).map((target) => ({
					id: `open-with:${target.id}`,
					label: openWithLabelOf(target),
					icon: itemIcon(target)
				}));
				const submenu = openWithTargets.map((target) => {
					const pinnedNow = pinnedIds.includes(target.id);
					return {
						id: `open-with:${target.id}`,
						label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: sidebar_module_css_default.openWithLabel,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.openWithName,
								children: openWithLabelOf(target)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								role: "button",
								tabIndex: -1,
								className: clsx(sidebar_module_css_default.openWithPin, pinnedNow && sidebar_module_css_default.openWithPinActive),
								"aria-label": pinnedNow ? t("unpinOpenWith") : t("pinOpenWith"),
								title: pinnedNow ? t("unpinOpenWith") : t("pinOpenWith"),
								onClick: (event) => {
									event.preventDefault();
									event.stopPropagation();
									onToggleOpenWithPin?.(target.id);
								},
								children: pinnedNow ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscPinned, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscPin, { size: 12 })
							})]
						}),
						icon: itemIcon(target)
					};
				});
				return [
					...pinned,
					...pinned.length > 0 ? [{
						id: "open-with-sep",
						type: "separator"
					}] : [],
					{
						id: "open-with-menu",
						label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: sidebar_module_css_default.openWithLabel,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.openWithName,
								children: t("openWithMenu")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {
								size: 14,
								className: sidebar_module_css_default.openWithChevron,
								"aria-hidden": true
							})]
						}),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscLinkExternal, { size: 14 }),
						submenu
					}
				];
			};
			const root = cwd;
			const expandedSet = (0, react.useMemo)(() => new Set(expanded), [expanded]);
			const revealedSet = (0, react.useMemo)(() => new Set(revealed), [revealed]);
			/**
			* Focus + select the rename editor once, on mount. The callback identity
			* must stay STABLE (useCallback []): an inline arrow re-runs on every
			* render (detach null → attach el), and focus()/select() mid-keystroke
			* would reselect the whole buffer while typing. A plain <input>, not the
			* primitives Input — that one forwards no ref, and focus+select is the
			* entire point here.
			*/
			const renameInputRef = (0, react.useCallback)((el) => {
				if (el !== null) {
					el.focus();
					el.select();
				}
			}, []);
			/** The inline rename editor replacing one row (dirs and files alike):
			*  same indent/icon/height for a seamless swap, Enter/blur commits,
			*  Escape cancels, IME composition keys never reach the handlers (the
			*  shared isImeComposition guard). */
			const renderRenameRow = (entry, depth) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(sidebar_module_css_default.explorerRow, sidebar_module_css_default.explorerRenaming),
				style: { paddingLeft: depth * 22 + 6 },
				children: [entry.isDir ? dirRowIcon(entry.path, expandedSet.has(entry.path)) : fileRowIcon(entry.path), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					ref: renameInputRef,
					className: sidebar_module_css_default.explorerRenameInput,
					value: renaming?.value ?? "",
					"aria-label": t("rename"),
					spellCheck: false,
					onChange: (event) => {
						setRenaming((prev) => prev === null ? prev : {
							...prev,
							value: event.target.value
						});
					},
					onKeyDown: (event) => {
						if (isImeComposition(event)) return;
						if (event.key === "Enter") {
							event.preventDefault();
							commitRename(entry.path, renaming?.value ?? "");
						} else if (event.key === "Escape") {
							event.preventDefault();
							setRenaming(null);
						}
					},
					onBlur: () => {
						commitRename(entry.path, renaming?.value ?? "");
					}
				})]
			}, entry.path);
			const renderLevel = (dir, depth) => {
				const level = data[dir];
				if (level === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.explorerRow,
					style: { paddingLeft: depth * 22 + 6 },
					children: t("loading")
				});
				if (level.error !== void 0) {
					if (isOutsideWorkspaceMessage(level.error)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { paddingLeft: depth * 22 + 6 },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FenceErrorNotice, {
							store,
							onDisabled: () => {
								retryDir(dir);
							}
						})
					});
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: clsx(sidebar_module_css_default.explorerRow, sidebar_module_css_default.explorerError),
						style: { paddingLeft: depth * 22 + 6 },
						children: level.error
					});
				}
				return (level.entries ?? []).map((entry) => {
					if (renaming?.path === entry.path) return renderRenameRow(entry, depth);
					if (entry.isDir) {
						const isOpen = expandedSet.has(entry.path);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "button",
							tabIndex: 0,
							className: clsx(sidebar_module_css_default.explorerRow, sidebar_module_css_default.explorerDir, entry.hidden && sidebar_module_css_default.explorerHidden, dropTarget === entry.path && sidebar_module_css_default.explorerRowDropTarget, revealedSet.has(entry.path) && sidebar_module_css_default.explorerRowRevealed),
							"data-dsh-revealed": revealedSet.has(entry.path) ? "true" : void 0,
							style: { paddingLeft: depth * 22 + 6 },
							onClick: () => {
								onToggle(entry.path);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onToggle(entry.path);
								}
							},
							onDragOver: (event) => {
								handleRowDragOver(event, entry.path);
							},
							onDrop: (event) => {
								handleDirDrop(event, entry.path);
							},
							onContextMenu: (event) => {
								openRowMenu(event, entry.path, true);
							},
							children: [
								dirRowIcon(entry.path, isOpen),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: sidebar_module_css_default.explorerName,
									children: entry.name
								}),
								entry.isSymlink && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline16, {
									size: 12,
									className: sidebar_module_css_default.explorerSymlink
								}),
								rowActions(entry)
							]
						}), isOpen && renderLevel(entry.path, depth + 1)] }, entry.path);
					}
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "button",
						tabIndex: 0,
						className: clsx(sidebar_module_css_default.explorerRow, entry.hidden && sidebar_module_css_default.explorerHidden, entry.broken && sidebar_module_css_default.explorerBroken, dropTarget === parentOf(entry.path) && sidebar_module_css_default.explorerRowDropTarget, revealedSet.has(entry.path) && sidebar_module_css_default.explorerRowRevealed),
						"data-dsh-revealed": revealedSet.has(entry.path) ? "true" : void 0,
						style: { paddingLeft: depth * 22 + 6 },
						title: entry.broken ? `${entry.path} — ${t("brokenSymlink")}` : entry.path,
						onClick: () => {
							onOpenFile(entry.path);
						},
						onKeyDown: (event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onOpenFile(entry.path);
							}
						},
						onDragOver: (event) => {
							handleRowDragOver(event, parentOf(entry.path));
						},
						onDrop: (event) => {
							handleFileDrop(event, entry.path);
						},
						onContextMenu: (event) => {
							openRowMenu(event, entry.path, false);
						},
						children: [
							fileRowIcon(entry.path),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.explorerName,
								children: entry.name
							}),
							entry.isSymlink && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline16, {
								size: 12,
								className: sidebar_module_css_default.explorerSymlink
							}),
							rowActions(entry)
						]
					}, entry.path);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: bodyRef,
				className: sidebar_module_css_default.explorerBody,
				onDragEnter: handleBodyDragEnter,
				onDragOver: handleBodyDragOver,
				onDragLeave: handleBodyDragLeave,
				onDrop: handleBodyDrop,
				children: [
					root === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.explorerEmpty,
						children: t("noSession")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						actionError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.explorerActionError,
							role: "alert",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sidebar_module_css_default.explorerActionErrorText,
								children: actionError
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.explorerActionErrorClose,
								"aria-label": t("dismiss"),
								onClick: () => {
									setActionError(null);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: clsx(sidebar_module_css_default.explorerRow, dropTarget === root && sidebar_module_css_default.explorerRowDropTarget),
							style: { paddingLeft: 6 },
							onDragOver: (event) => {
								handleRowDragOver(event, root);
							},
							onDrop: (event) => {
								handleDirDrop(event, root);
							},
							onContextMenu: (event) => {
								openRowMenu(event, root, true);
							},
							children: [
								dirRowIcon(root, true),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: sidebar_module_css_default.explorerName,
									children: baseName(root)
								}),
								copiedPath === root ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: sidebar_module_css_default.explorerCopied,
									children: t("copied")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sidebar_module_css_default.explorerRef,
									"aria-label": t("referenceFile"),
									title: t("referenceFile"),
									onClick: (event) => {
										event.stopPropagation();
										onReferenceFile(root, true);
									},
									children: t("referenceFile")
								})
							]
						}),
						data[root] !== void 0 && renderLevel(root, 1)
					] }),
					dropOver && dropRect !== null && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.uploadDropZone,
						style: {
							top: dropRect.top + 2,
							left: dropRect.left + 2,
							width: dropRect.width - 4,
							height: dropRect.height - 4
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.uploadDropHero,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UploadDropIllustration, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sidebar_module_css_default.uploadDropZonePill,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconUploadOutline16, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: sidebar_module_css_default.uploadDropZoneText,
									children: dropTarget !== null ? t("uploadTo", { dir: dropTarget }) : t("uploadDropHint")
								})]
							})]
						})
					}), dropRect.left >= 200 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.uploadDropChatHint,
						style: { width: dropRect.left },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.uploadDropChatCard,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChatDropIllustration, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("uploadDropChat") })]
						})
					})] }), document.body),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						ref: fileInputRef,
						type: "file",
						multiple: true,
						style: { display: "none" },
						onChange: (event) => {
							const dir = pendingUploadDir.current ?? root;
							pendingUploadDir.current = void 0;
							if (dir !== void 0 && !busy) onUploadRequest(dir, uploadItemsFromFiles(event.target.files ?? []));
							event.target.value = "";
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open: rowMenu !== null,
						onClose: () => {
							setRowMenu(null);
						},
						items: [
							...rowMenu?.isDir === false && onOpenFileNewTab !== void 0 ? [{
								id: "open-new-tab",
								label: t("openFileNewTab"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 })
							}] : [],
							...rowMenu?.isDir === false && onOpenFileSide !== void 0 ? [{
								id: "open-side",
								label: t("openFileSide"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscFolderOpened, { size: 14 })
							}] : [],
							...openWithEntries(),
							...rowMenu?.isDir === false ? [{
								id: "download",
								label: t("download"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 14 })
							}] : [],
							...rowMenu?.isDir === true ? [{
								id: "upload-here",
								label: t("uploadHere"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconUploadOutline16, { size: 14 })
							}] : [],
							{
								id: "relative",
								label: t("copyRelative"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
							},
							{
								id: "absolute",
								label: t("copyAbsolute"),
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
							},
							...rowMenu !== null && rowMenu.path !== cwd ? [
								{
									id: "mutate-sep",
									type: "separator"
								},
								{
									id: "rename",
									label: t("rename"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 })
								},
								{
									id: "delete",
									label: t("delete"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 }),
									danger: true
								}
							] : []
						],
						onSelect: (id) => {
							const target = rowMenu;
							if (target === null) return;
							setRowMenu(null);
							if (id === "open-new-tab") {
								onOpenFileNewTab?.(target.path);
								return;
							}
							if (id === "open-side") {
								onOpenFileSide?.(target.path);
								return;
							}
							if (id.startsWith("open-with:")) {
								onOpenWith?.(id.slice(10), target.path);
								return;
							}
							if (id === "download") {
								downloadFile(target.path);
								return;
							}
							if (id === "upload-here") {
								pendingUploadDir.current = target.path;
								fileInputRef.current?.click();
								return;
							}
							if (id === "rename") {
								setRenaming({
									path: target.path,
									value: baseName(target.path)
								});
								return;
							}
							if (id === "delete") {
								setConfirmDelete({
									path: target.path,
									isDir: target.isDir,
									name: baseName(target.path)
								});
								return;
							}
							copyPath(id === "relative" ? relativeTo(cwd ?? "", target.path) : target.path, target.path);
						},
						portal: true,
						compact: true,
						align: "start",
						getAnchorRect: () => rowMenu === null ? null : new DOMRect(rowMenu.x, rowMenu.y, 0, 0),
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: confirmDelete !== null,
						onClose: () => {
							setConfirmDelete(null);
						},
						title: confirmDelete === null ? "" : t("deleteTitle", { name: confirmDelete.name }),
						closeLabel: t("cancel"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: () => {
								setConfirmDelete(null);
							},
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							onClick: () => {
								const pending = confirmDelete;
								if (pending === null) return;
								setConfirmDelete(null);
								performDelete(pending);
							},
							children: t("delete")
						})] }),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: sidebar_module_css_default.explorerConfirmDesc,
							children: confirmDelete === null ? "" : t(confirmDelete.isDir ? "deleteDescDir" : "deleteDescFile")
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/frame-batcher.ts
		function createFrameBatcher() {
			let frame = null;
			let task = null;
			const run = () => {
				frame = null;
				const current = task;
				task = null;
				current?.();
			};
			return {
				schedule(next) {
					task = next;
					if (frame === null) frame = requestAnimationFrame(run);
				},
				flushNow() {
					if (frame !== null) {
						cancelAnimationFrame(frame);
						frame = null;
					}
					run();
				},
				dispose() {
					if (frame !== null) {
						cancelAnimationFrame(frame);
						frame = null;
					}
					task = null;
				}
			};
		}
		//#endregion
		//#region src/client/open-with.ts
		/** The default open-with configuration (fresh documents). */
		const OPEN_WITH_DEFAULTS = {
			sshHost: "",
			customEditors: [],
			pinned: []
		};
		/** The built-in open targets, in menu order. */
		const OPEN_WITH_BUILTINS = [
			{
				id: "explorer",
				nameKey: "openWithExplorer",
				name: "",
				kind: "reveal",
				isVscodeFamily: false,
				localOnly: true
			},
			{
				id: "vscode",
				nameKey: "openWithVscode",
				name: "",
				kind: "url",
				urlTemplate: "vscode://file/{path}",
				isVscodeFamily: true,
				localOnly: false
			},
			{
				id: "cursor",
				nameKey: "openWithCursor",
				name: "",
				kind: "url",
				urlTemplate: "cursor://file/{path}",
				isVscodeFamily: true,
				localOnly: false
			},
			{
				id: "zed",
				nameKey: "openWithZed",
				name: "",
				kind: "url",
				urlTemplate: "zed://file/{path}",
				isVscodeFamily: false,
				localOnly: true
			}
		];
		/** Whether a persisted value makes a structurally valid custom-editor row.
		*  Name/template may be empty — the settings panel edits rows in place and
		*  an in-progress row must survive the round-trip; the MENU hides rows that
		*  fail the stricter {@link isValidCustomEditor} check. */
		function isCustomEditor(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
			const record = value;
			return typeof record.id === "string" && record.id !== "" && typeof record.name === "string" && typeof record.urlTemplate === "string" && typeof record.isVscodeFamily === "boolean";
		}
		/**
		* Parse the persisted `openWith` blob (tolerant): malformed fields fall back
		* to the defaults, malformed custom-editor rows are dropped, and pinned ids
		* are kept verbatim (unknown ids are pruned when the targets are resolved —
		* the menu is the only consumer of the resolved list).
		*/
		function parseOpenWithConfig(raw) {
			if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return { ...OPEN_WITH_DEFAULTS };
			const record = raw;
			return {
				sshHost: typeof record.sshHost === "string" ? record.sshHost : "",
				customEditors: Array.isArray(record.customEditors) ? record.customEditors.filter(isCustomEditor) : [],
				pinned: Array.isArray(record.pinned) ? record.pinned.filter((id) => typeof id === "string" && id !== "") : []
			};
		}
		/** Whether a custom editor id belongs to this config (id prefix match). */
		function customIdOf(id) {
			return `custom:${id}`;
		}
		/**
		* The menu-visible open targets, in order (built-ins then custom editors).
		* In SSH mode the local-only targets (the OS file manager, Zed, custom
		* editors without the VSCode dialect) are dropped — they cannot reach a
		* remote path. Unknown pinned ids are pruned here too.
		*/
		function resolveOpenWithTargets(config) {
			const ssh = config.sshHost.trim() !== "";
			return [...OPEN_WITH_BUILTINS, ...config.customEditors.filter(isValidCustomEditor).map((editor) => ({
				id: customIdOf(editor.id),
				name: editor.name,
				kind: "url",
				urlTemplate: editor.urlTemplate,
				isVscodeFamily: editor.isVscodeFamily,
				localOnly: !editor.isVscodeFamily
			}))].filter((target) => !(ssh && target.localOnly));
		}
		/** The SSH hint appended to a target's label in remote mode. */
		function openWithSshActive(config) {
			return config.sshHost.trim() !== "";
		}
		/**
		* The URL to open for one resolved target, or undefined when the target has
		* no URL form (reveal) or the template is malformed. The path is inserted
		* RAW into the template (browsers percent-encode as needed; VSCode-family
		* URL parsers consume the absolute path with its leading slash, e.g.
		* `vscode://file//home/u/f.ts` or `vscode://file/C:/Users/u/f.ts`).
		*/
		function openWithUrl(target, path, config) {
			if (target.kind !== "url" || target.urlTemplate === void 0) return void 0;
			const normalized = normalizeUrlPath(path);
			if (openWithSshActive(config) && target.isVscodeFamily) {
				const scheme = schemeOf(target.urlTemplate);
				if (scheme === void 0) return void 0;
				return `${scheme}://vscode-remote/ssh-remote+${config.sshHost.trim()}${normalized}`;
			}
			if (!target.urlTemplate.includes("{path}") || !hasUrlScheme(target.urlTemplate)) return void 0;
			return target.urlTemplate.replace("{path}", normalized);
		}
		/** Whether a template starts with a `scheme://` prefix (the only shape the
		*  host's external opener accepts and the settings panel suggests). */
		function hasUrlScheme(template) {
			return /^[a-z][a-z0-9+.-]*:\/\//i.test(template);
		}
		/** The scheme of a URL template (the part before the first ':'), or undefined. */
		function schemeOf(template) {
			const at = template.indexOf(":");
			if (at <= 0) return void 0;
			const scheme = template.slice(0, at);
			return /^[a-z][a-z0-9+.-]*$/i.test(scheme) ? scheme : void 0;
		}
		/** Normalize a filesystem path for embedding in a URL (backslashes → '/'). */
		function normalizeUrlPath(path) {
			return path.replace(/\\/g, "/");
		}
		/** A fresh custom-editor id (uuid when available, time-based fallback). */
		function newCustomEditorId() {
			if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
			return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
		}
		/** Validate one custom-editor row before the settings panel accepts it. */
		function isValidCustomEditor(row) {
			return row.name.trim() !== "" && row.urlTemplate.includes("{path}") && /^[a-z][a-z0-9+.-]*:\/\//i.test(row.urlTemplate.trim());
		}
		//#endregion
		//#region src/client/plugin-settings.ts
		/**
		* Pending-writes queue for the file tree's open-with config: pin toggles and
		* (outside the settings popup) config edits land in the sidebar prefs as
		* `pluginSettings['editor']`. Writes are serialized through one promise chain
		* so a quick burst of pin clicks can never read a stale pluginSettings map
		* and drop an earlier toggle; each write pushes the whole open map patch
		* through the revision-free settings route and adopts the returned document.
		*
		* (The settings popup has its own serialized commit — SideCardSection's —
		* so its rows and this helper rarely race; the shared route's last-write-wins
		* semantics cover the uncommon overlap.)
		*/
		let queue = Promise.resolve();
		/**
		* Merge one plugin-owned settings blob of one descriptor and persist it.
		* @param store - the sidebar store (its prefs are replaced by the write result).
		* @param descriptorId - the descriptor whose blob is patched ('editor' here).
		* @param updater - pure patch function; receives a shallow copy of the blob.
		*/
		function updatePluginSettings(store, descriptorId, updater) {
			queue = queue.then(async () => {
				const prefs = store.getPrefs();
				const next = updater({ ...prefs.pluginSettings[descriptorId] ?? {} });
				const view = await api.settingsUpdate({ pluginSettings: {
					...prefs.pluginSettings,
					[descriptorId]: next
				} });
				store.setPrefs(parsePrefs(view.value));
			}).catch((error) => {
				console.error("open-with settings write failed", error);
			});
		}
		//#endregion
		//#region src/client/UploadOverlay.tsx
		/**
		* Full-window upload progress over the files tree: a blurred scrim (same mask
		* token as the repo's Modal primitive) with a card showing the target
		* directory, file-level progress, and a cancel button. Esc cancels too —
		* clicking the scrim does not, so a stray click can never abort an upload.
		* Rendered inside TreePanel (absolute inset-0), so it covers only the file
		* window and never the conversation column.
		*/
		function UploadOverlay(props) {
			const { dir, done, total, current, onCancel, cancelling } = props;
			(0, react.useEffect)(() => {
				const onKey = (event) => {
					if (event.key === "Escape") onCancel();
				};
				window.addEventListener("keydown", onKey);
				return () => {
					window.removeEventListener("keydown", onKey);
				};
			}, [onCancel]);
			const percent = total === 0 ? 0 : Math.min(100, Math.round(done / total * 100));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: sidebar_module_css_default.uploadOverlay,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("uploadingTo", { dir }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.uploadOverlayCard,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.uploadOverlayTitle,
							title: dir,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconUploadOutline16, { size: 16 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("uploadingTo", { dir }) })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.uploadOverlayProgress,
							role: "progressbar",
							"aria-valuemin": 0,
							"aria-valuemax": total,
							"aria-valuenow": done,
							"aria-valuetext": t("uploadProgress", {
								done,
								total,
								name: current
							}),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sidebar_module_css_default.uploadOverlayProgressFill,
								style: { width: `${percent}%` }
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.uploadOverlayStatus,
							children: uploadHintText(done, total, current, dir, t)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.uploadOverlayCancel,
							disabled: cancelling,
							onClick: onCancel,
							children: t("cancel")
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/TreePanel.tsx
		/**
		* The files window's tree surface: a global file-name search box on top
		* (300ms debounce; an in-flight search is aborted by the next keystroke)
		* over either the shared controlled FileTree (empty query) or the flat
		* result list (relative paths; click opens through the caller's mode-aware
		* open). Owns its refresh tick: the icon next to the search input clears
		* the tree cache. EditorHost docks it as the tab's right panel (wrapped in
		* a drag-resize handle) and provides the file context-menu open escapes.
		*
		* Uploads (header pickers, the tree's drag-drop and "upload here" menu)
		* all funnel through here: one session at a time, shown in a full-window
		* progress overlay with cancel, followed by a tree refresh and a one-line
		* hint under the search row (success fades, failures and cancels stay).
		* OS file drags are shielded at the panel host (see Sidebar.tsx), so a
		* drop over the file window uploads here and never reaches DSH's chat
		* intake.
		*/
		function TreePanel(props) {
			const { sessionId, cwd, store, expanded, revealed, onToggle, onOpenFile, onOpenFileNewTab, onOpenFileSide, openWithTargets, openWithPinned, openWithSsh, onOpenWith, onToggleOpenWithPin, onReferenceFile, onPathRenamed, onPathDeleted, full, service } = props;
			const [query, setQuery] = (0, react.useState)("");
			const [results, setResults] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [refreshTick, setRefreshTick] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				const bump = () => {
					setRefreshTick((tick) => tick + 1);
				};
				window.addEventListener("focus", bump);
				window.addEventListener("dsh-sidebar:refresh-files", bump);
				return () => {
					window.removeEventListener("focus", bump);
					window.removeEventListener("dsh-sidebar:refresh-files", bump);
				};
			}, []);
			/** One-line upload status under the search row ('' hides the hint). */
			const [uploadStatus, setUploadStatus] = (0, react.useState)("");
			/** Whether the status line is a failure/cancel (error color, stays visible). */
			const [uploadFailed, setUploadFailed] = (0, react.useState)(false);
			/** The in-flight upload session (null → no overlay, buttons enabled). */
			const [upload, setUpload] = (0, react.useState)(null);
			/** True between the cancel click and the session settling (button disabled). */
			const [cancelling, setCancelling] = (0, react.useState)(false);
			/** Set by cancelUpload; the settle path shows 'upload cancelled' instead of
			*  summarizing the partial results. */
			const cancelledRef = (0, react.useRef)(false);
			const fileInputRef = (0, react.useRef)(null);
			const folderInputRef = (0, react.useRef)(null);
			/** Start one upload session into `dir` (absolute, inside the workspace). */
			const startUpload = (dir, items) => {
				if (items.length === 0 || cwd === void 0 || upload !== null) return;
				cancelledRef.current = false;
				const controller = new AbortController();
				setUploadFailed(false);
				setUploadStatus(uploadHintText(0, items.length, "", dir, t));
				setUpload({
					dir,
					done: 0,
					total: items.length,
					current: "",
					controller
				});
				uploadToDir({
					sessionId,
					cwd
				}, dir, items, (done, total, current) => {
					if (current !== "") setUploadStatus(uploadHintText(done, total, current, dir, t));
					setUpload((session) => session === null ? session : {
						...session,
						done,
						total,
						current
					});
				}, controller.signal).then((results) => {
					setUpload(null);
					setCancelling(false);
					setRefreshTick((tick) => tick + 1);
					if (cancelledRef.current) {
						setUploadStatus(t("uploadCancelled"));
						setUploadFailed(true);
						return;
					}
					const status = summarizeResults(results, t);
					setUploadStatus(status);
					setUploadFailed(results.some((result) => !result.ok));
					if (results.every((result) => result.ok)) window.setTimeout(() => {
						setUploadStatus((current) => current === status ? "" : current);
					}, UPLOAD_HINT_MS);
				});
			};
			/** Cancel the in-flight upload (aborts the request; the host drops its temp). */
			const cancelUpload = () => {
				if (upload === null || cancelling) return;
				cancelledRef.current = true;
				setCancelling(true);
				upload.controller.abort();
			};
			const folderInputProps = { webkitdirectory: "" };
			const needle = query.trim();
			(0, react.useEffect)(() => {
				if (needle === "") {
					setResults(null);
					setError(null);
					return;
				}
				const controller = new AbortController();
				const timer = window.setTimeout(() => {
					api.fsSearch({
						sessionId,
						cwd
					}, needle, controller.signal).then((found) => {
						setResults(found);
						setError(null);
					}).catch((failure) => {
						if (controller.signal.aborted) return;
						setResults(null);
						setError(failure instanceof Error ? failure.message : String(failure));
					});
				}, 300);
				return () => {
					window.clearTimeout(timer);
					controller.abort();
				};
			}, [
				sessionId,
				cwd,
				needle
			]);
			const busy = upload !== null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(sidebar_module_css_default.editorTreePanel, full === true && sidebar_module_css_default.editorTreePanelFull),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.editorTreeSearch,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: sidebar_module_css_default.editorSearchInput,
								value: query,
								placeholder: t("editorSearchPlaceholder"),
								spellCheck: false,
								onChange: (event) => {
									setQuery(event.target.value);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("refresh"),
								title: t("refresh"),
								onClick: () => {
									setRefreshTick((tick) => tick + 1);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("uploadFiles"),
								title: t("uploadFiles"),
								disabled: busy,
								onClick: () => {
									fileInputRef.current?.click();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconUploadOutline16, { size: 14 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("uploadFolder"),
								title: t("uploadFolder"),
								disabled: busy,
								onClick: () => {
									folderInputRef.current?.click();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 14 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: fileInputRef,
								type: "file",
								multiple: true,
								style: { display: "none" },
								onChange: (event) => {
									if (cwd !== void 0) startUpload(cwd, uploadItemsFromFiles(event.target.files ?? []));
									event.target.value = "";
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: folderInputRef,
								type: "file",
								multiple: true,
								...folderInputProps,
								style: { display: "none" },
								onChange: (event) => {
									if (cwd !== void 0) startUpload(cwd, uploadItemsFromFiles(event.target.files ?? []));
									event.target.value = "";
								}
							})
						]
					}),
					uploadStatus !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: clsx(sidebar_module_css_default.editorSearchHint, uploadFailed && sidebar_module_css_default.editorError),
						title: uploadStatus,
						children: uploadStatus
					}),
					needle === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTree, {
						sessionId,
						cwd,
						store,
						expanded,
						revealed,
						onToggle,
						onOpenFile,
						onOpenFileNewTab,
						onOpenFileSide,
						openWithTargets,
						openWithPinned,
						openWithSsh,
						onOpenWith,
						onToggleOpenWithPin,
						onReferenceFile,
						onPathRenamed,
						onPathDeleted,
						refreshTick,
						onUploadRequest: startUpload,
						busy,
						service
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.explorerBody,
						children: [
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: clsx(sidebar_module_css_default.editorSearchHint, sidebar_module_css_default.editorError),
								children: error
							}),
							error === null && results === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sidebar_module_css_default.editorSearchHint,
								children: t("loading")
							}),
							error === null && results !== null && results.matches.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sidebar_module_css_default.editorSearchHint,
								children: t("editorSearchNoResults")
							}),
							error === null && results !== null && results.matches.map((rel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.editorSearchResult,
								title: rel,
								onClick: () => {
									onOpenFile(resolveSidebarPath(cwd, rel));
								},
								children: rel
							}, rel)),
							error === null && results?.truncated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sidebar_module_css_default.editorSearchHint,
								children: t("editorSearchTruncated")
							})
						]
					}),
					upload !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UploadOverlay, {
						dir: upload.dir,
						done: upload.done,
						total: upload.total,
						current: upload.current,
						onCancel: cancelUpload,
						cancelling
					})
				]
			});
		}
		//#endregion
		//#region src/client/tree-mutations.ts
		/** Every open tab that carries a file path. */
		function pathTabsOf(snapshot) {
			const state = snapshot.state;
			if (state === void 0) return [];
			const tabs = [];
			for (const leaf of allLeaves(state.bottomSplits)) tabs.push(...leaf.tabs);
			return tabs.filter((tab) => tab.path !== void 0);
		}
		/** Retarget tabs after `oldPath` became `newPath` (title follows the new
		*  base name, matching how openFile titles editor tabs). */
		function retargetPathTabs(ctx, store, oldPath, newPath) {
			const service = ctx.get("betterSidebar");
			if (service === void 0) return;
			for (const tab of pathTabsOf(store.getSnapshot())) if (tab.path === oldPath) service.updateTab(tab.id, {
				path: newPath,
				title: baseName(newPath)
			});
		}
		/** Close tabs at or under the removed `target` (a directory takes its whole
		*  subtree of open files with it). */
		function closePathTabs(ctx, store, target) {
			const service = ctx.get("betterSidebar");
			if (service === void 0) return;
			for (const tab of pathTabsOf(store.getSnapshot())) {
				const path = tab.path;
				if (path !== void 0 && (path === target || isWithinWorkspace(target, path))) service.closeTab(tab.id);
			}
		}
		//#endregion
		//#region src/client/EditorHost.tsx
		/**
		* The editor tab host: the single FILES WINDOW. It resolves a file's
		* previewer through the sidebar registry (`matchFileViewer`), fetches bytes
		* per the matched viewer's fetch strategy, and renders its component — or
		* the shared download pane when nothing can render the file. A tab without
		* a path (the seeded "Files" home) renders an empty-state hint instead of
		* the viewer loading flow; that path-less window IS the file explorer.
		*
		* The chrome depends on the `editorExplorer` mode (read reactively so
		* toggling it re-renders without a reload):
		* - merged (in-place): tree click / path-input Enter switch the CURRENT
		*   tab in place (updateTab rewrites path/title; the tab keeps its id and
		*   meta, so treeOpen/treeWidth survive the switch);
		* - split: they open through `openSidebarFile` (a per-path dedupe tab),
		*   and a PATH-LESS window is the standalone explorer — it renders ONLY
		*   the tree panel (search + FileTree, full-window), no editor chrome.
		*   Editor tabs (with a path) keep the full chrome in both modes.
		* The tree's context menu offers the explicit escapes in both modes: open
		* in a new tab (per-path dedupe) or to the side (a fresh tab in a fresh
		* rightward split of the current pane).
		*
		* The strategy dispatch is pure (planFirstMatch / planFsReadOutcome in
		* editor-load.ts); this component only wires it to the host APIs.
		*/
		/** The docked tree panel's width bounds (drag-resize clamps into them). */
		const TREE_WIDTH_DEFAULT = 240;
		const TREE_WIDTH_MIN = 160;
		const TREE_WIDTH_MAX = 480;
		/** Stable empty blob for the editor pluginSettings read (a fresh `?? {}`
		*  would change identity every snapshot and loop useSyncExternalStore). */
		const EMPTY_PLUGIN_BLOB = {};
		/** The tab's persisted meta object (a malformed meta reads as empty). */
		function metaOf(tab) {
			return tab.meta !== null && typeof tab.meta === "object" && !Array.isArray(tab.meta) ? tab.meta : {};
		}
		/** Read the persisted tree-panel flag of one editor tab: an explicit
		*  boolean meta wins; otherwise path-less tabs (the seeded home) default
		*  open and file tabs default closed. */
		function treeOpenOf(tab) {
			const treeOpen = metaOf(tab).treeOpen;
			return typeof treeOpen === "boolean" ? treeOpen : tab.path === void 0 || tab.path === "";
		}
		/** Read the persisted tree-panel width (clamped; default 240). */
		function treeWidthOf(tab) {
			const width = metaOf(tab).treeWidth;
			return typeof width === "number" && Number.isFinite(width) ? Math.min(TREE_WIDTH_MAX, Math.max(TREE_WIDTH_MIN, Math.round(width))) : TREE_WIDTH_DEFAULT;
		}
		/** Merge a patch into the tab's persisted meta (rides the layout). */
		function patchMeta(ctx, tab, patch) {
			ctx.get("betterSidebar")?.updateTab(tab.id, { meta: {
				...metaOf(tab),
				...patch
			} });
		}
		/** Clamp one dock width into the contract range. */
		function clampTreeWidth(value) {
			return Math.min(TREE_WIDTH_MAX, Math.max(TREE_WIDTH_MIN, Math.round(value)));
		}
		function EditorHost(props) {
			const { ctx, store, scope, tab, expanded, revealed, onToggleDir, onReferenceFile } = props;
			const path = tab.path ?? "";
			const title = tab.title;
			const isDir = metaOf(tab).dir === true;
			const [load, setLoad] = (0, react.useState)({ status: "loading" });
			const [reloadSeq, setReloadSeq] = (0, react.useState)(0);
			const refreshFile = () => {
				if (toolbar?.dirty === true) {
					if (!(typeof window.confirm === "function" ? window.confirm(t("refreshUnsavedConfirm")) : false)) return;
				}
				setReloadSeq((sequence) => sequence + 1);
			};
			const inPlace = (0, react.useSyncExternalStore)((0, react.useCallback)((callback) => store.subscribe(callback), [store]), (0, react.useCallback)(() => store.getSnapshot().prefs.editorExplorer, [store]));
			const editorBlob = (0, react.useSyncExternalStore)((0, react.useCallback)((callback) => store.subscribe(callback), [store]), (0, react.useCallback)(() => store.getSnapshot().prefs.pluginSettings["editor"] ?? EMPTY_PLUGIN_BLOB, [store]));
			const openWithConfig = (0, react.useMemo)(() => parseOpenWithConfig(editorBlob.openWith), [editorBlob]);
			const openWithTargets = (0, react.useMemo)(() => resolveOpenWithTargets(openWithConfig), [openWithConfig]);
			const showEmpty = path === "";
			const treeOnly = showEmpty && !inPlace;
			const folderRoot = isDir ? path : void 0;
			/**
			* Open a file from THIS window (tree click / search row / path input):
			* merged mode switches this tab in place (stable id, meta survives);
			* split mode opens a per-path dedupe tab through openSidebarFile.
			*/
			const openFile = (absolute) => {
				if (inPlace) ctx.get("betterSidebar")?.updateTab(tab.id, {
					path: absolute,
					title: baseName(absolute)
				});
				else openSidebarFile(ctx, store, scope.sessionId, absolute);
			};
			/** The context menu's explicit "new tab" escape (per-path dedupe). */
			const openFileNewTab = (absolute) => {
				openSidebarFile(ctx, store, scope.sessionId, absolute);
			};
			/**
			* The context menu's "open to the side": a fresh editor tab (uid id — the
			* `'editor:' + path` convention would clash with the id safety net on a
			* second side-open of the same file) in a rightward split of THIS pane.
			*/
			const openFileSide = (absolute) => {
				store.reduce((state) => {
					const pane = leafWithTab(state.bottomSplits, tab.id) ?? firstLeaf(state.bottomSplits);
					const fresh = {
						id: mintTabId(),
						type: "editor",
						title: baseName(absolute),
						path: absolute,
						meta: { treeOpen: false }
					};
					const { node, leafId } = insertLeafAt(state.bottomSplits, pane.id, "row", fresh, false);
					return {
						...state,
						bottomSplits: node,
						activePane: leafId
					};
				});
			};
			/** The context menu's "open with" action: reveal the path in the OS file
			*  manager, or hand the target's URL to its opener — local `file` URLs go
			*  to the host's external opener, while the SSH-remote form for
			*  VSCode-family editors launches on the browser/client machine (see
			*  api.openExternal). Failures are logged only — a missing handler is the
			*  OS's/browser's dialog, not a sidebar error. */
			const openWith = (targetId, absolute) => {
				const target = openWithTargets.find((item) => item.id === targetId);
				if (target === void 0) return;
				if (target.kind === "reveal") {
					api.openExternal({
						action: "reveal",
						path: absolute
					}).catch((error) => {
						console.error("open external failed", error);
					});
					return;
				}
				const url = openWithUrl(target, absolute, openWithConfig);
				if (url === void 0) return;
				api.openExternal({
					action: "url",
					url
				}).catch((error) => {
					console.error("open external failed", error);
				});
			};
			/** Toggle one target's pinned state. The write is serialized (see
			*  plugin-settings.ts) and the menu re-renders when the store prefs land. */
			const toggleOpenWithPin = (targetId) => {
				updatePluginSettings(store, "editor", (blob) => {
					const config = parseOpenWithConfig(blob.openWith);
					const pinned = config.pinned.includes(targetId) ? config.pinned.filter((id) => id !== targetId) : [...config.pinned, targetId];
					return {
						...blob,
						openWith: {
							...config,
							pinned
						}
					};
				});
			};
			const onPathRenamed = (oldPath, newPath) => {
				retargetPathTabs(ctx, store, oldPath, newPath);
			};
			const onPathDeleted = (path) => {
				closePathTabs(ctx, store, path);
			};
			const [toolbar, setToolbar] = (0, react.useState)(null);
			const controlsRef = (0, react.useRef)(null);
			const onToolbarState = (0, react.useCallback)((next) => {
				setToolbar((prev) => prev !== null && JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
			}, []);
			const onToolbarControls = (0, react.useCallback)((controls) => {
				controlsRef.current = controls;
			}, []);
			const [dragWidth, setDragWidth] = (0, react.useState)(null);
			const dragRef = (0, react.useRef)(null);
			const pendingWidthRef = (0, react.useRef)(0);
			const dragBatcher = (0, react.useRef)(createFrameBatcher()).current;
			(0, react.useEffect)(() => () => dragBatcher.dispose(), [dragBatcher]);
			const treeWidth = dragWidth ?? treeWidthOf(tab);
			const onResizeStart = (event) => {
				event.preventDefault();
				event.currentTarget.setPointerCapture?.(event.pointerId);
				dragRef.current = {
					startX: event.clientX,
					startWidth: treeWidth
				};
			};
			const onResizeMove = (event) => {
				const drag = dragRef.current;
				if (drag === null) return;
				pendingWidthRef.current = clampTreeWidth(drag.startWidth + (drag.startX - event.clientX));
				dragBatcher.schedule(() => setDragWidth(pendingWidthRef.current));
			};
			const onResizeEnd = (event) => {
				const drag = dragRef.current;
				if (drag === null) return;
				dragBatcher.flushNow();
				dragRef.current = null;
				setDragWidth(null);
				const finalWidth = clampTreeWidth(drag.startWidth + (drag.startX - event.clientX));
				if (finalWidth !== treeWidthOf(tab)) patchMeta(ctx, tab, { treeWidth: finalWidth });
			};
			(0, react.useEffect)(() => {
				setToolbar(null);
				if (showEmpty || isDir) return;
				let cancelled = false;
				const controller = new AbortController();
				setLoad({ status: "loading" });
				const mediaUrlOf = () => mediaUrl(scope, path);
				const apply = (action) => {
					if (cancelled) return;
					switch (action.kind) {
						case "binary":
							setLoad({ status: "binary" });
							return;
						case "render":
							setLoad({
								status: "ready",
								viewer: action.viewer,
								content: action.content,
								truncated: action.truncated,
								mediaUrl: action.mediaUrl,
								customData: action.customData
							});
							return;
						case "customLoad":
							action.viewer.load?.(path, scope, controller.signal).then((data) => {
								if (cancelled) return;
								setLoad({
									status: "ready",
									viewer: action.viewer,
									customData: data
								});
							}).catch((error) => {
								if (cancelled) return;
								setLoad({
									status: "error",
									message: error instanceof Error ? error.message : String(error)
								});
							});
							return;
						case "fetchFsRead":
							api.fsRead(scope, path).then((result) => {
								if (cancelled) return;
								const outcome = planFsReadOutcome(action.viewer, {
									binary: result.kind === "binary",
									content: result.kind === "text" ? result.content : "",
									truncated: result.truncated,
									head: result.kind === "binary" ? result.head : void 0
								}, (head) => ctx.get("betterSidebar")?.matchFileViewer(path, head), mediaUrlOf);
								apply(outcome);
							}).catch((error) => {
								if (cancelled) return;
								setLoad({
									status: "error",
									message: error instanceof Error ? error.message : String(error)
								});
							});
							return;
					}
				};
				apply(planFirstMatch(ctx.get("betterSidebar")?.matchFileViewer(path), mediaUrlOf));
				return () => {
					cancelled = true;
					controller.abort();
				};
			}, [
				scope.sessionId,
				scope.cwd,
				path,
				ctx,
				showEmpty,
				isDir,
				reloadSeq
			]);
			const prevSaveState = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				const current = toolbar?.saveState;
				if (prevSaveState.current !== "saved" && current === "saved" && toolbar?.mode === "preview") setReloadSeq((sequence) => sequence + 1);
				prevSaveState.current = current;
			}, [toolbar?.saveState, toolbar?.mode]);
			const treeOpen = treeOpenOf(tab);
			/** Persist the panel flag on the tab (survives reloads with the layout). */
			const toggleTree = () => {
				patchMeta(ctx, tab, { treeOpen: !treeOpen });
			};
			const saveLabel = toolbar === null ? "" : toolbar.saveState === "saving" ? t("loading") : toolbar.saveState === "saved" ? t("saved") : toolbar.saveState === "failed" ? t("saveFailed") : "";
			if (treeOnly || folderRoot !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: sidebar_module_css_default.editor,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreePanel, {
					full: true,
					store,
					sessionId: scope.sessionId,
					cwd: folderRoot ?? scope.cwd,
					expanded,
					revealed,
					onToggle: onToggleDir,
					onOpenFile: openFile,
					onOpenFileNewTab: openFileNewTab,
					onOpenFileSide: openFileSide,
					openWithTargets,
					openWithPinned: openWithConfig.pinned,
					openWithSsh: openWithSshActive(openWithConfig),
					onOpenWith: openWith,
					onToggleOpenWithPin: toggleOpenWithPin,
					onReferenceFile,
					onPathRenamed,
					onPathDeleted,
					service: ctx.get("betterSidebar")
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editor,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.editorHeader,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditorPathInput, {
							path,
							cwd: scope.cwd,
							onOpen: openFile
						}, path),
						toolbar?.modes === true && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sidebar_module_css_default.editorModeToggle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: clsx(sidebar_module_css_default.editorModeButton, toolbar.mode === "preview" && sidebar_module_css_default.editorModeActive),
								onClick: () => {
									if (toolbar.mode === "edit" && toolbar.dirty !== true && toolbar.saveState !== "failed") setReloadSeq((sequence) => sequence + 1);
									controlsRef.current?.setMode("preview");
								},
								children: t("preview")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: clsx(sidebar_module_css_default.editorModeButton, toolbar.mode === "edit" && sidebar_module_css_default.editorModeActive),
								onClick: () => {
									controlsRef.current?.setMode("edit");
								},
								children: t("edit")
							})]
						}),
						toolbar?.dirty === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.dirtyDot,
							title: t("unsaved")
						}),
						toolbar?.editable === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.iconButton,
							"aria-label": t("save"),
							title: `${t("save")} (Ctrl/Cmd+S)`,
							onClick: () => {
								controlsRef.current?.save();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 14 })
						}),
						saveLabel !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: clsx(sidebar_module_css_default.editorStatus, toolbar?.saveState === "failed" && sidebar_module_css_default.editorStatusError),
							children: saveLabel
						}),
						toolbar !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.iconButton,
							"aria-label": t("refresh"),
							title: t("refresh"),
							onClick: refreshFile,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, { size: 14 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: clsx(sidebar_module_css_default.iconButton, treeOpen && sidebar_module_css_default.editorTreeToggleActive),
							"aria-label": t("editorTreeToggle"),
							title: t("editorTreeToggle"),
							"aria-pressed": treeOpen,
							onClick: toggleTree,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 14 })
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.editorBody,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.editorMain,
						children: [
							showEmpty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sidebar_module_css_default.editorPlaceholder,
								children: t("editorEmptyHint")
							}),
							!showEmpty && load.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sidebar_module_css_default.editorPlaceholder,
								children: t("loading")
							}),
							!showEmpty && load.status === "error" && (isOutsideWorkspaceMessage(load.message) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FenceErrorNotice, {
								store,
								onDisabled: () => {
									setReloadSeq((sequence) => sequence + 1);
								}
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sidebar_module_css_default.editorError,
								children: load.message
							})),
							!showEmpty && load.status === "binary" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BinaryDownload, {
								scope,
								path
							}),
							!showEmpty && load.status === "ready" && (0, react.createElement)(load.viewer.component, {
								ctx,
								store,
								scope,
								path,
								title,
								viewerId: load.viewer.id,
								content: load.content,
								truncated: load.truncated,
								mediaUrl: load.mediaUrl,
								customData: load.customData,
								toolbar: "host",
								onToolbarState,
								onToolbarControls
							})
						]
					}), treeOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.editorTreeDock,
						style: { width: treeWidth },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.editorTreeResize,
							role: "separator",
							"aria-orientation": "vertical",
							"aria-label": t("editorTreeToggle"),
							onPointerDown: onResizeStart,
							onPointerMove: onResizeMove,
							onPointerUp: onResizeEnd,
							onPointerCancel: onResizeEnd
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreePanel, {
							store,
							sessionId: scope.sessionId,
							cwd: scope.cwd,
							expanded,
							revealed,
							onToggle: onToggleDir,
							onOpenFile: openFile,
							onOpenFileNewTab: openFileNewTab,
							onOpenFileSide: openFileSide,
							openWithTargets,
							openWithPinned: openWithConfig.pinned,
							openWithSsh: openWithSshActive(openWithConfig),
							onOpenWith: openWith,
							onToggleOpenWithPin: toggleOpenWithPin,
							onReferenceFile,
							onPathRenamed,
							onPathDeleted,
							service: ctx.get("betterSidebar")
						})]
					})]
				})]
			});
		}
		/**
		* The header's path input: shows the current file relative to the session
		* cwd (absolute when outside it). Enter resolves the typed path (relative
		* input joins onto the cwd — the same resolution `openSidebarFile` uses)
		* and opens it through the parent's mode-aware open (in-place switch or a
		* per-path dedupe tab); Escape/blur restores the current value. The parent
		* keys it by `path` so an in-place switch remounts and reseeds the draft.
		*/
		function EditorPathInput(props) {
			const { path, cwd, onOpen } = props;
			const display = path === "" ? "" : relativeTo(cwd ?? "", path);
			const [value, setValue] = (0, react.useState)(display);
			const commit = () => {
				const input = value.trim();
				if (input === "" || input === display) {
					setValue(display);
					return;
				}
				onOpen(resolveSidebarPath(cwd, input));
				setValue(display);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				className: sidebar_module_css_default.editorPathInput,
				value,
				placeholder: t("editorPathPlaceholder"),
				title: path,
				spellCheck: false,
				onChange: (event) => {
					setValue(event.target.value);
				},
				onKeyDown: (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						commit();
					} else if (event.key === "Escape") setValue(display);
				},
				onBlur: () => {
					setValue(display);
				}
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/DSH-better-sidebar/DSH-better-sidebar/src/client/SideCardSection.module.css.mjs
		const css$5 = "._2vuxea_section{flex-direction:column;gap:16px;width:100%;max-width:760px;display:flex}._2vuxea_intro{color:var(--dsw-alias-label-tertiary);margin:0;padding:0 2px;font-size:13px;line-height:20px}._2vuxea_group{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:16px;flex-direction:column;flex:none;gap:8px;padding:20px;display:flex}._2vuxea_groupHeading{color:var(--dsw-alias-label-primary);align-items:baseline;gap:7px;padding:0 2px 6px;font-size:13px;font-weight:600;line-height:20px;display:flex}._2vuxea_count{background:var(--dsw-alias-accent-soft,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:16px}._2vuxea_grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;display:grid}._2vuxea_card{border:1px solid var(--dsw-alias-border-l2);min-height:106px;font:inherit;color:inherit;cursor:pointer;background:0 0;border-radius:12px;flex-direction:column;transition:background .12s,border-color .12s;display:flex;position:relative;overflow:hidden}._2vuxea_card:not(._2vuxea_cardOn):hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-label-dimmed)}._2vuxea_cardOn{border-color:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 45%, transparent);background:var(--dsw-alias-interactive-bg-active)}._2vuxea_cardMain{border-radius:inherit;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;flex-direction:column;flex:1;gap:6px;padding:12px;display:flex}._2vuxea_cardMain:focus-visible,._2vuxea_cardSettings:focus-visible,._2vuxea_rowGear:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:2px}._2vuxea_cardTop{align-items:center;gap:8px;min-width:0;min-height:28px;display:flex}._2vuxea_cardIconChip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:28px;height:28px;color:var(--dsw-alias-label-tertiary);border-radius:8px;flex:none;justify-content:center;align-items:center;display:inline-flex}._2vuxea_cardOn ._2vuxea_cardIconChip{border-color:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 35%, transparent);background:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 12%, transparent);color:var(--dsw-alias-button-primary-fill)}._2vuxea_cardTitle{min-width:0;color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;flex:1;font-size:13px;font-weight:600;line-height:20px;overflow:hidden}._2vuxea_cardOn ._2vuxea_cardTitle{color:var(--dsw-alias-label-primary)}._2vuxea_cardSwitch{flex:none;align-items:center;display:inline-flex}._2vuxea_cardSwitchTrack{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;align-items:center;width:30px;height:16px;padding:2px;transition:background .15s,border-color .15s;display:inline-flex}._2vuxea_cardSwitchThumb{background:var(--dsw-alias-label-tertiary);border-radius:50%;width:10px;height:10px;transition:transform .15s,background .15s;display:block}._2vuxea_cardOn ._2vuxea_cardSwitchTrack{border-color:var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill)}._2vuxea_cardOn ._2vuxea_cardSwitchThumb{background:var(--dsw-alias-bg-layer-3);transform:translate(14px)}._2vuxea_cardDesc{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:11px;line-height:16px;overflow:hidden}._2vuxea_addCard{border-style:dashed;border-color:var(--dsw-alias-border-l2);text-align:left;align-items:flex-start;padding:12px}._2vuxea_addCard:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-label-primary)}._2vuxea_addCard:hover ._2vuxea_cardTitle{color:var(--dsw-alias-label-primary)}._2vuxea_addCard:hover ._2vuxea_cardIconChip{border-color:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 35%, transparent);color:var(--dsw-alias-button-primary-fill)}._2vuxea_addCard:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:2px}._2vuxea_cardOn ._2vuxea_cardDesc{color:var(--dsw-alias-label-secondary)}._2vuxea_cardSettings{border:0;border-top:1px solid var(--dsw-alias-border-l1);width:100%;color:var(--dsw-alias-label-secondary);font:inherit;text-align:left;cursor:pointer;background:0 0;align-items:center;gap:6px;padding:6px 12px;font-size:11px;font-weight:500;line-height:16px;transition:background .12s,color .12s;display:flex}._2vuxea_cardOn ._2vuxea_cardSettings{border-top-color:color-mix(in srgb, var(--dsw-alias-button-primary-fill) 18%, transparent)}._2vuxea_cardSettings:hover{background:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-brand-primary)}._2vuxea_rowGear{border:1px solid var(--dsw-alias-border-l2);width:22px;height:22px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;transition:background .12s,border-color .12s,color .12s;display:inline-flex}._2vuxea_rowGear:hover{border-color:var(--dsw-alias-interactive-bg-hover-accent);background:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-brand-primary)}._2vuxea_row{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:16px;padding:12px 2px;display:flex}._2vuxea_row:last-child{border-bottom:none}._2vuxea_rowText{flex-direction:column;gap:4px;min-width:0;display:flex}._2vuxea_title{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}._2vuxea_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}._2vuxea_switch{cursor:pointer;flex:none;display:inline-flex;position:relative}._2vuxea_switchInput{opacity:0;width:1px;height:1px;margin:0;position:absolute}._2vuxea_switchTrack{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:10px;align-items:center;width:36px;height:20px;padding:2px;transition:background .15s,border-color .15s;display:inline-flex}._2vuxea_switchThumb{background:var(--dsw-alias-label-tertiary);border-radius:50%;width:14px;height:14px;transition:transform .15s,background .15s;display:block}._2vuxea_switch:hover ._2vuxea_switchTrack{border-color:var(--dsw-alias-label-dimmed)}._2vuxea_switchInput:checked+._2vuxea_switchTrack{border-color:var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill)}._2vuxea_switchInput:checked+._2vuxea_switchTrack ._2vuxea_switchThumb{background:var(--dsw-alias-bg-layer-3);transform:translate(16px)}._2vuxea_switchInput:focus-visible+._2vuxea_switchTrack{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._2vuxea_control{flex:none;align-items:center;gap:6px;display:flex}._2vuxea_percentInput{width:76px}._2vuxea_typedInput{width:200px}._2vuxea_typedInputNumber{width:76px}._2vuxea_selectAnchor{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);max-width:220px;color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:8px;align-items:center;gap:6px;padding:4px 8px;font-size:13px;line-height:20px;display:flex}._2vuxea_selectAnchor:hover{border-color:var(--dsw-alias-label-dimmed)}._2vuxea_selectAnchorIcon{flex:none;display:inline-flex}._2vuxea_selectAnchorText{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._2vuxea_selectOption{align-items:center;gap:10px;min-width:200px;display:flex}._2vuxea_selectOptionIcon{color:var(--dsw-alias-label-secondary);flex:none;display:inline-flex}._2vuxea_selectOptionText{flex-direction:column;min-width:0;display:flex}._2vuxea_suffix{color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}._2vuxea_cssTextArea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);width:100%;min-height:120px;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code,monospace);resize:vertical;border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.6}._2vuxea_cssTextArea:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._2vuxea_popupDialog._2vuxea_popupDialog{width:min(460px,100%)}._2vuxea_popupRows{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l2,transparent) transparent;flex-direction:column;gap:8px;width:100%;max-height:min(52vh,440px);padding-right:4px;display:flex;overflow:hidden auto}._2vuxea_popupRows::-webkit-scrollbar{width:6px}._2vuxea_popupRows::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2,var(--dsw-alias-border-l2));border-radius:3px}._2vuxea_popupRows::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2,var(--dsw-alias-label-dimmed))}._2vuxea_popupRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;flex:none;justify-content:space-between;align-items:center;gap:16px;min-width:0;padding:12px 14px;transition:border-color .16s,background .16s;display:flex}._2vuxea_popupRow:hover{border-color:var(--dsw-alias-label-dimmed)}._2vuxea_done{appearance:none;font:inherit;cursor:pointer;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}._2vuxea_done:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}._2vuxea_error{color:var(--dsw-alias-state-error-primary);padding:10px 0 2px;font-size:12px;line-height:17px}._2vuxea_pluginModal._2vuxea_pluginModal{width:min(560px,100%)}._2vuxea_pluginList{flex-direction:column;gap:12px;width:100%;display:flex}._2vuxea_pluginTopicBtn{appearance:none;border:1px solid var(--dsw-alias-border-l2);width:100%;font:inherit;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);cursor:pointer;border-radius:8px;padding:6px 12px;font-size:12px;line-height:18px}._2vuxea_pluginTopicBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-label-primary)}._2vuxea_pluginTopicBtn:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:1px}._2vuxea_pluginEmpty{color:var(--dsw-alias-label-tertiary);padding:20px 2px;font-size:12px;line-height:18px}._2vuxea_pluginEntry{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;flex-direction:column;gap:4px;padding:12px;display:flex}._2vuxea_pluginEntryHead{justify-content:space-between;align-items:center;gap:12px;display:flex}._2vuxea_pluginEntryActions{flex:none;align-items:center;gap:6px;display:inline-flex}._2vuxea_pluginJumpBtn{appearance:none;border:1px solid var(--dsw-alias-border-l2);font:inherit;cursor:pointer;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:8px;flex:none;padding:3px 12px;font-size:12px;line-height:1.5}._2vuxea_pluginJumpBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-label-primary)}._2vuxea_pluginJumpBtn:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:1px}._2vuxea_pluginName{appearance:none;min-width:0;font:inherit;color:var(--dsw-alias-label-primary);text-align:left;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;background:0 0;border:0;padding:0;font-size:13px;font-weight:600;line-height:20px;text-decoration:none;overflow:hidden}._2vuxea_pluginName:hover{color:var(--dsw-alias-button-primary-fill);text-decoration:underline}._2vuxea_pluginDesc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}._2vuxea_pluginInstall{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);white-space:nowrap;border-radius:8px;padding:6px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:16px;display:block;overflow-x:auto}._2vuxea_pluginCopyBtn{appearance:none;font:inherit;cursor:pointer;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border:1px solid #0000;border-radius:8px;flex:none;padding:3px 12px;font-size:12px;line-height:1.5}._2vuxea_pluginCopyBtn:hover{background:var(--dsw-alias-button-primary-hover)}._2vuxea_pluginCopyBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}@media (prefers-reduced-motion:reduce){._2vuxea_card,._2vuxea_cardSettings,._2vuxea_cardSwitchTrack,._2vuxea_cardSwitchThumb,._2vuxea_rowGear,._2vuxea_popupRow,._2vuxea_switchTrack,._2vuxea_switchThumb{transition:none}}._2vuxea_versionBadge{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:999px;align-self:flex-start;align-items:center;gap:8px;padding:4px 12px 4px 14px;font-size:12px;line-height:18px;display:inline-flex}._2vuxea_versionBadgeName{color:var(--dsw-alias-label-primary);font-weight:600}._2vuxea_versionBadgeTag{background:var(--dsw-alias-accent-soft,var(--dsw-alias-border-l2));color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;border-radius:999px;padding:1px 8px}._2vuxea_pluginSearch{box-sizing:border-box;appearance:none;border:1px solid var(--dsw-alias-border-l2);width:100%;font:inherit;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:6px 10px;font-size:12px;line-height:18px}._2vuxea_pluginSearch::placeholder{color:var(--dsw-alias-label-tertiary)}._2vuxea_pluginSearch:focus-visible{outline:2px solid var(--dsw-alias-border-l4);outline-offset:1px}._2vuxea_pluginEntries{flex-direction:column;gap:10px;max-height:46vh;padding-right:2px;display:flex;overflow:hidden auto}._2vuxea_pluginGroup{flex-direction:column;gap:8px;display:flex}._2vuxea_pluginGroupHeading{color:var(--dsw-alias-label-secondary);padding:2px 2px 0;font-size:12px;font-weight:600;line-height:18px}._2vuxea_openWithEditorRow{grid-template-columns:1fr 1.5fr auto auto;align-items:center;gap:8px;min-width:0;display:grid}._2vuxea_openWithEditorInput,._2vuxea_openWithEditorTemplate{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);width:100%;min-width:0;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:5px 8px;font-size:13px;line-height:20px}._2vuxea_openWithEditorInput:focus-visible,._2vuxea_openWithEditorTemplate:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}._2vuxea_openWithFamily{color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;align-items:center;gap:5px;font-size:12px;display:inline-flex}._2vuxea_openWithRemove{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:8px;justify-content:center;align-items:center;padding:4px;display:inline-flex}._2vuxea_openWithRemove:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-2)}._2vuxea_openWithHint{color:var(--dsw-alias-state-error-primary);padding:0 2px;font-size:12px;line-height:17px}";
		const tagId$5 = "dsh-better-sidebar/SideCardSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		var SideCardSection_module_css_default = {
			"typedInput": "_2vuxea_typedInput",
			"switchTrack": "_2vuxea_switchTrack",
			"cardSwitchThumb": "_2vuxea_cardSwitchThumb",
			"openWithEditorRow": "_2vuxea_openWithEditorRow",
			"card": "_2vuxea_card",
			"done": "_2vuxea_done",
			"control": "_2vuxea_control",
			"intro": "_2vuxea_intro",
			"cardOn": "_2vuxea_cardOn",
			"cardSettings": "_2vuxea_cardSettings",
			"cardTop": "_2vuxea_cardTop",
			"grid": "_2vuxea_grid",
			"popupDialog": "_2vuxea_popupDialog",
			"pluginGroup": "_2vuxea_pluginGroup",
			"openWithFamily": "_2vuxea_openWithFamily",
			"selectOptionText": "_2vuxea_selectOptionText",
			"cardIconChip": "_2vuxea_cardIconChip",
			"switch": "_2vuxea_switch",
			"typedInputNumber": "_2vuxea_typedInputNumber",
			"suffix": "_2vuxea_suffix",
			"popupRows": "_2vuxea_popupRows",
			"pluginEntryHead": "_2vuxea_pluginEntryHead",
			"groupHeading": "_2vuxea_groupHeading",
			"cardMain": "_2vuxea_cardMain",
			"cssTextArea": "_2vuxea_cssTextArea",
			"pluginSearch": "_2vuxea_pluginSearch",
			"openWithEditorTemplate": "_2vuxea_openWithEditorTemplate",
			"openWithHint": "_2vuxea_openWithHint",
			"versionBadge": "_2vuxea_versionBadge",
			"pluginEntries": "_2vuxea_pluginEntries",
			"versionBadgeTag": "_2vuxea_versionBadgeTag",
			"section": "_2vuxea_section",
			"group": "_2vuxea_group",
			"pluginName": "_2vuxea_pluginName",
			"pluginEmpty": "_2vuxea_pluginEmpty",
			"pluginGroupHeading": "_2vuxea_pluginGroupHeading",
			"pluginList": "_2vuxea_pluginList",
			"cardSwitch": "_2vuxea_cardSwitch",
			"pluginInstall": "_2vuxea_pluginInstall",
			"error": "_2vuxea_error",
			"cardSwitchTrack": "_2vuxea_cardSwitchTrack",
			"desc": "_2vuxea_desc",
			"row": "_2vuxea_row",
			"cardDesc": "_2vuxea_cardDesc",
			"selectAnchorText": "_2vuxea_selectAnchorText",
			"pluginModal": "_2vuxea_pluginModal",
			"switchInput": "_2vuxea_switchInput",
			"selectOptionIcon": "_2vuxea_selectOptionIcon",
			"title": "_2vuxea_title",
			"selectAnchor": "_2vuxea_selectAnchor",
			"openWithRemove": "_2vuxea_openWithRemove",
			"rowText": "_2vuxea_rowText",
			"percentInput": "_2vuxea_percentInput",
			"count": "_2vuxea_count",
			"rowGear": "_2vuxea_rowGear",
			"cardTitle": "_2vuxea_cardTitle",
			"switchThumb": "_2vuxea_switchThumb",
			"pluginDesc": "_2vuxea_pluginDesc",
			"versionBadgeName": "_2vuxea_versionBadgeName",
			"pluginEntry": "_2vuxea_pluginEntry",
			"openWithEditorInput": "_2vuxea_openWithEditorInput",
			"selectOption": "_2vuxea_selectOption",
			"pluginEntryActions": "_2vuxea_pluginEntryActions",
			"pluginTopicBtn": "_2vuxea_pluginTopicBtn",
			"addCard": "_2vuxea_addCard",
			"pluginJumpBtn": "_2vuxea_pluginJumpBtn",
			"pluginCopyBtn": "_2vuxea_pluginCopyBtn",
			"popupRow": "_2vuxea_popupRow",
			"selectAnchorIcon": "_2vuxea_selectAnchorIcon"
		};
		//#endregion
		//#region src/client/open-with-settings.tsx
		/**
		* The editor tab's custom settings panel ("打开方式"): the file tree's
		* "open with" configuration — the optional SSH host marking the workspace as
		* remote, and the user-defined editors (name + URL template with `{path}` +
		* whether they speak the VSCode URL dialect). Persisted as the editor
		* blob's `openWith` key through the settings popup's `updatePluginSetting`.
		*
		* The popup renders the declarative rows (the editorExplorer picker) ABOVE
		* this panel — SettingsBody renders the custom panel after the row list, so
		* this component owns only its own section.
		*/
		function OpenWithSettings(props) {
			const { pluginSettings, updatePluginSetting } = props;
			const [draft, setDraft] = (0, react.useState)(() => parseOpenWithConfig(pluginSettings.openWith));
			const commit = (next) => {
				setDraft(next);
				updatePluginSetting("openWith", next);
			};
			const setSshHost = (sshHost) => commit({
				...draft,
				sshHost
			});
			const patchCustom = (id, patch) => {
				commit({
					...draft,
					customEditors: draft.customEditors.map((editor) => editor.id === id ? {
						...editor,
						...patch
					} : editor)
				});
			};
			const removeCustom = (id) => {
				commit({
					...draft,
					customEditors: draft.customEditors.filter((editor) => editor.id !== id),
					pinned: draft.pinned.filter((pinnedId) => pinnedId !== `custom:${id}`)
				});
			};
			const addCustom = () => {
				commit({
					...draft,
					customEditors: [...draft.customEditors, {
						id: newCustomEditorId(),
						name: "",
						urlTemplate: "",
						isVscodeFamily: false
					}]
				});
			};
			const hasInvalid = draft.customEditors.some((editor) => !isValidCustomEditor(editor));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.popupRows,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.popupRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SideCardSection_module_css_default.rowText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.title,
								children: t("openWithSettingsSshTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.desc,
								children: t("openWithSettingsSshDesc")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: SideCardSection_module_css_default.typedInput,
							value: draft.sshHost,
							placeholder: t("openWithSettingsSshPlaceholder"),
							spellCheck: false,
							onChange: (event) => {
								setSshHost(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.popupRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SideCardSection_module_css_default.rowText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.title,
								children: t("openWithSettingsCustomTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.desc,
								children: t("openWithSettingsCustomDesc")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideCardSection_module_css_default.control,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SideCardSection_module_css_default.done,
								onClick: addCustom,
								children: t("openWithSettingsAdd")
							})
						})]
					}),
					draft.customEditors.map((editor) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.openWithEditorRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: SideCardSection_module_css_default.openWithEditorInput,
								value: editor.name,
								placeholder: t("openWithSettingsName"),
								spellCheck: false,
								onChange: (event) => {
									patchCustom(editor.id, { name: event.target.value });
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: SideCardSection_module_css_default.openWithEditorTemplate,
								value: editor.urlTemplate,
								placeholder: t("openWithSettingsTemplate"),
								spellCheck: false,
								onChange: (event) => {
									patchCustom(editor.id, { urlTemplate: event.target.value });
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: SideCardSection_module_css_default.openWithFamily,
								title: t("openWithSettingsFamilyDesc"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: editor.isVscodeFamily,
									onChange: (event) => {
										patchCustom(editor.id, { isVscodeFamily: event.currentTarget.checked });
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("openWithSettingsFamily") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SideCardSection_module_css_default.openWithRemove,
								"aria-label": t("openWithSettingsRemove"),
								title: t("openWithSettingsRemove"),
								onClick: () => {
									removeCustom(editor.id);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
							})
						]
					}, editor.id)),
					hasInvalid && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideCardSection_module_css_default.openWithHint,
						role: "note",
						children: t("openWithSettingsInvalidHint")
					})
				]
			});
		}
		//#endregion
		//#region src/client/lazy-chunk.tsx
		/**
		* Lazy chunk view wrapper: mounts a component that lives in a lazy chunk,
		* showing a loading placeholder while the chunk script loads and an error +
		* retry affordance on failure. Used by the built-in tab/viewer descriptors.
		*
		* Contract note: {@link lazyChunkComponent} returns a plain render-prop
		* function — the descriptor contract is `component: (props) => ReactNode`,
		* and the repo renders descriptors BOTH ways: Sidebar calls
		* `descriptor.component(props)` directly, EditorHost renders it via
		* `createElement`. The wrapper function body therefore contains no hooks;
		* all state lives in the inner {@link LazyChunkView} component.
		*/
		function LazyChunkView({ chunk, pick, props }) {
			const [attempt, setAttempt] = (0, react.useState)(0);
			const [state, setState] = (0, react.useState)({ status: "loading" });
			(0, react.useEffect)(() => {
				let cancelled = false;
				setState({ status: "loading" });
				loadChunk(chunk).then((mod) => {
					if (cancelled) return;
					const Comp = pick(mod);
					if (Comp === void 0) {
						setState({
							status: "error",
							message: `[dsh-better-sidebar] chunk "${chunk}" is missing its component`
						});
						return;
					}
					setState({
						status: "ready",
						Comp
					});
				}).catch((error) => {
					if (cancelled) return;
					setState({
						status: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					cancelled = true;
				};
			}, [
				chunk,
				pick,
				attempt
			]);
			if (state.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: sidebar_module_css_default.editorPlaceholder,
				children: t("loading")
			});
			if (state.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editorError,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: state.message }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: sidebar_module_css_default.terminalRetry,
					onClick: () => {
						setAttempt((current) => current + 1);
					},
					children: t("terminalRetry")
				})]
			});
			return (0, react.createElement)(state.Comp, props);
		}
		/**
		* Build a descriptor-compatible lazy wrapper for a chunk-resident component.
		* The returned function is the descriptor `component` itself: it returns an
		* element and never calls hooks, so both invocation styles (plain function
		* call and createElement/JSX render) work. `pick` must be a module-level
		* function (stable identity) — an inline lambda would re-trigger the load
		* effect on every render.
		* @param chunk - the chunk name (see chunk-loader.ts).
		* @param pick - select the component from the chunk's exports.
		*/
		function lazyChunkComponent(chunk, pick) {
			return (props) => (0, react.createElement)(LazyChunkView, {
				chunk,
				pick,
				props
			});
		}
		//#endregion
		//#region src/client/use-polling.ts
		/**
		* The sidebar's ONE polling loop: every timed client fetch — subagent live
		* previews, side-chat transcript deltas, git status, session ops — funnels
		* here so the cancellation-safety rules are written once instead of four
		* times. The contract every poller gets:
		*
		* - While `enabled`, the task runs on the chosen cadence; the loop restarts
		*   (and the old one is torn down) whenever `enabled`, the task identity, or
		*   any option primitive changes — callers express "scope changed" through
		*   the task's `useCallback` deps, exactly like an effect's dep array.
		* - Each enabled run owns ONE AbortSignal for its whole lifetime; teardown
		*   (unmount, `enabled` flip, identity change) aborts it AND stops all
		*   scheduling. A task whose fetch settles late must check the signal
		*   before writing state: an aborted fetch is NOT guaranteed to reject
		*   (the transport may deliver the response anyway), so the signal is the
		*   only reliable staleness guard.
		* - A rejected task never breaks the loop — the scheduler swallows it and
		*   the next tick retries. Sites that surface errors (setError banners and
		*   friends) do so inside the task body; the scheduler always stays silent.
		*/
		function usePolling(enabled, task, { intervalMs, mode = "fixed-interval", immediate = false }) {
			(0, react.useEffect)(() => {
				if (!enabled) return;
				const controller = new AbortController();
				if (mode === "self-scheduling") {
					let disposed = false;
					let timer;
					const tick = async () => {
						if (disposed) return;
						try {
							await task(controller.signal);
						} catch {}
						if (!disposed) timer = window.setTimeout(() => {
							tick();
						}, intervalMs);
					};
					if (immediate) tick();
					else timer = window.setTimeout(() => {
						tick();
					}, intervalMs);
					return () => {
						disposed = true;
						if (timer !== void 0) window.clearTimeout(timer);
						controller.abort();
					};
				}
				const run = () => {
					task(controller.signal).catch(() => {});
				};
				if (immediate) run();
				const timer = window.setInterval(run, intervalMs);
				return () => {
					window.clearInterval(timer);
					controller.abort();
				};
			}, [
				enabled,
				task,
				intervalMs,
				mode,
				immediate
			]);
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/DSH-better-sidebar/DSH-better-sidebar/src/client/changes/changes.module.css.mjs
		const css$4 = ".bdiHEa_root{background:var(--dsw-alias-bg-base);height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;font-size:12px;display:flex}.bdiHEa_lensBar{flex:none;align-items:center;padding:8px 8px 4px 12px;display:flex}.bdiHEa_lensSwitch{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;gap:2px;padding:2px;display:inline-flex}.bdiHEa_lensButton{color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-strong-11);cursor:pointer;background:0 0;border:0;border-radius:6px;padding:2px 10px}.bdiHEa_lensButton:hover{color:var(--dsw-alias-label-primary)}.bdiHEa_lensButton[data-active=true]{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary)}.bdiHEa_git{flex-direction:column;flex:1;min-width:0;min-height:0;display:flex;overflow:hidden auto}.bdiHEa_gitHeader{flex:none;align-items:center;gap:8px;height:36px;padding:0 8px 0 12px;display:flex}.bdiHEa_gitWorktreeRow{flex:none;align-items:center;gap:8px;padding:6px 8px 0 12px;display:flex}.bdiHEa_gitWorktreeLabel{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11);flex:none}.bdiHEa_gitBranchSelect{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);min-width:0;height:26px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);border-radius:6px;flex:1;padding:0 6px}.bdiHEa_gitSection{border-top:1px solid var(--dsw-alias-border-l1)}.bdiHEa_gitSectionHeader{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);text-transform:uppercase;justify-content:space-between;align-items:center;padding:6px 12px 4px;display:flex}.bdiHEa_gitLink{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:none;padding:0}.bdiHEa_gitLink:hover:not(:disabled){text-decoration:underline}.bdiHEa_gitLink:disabled{opacity:.4;cursor:default}.bdiHEa_gitRow{min-height:34px;animation:bdiHEa_dsh-row-in .15s var(--ds-ease-in-out);border-radius:8px;align-items:center;gap:6px;margin:0 6px;padding:0 8px;display:flex}.bdiHEa_gitRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.bdiHEa_gitRow[data-selected=true]{background:var(--dsw-alias-interactive-bg-active)}.bdiHEa_gitRowMain{cursor:pointer;text-align:left;background:0 0;border:none;flex:1;align-items:center;gap:8px;min-width:0;padding:3px 0;display:flex}.bdiHEa_gitBadge{width:20px;height:16px;font:var(--dsw-font-xxxs-strong-11);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;justify-content:center;align-items:center;display:inline-flex}.bdiHEa_gitBadge[data-letter=A],.bdiHEa_gitBadge[data-letter=\\?]{color:var(--dsw-alias-state-success-primary)}.bdiHEa_gitBadge[data-letter=D]{color:var(--dsw-alias-state-error-primary)}.bdiHEa_gitBadge[data-letter=M],.bdiHEa_gitBadge[data-letter=R]{color:var(--dsw-alias-state-business-primary)}.bdiHEa_gitBadge[data-letter=C],.bdiHEa_gitBadge[data-letter=U]{color:var(--dsw-alias-state-warn-primary)}.bdiHEa_gitName{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.bdiHEa_gitEmpty{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);padding:4px 12px 8px}.bdiHEa_gitPlaceholder{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;padding:16px}.bdiHEa_gitError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;padding:8px 12px}.bdiHEa_gitConfirmDesc{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);white-space:pre-wrap;margin:0}.bdiHEa_gitCommit{border-top:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:8px 12px;display:flex}.bdiHEa_gitCommitInput{flex:1;min-width:0}.bdiHEa_gitCommitButton{background:var(--dsw-alias-button-primary-fill);height:26px;color:var(--dsw-alias-label-primary-inverted);font:var(--dsw-font-xxs-strong-12);cursor:pointer;border:none;border-radius:6px;flex:none;padding:0 12px}.bdiHEa_gitCommitButton:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.bdiHEa_gitCommitButton:disabled{opacity:.45;cursor:default}.bdiHEa_gitLogRow{cursor:pointer;border-radius:8px;flex-direction:column;gap:2px;padding:5px 12px;display:flex}.bdiHEa_gitLogRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.bdiHEa_gitLogRow[data-selected=true]{background:var(--dsw-alias-interactive-bg-active)}.bdiHEa_gitLogLine1{align-items:baseline;gap:8px;min-width:0;display:flex}.bdiHEa_gitLogHash{font:var(--dsw-font-markdown-code-block-small);color:var(--dsw-alias-label-tertiary);flex:none}.bdiHEa_gitLogLine2{flex-wrap:wrap;align-items:center;gap:6px;min-width:0;display:flex}.bdiHEa_gitLogRef{border:1px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-brand-primary);white-space:nowrap;border-radius:999px;flex:none;padding:0 5px}.bdiHEa_gitLogSubject{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.bdiHEa_gitLogMeta{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.bdiHEa_gitLogMore{border:1px solid var(--dsw-alias-border-l2);width:calc(100% - 24px);font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:6px;margin:4px 12px 8px;padding:6px 0;display:block}.bdiHEa_gitLogMore:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.bdiHEa_gitLogMore:disabled{opacity:.5;cursor:default}.bdiHEa_session{flex-direction:column;flex:1;min-height:0;display:flex}.bdiHEa_filterRow{flex-wrap:wrap;flex:none;gap:4px;padding:2px 8px 6px 12px;display:flex}.bdiHEa_filterChip{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);cursor:pointer;background:0 0;border-radius:999px;padding:1px 8px}.bdiHEa_filterChip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.bdiHEa_filterChip[data-active=true]{background:var(--dsw-alias-interactive-bg-active);color:var(--dsw-alias-label-primary);border-color:#0000}.bdiHEa_sessionList{flex:1;min-height:0;padding:0 6px 10px;overflow-y:auto}.bdiHEa_empty{color:var(--dsw-alias-label-tertiary);text-align:center;padding:24px 8px}.bdiHEa_loadError{border-left:3px solid var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-label-secondary);border-radius:0 6px 6px 0;margin:4px 8px;padding:6px 10px;font-size:11px}.bdiHEa_fileGroup{margin-bottom:6px}.bdiHEa_filePath{color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,monospace);word-break:break-all;padding:6px 4px 2px;font-size:11px;display:block}.bdiHEa_fileGroup:first-child .bdiHEa_filePath{padding-top:2px}.bdiHEa_opRow{width:100%;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;text-align:left;background:0 0;border:0;border-radius:6px;align-items:center;gap:6px;padding:3px 5px;font-size:11px;display:flex}.bdiHEa_opRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.bdiHEa_opRow[data-selected=true]{background:var(--dsw-alias-interactive-bg-active)}.bdiHEa_opRow[data-op-error=true]{box-shadow:inset 2px 0 0 var(--dsw-alias-state-error-primary)}.bdiHEa_opKind{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;padding:0 5px;font-size:10px;line-height:16px}.bdiHEa_opKind[data-kind=write]{color:var(--dsw-alias-state-success-primary)}.bdiHEa_opKind[data-kind=edit]{color:var(--dsw-alias-state-business-primary)}.bdiHEa_opMeta{flex:none;align-items:baseline;gap:8px;min-width:0;margin-left:auto;display:inline-flex}.bdiHEa_opTime{color:var(--dsw-alias-label-tertiary);flex:none;font-size:10px}.bdiHEa_opFlag{color:var(--dsw-alias-state-business-primary);flex:none;font-size:10px}.bdiHEa_opFlagError{color:var(--dsw-alias-state-error-primary);flex:none;font-size:10px}.bdiHEa_opSize{color:var(--dsw-alias-label-tertiary);font-size:10px;font-family:var(--ds-font-family-code,monospace);flex:none}.bdiHEa_redactBanner{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-interactive-bg-hover);white-space:nowrap;border-radius:7px;flex:none;padding:2px 8px}.bdiHEa_mdToggle{border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-strong-11);cursor:pointer;background:0 0;border-radius:7px;flex:none;padding:2px 8px}.bdiHEa_mdToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.bdiHEa_mdToggle[data-on=true]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}.bdiHEa_mdBody{font:var(--dsw-font-xs-regular-13);min-height:0;padding:12px 16px 20px;line-height:1.6;overflow-y:auto}.bdiHEa_htmlPane{flex:1;min-height:0;display:flex}.bdiHEa_htmlFrame{background:var(--dsw-alias-bg-base);border:none;flex:1;width:100%}.bdiHEa_diffPane{border-top:1px solid var(--dsw-alias-border-l1);flex-direction:column;flex:none;min-height:0;display:flex}.bdiHEa_dragHandle{cursor:ns-resize;background:var(--dsw-alias-bg-base);flex:none;height:8px;position:relative}.bdiHEa_dragHandle:after{content:\"\";background:var(--dsw-alias-border-l2);border-radius:1px;width:36px;height:2px;position:absolute;top:3px;left:calc(50% - 18px)}.bdiHEa_dragHandle:hover:after,.bdiHEa_dragHandle:focus-visible:after{background:var(--dsw-alias-state-business-primary)}.bdiHEa_diffHead{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:3px 8px 3px 10px;display:flex}.bdiHEa_diffKind{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;padding:0 5px;font-size:10px;line-height:16px}.bdiHEa_diffKind[data-kind=git]{color:var(--dsw-alias-brand-primary)}.bdiHEa_diffKind[data-kind=write]{color:var(--dsw-alias-state-success-primary)}.bdiHEa_diffKind[data-kind=edit]{color:var(--dsw-alias-state-business-primary)}.bdiHEa_diffPath{font-family:var(--ds-font-family-code,monospace);white-space:nowrap;text-overflow:ellipsis;color:var(--dsw-alias-label-primary);direction:rtl;flex:1;min-width:0;font-size:11px;overflow:hidden}.bdiHEa_diffStats{font-size:10px;font-family:var(--ds-font-family-code,monospace);flex:none;gap:5px;display:inline-flex}.bdiHEa_iconButton{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.bdiHEa_iconButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.bdiHEa_iconButton:disabled{opacity:.4;cursor:default}.bdiHEa_paneBody{flex:1;min-height:0;overflow-y:auto}.bdiHEa_readError{color:var(--dsw-alias-state-error-primary);border-left:3px solid var(--dsw-alias-state-error-primary);white-space:pre-wrap;word-break:break-word;border-radius:0 6px 6px 0;margin:6px 8px;padding:6px 10px}.bdiHEa_priorUnknown{color:var(--dsw-alias-label-tertiary);padding:3px 10px;font-size:10px}@keyframes bdiHEa_dsh-row-in{0%{opacity:0}}.bdiHEa_gitLink:focus-visible,.bdiHEa_gitRowMain:focus-visible,.bdiHEa_gitLogRow:focus-visible,.bdiHEa_gitCommitButton:focus-visible,.bdiHEa_gitLogMore:focus-visible,.bdiHEa_gitBranchSelect:focus-visible,.bdiHEa_lensButton:focus-visible,.bdiHEa_filterChip:focus-visible,.bdiHEa_iconButton:focus-visible,.bdiHEa_dragHandle:focus-visible{outline:2px solid var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}@media (prefers-reduced-motion:reduce){.bdiHEa_gitRow{animation:none}}";
		const tagId$4 = "dsh-better-sidebar/changes.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var changes_module_css_default = {
			"opFlagError": "bdiHEa_opFlagError",
			"opRow": "bdiHEa_opRow",
			"dragHandle": "bdiHEa_dragHandle",
			"gitEmpty": "bdiHEa_gitEmpty",
			"gitLogLine2": "bdiHEa_gitLogLine2",
			"iconButton": "bdiHEa_iconButton",
			"dsh-row-in": "bdiHEa_dsh-row-in",
			"diffPane": "bdiHEa_diffPane",
			"priorUnknown": "bdiHEa_priorUnknown",
			"root": "bdiHEa_root",
			"gitCommitButton": "bdiHEa_gitCommitButton",
			"lensSwitch": "bdiHEa_lensSwitch",
			"gitLogMore": "bdiHEa_gitLogMore",
			"gitBranchSelect": "bdiHEa_gitBranchSelect",
			"gitLogRow": "bdiHEa_gitLogRow",
			"empty": "bdiHEa_empty",
			"fileGroup": "bdiHEa_fileGroup",
			"htmlPane": "bdiHEa_htmlPane",
			"gitLogSubject": "bdiHEa_gitLogSubject",
			"gitConfirmDesc": "bdiHEa_gitConfirmDesc",
			"mdToggle": "bdiHEa_mdToggle",
			"redactBanner": "bdiHEa_redactBanner",
			"opTime": "bdiHEa_opTime",
			"opMeta": "bdiHEa_opMeta",
			"gitCommitInput": "bdiHEa_gitCommitInput",
			"gitLogHash": "bdiHEa_gitLogHash",
			"gitSection": "bdiHEa_gitSection",
			"gitSectionHeader": "bdiHEa_gitSectionHeader",
			"filterRow": "bdiHEa_filterRow",
			"filterChip": "bdiHEa_filterChip",
			"gitLogRef": "bdiHEa_gitLogRef",
			"loadError": "bdiHEa_loadError",
			"diffKind": "bdiHEa_diffKind",
			"lensButton": "bdiHEa_lensButton",
			"git": "bdiHEa_git",
			"diffPath": "bdiHEa_diffPath",
			"gitLogMeta": "bdiHEa_gitLogMeta",
			"gitName": "bdiHEa_gitName",
			"mdBody": "bdiHEa_mdBody",
			"diffStats": "bdiHEa_diffStats",
			"gitLink": "bdiHEa_gitLink",
			"gitRowMain": "bdiHEa_gitRowMain",
			"filePath": "bdiHEa_filePath",
			"sessionList": "bdiHEa_sessionList",
			"readError": "bdiHEa_readError",
			"gitCommit": "bdiHEa_gitCommit",
			"gitPlaceholder": "bdiHEa_gitPlaceholder",
			"htmlFrame": "bdiHEa_htmlFrame",
			"gitLogLine1": "bdiHEa_gitLogLine1",
			"diffHead": "bdiHEa_diffHead",
			"opSize": "bdiHEa_opSize",
			"gitHeader": "bdiHEa_gitHeader",
			"opFlag": "bdiHEa_opFlag",
			"gitWorktreeRow": "bdiHEa_gitWorktreeRow",
			"gitWorktreeLabel": "bdiHEa_gitWorktreeLabel",
			"gitRow": "bdiHEa_gitRow",
			"gitBadge": "bdiHEa_gitBadge",
			"gitError": "bdiHEa_gitError",
			"session": "bdiHEa_session",
			"opKind": "bdiHEa_opKind",
			"paneBody": "bdiHEa_paneBody",
			"lensBar": "bdiHEa_lensBar"
		};
		//#endregion
		//#region src/client/changes/GitLens.tsx
		/**
		* The Git lens of the changes tab: repository truth — status list (staged vs
		* unstaged), stage/unstage, commit with a message box, branch switch, and a
		* VSCode-like history with branch decorations, author and relative time.
		* Clicking a changed file or a history row previews it in the tab's shared
		* bottom pane (see {@link DiffPane}); rows carry right-click context menus
		* with advanced operations (open in editor, discard, revert, cherry-pick,
		* copy paths/hashes). Refresh is manual + on mount/focus. While visible it
		* polls lightweight porcelain state so model-authored file changes appear
		* without a manual refresh. Everything here is the former standalone git
		* panel, re-homed as a lens.
		*/
		/** The XY status letters a row badge shows (X = index, Y = worktree). */
		function badgeOf(entry) {
			const index = entry.xy[0];
			if (index !== void 0 && index !== " " && index !== "?") return index;
			const worktree = entry.xy[1];
			if (worktree !== void 0 && worktree !== " " && worktree !== "?") return worktree;
			return "?";
		}
		/** Whether the entry carries STAGED (index) changes — the X letter is set. */
		function isStagedEntry(entry) {
			const index = entry.xy[0];
			return index !== void 0 && index !== " " && index !== "?";
		}
		/** Whether the entry carries UNSTAGED (worktree) changes — the Y letter is set
		*  (untracked `??` counts as unstaged: it is a worktree-only change). A file
		*  with both letters set ('MM') lands in BOTH sections. */
		function isUnstagedEntry(entry) {
			if (entry.xy === "??") return true;
			const worktree = entry.xy[1];
			return worktree !== void 0 && worktree !== " " && worktree !== "?";
		}
		/** Whether the entry is untracked (`??`): git diff never includes it. */
		function isUntracked(entry) {
			return badgeOf(entry) === "?";
		}
		/** The ref names of one log row's decorations (`HEAD -> main` → `main`), deduped. */
		function refNames(refs) {
			return [...new Set(refs.split(",").map((ref) => ref.trim()).filter((ref) => ref !== "").map((ref) => ref.includes(" -> ") ? ref.slice(ref.indexOf(" -> ") + 4) : ref).map((ref) => ref.startsWith("tag: ") ? ref.slice(5) : ref))];
		}
		/** One thrown value as display text (every error banner/row here normalizes
		*  through this so non-Error rejections never render as '[object Object]'). */
		function errorMessage(reason) {
			return reason instanceof Error ? reason.message : String(reason);
		}
		/** History batch size: the log loads lazily in pages so a long history never
		*  floods the panel at once (the end of the log is reached by paging). */
		const LOG_BATCH = 20;
		/** Every Nth silent poll re-lists worktrees (and re-runs auto-selection): the
		*  2s tick only needs the selected checkout's STATUS, and re-listing spawned
		*  a second git process per tick for a list that almost never changes — a
		*  linked checkout the agent creates mid-session is picked up within ~30s
		*  instead of 2s. */
		const WORKTREE_RECHECK_TICKS = 15;
		function GitLens(props) {
			const { scope, store, onOpenFile, onPreview, selectedRef, visible } = props;
			const [status, setStatus] = (0, react.useState)(null);
			const [worktrees, setWorktrees] = (0, react.useState)([]);
			const [selectedWorktree, setSelectedWorktree] = (0, react.useState)();
			const [repoRoot, setRepoRoot] = (0, react.useState)(void 0);
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)(null);
			const [branchNames, setBranchNames] = (0, react.useState)([]);
			const [logEntries, setLogEntries] = (0, react.useState)([]);
			const [commitMsg, setCommitMsg] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [commitError, setCommitError] = (0, react.useState)(null);
			/** Whether the history was fully paged (a batch shorter than LOG_BATCH). */
			const [logEnded, setLogEnded] = (0, react.useState)(false);
			const [logLoadingMore, setLogLoadingMore] = (0, react.useState)(false);
			/** The open file-row context menu (cursor position for the portaled Menu). */
			const [fileMenu, setFileMenu] = (0, react.useState)(null);
			/** The open history-row context menu. */
			const [historyMenu, setHistoryMenu] = (0, react.useState)(null);
			/** The pending destructive action awaiting confirmation. */
			const [confirm, setConfirm] = (0, react.useState)(null);
			const refreshInFlight = (0, react.useRef)(false);
			/** Monotonic request id: a manual worktree switch invalidates any older poll
			*  before it can publish state from the previous checkout. */
			const refreshGeneration = (0, react.useRef)(0);
			const worktreeChosenByUser = (0, react.useRef)(false);
			/** selectedWorktree read inside refresh without re-creating the callback:
			*  avoids a spurious full refresh on every auto-select (the very state
			*  change refresh writes back via setSelectedWorktree would recreate the
			*  callback and re-trigger the mount effect — an N→N+1 fetch loop). */
			const chosenPathRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				chosenPathRef.current = selectedWorktree;
			}, [selectedWorktree]);
			/** Silent polls since the last worktree re-list (see WORKTREE_RECHECK_TICKS). */
			const silentTickCount = (0, react.useRef)(0);
			const gitScope = repoRoot === void 0 ? scope : {
				...scope,
				repoRoot
			};
			/** Publish a complete checkout-derived view. Status, branch choices and
			*  history are one consistency unit: never mix rows from two worktrees. */
			const refreshTarget = (0, react.useCallback)(async (target, options) => {
				if (options.loading) setLoading(true);
				setError(null);
				try {
					const [statusResult, branchResult, logResult] = await Promise.all([
						api.gitStatus(gitScope, target),
						api.gitBranch(gitScope, target).catch(() => ({
							current: "",
							names: []
						})),
						api.gitLog(gitScope, LOG_BATCH, 0, target).catch(() => [])
					]);
					if (options.generation !== refreshGeneration.current) return;
					setStatus(statusResult);
					if (statusResult.root !== void 0 && statusResult.root !== repoRoot) setRepoRoot(statusResult.root);
					setBranchNames(branchResult.names);
					setLogEntries(logResult);
					setLogEnded(logResult.length < LOG_BATCH);
				} catch (reason) {
					if (options.generation === refreshGeneration.current) setError(errorMessage(reason));
				} finally {
					if (options.loading && options.generation === refreshGeneration.current) setLoading(false);
				}
			}, [
				scope.sessionId,
				scope.cwd,
				repoRoot
			]);
			const refresh = (0, react.useCallback)(async (silent = false) => {
				if (refreshInFlight.current) return;
				refreshInFlight.current = true;
				let generation = refreshGeneration.current;
				try {
					if (silent && chosenPathRef.current !== void 0 && (silentTickCount.current += 1) % WORKTREE_RECHECK_TICKS !== 0) {
						const statusResult = await api.gitStatus(gitScope, chosenPathRef.current);
						if (generation === refreshGeneration.current) setStatus(statusResult);
						return;
					}
					silentTickCount.current = 0;
					const listed = await api.gitWorktrees(scope);
					if (generation !== refreshGeneration.current) return;
					setWorktrees(listed);
					let target = listed.some((entry) => entry.path === chosenPathRef.current) ? chosenPathRef.current : listed.find((entry) => entry.current)?.path;
					const current = listed.find((entry) => entry.current);
					const dirtyLinked = listed.filter((entry) => !entry.current && entry.changes > 0);
					if (!worktreeChosenByUser.current) target = (current?.changes ?? 0) === 0 && dirtyLinked.length === 1 ? dirtyLinked[0].path : current?.path;
					const targetChanged = target !== chosenPathRef.current;
					if (targetChanged) {
						generation = refreshGeneration.current += 1;
						chosenPathRef.current = target;
						setSelectedWorktree(target);
						setStatus(null);
						setBranchNames([]);
						setLogEntries([]);
						setLogEnded(false);
						setLogLoadingMore(false);
					}
					if (silent && !targetChanged) {
						const statusResult = await api.gitStatus(gitScope, target);
						if (generation === refreshGeneration.current) setStatus(statusResult);
						return;
					}
					await refreshTarget(target, {
						loading: !silent,
						generation
					});
				} catch (reason) {
					if (generation === refreshGeneration.current) {
						setError(errorMessage(reason));
						if (!silent) setLoading(false);
					}
				} finally {
					refreshInFlight.current = false;
				}
			}, [
				scope.sessionId,
				scope.cwd,
				refreshTarget
			]);
			(0, react.useEffect)(() => {
				refreshGeneration.current += 1;
				refreshInFlight.current = false;
				worktreeChosenByUser.current = false;
				chosenPathRef.current = void 0;
				silentTickCount.current = 0;
				setSelectedWorktree(void 0);
			}, [scope.sessionId, scope.cwd]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			/** A user choice invalidates any older poll and atomically refreshes every
			*  checkout-derived surface before destructive history actions can run. */
			const chooseWorktree = (target) => {
				worktreeChosenByUser.current = true;
				chosenPathRef.current = target;
				setSelectedWorktree(target);
				setStatus(null);
				setBranchNames([]);
				setLogEntries([]);
				setLogEnded(false);
				setLogLoadingMore(false);
				const generation = refreshGeneration.current += 1;
				refreshTarget(target, {
					loading: true,
					generation
				});
			};
			/** Switching the selected child repository must invalidate every
			*  target-derived surface (status/history/log) before the asynchronous
			*  refresh resolves; otherwise stale rows remain actionable while their
			*  handlers already address the new repository. Mirrors chooseWorktree. */
			const chooseRepo = (target) => {
				setRepoRoot(target);
				setStatus(null);
				setBranchNames([]);
				setLogEntries([]);
				setLogEnded(false);
				setLogLoadingMore(false);
				const generation = refreshGeneration.current += 1;
				refreshTarget(chosenPathRef.current ?? "", {
					loading: true,
					generation
				});
			};
			usePolling(visible, (0, react.useCallback)(() => refresh(true), [refresh]), { intervalMs: 2e3 });
			/** Append the next history page (lazy: only when the user asks for more). */
			const loadMoreLog = async () => {
				if (logLoadingMore || logEnded) return;
				const generation = refreshGeneration.current;
				const target = chosenPathRef.current;
				setLogLoadingMore(true);
				try {
					const next = await api.gitLog(gitScope, LOG_BATCH, logEntries.length, target);
					if (generation !== refreshGeneration.current || target !== chosenPathRef.current) return;
					setLogEntries((entries) => [...entries, ...next]);
					if (next.length < LOG_BATCH) setLogEnded(true);
				} catch (reason) {
					if (generation === refreshGeneration.current && target === chosenPathRef.current) setCommitError(`${t("historyLoadError")}: ${errorMessage(reason)}`);
				} finally {
					if (generation === refreshGeneration.current && target === chosenPathRef.current) setLogLoadingMore(false);
				}
			};
			/** The preview ref for one changed file (one ref per path+side). */
			const worktreeRefOf = (entry, staged) => ({
				kind: "worktree",
				path: entry.path,
				staged,
				untracked: isUntracked(entry),
				worktree: selectedWorktree,
				repoRoot
			});
			/** The preview ref for one commit. */
			const commitRefOf = (entry) => ({
				kind: "commit",
				hash: entry.hash,
				hashFull: entry.hashFull,
				subject: entry.subject,
				worktree: selectedWorktree,
				repoRoot
			});
			/** Whether a worktree row is the one currently previewed. */
			const isPreviewedWorktree = (entry, staged) => {
				if (selectedRef === null || selectedRef.kind !== "worktree") return false;
				return selectedRef.path === entry.path && selectedRef.staged === staged && (selectedRef.worktree ?? "") === (selectedWorktree ?? "");
			};
			const stageEntry = async (entry, staged) => {
				setBusy(true);
				try {
					if (staged) await api.gitUnstage(gitScope, entry.path, selectedWorktree);
					else await api.gitStage(gitScope, entry.path, selectedWorktree);
					await refresh();
				} finally {
					setBusy(false);
				}
			};
			const stageAll = async (staged) => {
				setBusy(true);
				try {
					if (staged) await api.gitUnstage(gitScope, void 0, selectedWorktree);
					else await api.gitStage(gitScope, void 0, selectedWorktree);
					await refresh();
				} finally {
					setBusy(false);
				}
			};
			const commit = async () => {
				const message = commitMsg.trim();
				if (message === "" || busy) return;
				setBusy(true);
				setCommitError(null);
				try {
					await api.gitCommit(gitScope, message, selectedWorktree);
					setCommitMsg("");
					await refresh();
				} catch (reason) {
					setCommitError(errorMessage(reason));
				} finally {
					setBusy(false);
				}
			};
			const checkout = async (branch) => {
				if (branch === status?.branch || busy) return;
				setBusy(true);
				setCommitError(null);
				try {
					await api.gitCheckout(gitScope, branch, selectedWorktree);
					await refresh();
				} catch (reason) {
					setCommitError(`${t("checkoutError")}: ${errorMessage(reason)}`);
				} finally {
					setBusy(false);
				}
			};
			/** Run one destructive operation after the confirm modal, then refresh. */
			const runConfirmed = (confirmState) => {
				setConfirm({
					...confirmState,
					onConfirm: async () => {
						setBusy(true);
						setCommitError(null);
						try {
							await confirmState.onConfirm();
							await refresh();
						} catch (reason) {
							setCommitError(errorMessage(reason));
						} finally {
							setBusy(false);
						}
					}
				});
			};
			/** Copy `text` to the clipboard (best-effort; no visual feedback needed — the menu closes). */
			const copy = (text) => {
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(text);
			};
			const openFileMenu = (event, entry, staged) => {
				event.preventDefault();
				event.stopPropagation();
				setFileMenu({
					entry,
					staged,
					x: event.clientX,
					y: event.clientY
				});
			};
			const openHistoryMenu = (event, entry) => {
				event.preventDefault();
				event.stopPropagation();
				setHistoryMenu({
					entry,
					x: event.clientX,
					y: event.clientY
				});
			};
			const stagedEntries = (status?.entries ?? []).filter(isStagedEntry);
			const unstagedEntries = (status?.entries ?? []).filter(isUnstagedEntry);
			const renderEntry = (entry, staged) => {
				const selected = isPreviewedWorktree(entry, staged);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: changes_module_css_default.gitRow,
					"data-selected": selected ? "true" : void 0,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: changes_module_css_default.gitRowMain,
						title: entry.path,
						onClick: () => {
							onPreview(worktreeRefOf(entry, staged));
						},
						onContextMenu: (event) => {
							openFileMenu(event, entry, staged);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: changes_module_css_default.gitBadge,
							"data-letter": badgeOf(entry),
							children: badgeOf(entry)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: changes_module_css_default.gitName,
							children: entry.path
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: changes_module_css_default.iconButton,
						"aria-label": staged ? t("unstage") : t("stage"),
						title: staged ? t("unstage") : t("stage"),
						disabled: busy,
						onClick: () => {
							stageEntry(entry, staged);
						},
						children: staged ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
					})]
				}, `${staged ? "s" : "u"}:${entry.path}`);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: changes_module_css_default.git,
				children: [
					worktrees.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: changes_module_css_default.gitWorktreeRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: changes_module_css_default.gitWorktreeLabel,
							children: t("worktree")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: changes_module_css_default.gitBranchSelect,
							value: selectedWorktree ?? "",
							title: selectedWorktree,
							disabled: busy,
							onChange: (event) => {
								chooseWorktree(event.target.value);
							},
							children: worktrees.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
								value: entry.path,
								children: [
									entry.branch,
									" · ",
									baseName$1(entry.path),
									" (",
									entry.changes,
									")"
								]
							}, entry.path))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: changes_module_css_default.gitHeader,
						children: [
							(status?.repositories?.length ?? 0) > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: changes_module_css_default.gitBranchSelect,
								value: repoRoot ?? "",
								title: repoRoot,
								onChange: (event) => {
									chooseRepo(event.target.value);
								},
								disabled: busy,
								children: status.repositories.map((root) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: root,
									children: baseName$1(root)
								}, root))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: changes_module_css_default.gitBranchSelect,
								value: status?.branch ?? "",
								onChange: (event) => {
									checkout(event.target.value);
								},
								disabled: busy || status !== null && !status.isRepo,
								children: [(status?.branch ?? "") !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: status.branch,
									children: status.branch
								}), branchNames.filter((name) => name !== status?.branch).map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: name,
									children: name
								}, name))]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: changes_module_css_default.iconButton,
								"aria-label": t("refresh"),
								title: t("refresh"),
								onClick: () => {
									refresh();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
							})
						]
					}),
					loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.gitPlaceholder,
						children: t("loading")
					}),
					!loading && error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.gitError,
						children: error
					}),
					!loading && status !== null && !status.isRepo && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.gitPlaceholder,
						children: t("notRepo")
					}),
					status !== null && status.isRepo && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						status.truncated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.gitEmpty,
							children: t("statusTruncated")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: changes_module_css_default.gitSection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: changes_module_css_default.gitSectionHeader,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										t("staged"),
										" (",
										stagedEntries.length,
										")"
									] }), stagedEntries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: changes_module_css_default.gitLink,
										disabled: busy,
										onClick: () => {
											stageAll(true);
										},
										children: t("unstageAll")
									})]
								}),
								stagedEntries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: changes_module_css_default.gitEmpty,
									children: t("noChanges")
								}),
								stagedEntries.map((entry) => renderEntry(entry, true))
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: changes_module_css_default.gitSection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: changes_module_css_default.gitSectionHeader,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										t("unstaged"),
										" (",
										unstagedEntries.length,
										")"
									] }), unstagedEntries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: changes_module_css_default.gitLink,
										disabled: busy,
										onClick: () => {
											stageAll(false);
										},
										children: t("stageAll")
									})]
								}),
								unstagedEntries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: changes_module_css_default.gitEmpty,
									children: t("noChanges")
								}),
								unstagedEntries.map((entry) => renderEntry(entry, false))
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: changes_module_css_default.gitCommit,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: changes_module_css_default.gitCommitInput,
								placeholder: t("commitPlaceholder"),
								value: commitMsg,
								disabled: busy,
								onChange: (event) => {
									setCommitMsg(event.target.value);
									setCommitError(null);
								},
								onKeyDown: (event) => {
									if ((event.ctrlKey || event.metaKey) && event.key === "Enter") commit();
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: changes_module_css_default.gitCommitButton,
								disabled: busy || commitMsg.trim() === "" || stagedEntries.length === 0,
								onClick: () => {
									commit();
								},
								children: t("commit")
							})]
						}),
						commitError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.gitError,
							children: commitError
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: changes_module_css_default.gitSection,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: changes_module_css_default.gitSectionHeader,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("history") })
								}),
								logEntries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									role: "button",
									tabIndex: 0,
									className: changes_module_css_default.gitLogRow,
									"data-selected": selectedRef?.kind === "commit" && selectedRef.hashFull === entry.hashFull ? "true" : void 0,
									title: `${entry.author} · ${entry.date}\n${entry.hashFull}`,
									onClick: () => {
										onPreview(commitRefOf(entry));
									},
									onKeyDown: (event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											onPreview(commitRefOf(entry));
										}
									},
									onContextMenu: (event) => {
										openHistoryMenu(event, entry);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: changes_module_css_default.gitLogLine1,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: changes_module_css_default.gitLogHash,
											children: entry.hash
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: changes_module_css_default.gitLogSubject,
											children: entry.subject
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: changes_module_css_default.gitLogLine2,
										children: [refNames(entry.refs).map((ref) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: changes_module_css_default.gitLogRef,
											children: ref
										}, ref)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: changes_module_css_default.gitLogMeta,
											children: [
												entry.author,
												" · ",
												relativeTime(entry.date)
											]
										})]
									})]
								}, entry.hashFull)),
								!logEnded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: changes_module_css_default.gitLogMore,
									disabled: logLoadingMore || busy,
									onClick: () => {
										loadMoreLog();
									},
									children: logLoadingMore ? t("loading") : t("loadMore")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: fileMenu !== null,
							onClose: () => {
								setFileMenu(null);
							},
							items: [
								...fileMenu !== null && (store.getPrefs().workspaceFence === false || isWithinWorkspace(scope.cwd ?? "", resolveSidebarPath(repoRoot ?? selectedWorktree ?? scope.cwd, fileMenu.entry.path))) ? [{
									id: "open",
									label: t("openEditor"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 14 })
								}] : [],
								fileMenu?.staged === true ? {
									id: "stage",
									label: t("unstage"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
								} : {
									id: "stage",
									label: t("stage"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 })
								},
								...fileMenu !== null && !isUntracked(fileMenu.entry) ? [{
									id: "discard",
									label: t("discard"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 }),
									danger: true
								}] : [],
								{
									type: "separator",
									id: "sep1"
								},
								{
									id: "relative",
									label: t("copyRelative"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
								},
								{
									id: "absolute",
									label: t("copyAbsolute"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
								}
							],
							onSelect: (id) => {
								const target = fileMenu;
								if (target === null) return;
								setFileMenu(null);
								if (id === "open") {
									const resolved = resolveSidebarPath(repoRoot ?? selectedWorktree ?? scope.cwd, target.entry.path);
									if (store.getPrefs().workspaceFence !== false && !isWithinWorkspace(scope.cwd ?? "", resolved)) return;
									onOpenFile(resolved);
									return;
								}
								if (id === "stage") {
									stageEntry(target.entry, target.staged);
									return;
								}
								if (id === "discard") {
									runConfirmed({
										title: t("discardTitle"),
										description: t("discardDesc", { path: target.entry.path }),
										confirmLabel: t("discard"),
										onConfirm: () => api.gitDiscard(gitScope, target.entry.path, selectedWorktree)
									});
									return;
								}
								if (id === "relative") {
									copy(relativeTo(repoRoot ?? selectedWorktree ?? scope.cwd ?? "", target.entry.path));
									return;
								}
								if (id === "absolute") copy(resolveSidebarPath(repoRoot ?? selectedWorktree ?? scope.cwd, target.entry.path));
							},
							portal: true,
							compact: true,
							align: "start",
							getAnchorRect: () => fileMenu === null ? null : new DOMRect(fileMenu.x, fileMenu.y, 0, 0),
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: historyMenu !== null,
							onClose: () => {
								setHistoryMenu(null);
							},
							items: [
								{
									id: "view",
									label: t("viewCommitDiff")
								},
								{
									id: "copyShort",
									label: t("copyShortHash"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
								},
								{
									id: "copyFull",
									label: t("copyFullHash"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
								},
								{
									id: "copySubject",
									label: t("copySubject"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, { size: 14 })
								},
								{
									type: "separator",
									id: "sep2"
								},
								{
									id: "revert",
									label: t("revertCommit"),
									danger: true
								},
								{
									id: "cherryPick",
									label: t("cherryPickCommit"),
									danger: true
								}
							],
							onSelect: (id) => {
								const target = historyMenu;
								if (target === null) return;
								setHistoryMenu(null);
								if (id === "view") {
									onPreview(commitRefOf(target.entry));
									return;
								}
								if (id === "copyShort") {
									copy(target.entry.hash);
									return;
								}
								if (id === "copyFull") {
									copy(target.entry.hashFull);
									return;
								}
								if (id === "copySubject") {
									copy(target.entry.subject);
									return;
								}
								if (id === "revert") {
									runConfirmed({
										title: t("revertTitle"),
										description: t("revertDesc", { subject: target.entry.subject }),
										confirmLabel: t("revertCommit"),
										onConfirm: () => api.gitRevert(gitScope, target.entry.hashFull, selectedWorktree)
									});
									return;
								}
								if (id === "cherryPick") runConfirmed({
									title: t("cherryPickTitle"),
									description: t("cherryPickDesc", { subject: target.entry.subject }),
									confirmLabel: t("cherryPickCommit"),
									onConfirm: () => api.gitCherryPick(gitScope, target.entry.hashFull, selectedWorktree)
								});
							},
							portal: true,
							compact: true,
							align: "start",
							getAnchorRect: () => historyMenu === null ? null : new DOMRect(historyMenu.x, historyMenu.y, 0, 0),
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
							open: confirm !== null,
							onClose: () => {
								setConfirm(null);
							},
							title: confirm?.title ?? "",
							closeLabel: t("cancel"),
							footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => {
									setConfirm(null);
								},
								children: t("cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy,
								onClick: () => {
									const pending = confirm;
									if (pending === null) return;
									setConfirm(null);
									pending.onConfirm();
								},
								children: confirm?.confirmLabel ?? ""
							})] }),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: changes_module_css_default.gitConfirmDesc,
								children: confirm?.description
							})
						})
					] })
				]
			});
		}
		//#endregion
		//#region src/client/changes/ops.ts
		/** Tool names mapped to each op kind; unknown names are ignored. */
		const READ_TOOLS = /* @__PURE__ */ new Set([
			"read",
			"view",
			"see"
		]);
		const WRITE_TOOLS = /* @__PURE__ */ new Set(["write", "create"]);
		const EDIT_TOOLS = /* @__PURE__ */ new Set([
			"edit",
			"str_replace",
			"str-replace-editor",
			"multi-edit"
		]);
		/** Classify one tool name; undefined when the tool touches no file. */
		function kindOf(name) {
			if (READ_TOOLS.has(name)) return "read";
			if (WRITE_TOOLS.has(name)) return "write";
			if (EDIT_TOOLS.has(name)) return "edit";
		}
		/**
		* Parse one tool-call arguments JSON body defensively: the payload is
		* model-emitted wire data, so every field is checked before use.
		*/
		function parseArgs(argsRaw) {
			try {
				const parsed = JSON.parse(argsRaw);
				if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
				return parsed;
			} catch {
				return {};
			}
		}
		/** Extract the path field common to every file tool's arguments. */
		function pathOf(args) {
			for (const key of [
				"file_path",
				"path",
				"filePath"
			]) {
				const value = args[key];
				if (typeof value === "string" && value.length > 0) return value;
			}
		}
		/** The finalized plain text of one tool result (inner text blocks joined). */
		function resultText(message) {
			if (!Array.isArray(message.content)) return void 0;
			const parts = [];
			for (const block of message.content) {
				if (block === null || typeof block !== "object") continue;
				const candidate = block;
				if (candidate.type !== "tool-result") continue;
				const inner = candidate.content;
				if (!Array.isArray(inner)) continue;
				for (const item of inner) {
					if (item === null || typeof item !== "object") continue;
					const textItem = item;
					if (textItem.type === "text" && typeof textItem.text === "string") parts.push(textItem.text);
				}
			}
			return parts.length > 0 ? parts.join("\n") : void 0;
		}
		/** Whether a tool result reported an error (the inner block's isError flag). */
		function resultIsError(message) {
			if (!Array.isArray(message.content)) return false;
			return message.content.some((block) => {
				if (block === null || typeof block !== "object") return false;
				return block.type === "tool-result" && block.isError === true;
			});
		}
		/**
		* Fold a session event log into the file operations it contains, newest
		* first. A `tool/call` seeds a running op (payload from the model's
		* arguments); its `tool/result` settles it (read content, error text).
		* Calls dispatched through a host tool such as run_code appear as their own
		* `tool/call` rows in the log, so nested file calls fold in naturally.
		* @param events - the session's append-only event log (oldest → newest).
		* @returns the ordered operation list.
		*/
		function extractFileOps(events) {
			const byCall = /* @__PURE__ */ new Map();
			for (const event of events) if (event.type === "tool/call") {
				const data = event.data;
				if (typeof data.name !== "string" || typeof data.callId !== "string") continue;
				const kind = kindOf(data.name);
				if (kind === void 0) continue;
				const args = parseArgs(typeof data.arguments === "string" ? data.arguments : "");
				const path = pathOf(args);
				if (path === void 0) continue;
				const base = {
					callId: data.callId,
					kind,
					path,
					time: event.time,
					running: true,
					isError: false
				};
				if (kind === "edit") {
					const oldString = args.old_string;
					const newString = args.new_string;
					byCall.set(data.callId, typeof oldString === "string" && typeof newString === "string" ? {
						...base,
						edit: {
							oldString,
							newString
						}
					} : base);
					continue;
				}
				if (kind === "write") {
					const content = args.content;
					byCall.set(data.callId, typeof content === "string" && content.length > 0 ? {
						...base,
						content
					} : base);
					continue;
				}
				byCall.set(data.callId, base);
			} else if (event.type === "tool/result") {
				const message = event.data.message;
				if (message === void 0) continue;
				const callId = message.source?.callId;
				if (typeof callId !== "string") continue;
				const op = byCall.get(callId);
				if (op === void 0) continue;
				const text = resultText(message);
				const isError = resultIsError(message);
				const patch = {
					running: false,
					isError
				};
				if (text !== void 0 && text.length > 0) {
					if (isError) patch.errorText = text;
					else if (op.kind === "read") patch.read = text;
					else if (op.kind === "write" && op.content === void 0) patch.content = text;
				}
				byCall.set(callId, {
					...op,
					...patch
				});
			}
			return [...byCall.values()].sort((a, b) => b.time - a.time);
		}
		/**
		* Group operations by path, newest op first per file, files ordered by their
		* most recent operation.
		*/
		function groupByFile(ops) {
			const groups = /* @__PURE__ */ new Map();
			for (const op of ops) {
				const list = groups.get(op.path) ?? [];
				list.push(op);
				groups.set(op.path, list);
			}
			const ordered = [...groups.entries()].sort((a, b) => b[1][0].time - a[1][0].time);
			return new Map(ordered);
		}
		/**
		* The last content known for a path before the given operation, synthesized
		* from earlier ops: a write's payload is authoritative, an edit implies its
		* old side. Best effort — a write with no known prior content diffs against
		* nothing (all-added).
		*/
		function knownContentBefore(ops, path, before) {
			const ofFile = ops.filter((op) => op.path === path && op.time <= before.time && op !== before);
			for (let i = ofFile.length - 1; i >= 0; i -= 1) {
				const op = ofFile[i];
				if (op.kind === "write" && op.content !== void 0) return op.content;
				if (op.kind === "edit" && op.edit !== void 0 && i === ofFile.length - 1) return op.edit.oldString;
			}
		}
		/**
		* The read-tool response's `<content>` body split into lines with the
		* "(Showing lines …)" note dropped — the shared envelope core both read
		* parsers consume: {@link parseReadLines} recovers line numbers from the
		* "<n>: " prefixes, {@link parseReadContent} keeps the raw text.
		*/
		function contentLines(raw) {
			const contentMatch = raw.match(/<content>([\s\S]*?)<\/content>/);
			return (contentMatch ? contentMatch[1] : raw).split("\n").filter((line) => !/^\s*\(Showing lines .*\)\s*$/.test(line));
		}
		/**
		* Strip the DSH read-tool response envelope down to the file's raw content,
		* PRESERVING blank lines (unlike {@link parseReadLines}, which drops them):
		* drops the <content> wrapper, the "(Showing lines ...)" note, and the
		* per-line "<n>: " prefixes. The markdown reading mode needs the blank lines
		* because markdown block structure depends on them.
		*/
		function parseReadContent(raw) {
			return contentLines(raw).map((line) => line.replace(/^\s*\d+:\s/, "")).join("\n").replace(/^[\n]+/, "").replace(/\n+$/, "");
		}
		/**
		* Parse a DSH read result into file lines with their real line numbers:
		* drops the <content> envelope and "(Showing lines ...)" note; recovers the
		* "<n>: " prefix as the line number, falling back to sequential counting.
		*/
		function parseReadLines(raw) {
			const result = [];
			let fallback = 1;
			for (const line of contentLines(raw)) {
				if (line.length === 0) continue;
				const match = line.match(/^\s*(\d+):\s?(.*)$/);
				if (match !== null) {
					result.push({
						line: Number(match[1]),
						text: match[2] ?? ""
					});
					fallback = Number(match[1]) + 1;
				} else {
					result.push({
						line: fallback,
						text: line
					});
					fallback += 1;
				}
			}
			return result;
		}
		//#endregion
		//#region src/client/diff/rows.ts
		/**
		* Longest-common-subsequence table over line equality.
		* @param oldLines - old side lines.
		* @param newLines - new side lines.
		* @returns the LCS length matrix (rows index oldLines, columns newLines).
		*/
		function lcsTable(oldLines, newLines) {
			const table = Array.from({ length: oldLines.length + 1 }, () => new Array(newLines.length + 1).fill(0));
			for (let i = oldLines.length - 1; i >= 0; i -= 1) for (let j = newLines.length - 1; j >= 0; j -= 1) table[i][j] = oldLines[i] === newLines[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
			return table;
		}
		/**
		* Pair each del-run with the add-run that follows it: the overlapping
		* `min(len)` rows on both sides become 'mod' so rewrites tint distinctly and
		* receive intra-line highlighting. Pure — returns a new array when anything
		* changed. Shared by the LCS walk and the unified-diff converter so git
		* hunks rewrite-pair exactly like session ops do.
		*/
		function pairMods(rows) {
			const out = rows.slice();
			let k = 0;
			while (k < out.length) {
				if (out[k].kind !== "del") {
					k += 1;
					continue;
				}
				const delStart = k;
				while (k < out.length && out[k].kind === "del") k += 1;
				const addStart = k;
				while (k < out.length && out[k].kind === "add") k += 1;
				const pairs = Math.min(addStart - delStart, k - addStart);
				for (let p = 0; p < pairs; p += 1) {
					out[delStart + p] = {
						...out[delStart + p],
						kind: "mod"
					};
					out[addStart + p] = {
						...out[addStart + p],
						kind: "mod"
					};
				}
			}
			return out;
		}
		/**
		* Line diff by LCS walk with rewrite pairing: the raw walk emits context/del/
		* add rows; `pairMods` marks rewritten pairs as 'mod'.
		* @param oldText - the previous content; empty string diffs against nothing.
		* @param newText - the next content.
		* @returns ordered diff rows, old-side deletions before new-side additions.
		*/
		function diffLines(oldText, newText) {
			const oldLines = oldText.length === 0 ? [] : oldText.split("\n");
			const newLines = newText.length === 0 ? [] : newText.split("\n");
			const table = lcsTable(oldLines, newLines);
			const raw = [];
			let i = 0;
			let j = 0;
			while (i < oldLines.length && j < newLines.length) if (oldLines[i] === newLines[j]) {
				raw.push({
					kind: "context",
					oldLine: i + 1,
					newLine: j + 1,
					text: oldLines[i]
				});
				i += 1;
				j += 1;
			} else if (table[i + 1][j] >= table[i][j + 1]) {
				raw.push({
					kind: "del",
					oldLine: i + 1,
					text: oldLines[i]
				});
				i += 1;
			} else {
				raw.push({
					kind: "add",
					newLine: j + 1,
					text: newLines[j]
				});
				j += 1;
			}
			while (i < oldLines.length) {
				raw.push({
					kind: "del",
					oldLine: i + 1,
					text: oldLines[i]
				});
				i += 1;
			}
			while (j < newLines.length) {
				raw.push({
					kind: "add",
					newLine: j + 1,
					text: newLines[j]
				});
				j += 1;
			}
			return pairMods(raw);
		}
		/**
		* Group a line diff into hunks and folded context runs. Consecutive changes
		* whose gap fits within the context window merge into one hunk; unchanged
		* regions between hunks (and any surrounding the whole diff) become fold
		* segments that default collapsed. This yields the file-hunk presentation
		* familiar from terminal diffs (Claude Code / git hunk headers).
		* @param rows - the flat diff rows.
		* @param context - how many unchanged rows around a change stay visible.
		* @returns ordered segments (hunks and folds).
		*/
		function buildDiffSegments(rows, context = 3) {
			if (rows.length === 0) return [];
			const changeIndexes = rows.flatMap((row, index) => row.kind === "context" || row.kind === "meta" ? [] : [index]);
			if (changeIndexes.length === 0) return [{
				kind: "fold",
				rows: [...rows],
				count: rows.length,
				oldStart: 1,
				oldEnd: rows.length,
				newStart: 1,
				newEnd: rows.length
			}];
			const hunks = [];
			for (const ci of changeIndexes) {
				const start = Math.max(0, ci - context);
				const end = Math.min(rows.length - 1, ci + context);
				const last = hunks[hunks.length - 1];
				if (last !== void 0 && start <= last.end + 1) last.end = Math.max(last.end, end);
				else hunks.push({
					start,
					end
				});
			}
			const segments = [];
			let cursor = 0;
			for (const hunk of hunks) {
				if (hunk.start > cursor) segments.push(foldOf(rows.slice(cursor, hunk.start)));
				segments.push({
					kind: "hunk",
					rows: rows.slice(hunk.start, hunk.end + 1)
				});
				cursor = hunk.end + 1;
			}
			if (cursor < rows.length) segments.push(foldOf(rows.slice(cursor)));
			return segments;
		}
		function foldOf(rows) {
			return {
				kind: "fold",
				rows,
				count: rows.length,
				oldStart: firstOldLine(rows) ?? 1,
				oldEnd: lastOldLine(rows) ?? 0,
				newStart: firstNewLine(rows) ?? 1,
				newEnd: lastNewLine(rows) ?? 0
			};
		}
		function firstOldLine(rows) {
			for (const row of rows) if (row.oldLine !== void 0) return row.oldLine;
		}
		function lastOldLine(rows) {
			for (let i = rows.length - 1; i >= 0; i -= 1) if (rows[i].oldLine !== void 0) return rows[i].oldLine;
		}
		function firstNewLine(rows) {
			for (const row of rows) if (row.newLine !== void 0) return row.newLine;
		}
		function lastNewLine(rows) {
			for (let i = rows.length - 1; i >= 0; i -= 1) if (rows[i].newLine !== void 0) return rows[i].newLine;
		}
		/**
		* Intra-line diff by common prefix/suffix: the shared leading and trailing
		* characters stay unchanged, and only the differing middle is marked changed
		* on both sides. This never highlights identical characters and keeps a small
		* edit inside a long line immediately visible. Pure, no React/DOM.
		* @param oldText - the old line.
		* @param newText - the new line.
		* @returns per-side segments marking changed runs.
		*/
		function diffInline(oldText, newText) {
			const minLen = Math.min(oldText.length, newText.length);
			let prefix = 0;
			while (prefix < minLen && oldText[prefix] === newText[prefix]) prefix += 1;
			let suffix = 0;
			while (suffix < minLen - prefix && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]) suffix += 1;
			const oldMidStart = prefix;
			const oldMidEnd = oldText.length - suffix;
			const newMidStart = prefix;
			const newMidEnd = newText.length - suffix;
			const segments = (text, midStart, midEnd) => {
				const out = [];
				if (midStart > 0) out.push({
					text: text.slice(0, midStart),
					changed: false
				});
				const mid = text.slice(midStart, midEnd);
				if (mid.length > 0) out.push({
					text: mid,
					changed: true
				});
				if (midEnd < text.length) out.push({
					text: text.slice(midEnd),
					changed: false
				});
				return out;
			};
			return {
				old: segments(oldText, oldMidStart, oldMidEnd),
				next: segments(newText, newMidStart, newMidEnd)
			};
		}
		/**
		* Merge adjacent inline segments sharing the same changed flag, so rendering
		* wraps each run — not each character — in one span.
		* @param segments - the raw per-character-heavy inline segments.
		* @returns coalesced segments; identical text joined into runs.
		*/
		function coalesceInline(segments) {
			const out = [];
			for (const seg of segments) {
				const last = out[out.length - 1];
				if (last !== void 0 && last.changed === seg.changed) out[out.length - 1] = {
					text: last.text + seg.text,
					changed: seg.changed
				};
				else out.push(seg);
			}
			return out;
		}
		/** Human byte count for the panel meta row. */
		function formatBytes(bytes) {
			if (bytes < 1024) return `${String(bytes)} B`;
			if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
			return `${(bytes / 1048576).toFixed(1)} MB`;
		}
		/** Parse the hunk header `@@ -a[,b] +c[,d] @@ section` (section may contain '@@'). */
		function parseHunkHeader(line) {
			const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line);
			if (match === null) return null;
			return {
				oldStart: Number(match[1]),
				newStart: Number(match[3]),
				header: match[5] ?? ""
			};
		}
		/**
		* Parse `git diff --no-color` output into file sections and hunks. Rows
		* outside a file section (leading noise) and metadata rows between the
		* `diff --git`/`---`/`+++` headers and the first hunk (index lines, mode
		* changes, rename/similarity lines) are skipped; a section that never
		* reaches a hunk (a mode/rename-only change) stays hunkless so the caller
		* can still draw its path.
		*/
		function parseUnifiedDiff(text) {
			const files = [];
			let current = null;
			let inHunk = false;
			let hunk = null;
			let oldNum = 0;
			let newNum = 0;
			const flushHunk = () => {
				if (current !== null && hunk !== null) current.hunks.push(hunk);
				hunk = null;
				inHunk = false;
			};
			for (const raw of text.split("\n")) {
				if (raw.startsWith("diff --git ")) {
					flushHunk();
					current = {
						oldPath: "",
						newPath: "",
						binary: false,
						hunks: []
					};
					files.push(current);
					continue;
				}
				if (current === null) continue;
				if (raw.startsWith("Binary files ") || raw === "GIT binary patch") {
					flushHunk();
					current.binary = true;
					continue;
				}
				if (raw.startsWith("--- ")) {
					flushHunk();
					current.oldPath = raw.slice(4);
					continue;
				}
				if (raw.startsWith("+++ ")) {
					current.newPath = raw.slice(4);
					continue;
				}
				const header = parseHunkHeader(raw);
				if (header !== null) {
					flushHunk();
					hunk = {
						oldStart: header.oldStart,
						newStart: header.newStart,
						header: header.header,
						lines: []
					};
					oldNum = header.oldStart;
					newNum = header.newStart;
					inHunk = true;
					continue;
				}
				if (!inHunk || hunk === null) continue;
				const marker = raw[0];
				if (marker === "\\") {
					hunk.lines.push({
						kind: "meta",
						text: raw.slice(1),
						oldNum: null,
						newNum: null
					});
					continue;
				}
				if (marker === " ") {
					hunk.lines.push({
						kind: "ctx",
						text: raw.slice(1),
						oldNum,
						newNum
					});
					oldNum += 1;
					newNum += 1;
				} else if (marker === "-") {
					hunk.lines.push({
						kind: "del",
						text: raw.slice(1),
						oldNum,
						newNum: null
					});
					oldNum += 1;
				} else if (marker === "+") {
					hunk.lines.push({
						kind: "add",
						text: raw.slice(1),
						oldNum: null,
						newNum
					});
					newNum += 1;
				} else flushHunk();
			}
			flushHunk();
			return { files };
		}
		/** One DiffLine row mapped onto the shared DiffRow model. */
		function rowOfLine(line) {
			if (line.kind === "meta") return {
				kind: "meta",
				text: line.text
			};
			const kind = line.kind === "ctx" ? "context" : line.kind;
			if (line.kind === "del") return {
				kind,
				oldLine: line.oldNum ?? void 0,
				text: line.text
			};
			if (line.kind === "add") return {
				kind,
				newLine: line.newNum ?? void 0,
				text: line.text
			};
			return {
				kind,
				oldLine: line.oldNum ?? void 0,
				newLine: line.newNum ?? void 0,
				text: line.text
			};
		}
		/**
		* Convert one parsed unified-diff file into renderer segments: each hunk's
		* lines become a paired-mod hunk segment, and the unemitted context gaps
		* between hunks (git already trimmed them) become non-expandable folds that
		* still carry their old/new line ranges. The rewrite pairing applies within
		* each hunk, exactly like session-op diffs.
		*/
		function unifiedSegments(file) {
			const segments = [];
			file.hunks.forEach((hunk, index) => {
				const rows = pairMods(hunk.lines.map(rowOfLine));
				const prev = file.hunks[index - 1];
				if (prev !== void 0) {
					const prevOldEnd = prev.oldStart + prev.lines.filter((line) => line.oldNum !== null).length - 1;
					const prevNewEnd = prev.newStart + prev.lines.filter((line) => line.newNum !== null).length - 1;
					const oldGap = hunk.oldStart - prevOldEnd - 1;
					const newGap = hunk.newStart - prevNewEnd - 1;
					if (oldGap > 0 || newGap > 0) segments.push({
						kind: "fold",
						count: Math.max(oldGap, newGap, 0),
						oldStart: prevOldEnd + 1,
						oldEnd: Math.max(hunk.oldStart - 1, prevOldEnd),
						newStart: prevNewEnd + 1,
						newEnd: Math.max(hunk.newStart - 1, prevNewEnd)
					});
				} else if (hunk.oldStart > 1 || hunk.newStart > 1) segments.push({
					kind: "fold",
					count: Math.max(hunk.oldStart - 1, hunk.newStart - 1, 0),
					oldStart: 1,
					oldEnd: hunk.oldStart - 1,
					newStart: 1,
					newEnd: hunk.newStart - 1
				});
				segments.push({
					kind: "hunk",
					rows
				});
			});
			return segments;
		}
		/** Build the untracked-file shape: one file, one hunk of pure additions. */
		function untrackedFile(path, content) {
			const lines = [];
			const body = content.endsWith("\n") ? content.slice(0, -1) : content;
			if (body !== "") {
				let num = 1;
				for (const line of body.split("\n")) {
					lines.push({
						kind: "add",
						text: line,
						oldNum: null,
						newNum: num
					});
					num += 1;
				}
			}
			return {
				oldPath: "/dev/null",
				newPath: `b/${path}`,
				binary: false,
				hunks: [{
					oldStart: 0,
					newStart: 1,
					header: "",
					lines
				}]
			};
		}
		/**
		* Materialize a git gap fold's hidden rows from the two sides' full file
		* contents, by the fold's known line ranges: the old side drives context
		* rows (each mapped onto the new side through the fold's offset — a gap is
		* an unchanged run, so the sides align), and new-side lines the old range
		* never reaches become pure additions. Line numbers clip to the actual
		* content (a no-newline file's ranges can overrun by one); `\r` endings
		* survive verbatim, like git's own context lines.
		*/
		function foldRowsFromContents(fold, oldContent, newContent) {
			const oldLines = oldContent.length === 0 ? [] : oldContent.split("\n");
			const newLines = newContent.length === 0 ? [] : newContent.split("\n");
			const offset = fold.newStart - fold.oldStart;
			const rows = [];
			const oldFrom = Math.max(fold.oldStart, 1);
			const oldTo = Math.min(fold.oldEnd, oldLines.length);
			for (let oldLine = oldFrom; oldLine <= oldTo; oldLine += 1) {
				const text = oldLines[oldLine - 1];
				const newLine = oldLine + offset;
				rows.push(newLine >= fold.newStart && newLine <= fold.newEnd && newLine <= newLines.length ? {
					kind: "context",
					oldLine,
					newLine,
					text
				} : {
					kind: "context",
					oldLine,
					text
				});
			}
			const newFrom = Math.max(fold.newStart, 1);
			const newTo = Math.min(fold.newEnd, newLines.length);
			for (let newLine = Math.max(newFrom, oldTo + offset + 1); newLine <= newTo; newLine += 1) rows.push({
				kind: "add",
				newLine,
				text: newLines[newLine - 1]
			});
			return rows;
		}
		/** Strip the `a/` / `b/` prefix git puts on diff paths (not on /dev/null). */
		function displayPath(path) {
			if (path === "/dev/null") return path;
			if (path.startsWith("a/") || path.startsWith("b/")) return path.slice(2);
			return path;
		}
		/** The diff's add/del/mod row counts (the "+n −m" header chips). */
		function diffStats(segments) {
			let added = 0;
			let deleted = 0;
			for (const segment of segments) {
				if (segment.kind !== "hunk") continue;
				for (const row of segment.rows) {
					if (row.kind === "add" || row.kind === "mod") added += 1;
					if (row.kind === "del" || row.kind === "mod") deleted += 1;
				}
			}
			return {
				added,
				deleted
			};
		}
		//#endregion
		//#region src/client/changes/SessionLens.tsx
		/**
		* The session lens of the changes tab: agent truth — every file the model
		* read, wrote, or edited in this session, grouped by file, newest first,
		* with kind filters. Clicking an op previews it in the tab's shared bottom
		* pane (see {@link DiffPane}): writes and edits as line diffs, reads as a
		* line-numbered content view, failures as their real error text. The ops
		* arrive pre-folded from the tab (which owns the event poll); this
		* component is purely presentational.
		*/
		function SessionLens({ ops, loadError, onPreview, selectedCallId }) {
			const [filter, setFilter] = (0, react.useState)("all");
			const filteredOps = (0, react.useMemo)(() => filter === "all" ? ops : ops.filter((op) => op.kind === filter), [ops, filter]);
			const groups = (0, react.useMemo)(() => groupByFile(filteredOps), [filteredOps]);
			const counts = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map([
					["read", 0],
					["write", 0],
					["edit", 0]
				]);
				for (const op of ops) map.set(op.kind, (map.get(op.kind) ?? 0) + 1);
				return map;
			}, [ops]);
			const chip = (value, label, count) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: changes_module_css_default.filterChip,
				"data-active": filter === value ? "true" : void 0,
				onClick: () => {
					setFilter(value);
				},
				"aria-pressed": filter === value,
				children: [label, value !== "all" ? ` ${String(count)}` : ""]
			}, value);
			const opSizes = (0, react.useMemo)(() => {
				const sizes = /* @__PURE__ */ new Map();
				for (const op of ops) if (op.kind !== "read" && !op.isError) sizes.set(op.callId, formatBytes(new Blob([op.edit?.newString ?? op.content ?? ""]).size));
				return sizes;
			}, [ops]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: changes_module_css_default.session,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: changes_module_css_default.filterRow,
					role: "group",
					"aria-label": t("changesSessionLens"),
					children: [
						chip("all", t("changesFilterAll"), ops.length),
						chip("write", t("changesWrite"), counts.get("write") ?? 0),
						chip("edit", t("changesEdit"), counts.get("edit") ?? 0),
						chip("read", t("changesRead"), counts.get("read") ?? 0)
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: changes_module_css_default.sessionList,
					children: [
						loadError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.loadError,
							children: t("changesLoadError")
						}),
						ops.length === 0 && !loadError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.empty,
							children: t("changesSessionEmpty")
						}),
						ops.length > 0 && filteredOps.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.empty,
							children: t("changesFilterEmpty")
						}),
						[...groups.entries()].map(([path, fileOps]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: changes_module_css_default.fileGroup,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: changes_module_css_default.filePath,
								title: path,
								children: path
							}), fileOps.map((op) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: changes_module_css_default.opRow,
								"data-op-kind": op.kind,
								"data-op-error": op.isError ? "true" : void 0,
								"data-selected": selectedCallId === op.callId ? "true" : void 0,
								onClick: () => {
									onPreview(path, op);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: changes_module_css_default.opKind,
										"data-kind": op.kind,
										children: t(op.kind === "read" ? "changesRead" : op.kind === "write" ? "changesWrite" : "changesEdit")
									}),
									op.running && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: changes_module_css_default.opFlag,
										children: t("changesRunning")
									}),
									op.isError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: changes_module_css_default.opFlagError,
										children: t("changesError")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: changes_module_css_default.opMeta,
										children: [opSizes.get(op.callId) !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: changes_module_css_default.opSize,
											children: opSizes.get(op.callId)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: changes_module_css_default.opTime,
											children: relativeTime(new Date(op.time).toISOString())
										})]
									})
								]
							}, op.callId))]
						}, path))
					]
				})]
			});
		}
		//#endregion
		//#region src/client/html-preview.ts
		/**
		* Shared vocabulary of the sidebar's HTML preview surfaces (the editor's
		* html viewer and the changes tab's op render preview): the sandbox tokens
		* both preview iframes load with.
		*/
		/**
		* The sandbox tokens of an HTML preview iframe. NO allow-same-origin (the
		* preview must stay in an opaque origin — with the route's own origin it
		* could read session data) and NO allow-top-navigation (a previewed page
		* must not hijack the GUI). The editor viewer can disable the sandbox
		* per-feature in the side card settings (warned); the changes tab's op
		* render preview always stays sandboxed.
		*/
		const HTML_IFRAME_SANDBOX = "allow-scripts allow-popups allow-downloads allow-modals";
		//#endregion
		//#region src/client/diff/highlight.ts
		/** Token classes that imply their own color; `plain` inherits the row color. */
		const COLORED = /* @__PURE__ */ new Set([
			"comment",
			"string",
			"keyword",
			"number",
			"type",
			"function",
			"macro"
		]);
		const LETTER = /[A-Za-z_$]/u;
		const WORD = /[A-Za-z0-9_$]/u;
		const ANYWORD = {
			wordStart: LETTER,
			wordBody: WORD
		};
		const kw = (words) => new Set(words.split(/\s+/));
		const C_FAMILY = (words) => ({
			lineComments: ["//"],
			blockComment: ["/*", "*/"],
			strings: [
				"\"",
				"'",
				"`"
			],
			keywords: kw(words),
			constants: kw("true false null NULL nullptr TRUE FALSE"),
			macro: true,
			...ANYWORD
		});
		const HASH_FAMILY = (words, constants = "") => ({
			lineComments: ["#"],
			strings: ["\"", "'"],
			keywords: kw(words),
			constants: kw(constants.length > 0 ? constants : "True False None true false null"),
			macro: false,
			...ANYWORD
		});
		const CONFIG_LANG = {
			lineComments: ["#"],
			strings: ["\"", "'"],
			keywords: /* @__PURE__ */ new Set(),
			constants: /* @__PURE__ */ new Set(),
			macro: false,
			wordStart: LETTER,
			wordBody: WORD
		};
		/** SQL: '--' line comments plus '#', quoting with single quotes. */
		const SQL_LANG = {
			lineComments: ["--", "#"],
			strings: ["'"],
			keywords: kw(`select from where insert into values update set delete create table drop alter add column
    primary key foreign references index view join inner left right outer on as order by group having
    limit offset distinct union all and or not in exists between like is null asc desc count sum avg
    min max case when then else end begin commit rollback transaction default constraint unique`),
			constants: kw("true false null"),
			macro: false,
			...ANYWORD
		};
		/** Windows batch: 'REM'/'::' comments, '%' variable quoting. */
		const CMD_LANG = {
			lineComments: ["::"],
			strings: ["\""],
			keywords: kw(`rem if else for in do goto call exit echo set setlocal endlocal shift
    exist defined errorlevel not equ neq lss leq gtr geq nul con defined enabledelayedexpansion`),
			constants: /* @__PURE__ */ new Set(),
			macro: false,
			wordStart: LETTER,
			wordBody: WORD
		};
		/** PowerShell: '#' comments, quoted strings including here-string quotes. */
		const PS_LANG = {
			lineComments: ["#"],
			blockComment: ["<#", "#>"],
			strings: ["\"", "'"],
			keywords: kw(`function param begin process end if elseif else foreach for while do until switch
    try catch finally throw return break continue filter in workflow class enum interface
    dynamicparam data checkpoint systemlanguage default expand`),
			constants: kw("true false null"),
			macro: false,
			...ANYWORD
		};
		/** Markdown: no tokenizer; the whole line stays plain. */
		const MD_LANG = {
			lineComments: [],
			strings: [],
			keywords: /* @__PURE__ */ new Set(),
			constants: /* @__PURE__ */ new Set(),
			macro: false,
			wordStart: LETTER,
			wordBody: WORD
		};
		/** JS keyword list, shared by js/jsx/mjs/cjs. */
		const JS_WORDS = `async await break case catch class const continue debugger default delete do else
  export extends false finally for from function get if implements import in instanceof interface
  let new null of return set static super switch this throw true try typeof undefined var void
  while with yield`;
		/** TS keyword list, shared by ts/tsx/mts/cts. */
		const TS_WORDS = `abstract any as asserts async await boolean break case catch class const constructor
  continue debugger declare default delete do else enum export extends false finally for from
  function get if implements import in infer instanceof interface is keyof let module namespace
  never new null number object of override private protected public readonly return satisfies set
  static string super switch symbol this throw true try type typeof undefined union unknown var
  void while with yield`;
		/** CSS family: block comments delimited by slash-star, hyphenated property words. */
		const CSS_LANG = {
			lineComments: [],
			blockComment: ["/*", "*/"],
			strings: ["\"", "'"],
			keywords: kw(`media import charset keyframes font-face supports page namespace layer scope container
    property value at-rule when and not only from to important
    background background-color background-image background-position background-size
    border border-radius border-color border-width border-style bottom box-shadow box-sizing
    color content cursor clip clip-path clear display direction
    flex flex-direction flex-wrap flex-flow flex-grow flex-shrink flex-basis
    font font-family font-size font-style font-weight float fill
    grid grid-area grid-template grid-template-columns grid-template-rows grid-gap gap
    height left letter-spacing line-height list-style margin margin-top margin-right
    margin-bottom margin-left max-height max-width min-height min-width opacity order
    outline overflow padding padding-top padding-right padding-bottom padding-left
    position pointer-events right rotate scale translate transform transform-origin
    text-align text-decoration text-transform top transition transition-property
    user-select vertical-align visibility white-space width word-break word-spacing z-index
    align-items align-content align-self justify-content justify-items justify-self
    aspect-ratio inset object-fit object-position resize scroll-behavior filter backdrop-filter
    animation animation-name animation-duration animation-timing-function animation-delay
    will-change
    html body p a div span li ul ol table tr td th form input button label select textarea img
    section header footer main nav article aside h1 h2 h3 h4 h5 h6 i b em strong small pre code
    inherit initial unset auto none fixed absolute relative sticky static flex block inline
    inline-block inline-flex grid hidden visible bold normal root var calc env`),
			constants: /* @__PURE__ */ new Set(),
			macro: false,
			wordStart: /[A-Za-z-]/u,
			wordBody: /[A-Za-z0-9-]/u
		};
		/** Markup family (HTML/XML/SVG/Vue): markup comments plus common tags. */
		const MARKUP_LANG = {
			lineComments: [],
			blockComment: ["<!--", "-->"],
			strings: ["\"", "'"],
			keywords: kw(`html head body title meta link script style template slot
    div span p a img ul ol li table thead tbody tr th td form input button label select
    option textarea header footer main nav section article aside figure figcaption
    h1 h2 h3 h4 h5 h6 strong em b i u s small br hr pre code blockquote
    svg path circle rect line polyline polygon g defs use text symbol
    xml doctype class id href src type value name content charset async defer
    vue component props setup script-style export import v-if v-for v-bind v-on`),
			constants: /* @__PURE__ */ new Set(),
			macro: false,
			wordStart: LETTER,
			wordBody: WORD
		};
		/** Extension → language id, mirroring the read tool's hint table. */
		const LANGS = {
			ts: C_FAMILY(TS_WORDS),
			tsx: C_FAMILY(TS_WORDS),
			js: C_FAMILY(JS_WORDS),
			jsx: C_FAMILY(JS_WORDS),
			json: CONFIG_LANG,
			py: HASH_FAMILY(`and as assert async await break class continue def del elif else except finally
    for from global if import in is lambda nonlocal not or pass raise return try while with yield
    match case`, "True False None self cls NotImplemented __name__ __main__"),
			go: C_FAMILY(`break case chan const continue default defer else fallthrough for func go goto if
    import interface map package range return select struct switch type var nil iota make new len
    cap append copy close delete panic print println recover`),
			rs: C_FAMILY(`as async await break const continue crate dyn else enum extern false fn for if impl
    in let loop match mod move mut pub ref return self Self static struct super trait true type
    unsafe use where while`),
			java: C_FAMILY(`abstract assert boolean break byte case catch char class const continue default do
    double else enum extends final finally float for goto if implements import instanceof int
    interface long native new package private protected public return short static strictfp super
    switch synchronized this throw throws transient try void volatile while var record sealed
    permits yield`),
			c: C_FAMILY(`auto break case char const continue default do double else enum extern float for
    goto if inline int long register restrict return short signed sizeof static struct switch
    typedef union unsigned void volatile while _Bool _Complex _Atomic`),
			cpp: C_FAMILY(`alignas alignof and auto break case catch char class co_await co_return co_yield
    concept const consteval constexpr constinit const_cast continue decltype default delete
    do double dynamic_cast else enum explicit export extern false final float for friend goto if
    inline int long mutable namespace new noexcept not nullptr operator or override private
    protected public register reinterpret_cast requires return short signed sizeof static
    static_assert static_cast struct switch template this thread_local throw true try typedef
    typeid typename union unsigned using virtual void volatile wchar_t while`),
			cs: C_FAMILY(`abstract as async await base bool break byte case catch char checked class const
    continue decimal default delegate do double dynamic else enum event explicit extern false
    finally fixed float for foreach get goto if implicit in init int interface internal is lock
    long namespace new null not null forgiving object operator out override params partial
    private protected public readonly record ref return sbyte sealed set short sizeof stackalloc
    static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort
    using var virtual void volatile when where while with yield`),
			kt: C_FAMILY(`as break by catch class companion const constructor continue crossinline data do
    dynamic else enum external false final finally for fun get if import in infix init inline
    interface internal is lateinit lazy null object open operator out override package private
    protected public reified return sealed set super suspend tailrec this throw true try typealias
    val var vararg when where while`),
			swift: C_FAMILY(`actor as associatedtype async await break case catch class continue
    convenience default defer deinit didSet do dynamic else enum extension fallthrough false
    final for func get guard if import in indirect infix init inout internal is lazy let nil
    nonmutating open operator optional override postfix precedencegroup prefix private protocol
    public repeat required rethrows return self set some static struct subscript super switch
    throw throws true try typealias unowned var weak where while willSet`),
			php: C_FAMILY(`abstract and array as break callable case catch class clone const continue declare
    default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum
    extends final finally fn for foreach function global goto if implements include
    include_once instanceof insteadof interface isset list match namespace new or print private
    protected public readonly require require_once return static switch throw trait try unset use
    var while xor yield true false null int string bool float void mixed never self parent`),
			sh: HASH_FAMILY(`if then else elif fi for while until do done case esac function in select time
    coproc return break continue local export readonly declare typeset unset shift eval exec trap
    exit source alias set`, "true false"),
			bash: HASH_FAMILY(`if then else elif fi for while until do done case esac function in select time
    coproc return break continue local export readonly declare typeset unset shift eval exec trap
    exit source alias set`, "true false"),
			zsh: HASH_FAMILY(`if then else elif fi for while until do done case esac function in select time
    coproc return break continue local export readonly declare typeset unset shift eval exec trap
    exit source alias set`, "true false"),
			yaml: CONFIG_LANG,
			yml: CONFIG_LANG,
			toml: CONFIG_LANG,
			ini: CONFIG_LANG,
			sql: SQL_LANG,
			cmd: CMD_LANG,
			bat: CMD_LANG,
			ps1: PS_LANG,
			psm1: PS_LANG,
			psd1: PS_LANG,
			md: MD_LANG,
			markdown: MD_LANG,
			mdx: MD_LANG,
			mjs: C_FAMILY(JS_WORDS),
			cjs: C_FAMILY(JS_WORDS),
			mts: C_FAMILY(TS_WORDS),
			cts: C_FAMILY(TS_WORDS),
			jsonc: CONFIG_LANG,
			json5: CONFIG_LANG,
			html: MARKUP_LANG,
			htm: MARKUP_LANG,
			xml: MARKUP_LANG,
			svg: MARKUP_LANG,
			vue: MARKUP_LANG,
			css: CSS_LANG,
			scss: CSS_LANG,
			less: CSS_LANG,
			graphql: HASH_FAMILY("query mutation fragment on directive enum input interface scalar schema type implements"),
			gql: HASH_FAMILY("query mutation fragment on directive enum input interface scalar schema type implements"),
			lua: HASH_FAMILY(`and break do else elseif end false for function goto if in local nil not or
    repeat return then true until while`)
		};
		/**
		* Language id for a file path's extension (the read tool's mapping): the
		* lowercase extension without its dot; dotfiles and unknown extensions map to
		* undefined (plain text).
		* @param path - the op's file path exactly as recorded.
		* @returns the language id, or undefined for plain text.
		*/
		function langOfPath(path) {
			const base = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
			const dot = base.lastIndexOf(".");
			if (dot <= 0) return void 0;
			const ext = base.slice(dot + 1).toLowerCase();
			return Object.hasOwn(LANGS, ext) ? ext : void 0;
		}
		/** Scan one line, entering from (and reporting) block-comment state. */
		function scanLine(line, lang, inBlock = false) {
			if (line.length === 0) return {
				tokens: [],
				inBlock
			};
			const cfg = lang !== void 0 ? LANGS[lang] : void 0;
			if (cfg === void 0 || cfg.lineComments.length === 0 && cfg.keywords.size === 0) return {
				tokens: [{
					text: line,
					type: "plain"
				}],
				inBlock: false
			};
			let inComment = inBlock && cfg.blockComment !== void 0;
			const tokens = [];
			const push = (text, type) => {
				if (text.length === 0) return;
				const last = tokens[tokens.length - 1];
				if (last !== void 0 && last.type === type) tokens[tokens.length - 1] = {
					text: last.text + text,
					type
				};
				else tokens.push({
					text,
					type
				});
			};
			let i = 0;
			const atLineComment = () => {
				for (const lead of cfg.lineComments) if (line.startsWith(lead, i)) return lead;
			};
			const atBlockOpen = () => cfg.blockComment !== void 0 && line.startsWith(cfg.blockComment[0], i) ? cfg.blockComment[0] : void 0;
			const readString = () => {
				const quote = line[i];
				i += 1;
				while (i < line.length && line[i] !== quote) {
					if (line[i] === "\\") i += 1;
					i += 1;
				}
				i = Math.min(i + 1, line.length);
			};
			while (i < line.length) {
				if (inComment) {
					const closeIdx = cfg.blockComment !== void 0 ? line.indexOf(cfg.blockComment[1], i) : -1;
					if (closeIdx === -1) {
						push(line.slice(i), "comment");
						return {
							tokens,
							inBlock: true
						};
					}
					const end = closeIdx + (cfg.blockComment?.[1].length ?? 0);
					push(line.slice(i, end), "comment");
					i = end;
					inComment = false;
					continue;
				}
				const ch = line[i];
				const wsMatch = /\s/u.exec(line.slice(i));
				if (wsMatch !== null && wsMatch.index === 0) {
					push(ch, "plain");
					i += 1;
					continue;
				}
				if (atLineComment() !== void 0) {
					push(line.slice(i), "comment");
					break;
				}
				const blockOpen = atBlockOpen();
				if (blockOpen !== void 0 && cfg.blockComment !== void 0) {
					const close = line.indexOf(cfg.blockComment[1], i + blockOpen.length);
					const end = close === -1 ? line.length : close + cfg.blockComment[1].length;
					push(line.slice(i, end), "comment");
					i = end;
					inComment = close === -1;
					continue;
				}
				if (cfg.strings !== void 0 && cfg.strings.includes(ch)) {
					const start = i;
					readString();
					push(line.slice(start, i), "string");
					continue;
				}
				if (/[0-9]/u.test(ch)) {
					const m = /^(?:0[xXbo][0-9a-fA-F_]+|[0-9][0-9_]*(?:\.[0-9_]+)?(?:[eE][+-]?[0-9_]+)?)/u.exec(line.slice(i));
					const len = m !== null ? m[0].length : 1;
					push(line.slice(i, i + len), "number");
					i += len;
					continue;
				}
				if (cfg.wordStart.test(ch)) {
					let j = i + 1;
					while (j < line.length && cfg.wordBody.test(line[j])) j += 1;
					const word = line.slice(i, j);
					if ((lang === "cmd" || lang === "bat") && word.toLowerCase() === "rem") {
						push(line.slice(i), "comment");
						break;
					}
					let k = j;
					while (k < line.length && (line[k] === " " || line[k] === "	")) k += 1;
					if (cfg.constants.has(word)) push(word, "keyword");
					else if (cfg.keywords.has(word)) push(word, "keyword");
					else if (line[k] === "(") push(word, "function");
					else if (/^[A-Z]/u.test(word) && word.length > 1) push(word, "type");
					else push(word, "plain");
					i = j;
					continue;
				}
				if (cfg.macro && ch === "#" && (i === 0 || /\s/u.test(line[i - 1]))) {
					let j = i + 1;
					while (j < line.length && cfg.wordBody.test(line[j])) j += 1;
					push(line.slice(i, j), "macro");
					i = j;
					continue;
				}
				push(ch, "plain");
				i += 1;
			}
			return {
				tokens,
				inBlock: inComment
			};
		}
		/** True when the language has multi-line block-comment delimiters. */
		function hasBlockComment(lang) {
			return lang !== void 0 && LANGS[lang]?.blockComment !== void 0;
		}
		/** Token classes worth wrapping in a span; plain runs join the parent text node. */
		function isColored(token) {
			return COLORED.has(token.type);
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/DSH-better-sidebar/DSH-better-sidebar/src/client/diff/diff.module.css.mjs
		const css$3 = ".sstWLa_rows{font-family:var(--ds-font-family-code,monospace);padding:4px 0 8px;font-size:11px}.sstWLa_row{cursor:default;align-items:flex-start;gap:5px;padding:0 10px;line-height:18px;display:flex}.sstWLa_row[data-folded=true]{cursor:pointer}.sstWLa_lineNo{width:2.5em;color:var(--dsw-alias-label-tertiary);text-align:right;user-select:none;flex:none;font-size:10px}.sstWLa_sign{text-align:center;user-select:none;flex:none;width:1em;font-weight:700}.sstWLa_row[data-kind=del] .sstWLa_sign,.sstWLa_row[data-kind=del] .sstWLa_text{color:var(--dsw-alias-state-error-primary)}.sstWLa_row[data-kind=add] .sstWLa_sign,.sstWLa_row[data-kind=add] .sstWLa_text{color:var(--dsw-alias-state-success-primary)}.sstWLa_row[data-kind=mod] .sstWLa_sign,.sstWLa_row[data-kind=mod] .sstWLa_text{color:var(--dsw-alias-state-business-primary)}.sstWLa_row[data-kind=context] .sstWLa_sign,.sstWLa_row[data-kind=context] .sstWLa_text{color:var(--dsw-alias-label-secondary)}.sstWLa_row[data-kind=read] .sstWLa_text{color:var(--dsw-alias-label-primary)}.sstWLa_row[data-kind=del]{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)}.sstWLa_row[data-kind=add]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, transparent)}.sstWLa_row[data-kind=mod]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent)}.sstWLa_row .sstWLa_text{white-space:pre-wrap;word-break:break-word;flex:1;min-width:0}.sstWLa_row[data-folded=true] .sstWLa_text{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.sstWLa_row[data-kind=meta] .sstWLa_metaText{color:var(--dsw-alias-label-tertiary);font-style:italic}.sstWLa_inlineChange{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 26%, transparent);border-radius:3px;padding:0 1px}.sstWLa_tokComment{color:var(--dsw-alias-label-tertiary);font-style:italic}.sstWLa_tokKeyword{color:color-mix(in oklab, var(--dsw-alias-state-business-primary) 55%, var(--dsw-alias-state-error-primary))}.sstWLa_tokString{color:color-mix(in oklab, var(--dsw-alias-state-success-primary) 45%, var(--dsw-alias-state-business-primary))}.sstWLa_tokType{color:color-mix(in oklab, var(--dsw-alias-brand-primary) 60%, var(--dsw-alias-state-success-primary))}.sstWLa_tokNumber{color:var(--dsw-alias-state-warn-primary)}.sstWLa_tokFunction{color:color-mix(in oklab, var(--dsw-alias-state-warn-primary) 55%, var(--dsw-alias-state-error-primary))}.sstWLa_tokMacro{color:color-mix(in oklab, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-state-business-primary))}.sstWLa_foldRow{padding:0 10px}.sstWLa_foldRow[data-expandable=true]{cursor:pointer}.sstWLa_foldRow[data-expandable=true]:hover{background:var(--dsw-alias-interactive-bg-hover)}.sstWLa_foldRow[data-expanded=true]{cursor:default;padding:0}.sstWLa_foldRow[data-expanded=true] .sstWLa_foldMarker{display:none}.sstWLa_foldMarker{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-interactive-bg-hover);border-radius:4px;align-items:center;gap:5px;margin:2px 0;padding:2px 7px;display:inline-flex}.sstWLa_foldRow[data-expandable=true] .sstWLa_foldMarker{color:var(--dsw-alias-label-secondary)}.sstWLa_foldRow[data-expandable=true] .sstWLa_foldMarker:before{content:\"›\";color:var(--dsw-alias-label-tertiary);transition:transform var(--ds-transition-duration-slow) var(--ds-ease-in-out)}.sstWLa_expand{border:1px solid var(--dsw-alias-border-l1);width:calc(100% - 20px);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;margin:4px 10px;padding:4px;font-size:11px;display:block}.sstWLa_expand:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.sstWLa_files,.sstWLa_fileBlock{flex-direction:column;display:flex}.sstWLa_file{width:100%;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:center;gap:6px;padding:6px 10px;font-size:11px;display:flex}.sstWLa_file:disabled{cursor:default}.sstWLa_file:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.sstWLa_fileChevron{width:12px;color:var(--dsw-alias-label-tertiary);transition:transform var(--ds-transition-duration-slow) var(--ds-ease-in-out);flex:none}.sstWLa_fileChevronExpanded{transform:rotate(90deg)}.sstWLa_filePath{font-family:var(--ds-font-family-code,monospace);color:var(--dsw-alias-label-primary);word-break:break-all;min-width:0}.sstWLa_fileOld{text-overflow:ellipsis;white-space:nowrap;max-width:40%;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,monospace);flex:none;overflow:hidden}.sstWLa_fileTag{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;padding:0 5px;font-size:10px;line-height:16px}.sstWLa_fileStats{font-size:10px;font-family:var(--ds-font-family-code,monospace);flex:none;gap:5px;margin-left:auto;display:inline-flex}.sstWLa_statAdd{color:var(--dsw-alias-state-success-primary)}.sstWLa_statDel{color:var(--dsw-alias-state-error-primary)}.sstWLa_row:focus-visible,.sstWLa_foldRow:focus-visible,.sstWLa_file:focus-visible,.sstWLa_expand:focus-visible{outline:2px solid var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}@media (prefers-reduced-motion:reduce){.sstWLa_fileChevron{transition:none}}";
		const tagId$3 = "dsh-better-sidebar/diff.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var diff_module_css_default = {
			"lineNo": "sstWLa_lineNo",
			"sign": "sstWLa_sign",
			"fileChevron": "sstWLa_fileChevron",
			"fileChevronExpanded": "sstWLa_fileChevronExpanded",
			"fileOld": "sstWLa_fileOld",
			"tokFunction": "sstWLa_tokFunction",
			"statAdd": "sstWLa_statAdd",
			"fileTag": "sstWLa_fileTag",
			"statDel": "sstWLa_statDel",
			"fileBlock": "sstWLa_fileBlock",
			"tokKeyword": "sstWLa_tokKeyword",
			"files": "sstWLa_files",
			"text": "sstWLa_text",
			"file": "sstWLa_file",
			"filePath": "sstWLa_filePath",
			"fileStats": "sstWLa_fileStats",
			"inlineChange": "sstWLa_inlineChange",
			"row": "sstWLa_row",
			"rows": "sstWLa_rows",
			"tokNumber": "sstWLa_tokNumber",
			"tokString": "sstWLa_tokString",
			"tokType": "sstWLa_tokType",
			"tokMacro": "sstWLa_tokMacro",
			"foldMarker": "sstWLa_foldMarker",
			"expand": "sstWLa_expand",
			"metaText": "sstWLa_metaText",
			"foldRow": "sstWLa_foldRow",
			"tokComment": "sstWLa_tokComment"
		};
		//#endregion
		//#region src/client/diff/DiffRows.tsx
		/**
		* The one diff renderer every file-change surface shares (the changes tab's
		* inline preview pane and the diff tab): fold-capable hunk rows with old/new
		* line gutters, rewrite (mod) tinting with intra-line character highlights,
		* lightweight syntax coloring, and long-line folding. Presentational — the
		* segments arrive precomputed (session ops via buildDiffSegments, git diffs
		* via unifiedSegments) so both producers render identically; the one
		* exception is git gap folds, whose rows git never emitted and a caller
		* supplies on demand through resolveFold (first click fetches, then they
		* toggle like any fold).
		*/
		/** Long diff lines fold to one ellipsized row; the threshold is the char count. */
		const FOLD_THRESHOLD = 120;
		/** Rendered hunk rows per file capped at this count; expand reveals the rest. */
		const MAX_ROWS = 600;
		/** Token class -> CSS color class ('' inherits the row's diff color). */
		const TOKEN_CLASS = {
			plain: "",
			comment: diff_module_css_default.tokComment ?? "",
			string: diff_module_css_default.tokString ?? "",
			keyword: diff_module_css_default.tokKeyword ?? "",
			number: diff_module_css_default.tokNumber ?? "",
			type: diff_module_css_default.tokType ?? "",
			function: diff_module_css_default.tokFunction ?? "",
			macro: diff_module_css_default.tokMacro ?? ""
		};
		/** One token span's class list: its color class, plus the change tint. */
		function tokenSpanClass(type, changed) {
			const color = TOKEN_CLASS[type];
			return changed ? `${color} ${diff_module_css_default.inlineChange}` : color;
		}
		/** Render scanned tokens as colored nodes; uncolored runs stay text. */
		function tokensToNodes(tokens, changed = false) {
			const nodes = [];
			for (const token of tokens) if (!changed && !isColored(token)) nodes.push(token.text);
			else nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: tokenSpanClass(token.type, changed),
				children: token.text
			}, String(nodes.length)));
			return nodes;
		}
		/**
		* Intra-line diffs for mod-row pairs, keyed by row identity: each mod-run's
		* first half (old side) pairs with its second half (new side), each pair
		* diffed by common prefix/suffix so both sides highlight the exact changed
		* substring.
		*/
		function buildInlineMap(segments) {
			const map = /* @__PURE__ */ new Map();
			for (const segment of segments) {
				if (segment.kind !== "hunk") continue;
				const rows = segment.rows;
				let i = 0;
				while (i < rows.length) {
					if (rows[i].kind !== "mod") {
						i += 1;
						continue;
					}
					let j = i;
					while (j < rows.length && rows[j].kind === "mod") j += 1;
					const block = rows.slice(i, j);
					const half = Math.floor(block.length / 2);
					for (let p = 0; p < half; p += 1) {
						const delRow = block[p];
						const addRow = block[p + half];
						const inline = diffInline(delRow.text, addRow.text);
						map.set(delRow, inline);
						map.set(addRow, inline);
					}
					i = j;
				}
			}
			return map;
		}
		/**
		* Per-row block-comment entry state for a diff: the old side threads along
		* old-line order and the new side along new-line order (the row order
		* preserves both), so multi-line comments color correctly on each side.
		*/
		function diffBlockEntries(segments, lang) {
			const entries = /* @__PURE__ */ new Map();
			if (!hasBlockComment(lang)) return entries;
			let oldIn = false;
			let newIn = false;
			for (const segment of segments) {
				if (segment.kind !== "hunk") continue;
				for (const row of segment.rows) {
					const isOld = row.oldLine !== void 0;
					const isNew = row.newLine !== void 0;
					entries.set(row, isOld ? oldIn : newIn);
					if (isOld) oldIn = scanLine(row.text, lang, oldIn).inBlock;
					if (isNew) newIn = scanLine(row.text, lang, newIn).inBlock;
				}
			}
			return entries;
		}
		/** One file's diff rows: fold chips between hunks, highlighted code rows. */
		function DiffRows({ segments, lang, resolveFold }) {
			const [expandedLines, setExpandedLines] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [expandedFolds, setExpandedFolds] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [expandedAll, setExpandedAll] = (0, react.useState)(false);
			const [foldData, setFoldData] = (0, react.useState)(/* @__PURE__ */ new Map());
			const [foldLoading, setFoldLoading] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [foldFailed, setFoldFailed] = (0, react.useState)(/* @__PURE__ */ new Set());
			const foldEpoch = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				setExpandedLines(/* @__PURE__ */ new Set());
				setExpandedFolds(/* @__PURE__ */ new Set());
				setExpandedAll(false);
				setFoldData(/* @__PURE__ */ new Map());
				setFoldLoading(/* @__PURE__ */ new Set());
				setFoldFailed(/* @__PURE__ */ new Set());
				foldEpoch.current += 1;
			}, [segments]);
			const inlineMap = (0, react.useMemo)(() => buildInlineMap(segments), [segments]);
			const blockEntries = (0, react.useMemo)(() => diffBlockEntries(segments, lang), [segments, lang]);
			/** One diff row: colored sign + syntax-colored text, long-line fold toggle. */
			const renderDiffRow = (row, rowKey) => {
				if (row.kind === "meta") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: diff_module_css_default.row,
					"data-kind": "meta",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: diff_module_css_default.metaText,
						children: row.text
					})
				}, rowKey);
				const isLong = row.text.length > FOLD_THRESHOLD;
				const isFolded = isLong && !expandedLines.has(rowKey);
				const blockEntry = blockEntries.get(row) ?? false;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: diff_module_css_default.row,
					"data-kind": row.kind,
					"data-folded": isFolded ? "true" : void 0,
					onClick: isLong ? () => {
						setExpandedLines((prev) => {
							const next = new Set(prev);
							if (next.has(rowKey)) next.delete(rowKey);
							else next.add(rowKey);
							return next;
						});
					} : void 0,
					title: isFolded ? row.text : void 0,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: diff_module_css_default.lineNo,
							children: row.oldLine !== void 0 ? String(row.oldLine) : ""
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: diff_module_css_default.lineNo,
							children: row.newLine !== void 0 ? String(row.newLine) : ""
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: diff_module_css_default.sign,
							children: row.kind === "del" ? "-" : row.kind === "add" ? "+" : row.kind === "mod" ? "~" : " "
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: diff_module_css_default.text,
							"data-folded": isFolded ? "true" : void 0,
							children: [row.kind === "mod" && (() => {
								const inline = inlineMap.get(row);
								if (inline === void 0) return tokensToNodes(scanLine(row.text, lang, blockEntry).tokens);
								const side = coalesceInline(row.oldLine !== void 0 ? inline.old : inline.next);
								const nodes = [];
								let state = blockEntry;
								for (const seg of side) {
									const scan = scanLine(seg.text, lang, state);
									state = scan.inBlock;
									nodes.push(...tokensToNodes(scan.tokens, seg.changed));
								}
								return nodes;
							})(), row.kind !== "mod" && tokensToNodes(scanLine(row.text, lang, blockEntry).tokens)]
						})
					]
				}, rowKey);
			};
			let renderedRows = 0;
			const renderSegment = (segment, segIndex) => {
				if (segment.kind === "hunk") {
					const rows = !expandedAll && renderedRows + segment.rows.length > MAX_ROWS ? segment.rows.slice(0, Math.max(MAX_ROWS - renderedRows, 0)) : segment.rows;
					renderedRows += rows.length;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: rows.map((row, index) => renderDiffRow(row, `${segIndex}-${String(index)}`)) }, `hunk-${String(segIndex)}`);
				}
				if (foldFailed.has(segIndex)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: diff_module_css_default.foldRow,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: diff_module_css_default.foldMarker,
						title: t("changesContext"),
						children: t("changesFoldUnavailable")
					})
				}, `fold-${String(segIndex)}`);
				const resolvedRows = foldData.get(segIndex);
				if (!((segment.rows !== void 0 || resolvedRows !== void 0 || resolveFold !== void 0) && segment.count >= 3)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: diff_module_css_default.foldRow,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: diff_module_css_default.foldMarker,
						title: t("changesContext"),
						children: t("changesFold", { count: segment.count })
					})
				}, `fold-${String(segIndex)}`);
				const loading = foldLoading.has(segIndex);
				const isExpanded = expandedFolds.has(segIndex);
				const revealed = segment.rows ?? resolvedRows;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: diff_module_css_default.foldRow,
					"data-expandable": loading ? void 0 : "true",
					"data-expanded": isExpanded ? "true" : void 0,
					onClick: loading ? void 0 : () => {
						if (revealed !== void 0) {
							setExpandedFolds((prev) => {
								const next = new Set(prev);
								if (next.has(segIndex)) next.delete(segIndex);
								else next.add(segIndex);
								return next;
							});
							return;
						}
						if (resolveFold === void 0) return;
						const epoch = foldEpoch.current;
						setFoldLoading((prev) => new Set(prev).add(segIndex));
						resolveFold(segment).then((rows) => {
							if (foldEpoch.current !== epoch) return;
							setFoldData((prev) => new Map(prev).set(segIndex, rows));
							setFoldLoading((prev) => {
								const next = new Set(prev);
								next.delete(segIndex);
								return next;
							});
							setExpandedFolds((prev) => new Set(prev).add(segIndex));
						}, () => {
							if (foldEpoch.current !== epoch) return;
							setFoldLoading((prev) => {
								const next = new Set(prev);
								next.delete(segIndex);
								return next;
							});
							setFoldFailed((prev) => new Set(prev).add(segIndex));
						});
					},
					children: isExpanded && revealed !== void 0 ? revealed.map((row, index) => renderDiffRow(row, `${segIndex}-${String(index)}`)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: diff_module_css_default.foldMarker,
						title: t("changesContext"),
						children: loading ? t("changesFoldLoading") : t("changesFold", { count: segment.count })
					})
				}, `fold-${String(segIndex)}`);
			};
			const parts = segments.map(renderSegment);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: diff_module_css_default.rows,
				children: [parts, renderedRows >= MAX_ROWS && !expandedAll && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: diff_module_css_default.expand,
					onClick: () => {
						setExpandedAll(true);
					},
					children: t("diffExpand", { count: segments.reduce((sum, s) => sum + (s.kind === "hunk" ? s.rows.length : 0), 0) - renderedRows })
				})]
			});
		}
		/** The read view: a line-numbered, syntax-colored slice of a read file. */
		function ReadRows({ lines, lang }) {
			const rows = (0, react.useMemo)(() => {
				let state = false;
				return lines.map((line) => {
					const scan = scanLine(line.text, lang, state);
					state = scan.inBlock;
					return {
						line: line.line,
						nodes: tokensToNodes(scan.tokens)
					};
				});
			}, [lines, lang]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: diff_module_css_default.rows,
				children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: diff_module_css_default.row,
					"data-kind": "read",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: diff_module_css_default.lineNo,
						children: String(row.line)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: diff_module_css_default.text,
						children: row.nodes
					})]
				}, String(row.line)))
			});
		}
		//#endregion
		//#region src/client/PdfView.tsx
		/** Browser-native PDF preview with an always-available download fallback. */
		function PdfView(props) {
			const { scope, path, title } = props;
			const [load, setLoad] = (0, react.useState)({ status: "loading" });
			const [interactionBlocked, setInteractionBlocked] = (0, react.useState)(false);
			const frameRef = (0, react.useRef)(null);
			const shieldRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				let objectUrl;
				setLoad({ status: "loading" });
				(async () => {
					try {
						const response = await fetch(mediaUrl(scope, path), { signal: controller.signal });
						if (!response.ok) throw new Error(`HTTP ${response.status}`);
						const bytes = await response.arrayBuffer();
						if (controller.signal.aborted) return;
						objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
						setLoad({
							status: "ready",
							url: objectUrl
						});
					} catch (error) {
						if (controller.signal.aborted) return;
						setLoad({
							status: "error",
							message: error instanceof Error ? error.message : String(error)
						});
					}
				})();
				return () => {
					controller.abort();
					if (objectUrl !== void 0) URL.revokeObjectURL(objectUrl);
				};
			}, [
				scope.sessionId,
				scope.cwd,
				path
			]);
			(0, react.useEffect)(() => {
				const block = () => {
					setInteractionBlocked(true);
					if (frameRef.current !== null) frameRef.current.style.pointerEvents = "none";
					if (shieldRef.current !== null) shieldRef.current.style.pointerEvents = "auto";
				};
				const unblock = () => {
					setInteractionBlocked(false);
					if (frameRef.current !== null) frameRef.current.style.pointerEvents = "";
					if (shieldRef.current !== null) shieldRef.current.style.pointerEvents = "none";
				};
				const blockForResize = (event) => {
					const target = event.target;
					if (target instanceof Element && target.closest(`.${sidebar_module_css_default.panelResize}, .${sidebar_module_css_default.divider}`) !== null) block();
				};
				document.addEventListener("dragstart", block, true);
				document.addEventListener("dragend", unblock, true);
				document.addEventListener("drop", unblock, true);
				window.addEventListener("pointerdown", blockForResize, true);
				window.addEventListener("pointerup", unblock, true);
				window.addEventListener("pointercancel", unblock, true);
				window.addEventListener("blur", unblock);
				return () => {
					document.removeEventListener("dragstart", block, true);
					document.removeEventListener("dragend", unblock, true);
					document.removeEventListener("drop", unblock, true);
					window.removeEventListener("pointerdown", blockForResize, true);
					window.removeEventListener("pointerup", unblock, true);
					window.removeEventListener("pointercancel", unblock, true);
					window.removeEventListener("blur", unblock);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editorPdf,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.editorPdfToolbar,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						className: sidebar_module_css_default.editorDownloadLink,
						href: downloadUrl(scope, path),
						download: true,
						children: t("downloadToView")
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.editorPdfStage,
					children: [
						load.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.editorPlaceholder,
							children: t("loading")
						}),
						load.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.editorError,
							children: load.message
						}),
						load.status === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
							ref: frameRef,
							className: clsx(sidebar_module_css_default.editorPdfFrame, interactionBlocked && sidebar_module_css_default.editorPdfFrameBlocked),
							src: load.url,
							title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: shieldRef,
							className: clsx(sidebar_module_css_default.editorPdfDragShield, interactionBlocked && sidebar_module_css_default.editorPdfDragShieldActive),
							"aria-hidden": "true"
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/diff/DiffFiles.tsx
		/**
		* A full unified-diff document (one changed file, or every file of a commit
		* patch): collapsible per-file headers — source files open by default, tests
		* / docs / generated files stay folded — each expanded file rendering through
		* the shared {@link DiffRows} (so git diffs get the same rewrite tinting,
		* intra-line highlights, syntax colors and hunk folds as session-op diffs).
		* Untracked files produce no `git diff` output; the caller passes their
		* content to render as a full-file addition instead.
		*/
		const TEST_PATH = /(^|\/)(?:__tests__|tests?|specs?|fixtures?|mocks?|snapshots?)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i;
		const DOC_PATH = /(^|\/)(?:docs?|documentation)(?:\/|$)|(^|\/)(?:readme|changelog|contributing|license|authors|notice)(\.[^/]*)?$/i;
		const GENERATED_PATH = /(^|\/)(?:dist|build|coverage|generated|vendor|node_modules)(?:\/|$)|(^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|composer\.lock|cargo\.lock|poetry\.lock)$/i;
		const SOURCE_PATH = /\.(?:js|jsx|mjs|cjs|ts|tsx|mts|cts|py|pyw|rb|php|java|kt|kts|scala|go|rs|swift|c|h|cc|cpp|cxx|hpp|hh|hxx|cs|fs|fsx|vb|dart|lua|r|ex|exs|erl|hrl|clj|cljs|cljc|groovy|sh|bash|zsh|fish|ps1|sql|vue|svelte|astro|html|htm|css|scss|sass|less)$/i;
		/** Source files open by default; tests, docs, generated files and unknown types stay folded. */
		function defaultExpandedFiles(files) {
			const expanded = /* @__PURE__ */ new Set();
			files.forEach((file, index) => {
				const path = displayPath(file.newPath === "/dev/null" ? file.oldPath : file.newPath);
				if (!file.binary && file.hunks.length > 0 && !TEST_PATH.test(path) && !DOC_PATH.test(path) && !GENERATED_PATH.test(path) && SOURCE_PATH.test(path)) expanded.add(index);
			});
			return expanded;
		}
		/** The file header badge: added / deleted / renamed / binary ('' for a plain edit). */
		function fileTag(file) {
			if (file.binary) return t("diffBinary");
			if (file.oldPath === "/dev/null") return t("diffAdded");
			if (file.newPath === "/dev/null") return t("diffDeleted");
			if (displayPath(file.oldPath) !== displayPath(file.newPath)) return t("diffRenamed");
			return null;
		}
		function DiffFiles({ diff, untrackedPath, untrackedContent, resolveFold }) {
			const parsed = (0, react.useMemo)(() => {
				if (untrackedPath !== void 0) return { files: [untrackedFile(untrackedPath, untrackedContent ?? "")] };
				return parseUnifiedDiff(diff);
			}, [
				diff,
				untrackedPath,
				untrackedContent
			]);
			const [expandedFiles, setExpandedFiles] = (0, react.useState)(() => defaultExpandedFiles(parsed.files));
			(0, react.useEffect)(() => {
				setExpandedFiles(defaultExpandedFiles(parsed.files));
			}, [parsed]);
			const foldCache = (0, react.useRef)(/* @__PURE__ */ new Map());
			(0, react.useEffect)(() => {
				foldCache.current = /* @__PURE__ */ new Map();
			}, [parsed]);
			const loadFold = (file, segment) => {
				if (resolveFold === void 0) return Promise.resolve([]);
				const key = `${displayPath(file.newPath === "/dev/null" ? file.oldPath : file.newPath)}|${String(segment.oldStart)}|${String(segment.newStart)}`;
				let promise = foldCache.current.get(key);
				if (promise === void 0) {
					promise = resolveFold(file, segment);
					foldCache.current.set(key, promise);
					promise.catch(() => {
						foldCache.current.delete(key);
					});
				}
				return promise;
			};
			const files = (0, react.useMemo)(() => parsed.files.map((file) => {
				const segments = unifiedSegments(file);
				return {
					file,
					segments,
					stats: diffStats(segments)
				};
			}), [parsed]);
			const renderFile = (entry, fileIndex) => {
				const { file, segments, stats } = entry;
				const tag = fileTag(file);
				const from = displayPath(file.oldPath);
				const to = displayPath(file.newPath);
				const expandable = !file.binary && file.hunks.length > 0;
				const fileExpanded = expandedFiles.has(fileIndex);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: diff_module_css_default.fileBlock,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: diff_module_css_default.file,
						disabled: !expandable,
						"aria-expanded": expandable ? fileExpanded : void 0,
						onClick: () => {
							setExpandedFiles((current) => {
								const next = new Set(current);
								if (next.has(fileIndex)) next.delete(fileIndex);
								else next.add(fileIndex);
								return next;
							});
						},
						children: [
							expandable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								className: clsx(diff_module_css_default.fileChevron, fileExpanded && diff_module_css_default.fileChevronExpanded),
								children: "›"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: diff_module_css_default.filePath,
								children: to
							}),
							from !== to && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: diff_module_css_default.fileOld,
								children: ["← ", from]
							}),
							tag !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: diff_module_css_default.fileTag,
								children: tag
							}),
							expandable && (stats.added > 0 || stats.deleted > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: diff_module_css_default.fileStats,
								children: [stats.added > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: diff_module_css_default.statAdd,
									children: ["+", String(stats.added)]
								}), stats.deleted > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: diff_module_css_default.statDel,
									children: ["−", String(stats.deleted)]
								})]
							})
						]
					}), expandable && fileExpanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffRows, {
						segments,
						lang: langOfPath(to),
						resolveFold: resolveFold !== void 0 ? (segment) => loadFold(file, segment) : void 0
					})]
				}, `file-${String(fileIndex)}`);
			};
			if (parsed.files.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: diff_module_css_default.files,
				children: files.map(renderFile)
			});
		}
		//#endregion
		//#region src/client/redact.ts
		/**
		* Secret redaction for rendered file content. The tracer replays read/write
		* tool results into the DOM (diff, read view, markdown mode) — when the
		* model reads a credentials file, that plaintext must not land on screen or
		* in inspectable DOM. Two layers, both pure and unit-tested:
		*
		* 1. Path layer: files whose NAME marks them as secrets (.env, *secret*,
		*    *credential*, *token*, *api-key*, private keys, …) are masked whole —
		*    every non-empty line becomes [REDACTED].
		* 2. Content layer: for ordinary files, secret-SHAPED lines and tokens are
		*    masked in place (api_key/access_token/password assignments, sk-/AKIA/
		*    ghp_/xox prefixes, Bearer headers, PEM private-key block headers).
		*
		* Redaction is display-only: the session log and the tool results keep their
		* original bytes; this layer guarantees only that this plugin never renders
		* the secret. It is NOT a security boundary against a same-context malicious
		* plugin (which can read anything on the page or call host APIs itself) —
		* it removes the tracer's own contribution to secret exposure.
		*/
		/** Placeholder substituted for every secret found. */
		const REDACTED = "[REDACTED]";
		/**
		* Filename substrings that mark a whole file as sensitive. Each pattern is
		* matched case-insensitively against the full path with a RIGHT boundary
		* (the pattern must not continue into `[a-z0-9]`) so `tokenizer.ts`,
		* `dev.environment.ts`, and `style.keys.ts` stay ordinary files while
		* `.env.local`, `credentials.json`, and `id_rsa` still mask whole. Plurals
		* are listed only where the plural names a secret STORE (credentials /
		* secrets / passwords); a bare `tokens` is usually documentation
		* (api-tokens.md) and is deliberately absent.
		*/
		const SENSITIVE_PATH_RES = [
			".env",
			"secret",
			"secrets",
			"credential",
			"credentials",
			"token",
			"api-key",
			"apikey",
			"password",
			"passwords",
			"passwd",
			"private_key",
			"privatekey",
			"id_rsa",
			"id_ed25519",
			".pem",
			".key",
			".p12",
			".pfx"
		].map((pattern) => new RegExp(`${escapeRe(pattern)}(?![a-z0-9])`, "i"));
		/** Escape literal text for embedding into a RegExp. */
		function escapeRe(text) {
			return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		/**
		* Whether a path's own name marks the file as sensitive (case-insensitive,
		* matched against the full path so .env in any directory counts).
		*/
		function isSensitivePath(path) {
			return SENSITIVE_PATH_RES.some((re) => re.test(path));
		}
		/**
		* Assignment-shaped secret lines: "api_key: …", "TOKEN = …", "password": ….
		* The key name survives; the value is masked so the user still sees WHICH
		* field was secret.
		*/
		const ASSIGNMENT_RE = /^(\s*["']?[A-Za-z0-9_.-]*["']?\s*[:=]\s*)(\S.*)$/;
		/**
		* Field names whose assigned value is a secret. Stored in NORMALIZED form
		* (lower-case, separators stripped — see normalizeField) so api_key/API-KEY/
		* "api-key" all match one entry. Generic bare words (key / token / auth /
		* pass) are deliberately EXCLUDED: they label far more ordinary content
		* (keyboard keys, CSS custom properties, lexical tokens) than secrets —
		* Bearer-scheme headers stay covered by BEARER_RE below.
		*/
		const SECRET_FIELDS = /* @__PURE__ */ new Set([
			"apikey",
			"secret",
			"secretkey",
			"apitoken",
			"accesstoken",
			"refreshtoken",
			"idtoken",
			"password",
			"passwd",
			"pwd",
			"clientsecret",
			"privatekey",
			"accesskey",
			"accesskeyid",
			"secretaccesskey",
			"authorization"
		]);
		/** Bearer-scheme token in free text (covers HTTP headers in logs/configs). */
		const BEARER_RE = /(\bBearer\s+)[A-Za-z0-9\-_.+/]{16,}/gi;
		/** Well-known credential token prefixes (OpenAI/AWS/GitHub/Slack/Google). */
		const TOKEN_RES = [
			/\bsk-[A-Za-z0-9_-]{12,}/g,
			/\bAKIA[0-9A-Z]{16}\b/g,
			/\bghp_[A-Za-z0-9]{20,}\b/g,
			/\bgho_[A-Za-z0-9]{20,}\b/g,
			/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
			/\bya29\.[A-Za-z0-9_-]{20,}\b/g
		];
		/** Mask an entire non-empty line, keeping whitespace shape. */
		function maskLine(line) {
			return line.trim().length === 0 ? line : REDACTED;
		}
		/** Normalize a field name for SECRET_FIELDS lookup. */
		function normalizeField(raw) {
			return raw.replace(/["'\s:=]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
		}
		/** Redact one possibly-secret assignment line; undefined when not a secret field. */
		function redactAssignment(line) {
			const match = ASSIGNMENT_RE.exec(line);
			const prefix = match?.[1];
			if (prefix === void 0 || match?.[2] === void 0) return void 0;
			if (!SECRET_FIELDS.has(normalizeField(prefix))) return void 0;
			return prefix + REDACTED;
		}
		/** Whether a line is the header of a PEM private-key block. */
		function isPemPrivateKeyHeader(line) {
			return line.includes("-----BEGIN") && line.includes("PRIVATE KEY-----");
		}
		/**
		* Redact secret-shaped content from an ordinary file's text. Only the secret
		* itself is masked; surrounding code/config stays readable.
		*/
		function redactContentText(text) {
			return text.split("\n").map((line) => {
				if (isPemPrivateKeyHeader(line)) return REDACTED;
				const assignment = redactAssignment(line);
				if (assignment !== void 0) return assignment;
				let masked = line.replace(BEARER_RE, (_m, prefix) => prefix + REDACTED);
				for (const re of TOKEN_RES) masked = masked.replace(re, () => REDACTED);
				return masked;
			}).join("\n");
		}
		/**
		* Apply the full two-layer redaction for one file's text. Sensitive paths
		* mask whole lines; ordinary files mask only secret-shaped spans.
		*/
		function redactText(path, text) {
			if (isSensitivePath(path)) return {
				text: text.split("\n").map(maskLine).join("\n"),
				hit: text.trim().length > 0
			};
			const masked = redactContentText(text);
			return {
				text: masked,
				hit: masked !== text
			};
		}
		//#endregion
		//#region src/client/markdown-images.ts
		/**
		* True for a destination that is a remote URL — an absolute `scheme:` URL
		* that is not a Windows drive path (`C:\...`). http/https/data/mailto etc.
		* all match here and are handed back to `MarkdownText` untouched.
		*/
		function isRemoteUrl(dest) {
			return /^[a-z][a-z0-9+.-]*:/i.test(dest) && !/^[A-Za-z]:[\\/]/.test(dest);
		}
		/**
		* Collapse `.`/`..` segments of an absolute local path, preserving its root
		* (POSIX `/`), its Windows drive (`C:\`), or its UNC `\\server\share`
		* prefix. The host's `requireAbsolute` (`path.resolve`) normalizes anyway,
		* but producing a canonical path here keeps the `/sidebar/file` URL clean.
		*/
		function normalizeLocalPath(path) {
			const drive = /^([A-Za-z]:)[\\/]/.exec(path)?.[1];
			const parts = (drive !== void 0 ? path.slice(drive.length) : path).split(/[\\/]+/).filter((segment) => segment !== "" && segment !== ".");
			const out = [];
			for (const part of parts) {
				if (part === "..") {
					out.pop();
					continue;
				}
				out.push(part);
			}
			if (drive !== void 0) return `${drive}\\${out.join("\\")}`;
			const separator = path.startsWith("\\") ? "\\" : "/";
			return `${path.startsWith("/") ? "/" : path.startsWith("\\") ? "\\\\" : ""}${out.join(separator)}`;
		}
		/**
		* Rewrite markdown image destinations that point at local files into
		* absolute `/sidebar/file` media URLs. Relative destinations resolve against
		* the opened file's directory (normalizing `.`/`..` segments); absolute
		* local paths pass through. Remote (http/https/data/mailto) and `#`-anchor
		* destinations are left untouched for `MarkdownText`. Reference-style images
		* (`![x][id]` + `[id]: url`) are covered by rewriting their definition lines.
		*
		* Code spans (`` `...` ``) and fenced code blocks (``` ```...``` ```) are
		* masked before rewriting so documentation that demonstrates `![alt](./img.png)`
		* is not mutated into a `/sidebar/file` URL. Reference definitions are only
		* rewritten when their label is actually referenced by an image (collapsed
		* `[![][id]]`, full `![alt][id]`, or shortcut `![]` referencing the next
		* definition) — a plain link `[text][id]` must not have its destination
		* redirected to the media route.
		* @param text - The raw markdown source (inline + reference images).
		* @param scope - The session scope (sessionId + cwd) for the media route.
		* @param filePath - The absolute path of the opened `.md` file.
		* @param origin - The GUI's own origin (`window.location.origin`); injected
		* so the core rewrite stays pure and unit-testable.
		* @returns The markdown with local image destinations rewritten in place.
		*/
		/**
		* Resolve one media destination against the session's media route: local
		* (relative or absolute) paths become absolute `/sidebar/file` URLs (prefixed
		* with the GUI's own origin so the shared MarkdownText http(s) allowlist
		* accepts them), while remote URLs, `#`-anchors and empty destinations are
		* returned untouched. Shared by the markdown image rewriter below and by the
		* preview's raw-HTML sanitizer (`markdown-html.tsx`, which meets the same
		* allowlist when rendering `<img src="./x.png">` inside HTML blocks).
		*/
		function resolveLocalMediaDest(dest, scope, filePath, origin) {
			const trimmed = dest.trim();
			if (trimmed === "" || trimmed.startsWith("#")) return dest;
			if (isRemoteUrl(trimmed)) return dest;
			const slash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
			const directory = slash === -1 ? "/" : filePath.slice(0, slash + 1);
			const candidate = isAbsolutePath$1(trimmed) ? trimmed : directory + trimmed;
			const params = new URLSearchParams({
				sessionId: scope.sessionId,
				path: normalizeLocalPath(candidate)
			});
			if (scope.cwd !== void 0 && scope.cwd !== "") params.set("cwd", scope.cwd);
			return `${origin}/sidebar/file?${params.toString()}`;
		}
		function rewriteLocalImageUrls(text, scope, filePath, origin) {
			const resolve = (dest) => resolveLocalMediaDest(dest, scope, filePath, origin);
			const masks = [];
			const inline = text.replace(/```[\s\S]*?```/g, (block) => {
				masks.push(block);
				return `\u0000${masks.length - 1}\u0000`;
			}).replace(/`[^`\n]*`/g, (span) => {
				masks.push(span);
				return `\u0000${masks.length - 1}\u0000`;
			}).replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, alt, dest) => {
				return `![${alt}](${resolve(dest)})`;
			});
			const imageLabels = /* @__PURE__ */ new Set();
			const labelRe = /!\[([^\]]*)\](?:\[((?:[^\][]|\[[^\]]*\])*)\])?/g;
			let labelMatch;
			while ((labelMatch = labelRe.exec(inline)) !== null) {
				const alt = labelMatch[1] ?? "";
				const ref = labelMatch[2];
				imageLabels.add(ref !== void 0 && ref !== "" ? ref.toLowerCase() : alt.toLowerCase());
			}
			return inline.replace(/^(\s*\[([^\]]+)\]:\s*)(<[^>]+>|[^\s]+)/gm, (match, head, label, dest) => {
				if (!imageLabels.has(label.toLowerCase())) return match;
				return `${head}${resolve(dest.replace(/^<|>$/g, ""))}`;
			}).replace(/\u0000(\d+)\u0000/g, (_m, index) => masks[Number(index)] ?? "");
		}
		//#endregion
		//#region src/client/markdown-labels.tsx
		/** MarkdownText props carrying the nested chrome labels. */
		function markdownTextProps(text, labels) {
			return {
				text,
				labels: {
					code: {
						copyLabel: labels.copyLabel,
						copiedLabel: labels.copiedLabel
					},
					footnotes: ""
				}
			};
		}
		//#endregion
		//#region src/client/mermaid-blocks.ts
		/** CommonMark opening fence: 0-3 spaces indent + a run of 3+ backticks or tildes. */
		const OPEN_FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
		/** A closing-fence line: 0-3 spaces indent + 3+ backticks/tildes + trailing spaces only. */
		const CLOSE_FENCE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
		/** Parse the info string from the line tail after the fence run; null when invalid. */
		function fenceInfo(rest, fence) {
			const info = rest.trimStart().split(/\s+/)[0] ?? "";
			if (fence.charAt(0) === "`" && info.includes("`")) return null;
			return info;
		}
		/** True when the fence info string names mermaid (bare or `mermaid{...}`). */
		function isMermaidInfo(info) {
			const word = info.toLowerCase();
			return word === "mermaid" || word.startsWith("mermaid{");
		}
		/**
		* Split markdown source into md/mermaid blocks for detection: only fences
		* whose info string names mermaid are lifted; every other line stays in the
		* markdown stream untouched. CommonMark fence rules are honored — opening
		* fences of 3+ backticks OR tildes, and a closing fence must use the same
		* character with at least as many characters as the opening fence. An
		* unterminated mermaid fence swallows the rest of the file (the same
		* recovery CommonMark applies to open fences).
		*/
		function splitMermaidBlocks(text) {
			if (text === "") return [];
			const lines = text.split("\n");
			const blocks = [];
			let markdown = [];
			let index = 0;
			const flushMarkdown = () => {
				if (markdown.length === 0) return;
				blocks.push({
					kind: "markdown",
					text: markdown.join("\n")
				});
				markdown = [];
			};
			while (index < lines.length) {
				const line = lines[index] ?? "";
				const fenceMatch = OPEN_FENCE_RE.exec(line);
				if (fenceMatch === null) {
					markdown.push(line);
					index += 1;
					continue;
				}
				const fence = fenceMatch[1];
				const info = fenceInfo(line.slice(fenceMatch.index + fenceMatch[0].length), fence);
				if (info === null || !isMermaidInfo(info)) {
					markdown.push(line);
					index += 1;
					continue;
				}
				flushMarkdown();
				const char = fence.charAt(0);
				const length = fence.length;
				const code = [];
				index += 1;
				while (index < lines.length) {
					const candidate = lines[index] ?? "";
					const close = CLOSE_FENCE_RE.exec(candidate);
					if (close !== null && close[1].charAt(0) === char && close[1].length >= length) break;
					code.push(candidate);
					index += 1;
				}
				index += 1;
				blocks.push({
					kind: "mermaid",
					code: code.join("\n")
				});
			}
			flushMarkdown();
			return blocks;
		}
		//#endregion
		//#region src/client/mermaid-lazy.tsx
		/** Shared with the legacy no-HTML preview path in TextEditor (re-exported). */
		const LazyMermaidMarkdown = lazyChunkComponent("mermaid", (mod) => mod.MermaidMarkdown);
		//#endregion
		//#region src/client/changes/DiffPane.tsx
		/**
		* The changes tab's shared bottom preview pane: one selected target — a git
		* worktree change, a commit patch, or a session file op — rendered through
		* the unified diff stack (the same one the diff tab uses). Git targets load
		* on demand (refreshable, with the untracked full-addition fallback); op
		* targets are pure snapshots (diff / read view / error text). The pane is
		* resizable by drag (clamped; the height commits to the tab's persisted
		* meta on release) and by keyboard; git targets can expand into a dedicated
		* diff tab via the shell.
		*/
		/** Drag handle height clamp (px) and keyboard-resize step. */
		const HEIGHT_MIN = 140;
		const HEIGHT_STEP = 24;
		/** The redaction preference, persisted under the repo's sidebar storage
		*  prefix (see state.ts's `dsh-sidebar:v1`). */
		const REDACTION_KEY = "dsh-sidebar:v1:redaction";
		/** Diff material for one op snapshot: an edit reconstructs the full file
		*  from the window's known prior content when possible (hunk-style context);
		*  a write with unknown prior content renders all-added. */
		function diffOf(op, prior) {
			if (op.kind === "read") return [];
			if (op.kind === "edit" && op.edit !== void 0) {
				const { oldString, newString } = op.edit;
				if (prior !== void 0 && prior.includes(oldString)) return diffLines(prior, prior.replace(oldString, newString));
				return diffLines(oldString, newString);
			}
			if (op.kind === "write") {
				const content = op.content ?? "";
				return diffLines((prior !== void 0 && prior !== content ? prior : void 0) ?? "", content);
			}
			return [];
		}
		/** The render view of one html op target: the route-src iframe. Extracted
		*  (and exported) so the always-sandboxed contract is pinned directly by the
		*  sandbox spec — this surface has NO no-sandbox escape hatch. */
		function HtmlRenderPreview(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: changes_module_css_default.htmlPane,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					className: changes_module_css_default.htmlFrame,
					title: props.title,
					src: props.src,
					sandbox: HTML_IFRAME_SANDBOX,
					referrerPolicy: "no-referrer",
					allow: ""
				})
			});
		}
		/** One header pill toggle — the redaction / reading / render toggles share
		*  the shape (on-state styling + aria-pressed). */
		function PaneToggle(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: changes_module_css_default.mdToggle,
				"data-on": props.on ? "true" : void 0,
				"aria-pressed": props.on,
				title: props.title,
				onClick: props.onClick,
				children: props.label
			});
		}
		/** The reading-mode body of one markdown op target: the shared MarkdownText
		*  pass (local image destinations already rewritten to the media route by
		*  the caller). Mermaid fences render through the same chunk-resident
		*  renderer the editor preview uses (one MarkdownText pass with the fences
		*  lifted out); the plain path stays byte-for-byte for documents without
		*  any. */
		function MdReadingView(props) {
			const codeLabels = {
				copyLabel: t("copy"),
				copiedLabel: t("copied")
			};
			const hasMermaid = splitMermaidBlocks(props.text).some((block) => block.kind === "mermaid");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: changes_module_css_default.paneBody,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: changes_module_css_default.mdBody,
					children: hasMermaid ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyMermaidMarkdown, {
						text: props.text,
						codeLabels
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { ...markdownTextProps(props.text, codeLabels) })
				})
			});
		}
		/** The diff tab a git preview expands into (the shell owns placement). */
		function diffTabOf(ref) {
			if (ref.kind === "worktree") return {
				id: `diff:w:${encodeURIComponent(ref.worktree ?? "")}:${ref.staged ? "s" : "u"}:${ref.path}`,
				type: "diff",
				title: baseName$1(ref.path),
				diff: ref
			};
			return {
				id: `diff:c:${encodeURIComponent(ref.worktree ?? "")}:${ref.hashFull}`,
				type: "diff",
				title: `${ref.hash} ${ref.subject}`,
				diff: ref
			};
		}
		function DiffPane({ target, scope, height, onHeightCommit, onClose, onExpand }) {
			const [tick, setTick] = (0, react.useState)(0);
			const [loading, setLoading] = (0, react.useState)(target.kind === "git");
			const [error, setError] = (0, react.useState)(null);
			const [diffText, setDiffText] = (0, react.useState)(null);
			const [untracked, setUntracked] = (0, react.useState)(void 0);
			const [effectiveStaged, setEffectiveStaged] = (0, react.useState)(null);
			const gitRef = target.kind === "git" ? target.ref : null;
			const gitScope = (0, react.useMemo)(() => ({
				sessionId: scope.sessionId,
				cwd: scope.cwd,
				...gitRef?.repoRoot !== void 0 ? { repoRoot: gitRef.repoRoot } : {}
			}), [
				scope.sessionId,
				scope.cwd,
				gitRef?.repoRoot
			]);
			(0, react.useEffect)(() => {
				if (gitRef === null) return;
				let cancelled = false;
				const paneScope = {
					sessionId: scope.sessionId,
					cwd: scope.cwd,
					...gitRef.repoRoot !== void 0 ? { repoRoot: gitRef.repoRoot } : {}
				};
				setLoading(true);
				setError(null);
				setDiffText(null);
				setUntracked(void 0);
				setEffectiveStaged(null);
				const load = async () => {
					try {
						if (gitRef.kind === "commit") {
							const result = await api.gitCommitDiff(paneScope, gitRef.hashFull, gitRef.worktree);
							if (!cancelled) setDiffText(result.diff);
							return;
						}
						let result = await api.gitDiff(paneScope, gitRef.path, gitRef.staged, gitRef.worktree);
						if (result.diff === "") {
							const other = await api.gitDiff(paneScope, gitRef.path, !gitRef.staged, gitRef.worktree);
							if (other.diff !== "") {
								result = other;
								if (!cancelled) setEffectiveStaged(!gitRef.staged);
							}
						}
						if (result.diff !== "") {
							if (!cancelled) setDiffText(result.diff);
							return;
						}
						if (gitRef.untracked === true && !gitRef.staged) {
							const text = await api.fsRead(paneScope, resolveSidebarPath(gitRef.repoRoot ?? gitRef.worktree ?? scope.cwd, gitRef.path));
							if (!cancelled && text.kind === "text") {
								setDiffText("");
								setUntracked(text.content);
							}
							return;
						}
						if (!cancelled) setDiffText("");
					} catch (reason) {
						if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
					} finally {
						if (!cancelled) setLoading(false);
					}
				};
				load();
				return () => {
					cancelled = true;
				};
			}, [
				gitRef,
				scope.sessionId,
				scope.cwd,
				tick
			]);
			const foldContents = (0, react.useRef)(/* @__PURE__ */ new Map());
			(0, react.useEffect)(() => {
				foldContents.current = /* @__PURE__ */ new Map();
			}, [gitRef, tick]);
			const foldLoader = (0, react.useMemo)(() => {
				if (gitRef === null) return void 0;
				const sidesOf = (file) => {
					const ofSides = (oldContent, newContent) => {
						if ((oldContent ?? "") === "" && (newContent ?? "") === "") throw new Error("no content on either side");
						return {
							old: oldContent ?? "",
							new: newContent ?? ""
						};
					};
					const fetchSides = async () => {
						if (gitRef.kind === "commit") {
							const [oldSide, newSide] = await Promise.all([file.oldPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(gitScope, `${gitRef.hashFull}^`, displayPath(file.oldPath), gitRef.worktree), file.newPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(gitScope, gitRef.hashFull, displayPath(file.newPath), gitRef.worktree)]);
							return ofSides(oldSide.content, newSide.content);
						}
						if (effectiveStaged ?? gitRef.staged) {
							const [oldSide, newSide] = await Promise.all([file.oldPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(gitScope, "HEAD", displayPath(file.oldPath), gitRef.worktree), file.newPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(gitScope, ":0", displayPath(file.newPath), gitRef.worktree)]);
							return ofSides(oldSide.content, newSide.content);
						}
						const [oldSide, worktree] = await Promise.all([file.oldPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(gitScope, ":0", displayPath(file.oldPath), gitRef.worktree), api.fsRead(gitScope, resolveSidebarPath(gitRef.repoRoot ?? gitRef.worktree ?? scope.cwd, displayPath(file.newPath))).catch(() => null)]);
						return ofSides(oldSide.content, worktree !== null && worktree.kind === "text" ? worktree.content : null);
					};
					const path = displayPath(file.newPath === "/dev/null" ? file.oldPath : file.newPath);
					let promise = foldContents.current.get(path);
					if (promise === void 0) {
						promise = fetchSides();
						foldContents.current.set(path, promise);
					}
					return promise;
				};
				return (file, segment) => sidesOf(file).then((sides) => foldRowsFromContents(segment, sides.old, sides.new));
			}, [
				gitRef,
				gitScope,
				effectiveStaged,
				scope
			]);
			const opRaw = target.kind === "op" ? target.op : null;
			const priorRaw = target.kind === "op" ? target.prior : void 0;
			const [redactionOn, setRedactionOn] = (0, react.useState)(() => {
				try {
					return localStorage.getItem(REDACTION_KEY) !== "0";
				} catch {
					return true;
				}
			});
			const toggleRedaction = () => {
				setRedactionOn((prev) => {
					const next = !prev;
					try {
						localStorage.setItem(REDACTION_KEY, next ? "1" : "0");
					} catch {}
					return next;
				});
			};
			const { op, prior, redactionHit } = (0, react.useMemo)(() => {
				if (opRaw === null || !redactionOn) return {
					op: opRaw,
					prior: priorRaw,
					redactionHit: false
				};
				const path = target.kind === "op" ? target.path : "";
				const mask = (text) => {
					if (text === void 0) return {
						masked: void 0,
						hit: false
					};
					const outcome = redactText(path, text);
					return {
						masked: outcome.text,
						hit: outcome.hit
					};
				};
				const read = mask(opRaw.read);
				const content = mask(opRaw.content);
				const editOld = mask(opRaw.edit?.oldString);
				const editNew = mask(opRaw.edit?.newString);
				const errorText = mask(opRaw.errorText);
				const priorMasked = mask(priorRaw);
				if (!(read.hit || content.hit || editOld.hit || editNew.hit || errorText.hit || priorMasked.hit)) return {
					op: opRaw,
					prior: priorRaw,
					redactionHit: false
				};
				return {
					op: {
						...opRaw,
						...read.masked !== void 0 ? { read: read.masked } : {},
						...content.masked !== void 0 ? { content: content.masked } : {},
						...opRaw.edit !== void 0 ? { edit: {
							oldString: editOld.masked ?? opRaw.edit.oldString,
							newString: editNew.masked ?? opRaw.edit.newString
						} } : {},
						...errorText.masked !== void 0 ? { errorText: errorText.masked } : {}
					},
					prior: priorMasked.masked,
					redactionHit: true
				};
			}, [
				opRaw,
				priorRaw,
				target,
				redactionOn
			]);
			const opLang = (0, react.useMemo)(() => target.kind === "op" ? langOfPath(target.path) : void 0, [target]);
			const opRows = (0, react.useMemo)(() => op === null ? [] : diffOf(op, prior), [op, prior]);
			const opSegments = (0, react.useMemo)(() => buildDiffSegments(opRows), [opRows]);
			const opStats = (0, react.useMemo)(() => diffStats(opSegments), [opSegments]);
			const opReadLines = (0, react.useMemo)(() => op?.kind === "read" && op.read !== void 0 ? parseReadLines(op.read) : [], [op]);
			const mdOp = target.kind === "op" && !target.op.isError && /\.(md|markdown|mdx)$/i.test(target.path);
			const [reading, setReading] = (0, react.useState)(false);
			const readingSrc = (0, react.useMemo)(() => {
				if (!mdOp || op === null) return "";
				if (op.kind === "read") return parseReadContent(op.read ?? "");
				if (op.kind === "write") return op.content ?? "";
				if (op.kind === "edit" && op.edit !== void 0) {
					if (prior !== void 0 && prior.includes(op.edit.oldString)) return prior.replace(op.edit.oldString, op.edit.newString);
					return op.edit.newString;
				}
				return "";
			}, [
				mdOp,
				op,
				prior
			]);
			const readingText = (0, react.useMemo)(() => mdOp && reading && readingSrc !== "" && target.kind === "op" ? rewriteLocalImageUrls(readingSrc, scope, target.path, window.location.origin) : "", [
				mdOp,
				reading,
				readingSrc,
				scope,
				target
			]);
			const htmlOp = target.kind === "op" && !target.op.isError && /\.(html?)$/i.test(target.path);
			const [rendering, setRendering] = (0, react.useState)(false);
			const htmlRenderSrc = (0, react.useMemo)(() => {
				if (!htmlOp || target.kind !== "op") return "";
				return htmlUrl(scope, resolveSidebarPath(scope.cwd, target.path));
			}, [
				htmlOp,
				scope,
				target
			]);
			const pdfOp = target.kind === "op" && !target.op.isError && /\.pdf$/i.test(target.path);
			const [renderingPdf, setRenderingPdf] = (0, react.useState)(false);
			const pdfRenderPath = (0, react.useMemo)(() => {
				if (!pdfOp || target.kind !== "op") return "";
				return resolveSidebarPath(scope.cwd, target.path);
			}, [
				pdfOp,
				scope,
				target
			]);
			const gitStats = (0, react.useMemo)(() => {
				if (target.kind !== "git" || diffText === null || diffText === "") return null;
				let added = 0;
				let deleted = 0;
				for (const file of parseUnifiedDiff(diffText).files) {
					const stats = diffStats(unifiedSegments(file));
					added += stats.added;
					deleted += stats.deleted;
				}
				return {
					added,
					deleted
				};
			}, [target, diffText]);
			const [dragHeight, setDragHeight] = (0, react.useState)(null);
			const paneHeight = dragHeight ?? height;
			const clamp = (value) => Math.min(Math.max(value, HEIGHT_MIN), Math.round(window.innerHeight * .7));
			const dragOrigin = (0, react.useRef)(null);
			const dragBatcher = (0, react.useRef)(createFrameBatcher()).current;
			(0, react.useEffect)(() => () => dragBatcher.dispose(), [dragBatcher]);
			const onHandleDown = (event) => {
				event.preventDefault();
				dragOrigin.current = {
					y: event.clientY,
					h: paneHeight
				};
				const onMove = (ev) => {
					if (dragOrigin.current === null) return;
					const next = clamp(dragOrigin.current.h + (dragOrigin.current.y - ev.clientY));
					dragBatcher.schedule(() => {
						setDragHeight(next);
					});
				};
				const onUp = () => {
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
					dragOrigin.current = null;
					dragBatcher.flushNow();
					setDragHeight((current) => {
						if (current !== null) onHeightCommit(current);
						return null;
					});
				};
				window.addEventListener("pointermove", onMove);
				window.addEventListener("pointerup", onUp);
			};
			const title = target.kind === "op" ? target.path : target.ref.kind === "worktree" ? target.ref.path : `${target.ref.hash} ${target.ref.subject}`;
			const stats = gitStats ?? (target.kind === "op" && op !== null && op.kind !== "read" && !op.isError ? opStats : null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: changes_module_css_default.diffPane,
				style: { height: paneHeight },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.dragHandle,
						role: "separator",
						"aria-orientation": "horizontal",
						"aria-label": t("changesResizePreview"),
						tabIndex: 0,
						onPointerDown: onHandleDown,
						onKeyDown: (event) => {
							if (event.key === "ArrowUp") {
								event.preventDefault();
								onHeightCommit(clamp(paneHeight + HEIGHT_STEP));
							}
							if (event.key === "ArrowDown") {
								event.preventDefault();
								onHeightCommit(clamp(paneHeight - HEIGHT_STEP));
							}
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: changes_module_css_default.diffHead,
						children: [
							target.kind === "op" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: changes_module_css_default.diffKind,
								"data-kind": target.op.kind,
								children: t(target.op.kind === "read" ? "changesRead" : target.op.kind === "write" ? "changesWrite" : "changesEdit")
							}),
							target.kind === "git" && target.ref.kind === "worktree" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: changes_module_css_default.diffKind,
								"data-kind": "git",
								children: target.ref.staged ? t("staged") : t("unstaged")
							}),
							target.kind === "git" && target.ref.kind === "commit" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: changes_module_css_default.diffKind,
								"data-kind": "git",
								children: target.ref.hash
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: changes_module_css_default.diffPath,
								title,
								children: title
							}),
							stats !== null && (stats.added > 0 || stats.deleted > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: changes_module_css_default.diffStats,
								children: [stats.added > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: diff_module_css_default.statAdd,
									children: ["+", String(stats.added)]
								}), stats.deleted > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: diff_module_css_default.statDel,
									children: ["−", String(stats.deleted)]
								})]
							}),
							target.kind === "git" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: changes_module_css_default.iconButton,
								"aria-label": t("refresh"),
								title: t("refresh"),
								disabled: loading,
								onClick: () => {
									setTick((value) => value + 1);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: changes_module_css_default.iconButton,
								"aria-label": t("changesOpenDiffTab"),
								title: t("changesOpenDiffTab"),
								onClick: onExpand,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRightUpOutline16, { size: 14 })
							})] }),
							redactionHit && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: changes_module_css_default.redactBanner,
								role: "status",
								children: t("changesRedactBanner")
							}),
							target.kind === "op" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneToggle, {
								on: redactionOn,
								label: redactionOn ? t("changesRedactOnLabel") : t("changesRedactOffLabel"),
								title: redactionOn ? t("changesRedactOff") : t("changesRedactOn"),
								onClick: toggleRedaction
							}),
							mdOp && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneToggle, {
								on: reading,
								label: t(reading ? "changesMdRaw" : "changesMdReading"),
								onClick: () => {
									setReading((value) => !value);
								}
							}),
							htmlOp && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneToggle, {
								on: rendering,
								label: t(rendering ? "changesHtmlRaw" : "changesHtmlRender"),
								onClick: () => {
									setRendering((value) => !value);
								}
							}),
							pdfOp && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneToggle, {
								on: renderingPdf,
								label: t(renderingPdf ? "changesPdfRaw" : "changesPdfRender"),
								onClick: () => {
									setRenderingPdf((value) => !value);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: changes_module_css_default.iconButton,
								"aria-label": t("changesClosePreview"),
								title: t("changesClosePreview"),
								onClick: onClose,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
							})
						]
					}),
					target.kind === "op" && htmlOp && rendering && htmlRenderSrc !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HtmlRenderPreview, {
						src: htmlRenderSrc,
						title: target.path
					}) : target.kind === "op" && pdfOp && renderingPdf && pdfRenderPath !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.htmlPane,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PdfView, {
							scope,
							path: pdfRenderPath,
							title: target.path
						})
					}) : target.kind === "op" && mdOp && reading && readingText !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MdReadingView, { text: readingText }) : target.kind === "op" && op !== null && op.isError ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.paneBody,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.readError,
							role: "alert",
							children: op.errorText ?? t("changesError")
						})
					}) : target.kind === "op" && op !== null && op.kind === "read" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.paneBody,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReadRows, {
							lines: opReadLines,
							lang: opLang
						})
					}) : target.kind === "op" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: changes_module_css_default.paneBody,
						children: [op !== null && op.kind === "write" && prior === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.priorUnknown,
							children: t("changesPriorUnknown")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffRows, {
							segments: opSegments,
							lang: opLang
						}, target.op.callId)]
					}) : loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.paneBody,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.gitPlaceholder,
							children: t("loading")
						})
					}) : error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.paneBody,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: changes_module_css_default.gitError,
							children: [
								t("diffLoadError"),
								": ",
								error
							]
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: changes_module_css_default.paneBody,
						children: [diffText !== null && diffText !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffFiles, {
							diff: diffText,
							resolveFold: foldLoader,
							untrackedPath: untracked !== void 0 && target.ref.kind === "worktree" ? target.ref.path : void 0,
							untrackedContent: untracked
						}), diffText === "" && untracked === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: changes_module_css_default.gitEmpty,
							children: t("diffEmpty")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/changes/ChangesTab.tsx
		/**
		* The unified changes tab: one tab, two lenses on "what changed?" — Git
		* (repository truth: staged/unstaged files, commit box, history) and the
		* session round (agent truth: every file the model read, wrote, or edited).
		* Both lenses preview their selections in a shared resizable bottom pane
		* ({@link DiffPane}); git targets expand into the dedicated diff tab docked
		* in the workbench's diff pane. The active lens and the pane height persist
		* in the tab's meta, so the tab
		* reopens exactly where it was left.
		*
		* The session events ride the host's `changes.ops` route (the client
		* runtime exposes no event-log face): the tab pulls the delta past its
		* cursor while visible, folds it into ops, and publishes the op count to a
		* module-level cache the tab-strip badge reads.
		*/
		/** The default preview pane height (px) before the first drag. */
		const PANE_HEIGHT_DEFAULT = 300;
		/** Cap on accumulated events: the lens shows the recent window, not eternity
		*  (the host enforces the same bound per response). */
		const EVENTS_CAP = 4e3;
		/** Live op count per session: the tab's poller writes, the badge reads (a
		*  badge cannot fetch — it must resolve synchronously during render). */
		const opCounts = /* @__PURE__ */ new Map();
		/** The session's traced-op count as of the last poll (undefined before the
		*  tab has ever pulled; 0 hides the badge pill). */
		function opCountOf(sessionId) {
			return opCounts.get(sessionId);
		}
		function ChangesTab({ ctx, store, scope, tab, visible, onOpenFile, onOpenDiff }) {
			const meta = tab.meta ?? {};
			const [lens, setLens] = (0, react.useState)(meta.lens === "session" ? "session" : "git");
			const [preview, setPreview] = (0, react.useState)(null);
			const [paneHeight, setPaneHeight] = (0, react.useState)(typeof meta.previewH === "number" && meta.previewH >= 140 ? meta.previewH : PANE_HEIGHT_DEFAULT);
			const eventsRef = (0, react.useRef)([]);
			const opsRef = (0, react.useRef)([]);
			const seqRef = (0, react.useRef)(0);
			const pollGen = (0, react.useRef)(0);
			const [opsError, setOpsError] = (0, react.useState)(false);
			const [tick, setTick] = (0, react.useState)(0);
			const pull = (0, react.useCallback)(async () => {
				const generation = pollGen.current;
				try {
					const { events, lastSeq } = await api.changesOps(scope, seqRef.current);
					if (generation !== pollGen.current) return;
					if (events.length > 0) {
						const merged = [...eventsRef.current, ...events];
						eventsRef.current = merged.length > EVENTS_CAP ? merged.slice(merged.length - EVENTS_CAP) : merged;
					}
					if (lastSeq > seqRef.current) seqRef.current = lastSeq;
					const folded = extractFileOps(eventsRef.current);
					opsRef.current = folded;
					opCounts.set(scope.sessionId, folded.length);
					setOpsError(false);
					setTick((value) => value + 1);
				} catch {
					if (generation === pollGen.current) setOpsError(true);
				}
			}, [scope.sessionId, scope.cwd]);
			(0, react.useEffect)(() => {
				pollGen.current += 1;
				eventsRef.current = [];
				opsRef.current = [];
				seqRef.current = 0;
				setOpsError(false);
			}, [scope.sessionId]);
			(0, react.useEffect)(() => {
				pull();
			}, [visible, pull]);
			usePolling(visible, pull, { intervalMs: 2500 });
			const ops = opsRef.current;
			/** Persist a meta patch onto the tab (lens choice, pane height). */
			const patchMeta = (patch) => {
				ctx.get("betterSidebar")?.updateTab(tab.id, { meta: {
					...tab.meta ?? {},
					...patch
				} });
			};
			const chooseLens = (next) => {
				if (next === lens) return;
				setLens(next);
				patchMeta({ lens: next });
			};
			/** Preview one git change (worktree file or commit) from the Git lens. */
			const previewGit = (ref) => {
				setPreview({
					kind: "git",
					ref
				});
			};
			/** Preview one session op (with its best-effort prior content snapshot). */
			const previewOp = (path, op) => {
				setPreview({
					kind: "op",
					path,
					op,
					prior: knownContentBefore(ops, path, op)
				});
			};
			/** Expand the current git preview into the dedicated diff tab, docked
			*  into the workbench's diff pane. */
			const expandPreview = () => {
				if (preview?.kind !== "git") return;
				onOpenDiff?.(diffTabOf(preview.ref));
			};
			const previewKey = (target) => target.kind === "git" ? target.ref.kind === "worktree" ? `git:w:${target.ref.path}:${target.ref.staged ? "s" : "u"}` : `git:c:${target.ref.hashFull}` : `op:${target.op.callId}`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: changes_module_css_default.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: changes_module_css_default.lensBar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: changes_module_css_default.lensSwitch,
							role: "group",
							"aria-label": t("changes"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: changes_module_css_default.lensButton,
								"data-active": lens === "git" ? "true" : void 0,
								"aria-pressed": lens === "git",
								onClick: () => {
									chooseLens("git");
								},
								children: t("changesGitLens")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: changes_module_css_default.lensButton,
								"data-active": lens === "session" ? "true" : void 0,
								"aria-pressed": lens === "session",
								onClick: () => {
									chooseLens("session");
								},
								children: t("changesSessionLens")
							})]
						})
					}),
					lens === "git" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitLens, {
						scope,
						store,
						visible,
						onOpenFile: onOpenFile ?? (() => {}),
						onPreview: previewGit,
						selectedRef: preview !== null && preview.kind === "git" ? preview.ref : null
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionLens, {
						ops,
						loadError: opsError && ops.length === 0,
						onPreview: previewOp,
						selectedCallId: preview !== null && preview.kind === "op" ? preview.op.callId : null
					}),
					preview !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffPane, {
						target: preview,
						scope,
						height: paneHeight,
						onHeightCommit: (height) => {
							setPaneHeight(height);
							patchMeta({ previewH: height });
						},
						onClose: () => {
							setPreview(null);
						},
						onExpand: expandPreview
					}, previewKey(preview))
				]
			});
		}
		//#endregion
		//#region src/client/DiffTab.tsx
		/**
		* The diff tab: one change opened from the changes tab, like VSCode's diff
		* editor. A worktree ref loads the file's unified diff (`git diff`, staged or
		* not; untracked files — which git diff never covers — render as a full-file
		* addition from their content), a commit ref loads the commit's full patch
		* (`git.show`-style). The header carries a refresh button because the tab
		* stays mounted while the changes tab's staging/discard operations change the
		* very content it shows. Rendering goes through the shared {@link DiffFiles}
		* renderer — the same one the changes tab's inline preview uses.
		*/
		function DiffTab(props) {
			const { sessionId, cwd, diff } = props;
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)(null);
			const [data, setData] = (0, react.useState)(null);
			const [tick, setTick] = (0, react.useState)(0);
			const [effectiveStaged, setEffectiveStaged] = (0, react.useState)(null);
			const refresh = (0, react.useCallback)(() => {
				setTick((value) => value + 1);
			}, []);
			(0, react.useEffect)(() => {
				let cancelled = false;
				const scope = {
					sessionId,
					cwd,
					...diff.repoRoot !== void 0 ? { repoRoot: diff.repoRoot } : {}
				};
				setLoading(true);
				setError(null);
				setData(null);
				setEffectiveStaged(null);
				const load = async () => {
					try {
						if (diff.kind === "commit") {
							const result = await api.gitCommitDiff(scope, diff.hashFull, diff.worktree);
							if (!cancelled) setData({ diff: result.diff });
							return;
						}
						let result = await api.gitDiff(scope, diff.path, diff.staged, diff.worktree);
						if (result.diff === "") {
							const other = await api.gitDiff(scope, diff.path, !diff.staged, diff.worktree);
							if (other.diff !== "") {
								result = other;
								if (!cancelled) setEffectiveStaged(!diff.staged);
							}
						}
						if (result.diff !== "") {
							if (!cancelled) setData({ diff: result.diff });
							return;
						}
						if (diff.untracked === true && !diff.staged) {
							const text = await api.fsRead(scope, resolveSidebarPath(diff.repoRoot ?? diff.worktree ?? cwd, diff.path));
							if (!cancelled) setData(text.kind === "text" ? {
								diff: "",
								untracked: text.content
							} : { diff: "" });
							return;
						}
						if (!cancelled) setData({ diff: "" });
					} catch (reason) {
						if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
					} finally {
						if (!cancelled) setLoading(false);
					}
				};
				load();
				return () => {
					cancelled = true;
				};
			}, [
				sessionId,
				cwd,
				diff,
				tick
			]);
			const foldContents = (0, react.useRef)(/* @__PURE__ */ new Map());
			(0, react.useEffect)(() => {
				foldContents.current = /* @__PURE__ */ new Map();
			}, [diff, tick]);
			const foldLoader = (0, react.useMemo)(() => {
				const sidesOf = (file) => {
					const ofSides = (oldContent, newContent) => {
						if ((oldContent ?? "") === "" && (newContent ?? "") === "") throw new Error("no content on either side");
						return {
							old: oldContent ?? "",
							new: newContent ?? ""
						};
					};
					const fetchSides = async () => {
						const scope = {
							sessionId,
							cwd,
							...diff.repoRoot !== void 0 ? { repoRoot: diff.repoRoot } : {}
						};
						if (diff.kind === "commit") {
							const [oldSide, newSide] = await Promise.all([file.oldPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(scope, `${diff.hashFull}^`, displayPath(file.oldPath), diff.worktree), file.newPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(scope, diff.hashFull, displayPath(file.newPath), diff.worktree)]);
							return ofSides(oldSide.content, newSide.content);
						}
						if (effectiveStaged ?? diff.staged) {
							const [oldSide, newSide] = await Promise.all([file.oldPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(scope, "HEAD", displayPath(file.oldPath), diff.worktree), file.newPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(scope, ":0", displayPath(file.newPath), diff.worktree)]);
							return ofSides(oldSide.content, newSide.content);
						}
						const [oldSide, worktree] = await Promise.all([file.oldPath === "/dev/null" ? Promise.resolve({ content: null }) : api.gitShow(scope, ":0", displayPath(file.oldPath), diff.worktree), api.fsRead(scope, resolveSidebarPath(diff.repoRoot ?? diff.worktree ?? cwd, displayPath(file.newPath))).catch(() => null)]);
						return ofSides(oldSide.content, worktree !== null && worktree.kind === "text" ? worktree.content : null);
					};
					const path = displayPath(file.newPath === "/dev/null" ? file.oldPath : file.newPath);
					let promise = foldContents.current.get(path);
					if (promise === void 0) {
						promise = fetchSides();
						foldContents.current.set(path, promise);
					}
					return promise;
				};
				return (file, segment) => sidesOf(file).then((sides) => foldRowsFromContents(segment, sides.old, sides.new));
			}, [
				sessionId,
				cwd,
				diff,
				effectiveStaged
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.gitDiffTab,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitDiffTabHeader,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.gitDiffTabTitle,
							title: diff.kind === "worktree" ? diff.path : `${diff.hash} ${diff.subject}`,
							children: diff.kind === "worktree" ? diff.path : `${diff.hash} ${diff.subject}`
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.iconButton,
							"aria-label": t("refresh"),
							title: t("refresh"),
							onClick: refresh,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
						})]
					}),
					loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitPlaceholder,
						children: t("loading")
					}),
					!loading && error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.gitError,
						children: [
							t("diffLoadError"),
							": ",
							error
						]
					}),
					!loading && error === null && data !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [data.untracked !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffFiles, {
						diff: "",
						untrackedPath: diff.kind === "worktree" ? diff.path : "",
						untrackedContent: data.untracked
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffFiles, {
						diff: data.diff,
						resolveFold: foldLoader
					}), data.diff === "" && data.untracked === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.gitEmpty,
						children: t("diffEmpty")
					})] })
				]
			});
		}
		/** The boundary message's opening line — the transcript mapping drops user
		*  rows starting with it (same first line as dsh-sidechain's boundary, so
		*  the two plugins' threads render consistently in either UI). */
		const SIDE_BOUNDARY_PREFIX = "Side conversation boundary";
		/**
		* The boundary prompt delivered as the thread's first user message: the
		* inherited seed is reference context only, never active instruction.
		* Model-facing contract — change only with intent, tests pin the sentences.
		*/
		const SIDE_BOUNDARY_PROMPT = `Side conversation boundary.

Everything before this boundary is inherited history from the parent session: its completed turns, its pending question, and — if the parent was mid-turn — its in-progress output frozen at the moment this side conversation started. It is reference context only. It is not your current task.

Do not continue, execute, or complete any instructions, plans, tool calls, approvals, edits, or requests from before this boundary. Only messages submitted after this boundary are active user instructions for this side conversation.

Mode: this is a continuable side conversation. Your answers stay in this side thread and are viewed in the side panel; they are never delivered into the parent session.`;
		/**
		* Derive the side threads of one parent session from the client session list:
		* durable `origin: 'subagent'` children of the parent whose pinned title
		* carries the thread label prefix (our creation path pins it via
		* sessionTitle.rename; dsh-sidechain threads share the convention, so they
		* are visible here too).
		*/
		function sideThreadRows(byId, sessionId) {
			const rows = [];
			for (const summary of Object.values(byId)) {
				if (summary.origin !== "subagent" || summary.parentId !== sessionId) continue;
				if (!summary.displayTitle.startsWith("Side: ")) continue;
				rows.push({
					id: summary.id,
					title: summary.displayTitle,
					running: summary.running === true
				});
			}
			return rows;
		}
		/** The leading text of a user/message's content (block array or bare string). */
		function messageLeadText(data) {
			const content = data.content;
			const first = Array.isArray(content) ? content[0] : content;
			return typeof first === "string" ? first : typeof first === "object" && first !== null && "text" in first ? String(first.text) : "";
		}
		/**
		* Whether a logged user/message is a CONTEXT INJECTION (the boundary prompt
		* plus the parked in-progress snapshot) rather than a real user message.
		* New threads deliver the injection via `agent.inject` stamped with a
		* non-'user' source kind; threads created before that split carry
		* boundary+question in ONE 'user' message, recognized by the boundary
		* prefix. Both render as one collapsible injection row — never as a user
		* bubble.
		*/
		function isContextInjectionMessage(data) {
			const source = data.source;
			if (source?.kind !== void 0 && source.kind !== "user") return true;
			return messageLeadText(data).startsWith(SIDE_BOUNDARY_PREFIX);
		}
		/** The events a thread produced itself: everything after the LAST
		*  `session/end-seed` marker (the fork-seed boundary). A log with no marker
		*  (a thread created before seeding existed) is returned whole. */
		function threadOwnLogEvents(events) {
			for (let index = events.length - 1; index >= 0; index--) if (events[index]?.type === "session/end-seed") return events.slice(index + 1);
			return [...events];
		}
		/** {@link threadOwnLogEvents} over history rows (the client cache shape). */
		function threadOwnEvents(entries) {
			return threadOwnLogEvents(entries.map((entry) => entry.event));
		}
		/**
		* Whether the thread has at least one completed turn — the save-as-new-
		* session precondition (`session.fork` refuses to fork before the first
		* `turn/end`).
		*/
		function threadHasCompletedTurn(entries) {
			return threadOwnEvents(entries).some((event) => event.type === "turn/end");
		}
		/** Whether the thread ends with a user message that no completed turn
		*  answered yet — such a pending follow-up is NOT carried into the saved
		*  session (the fork cut is the last `turn/end`). */
		function threadTrailingPending(entries) {
			const own = threadOwnEvents(entries);
			let lastUser = -1;
			let lastTurnEnd = -1;
			own.forEach((event, index) => {
				if (event.type === "user/message") lastUser = index;
				if (event.type === "turn/end") lastTurnEnd = index;
			});
			return lastUser > lastTurnEnd;
		}
		//#endregion
		//#region src/client/subagent-lineage.ts
		/**
		* Side Chat threads ride the subagent origin (main-list hiding + the RPC
		* ownership fence) but they are NOT subagent topology: they carry the
		* durable 'Side: ' label and live as sidebar tabs. Excluding them here
		* keeps the auto-open trigger and the Subagent page counts clean.
		*/
		function isSideThreadSummary(summary) {
			return summary.origin === "subagent" && summary.displayTitle.startsWith("Side: ");
		}
		/**
		* Yield `start`'s uninterrupted subagent-origin chain upward: each summary
		* while it is a subagent with a known parent, then its parent row, and so
		* on. A revisited id ends the walk (cycles fail soft); the row that BREAKS
		* the chain — the first non-subagent ancestor, or a parent id with no row —
		* is deliberately NOT yielded: callers observe it through where the walk
		* stopped (the row after the last yielded one is `byId[last.parentId]`).
		*/
		function* subagentOriginChain(byId, start) {
			const seen = /* @__PURE__ */ new Set();
			let current = start;
			while (current?.origin === "subagent" && current.parentId !== void 0 && !seen.has(current.id)) {
				seen.add(current.id);
				yield current;
				current = byId[current.parentId];
			}
		}
		/**
		* The main agent of the current session's tree: walk the durable parent
		* chain upward until the first non-subagent session. The Subagent page shows
		* THIS root's full topology regardless of how deep the current selection is
		* (a session whose row is still hydrating, or a broken chain, degrades to
		* the session itself).
		*/
		function rootAncestor(byId, sessionId) {
			if (sessionId === void 0) return void 0;
			const start = byId[sessionId];
			if (start === void 0) return sessionId;
			let last;
			for (const node of subagentOriginChain(byId, start)) last = node;
			if (last === void 0) return start.id;
			return byId[last.parentId]?.id ?? sessionId;
		}
		/**
		* Index every subagent descendant under each ancestor it reaches through an
		* uninterrupted subagent-origin chain (same semantics as the official
		* `indexSubagentDescendants`; cycles fail soft).
		*/
		function countSubagentDescendants(byId, sessionId) {
			const totals = {
				count: 0,
				runningCount: 0
			};
			for (const descendant of Object.values(byId)) {
				if (descendant.origin !== "subagent" || isSideThreadSummary(descendant)) continue;
				for (const node of subagentOriginChain(byId, descendant)) if (node.parentId === sessionId) {
					totals.count += 1;
					if (descendant.running === true) totals.runningCount += 1;
					break;
				}
			}
			return totals;
		}
		/**
		* Every session id of the topology tree rooted at `rootId` (the root plus
		* each session whose uninterrupted subagent-origin chain reaches it — same
		* lineage semantics as {@link countSubagentDescendants}; cycles fail soft).
		* Sessions outside the tree (orphans, other trees) are excluded, so the
		* jobs section never shows foreign work.
		*/
		function treeSessionIds(byId, rootId) {
			const ids = /* @__PURE__ */ new Set();
			if (rootId === void 0 || byId[rootId] === void 0) return ids;
			for (const summary of Object.values(byId)) {
				if (summary.id === rootId) {
					ids.add(summary.id);
					continue;
				}
				for (const node of subagentOriginChain(byId, summary)) if (node.parentId === rootId) {
					ids.add(summary.id);
					break;
				}
			}
			return ids;
		}
		//#endregion
		//#region src/client/subagent-detect.ts
		/** Count the direct subagent children of one session (durable `origin` rows). */
		function directSubagentCount(byId, sessionId) {
			let count = 0;
			for (const summary of Object.values(byId)) if (summary.origin === "subagent" && summary.parentId === sessionId && !isSideThreadSummary(summary)) count += 1;
			return count;
		}
		/**
		* Collect every catalog branch (an entry with `hasChildren`) reachable from
		* the root — the set of catalogs the always-expanded topology consumes.
		* Cycles fail soft.
		*/
		function collectBranchIds(catalogs, rootId) {
			const out = [];
			const seen = /* @__PURE__ */ new Set();
			const visit = (parentId) => {
				if (seen.has(parentId)) return;
				seen.add(parentId);
				for (const entry of catalogs[parentId]?.entries ?? []) if (entry.kind === "child" && entry.hasChildren) {
					out.push(entry.id);
					visit(entry.id);
				}
			};
			if (rootId !== void 0) visit(rootId);
			return out;
		}
		/**
		* Whether a new direct subagent appeared under `sessionId` between two
		* consecutive list snapshots (the count crossed 0 → >0). Switching to a
		* session that already has subagents yields `false` (its baseline starts at
		* the current count), so the auto-open never fights an existing layout.
		*/
		function detectNewDirectSubagent(prev, next, sessionId) {
			return directSubagentCount(prev.byId, sessionId) === 0 && directSubagentCount(next.byId, sessionId) > 0;
		}
		//#endregion
		//#region src/client/subagent-jobs.ts
		/** Whether the registry still holds the job open (its duration ticks). */
		function isJobLive(job) {
			return job.status === "running" || job.status === "stopping";
		}
		/**
		* Whether a NEW background job appeared for one session between two
		* consecutive list snapshots (a job id the previous snapshot lacked).
		* Unlike the subagent auto-open (0 → N only), ANY new job id triggers: the
		* agent may start several jobs over a session, and each new one should
		* surface the Tasks page containing the background-jobs section (a fresh page
		* load never triggers — its baseline starts at the current snapshot).
		*/
		function detectNewJob(prev, next, sessionId) {
			const prevIds = new Set((prev.jobsBySession?.[sessionId] ?? []).map((job) => job.id));
			return (next.jobsBySession?.[sessionId] ?? []).some((job) => !prevIds.has(job.id));
		}
		/**
		* Collect the background jobs of the whole current tree, owner-labeled.
		* Sessions without a mirror entry contribute nothing; an absent mirror
		* (runtime older than the jobs feed) yields an empty list.
		*/
		function collectTreeJobs(byId, jobsBySession, rootId) {
			const rows = [];
			if (jobsBySession === void 0) return rows;
			for (const sessionId of treeSessionIds(byId, rootId)) {
				const jobs = jobsBySession[sessionId];
				if (jobs === void 0 || jobs.length === 0) continue;
				const ownerTitle = byId[sessionId]?.displayTitle ?? sessionId;
				for (const job of jobs) rows.push({
					ownerSessionId: sessionId,
					ownerTitle,
					job
				});
			}
			return rows;
		}
		/**
		* Live rows first in start order, then settled rows newest-first (mirror of
		* the official ui-jobs ordering); a tie falls back to start order so the
		* sort never depends on the host's map iteration.
		*/
		function orderJobs(rows) {
			return [...rows].sort((left, right) => {
				const liveLeft = isJobLive(left.job);
				if (liveLeft !== isJobLive(right.job)) return liveLeft ? -1 : 1;
				if (liveLeft) return left.job.startedAt - right.job.startedAt;
				const finished = (right.job.finishedAt ?? right.job.startedAt) - (left.job.finishedAt ?? left.job.startedAt);
				return finished !== 0 ? finished : left.job.startedAt - right.job.startedAt;
			});
		}
		/**
		* Status marker semantics. `stopping` and `killed` share the attention
		* color: both mean the work ended (or is ending) on request rather than on
		* its own.
		*/
		function jobDotState(status) {
			switch (status) {
				case "running": return "ongoing";
				case "stopping": return "warning";
				case "completed": return "done";
				case "killed": return "warning";
				case "failed": return "error";
			}
		}
		/** Human status word of one wire status (localized through the passed translator). */
		function jobStatusLabel(status, t) {
			switch (status) {
				case "running": return t("jobStatusRunning");
				case "stopping": return t("jobStatusStopping");
				case "completed": return t("jobStatusCompleted");
				case "killed": return t("jobStatusKilled");
				case "failed": return t("jobStatusFailed");
			}
		}
		/**
		* Elapsed time in at most two adjacent units (mirror of the official
		* ui-jobs duration wording). A background job that outlives an hour is
		* already exceptional, so hours is the widest unit.
		*/
		function formatJobDuration(elapsedMs, t) {
			const total = Math.max(0, Math.floor(elapsedMs / 1e3));
			const seconds = total % 60;
			const minutes = Math.floor(total / 60) % 60;
			const hours = Math.floor(total / 3600);
			if (hours > 0) return t("jobDurationHours", {
				hours,
				minutes
			});
			if (minutes > 0) return t("jobDurationMinutes", {
				minutes,
				seconds
			});
			return t("jobDurationSeconds", { seconds });
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/DSH-better-sidebar/DSH-better-sidebar/src/client/SubagentView.module.css.mjs
		const css$2 = ".wxwsGW_subagent{flex-direction:column;flex:1;min-height:0;display:flex}.wxwsGW_subagentHeader{flex:none;align-items:center;gap:8px;height:36px;padding:0 8px 0 12px;display:flex}.wxwsGW_subagentTitle{min-width:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.wxwsGW_subagentCount{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.wxwsGW_subagentRefresh{width:24px;height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;display:inline-flex}.wxwsGW_subagentRefresh:hover{background:var(--dsw-alias-interactive-bg-hover)}.wxwsGW_subagentBody{flex:1;min-height:0;padding:2px 6px 8px;overflow-y:auto}.wxwsGW_subagentRow{box-sizing:border-box;width:100%;min-height:50px;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;outline:none;align-items:flex-start;gap:8px;padding:7px 8px 7px 11px;display:flex;position:relative}.wxwsGW_subagentRow:hover,.wxwsGW_subagentRow:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.wxwsGW_subagentRowActive,.wxwsGW_subagentRowActive:hover,.wxwsGW_subagentRowActive:focus-visible{background:var(--dsw-alias-interactive-bg-active)}.wxwsGW_subagentRowDisabled{color:var(--dsw-alias-label-dimmed);cursor:not-allowed}.wxwsGW_subagentRowDisabled:hover{background:0 0}.wxwsGW_subagentRowLoading{cursor:default}.wxwsGW_subagentDot{margin-top:4px}.wxwsGW_subagentContent{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.wxwsGW_subagentLabel,.wxwsGW_subagentSecondary{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.wxwsGW_subagentLabel{color:inherit;font-weight:400}.wxwsGW_subagentSecondary{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary)}.wxwsGW_subagentLive{min-width:0;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);align-items:baseline;gap:4px;display:flex;overflow:hidden}.wxwsGW_subagentLiveTool{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-secondary);flex:none}.wxwsGW_subagentLiveArgs{min-width:0;font-family:var(--ds-font-family-code);font-size:var(--dsw-font-xxxs-11-font-size);line-height:var(--dsw-font-xxxs-11-line-height);color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.wxwsGW_subagentLiveText{-webkit-line-clamp:2;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-secondary);-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.wxwsGW_subagentNode{min-width:0;position:relative}.wxwsGW_subagentChildren{margin-left:18px;padding-left:4px;position:relative}.wxwsGW_subagentChildren:before{content:\"\";border-left:1px solid var(--dsw-alias-border-l2);height:26px;position:absolute;top:-26px;left:0}.wxwsGW_subagentChildren[aria-busy=true]:before{content:none}.wxwsGW_subagentChildren>.wxwsGW_subagentNode:before{content:\"\";border-left:1px solid var(--dsw-alias-border-l2);position:absolute;top:0;bottom:0;left:-4px}.wxwsGW_subagentChildren>.wxwsGW_subagentNode:last-child:before{height:17px;bottom:auto}.wxwsGW_subagentChildren>.wxwsGW_subagentNode>.wxwsGW_subagentRow:before{content:\"\";border-top:1px solid var(--dsw-alias-border-l2);width:14px;position:absolute;top:16px;left:-4px}.wxwsGW_subagentEmpty{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-align:center;flex-direction:column;gap:2px;padding:16px;display:flex}.wxwsGW_subagentEmptyHint{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-dimmed)}.wxwsGW_subagentError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;display:flex}.wxwsGW_subagentErrorRetry{height:24px;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-strong-11);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;align-items:center;gap:4px;padding:0 8px;display:inline-flex}.wxwsGW_subagentErrorRetry:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.wxwsGW_jobs{border-top:1px solid var(--dsw-alias-border-l2);margin-top:10px;padding-top:8px}.wxwsGW_jobsHeader{align-items:center;gap:8px;height:26px;padding:0 2px;display:flex}.wxwsGW_jobsTitle{min-width:0;font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.wxwsGW_jobsCount{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.wxwsGW_jobsList{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.wxwsGW_jobsRow{border-radius:8px;align-items:center;gap:4px;display:flex}.wxwsGW_jobsRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.wxwsGW_jobsRowSettled{opacity:.8}.wxwsGW_jobsRowSelected,.wxwsGW_jobsRowSelected:hover{background:var(--dsw-alias-interactive-bg-active)}.wxwsGW_jobsRowMain{min-width:0;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;outline:none;flex:1;align-items:flex-start;gap:8px;padding:6px 8px 6px 11px;display:flex}.wxwsGW_jobsRowMain:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.wxwsGW_jobsDot{margin-top:5px}.wxwsGW_jobsContent{flex-direction:column;gap:1px;min-width:0;display:flex}.wxwsGW_jobsLabelLine{align-items:center;gap:6px;min-width:0;display:flex}.wxwsGW_jobsKind{text-overflow:ellipsis;white-space:nowrap;border:1px solid var(--dsw-alias-border-l2);max-width:90px;font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);border-radius:4px;flex:none;padding:0 5px;line-height:14px;overflow:hidden}.wxwsGW_jobsLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--ds-font-family-code);font-size:var(--dsw-font-xxxs-11-font-size);line-height:var(--dsw-font-xxxs-11-line-height);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.wxwsGW_jobsSecondary{text-overflow:ellipsis;white-space:nowrap;font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);overflow:hidden}.wxwsGW_jobsKill{width:22px;height:22px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;margin-right:4px;display:inline-flex}.wxwsGW_jobsKill:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);color:var(--dsw-alias-state-error-primary)}.wxwsGW_jobsKillArmed,.wxwsGW_jobsKillArmed:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);width:auto;height:20px;color:var(--dsw-alias-state-error-primary);font:var(--dsw-font-xxxs-strong-11);white-space:nowrap;padding:0 8px}.wxwsGW_jobsKill:disabled{opacity:.5;cursor:default}.wxwsGW_jobsKillError{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-error-primary);flex:none;margin-right:4px}.wxwsGW_jobsPane{z-index:1;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;margin-top:4px;position:sticky;bottom:0;overflow:hidden;box-shadow:0 -6px 12px -8px #00000059}.wxwsGW_jobsPaneHeader{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;height:28px;padding:0 4px 0 10px;display:flex}.wxwsGW_jobsPaneDot{flex:none}.wxwsGW_jobsPaneLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--ds-font-family-code);font-size:var(--dsw-font-xxxs-11-font-size);line-height:var(--dsw-font-xxxs-11-line-height);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden}.wxwsGW_jobsPaneStatus{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);flex:none}.wxwsGW_jobsPaneClose{width:20px;height:20px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:5px;flex:none;justify-content:center;align-items:center;display:inline-flex}.wxwsGW_jobsPaneClose:hover{background:var(--dsw-alias-interactive-bg-hover)}.wxwsGW_jobsPanePre{max-height:200px;font-family:var(--ds-font-family-code);font-size:var(--dsw-font-xxxs-11-font-size);color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word;margin:0;padding:6px 10px;line-height:1.5;overflow:auto}.wxwsGW_jobsPaneHint{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);padding:8px 10px}.wxwsGW_jobsPaneError{color:var(--dsw-alias-state-error-primary)}";
		const tagId$2 = "dsh-better-sidebar/SubagentView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var SubagentView_module_css_default = {
			"jobsLabelLine": "wxwsGW_jobsLabelLine",
			"jobsPaneClose": "wxwsGW_jobsPaneClose",
			"subagentLabel": "wxwsGW_subagentLabel",
			"subagentRowDisabled": "wxwsGW_subagentRowDisabled",
			"subagentErrorRetry": "wxwsGW_subagentErrorRetry",
			"subagentCount": "wxwsGW_subagentCount",
			"jobsSecondary": "wxwsGW_jobsSecondary",
			"subagentLiveText": "wxwsGW_subagentLiveText",
			"jobsHeader": "wxwsGW_jobsHeader",
			"jobsPane": "wxwsGW_jobsPane",
			"subagentLiveTool": "wxwsGW_subagentLiveTool",
			"jobsRowSettled": "wxwsGW_jobsRowSettled",
			"jobsPaneError": "wxwsGW_jobsPaneError",
			"jobsKillError": "wxwsGW_jobsKillError",
			"subagent": "wxwsGW_subagent",
			"subagentHeader": "wxwsGW_subagentHeader",
			"subagentRowLoading": "wxwsGW_subagentRowLoading",
			"subagentBody": "wxwsGW_subagentBody",
			"subagentLive": "wxwsGW_subagentLive",
			"jobsCount": "wxwsGW_jobsCount",
			"subagentLiveArgs": "wxwsGW_subagentLiveArgs",
			"subagentRefresh": "wxwsGW_subagentRefresh",
			"subagentEmptyHint": "wxwsGW_subagentEmptyHint",
			"subagentError": "wxwsGW_subagentError",
			"jobsTitle": "wxwsGW_jobsTitle",
			"jobsRowSelected": "wxwsGW_jobsRowSelected",
			"jobsKill": "wxwsGW_jobsKill",
			"subagentTitle": "wxwsGW_subagentTitle",
			"subagentDot": "wxwsGW_subagentDot",
			"subagentContent": "wxwsGW_subagentContent",
			"jobsRow": "wxwsGW_jobsRow",
			"subagentNode": "wxwsGW_subagentNode",
			"subagentEmpty": "wxwsGW_subagentEmpty",
			"jobsRowMain": "wxwsGW_jobsRowMain",
			"jobsDot": "wxwsGW_jobsDot",
			"jobsKind": "wxwsGW_jobsKind",
			"subagentRow": "wxwsGW_subagentRow",
			"jobsContent": "wxwsGW_jobsContent",
			"jobsList": "wxwsGW_jobsList",
			"subagentSecondary": "wxwsGW_subagentSecondary",
			"jobsKillArmed": "wxwsGW_jobsKillArmed",
			"jobsPaneLabel": "wxwsGW_jobsPaneLabel",
			"jobsPaneStatus": "wxwsGW_jobsPaneStatus",
			"jobs": "wxwsGW_jobs",
			"jobsPanePre": "wxwsGW_jobsPanePre",
			"subagentRowActive": "wxwsGW_subagentRowActive",
			"subagentChildren": "wxwsGW_subagentChildren",
			"jobsPaneDot": "wxwsGW_jobsPaneDot",
			"jobsPaneHint": "wxwsGW_jobsPaneHint",
			"jobsPaneHeader": "wxwsGW_jobsPaneHeader",
			"jobsLabel": "wxwsGW_jobsLabel"
		};
		//#endregion
		//#region src/client/SubagentView.tsx
		/**
		* Subagent page: the FULL agent topology of the current tree's main session.
		*
		* The root is resolved by walking the durable parent chain upward from the
		* current session to the first non-subagent session — the MAIN session — and
		* every subagent under it shares this one topology view, no matter how deep
		* the current selection is (including a subagent transcript opened in the
		* main view). The main agent renders as the root node card (click it to jump
		* back to the main session), with its subagents hanging below it in clearly
		* LAYERED levels: tree connector lines (first level included) and per-level
		* indentation show the hierarchy, and the currently-open session is
		* highlighted in place. Every branch is expanded automatically (lazy
		* catalogs hydrate on demand and consume live membership while visible).
		*
		* Each node card carries live status (state dot, durable label, mode and
		* activity); while a child RUNS, its card additionally shows the LAST text
		* output and LAST tool call pulled from its history tail, auto-refreshing
		* every few seconds while the page is visible. Clicking a card jumps
		* straight into the child transcript (`openSubagent`); the page stays open
		* and the topology remains rooted at the main session.
		*/
		/** Refresh cadence of the live "last text + tool call" lines while a child runs. */
		const POLL_MS$1 = 3e3;
		/** Preview cap of one tool-call argument line. */
		const ARGS_PREVIEW = 60;
		/** Refresh cadence of an expanded job-output panel while its job runs. */
		const JOB_POLL_MS = 2e3;
		/** How long the kill button stays armed before it needs re-confirming. */
		const JOB_KILL_ARM_MS = 3e3;
		/** The direct subagent children of one parent (durable `origin` rows;
		*  Side Chat threads ride the same origin but are tab-strip conversations,
		*  never topology). */
		function directChildren(byId, parentSessionId) {
			return Object.values(byId).filter((summary) => summary.origin === "subagent" && summary.parentId === parentSessionId && !isSideThreadSummary(summary));
		}
		/** Human label of one catalog child: durable label, then summary title, then id. */
		function childLabel(entry, summary) {
			return entry.label ?? summary?.displayTitle ?? entry.id;
		}
		function diagnosticReason(entry) {
			switch (entry.reason) {
				case "corrupt": return t("subagentDiagCorrupt");
				case "unsupported": return t("subagentDiagUnsupported");
				case "unavailable": return t("subagentDiagUnavailable");
			}
		}
		/** The secondary line of one card: title · mode · activity (skips empty parts). */
		function cardSecondary(summary, entry) {
			return [
				summary?.displayTitle,
				entry.mode === "one-shot" ? t("subagentModeOneShot") : t("subagentModeContinuable"),
				entry.activity === "running" ? t("subagentRunning") : t("subagentInactive")
			].filter(Boolean).join(" · ");
		}
		/** First `limit` characters with an ellipsis when truncated. */
		function preview(text, limit) {
			return text.length > limit ? `${text.slice(0, limit)}…` : text;
		}
		/** Collapse whitespace for the single-paragraph live-text preview. */
		function flatten(text) {
			return text.replace(/\s+/g, " ").trim();
		}
		/** Disabled "loading…" cards backed by the summary mirror while a catalog hydrates. */
		function CatalogLoadingRows(props) {
			const { parentSessionId, byId, level } = props;
			const children = directChildren(byId, parentSessionId);
			if (children.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SubagentView_module_css_default.subagentEmpty,
				children: t("loading")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: children.map((summary) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "treeitem",
				"aria-disabled": "true",
				"aria-level": level,
				"aria-label": t("loading"),
				className: `${SubagentView_module_css_default.subagentRow} ${SubagentView_module_css_default.subagentRowDisabled} ${SubagentView_module_css_default.subagentRowLoading}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
					state: summary.running === true ? "ongoing" : "done",
					className: SubagentView_module_css_default.subagentDot
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SubagentView_module_css_default.subagentContent,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SubagentView_module_css_default.subagentLabel,
						children: t("loading")
					})
				})]
			}, summary.id)) });
		}
		/**
		* The live lines of one RUNNING subagent card: a pure presentation of the
		* batch `subagents.live` activity. The polling lives in one place (the
		* SubagentView hook), not per card. A running child with neither output yet
		* reads "thinking…".
		*/
		function SubagentLiveLines(props) {
			const { live } = props;
			if (live?.text === void 0 && live?.tool === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SubagentView_module_css_default.subagentLive,
				children: t("subagentThinking")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [live.tool !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: SubagentView_module_css_default.subagentLive,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SubagentView_module_css_default.subagentLiveTool,
					children: live.tool.name
				}), live.tool.args !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SubagentView_module_css_default.subagentLiveArgs,
					children: preview(live.tool.args, ARGS_PREVIEW)
				})]
			}), live.text !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SubagentView_module_css_default.subagentLiveText,
				children: flatten(live.text)
			})] });
		}
		/**
		* One shared live-preview poller for the whole Subagent tree. Unlike the old
		* per-card `subagents.history` timers, this sends at most ONE `subagents.live`
		* request at a time (the shared poller's self-scheduling mode arms the next
		* tick only after the previous request settles, so a slow host never sees
		* abort/restart storms); a response settling after the poller stopped (page
		* hidden, tree re-rooted) is dropped via the aborted signal.
		*/
		function useSubagentLive(rootId, active) {
			const [live, setLive] = (0, react.useState)({});
			(0, react.useEffect)(() => {
				setLive({});
			}, [rootId]);
			const poll = (0, react.useCallback)(async (signal) => {
				if (rootId === void 0) return;
				const result = await api.subagentsLive(rootId, signal);
				if (!signal.aborted) setLive(result.live);
			}, [rootId]);
			usePolling(rootId !== void 0 && active, poll, {
				intervalMs: POLL_MS$1,
				mode: "self-scheduling",
				immediate: true
			});
			return live;
		}
		/** Render one topology level; branches are always expanded (lazy catalogs). */
		function CatalogRows({ parentSessionId, catalog, catalogs, byId, level, currentSessionId, live, openChild, refresh }) {
			const emptyLoading = catalog?.state === "loading" && catalog.entries.length === 0;
			const visibleEntries = (catalog?.entries ?? []).filter((entry) => {
				if (entry.kind === "child") return !(entry.label?.startsWith("Side: ") ?? false);
				return !(byId[entry.id]?.displayTitle.startsWith("Side: ") ?? false);
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				emptyLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogLoadingRows, {
					parentSessionId,
					byId,
					level
				}),
				catalog?.state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SubagentView_module_css_default.subagentError,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: catalog.error?.message ?? t("error") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: SubagentView_module_css_default.subagentErrorRetry,
						onClick: () => {
							refresh(parentSessionId);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {}), t("retry")]
					})]
				}),
				visibleEntries.map((entry) => {
					if (entry.kind === "diagnostic") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.subagentNode,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "treeitem",
							"aria-disabled": "true",
							"aria-level": level,
							className: `${SubagentView_module_css_default.subagentRow} ${SubagentView_module_css_default.subagentRowDisabled}`,
							title: diagnosticReason(entry),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: "error",
								className: SubagentView_module_css_default.subagentDot
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SubagentView_module_css_default.subagentContent,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SubagentView_module_css_default.subagentLabel,
									children: entry.id
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SubagentView_module_css_default.subagentSecondary,
									children: diagnosticReason(entry)
								})]
							})]
						})
					}, entry.id);
					const childCatalog = catalogs[entry.id];
					const knownLeaf = !entry.hasChildren;
					const summary = byId[entry.id];
					const label = childLabel(entry, summary);
					const secondary = cardSecondary(summary, entry);
					const childLoading = childCatalog === void 0 || childCatalog.state === "loading" && childCatalog.entries.length === 0;
					const address = {
						parentSessionId,
						childSessionId: entry.id,
						mode: entry.mode
					};
					const current = entry.id === currentSessionId;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SubagentView_module_css_default.subagentNode,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "treeitem",
							tabIndex: 0,
							"aria-level": level,
							"aria-label": `${label} ${secondary}`,
							"aria-current": current ? "true" : void 0,
							...knownLeaf ? {} : { "aria-expanded": true },
							className: clsx(SubagentView_module_css_default.subagentRow, current && SubagentView_module_css_default.subagentRowActive),
							onClick: () => {
								openChild(address);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									event.stopPropagation();
									openChild(address);
								}
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: entry.activity === "running" ? "ongoing" : "done",
								className: SubagentView_module_css_default.subagentDot
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SubagentView_module_css_default.subagentContent,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SubagentView_module_css_default.subagentLabel,
										children: label
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SubagentView_module_css_default.subagentSecondary,
										children: secondary
									}),
									entry.activity === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SubagentLiveLines, { live: live[entry.id] })
								]
							})]
						}), !knownLeaf && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							role: "group",
							className: SubagentView_module_css_default.subagentChildren,
							"aria-busy": childLoading || void 0,
							children: childCatalog === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogLoadingRows, {
								parentSessionId: entry.id,
								byId,
								level: level + 1
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogRows, {
								parentSessionId: entry.id,
								catalog: childCatalog,
								catalogs,
								byId,
								level: level + 1,
								currentSessionId,
								live,
								openChild,
								refresh
							})
						})]
					}, entry.id);
				})
			] });
		}
		/**
		* The shared output dock of the jobs section: ONE pane at the bottom of the
		* sidebar body (sticky, terminal-like) shows the SELECTED job's output as
		* the MODEL has read it so far (replayed from the owner session's event
		* log), refreshed every {@link JOB_POLL_MS} while the job runs and the
		* page is visible. The model's `job_output` cursor is never touched — the
		* pane can never steal the agent's bytes, and it stays empty until the
		* agent reads the job. A single dock — not a panel per row — keeps the
		* job list compact and stable when many jobs are running.
		*/
		function JobOutputPane(props) {
			const { ownerSessionId, job, active, onClose } = props;
			const [state, setState] = (0, react.useState)("loading");
			const controllerRef = (0, react.useRef)(void 0);
			const preRef = (0, react.useRef)(null);
			const load = (0, react.useCallback)(async () => {
				controllerRef.current?.abort();
				const controller = new AbortController();
				controllerRef.current = controller;
				try {
					const result = await api.jobOutput({ sessionId: ownerSessionId }, job.id, controller.signal);
					setState(result);
				} catch {
					setState((current) => current === "loading" ? "error" : current);
				}
			}, [ownerSessionId, job.id]);
			(0, react.useEffect)(() => {
				load();
				if (!active || !isJobLive(job)) return;
				const timer = window.setInterval(() => {
					load();
				}, JOB_POLL_MS);
				return () => {
					window.clearInterval(timer);
				};
			}, [
				load,
				active,
				job.status
			]);
			(0, react.useEffect)(() => () => {
				controllerRef.current?.abort();
			}, []);
			(0, react.useEffect)(() => {
				if (!isJobLive(job) || typeof state !== "object" || state.text.length === 0) return;
				const pre = preRef.current;
				if (pre !== null) pre.scrollTop = pre.scrollHeight;
			}, [state, job.status]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SubagentView_module_css_default.jobsPane,
				role: "region",
				"aria-label": `${job.label} ${t("jobs")}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SubagentView_module_css_default.jobsPaneHeader,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: jobDotState(job.status),
								className: SubagentView_module_css_default.jobsPaneDot
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SubagentView_module_css_default.jobsPaneLabel,
								title: job.label,
								children: job.label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SubagentView_module_css_default.jobsPaneStatus,
								children: [jobStatusLabel(job.status, t), job.detail !== void 0 && job.detail !== "" ? ` · ${job.detail}` : ""]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SubagentView_module_css_default.jobsPaneClose,
								"aria-label": t("close"),
								title: t("close"),
								onClick: onClose,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconStopOutline16, { size: 10 })
							})
						]
					}),
					state === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.jobsPaneHint,
						children: t("loading")
					}),
					state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: `${SubagentView_module_css_default.jobsPaneHint} ${SubagentView_module_css_default.jobsPaneError}`,
						children: t("jobOutputError")
					}),
					typeof state === "object" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [state.text.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						ref: preRef,
						className: SubagentView_module_css_default.jobsPanePre,
						children: state.text
					}) : state.read ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.jobsPaneHint,
						children: t("jobNoOutput")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.jobsPaneHint,
						children: t("jobNotReadYet")
					}), state.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SubagentView_module_css_default.jobsPaneHint,
						children: t("jobOutputTruncated")
					})] })
				]
			});
		}
		/**
		* The background-job section of the Subagent page: every job of the whole
		* current tree (main agent + subagents, owner-labeled), fed by the harness
		* `session/jobs` push mirror. Clicking a row feeds its model-read output to
		* the shared bottom dock (event replay — never the model's cursor); live
		* rows carry a two-click-confirm kill button. Renders nothing while the
		* tree has no jobs.
		*/
		function JobsSection(props) {
			const { byId, jobsBySession, rootId, active } = props;
			const rows = (0, react.useMemo)(() => orderJobs(collectTreeJobs(byId, jobsBySession, rootId)), [
				byId,
				jobsBySession,
				rootId
			]);
			const [selectedId, setSelectedId] = (0, react.useState)(void 0);
			const [armedId, setArmedId] = (0, react.useState)(void 0);
			const [killingId, setKillingId] = (0, react.useState)(void 0);
			const [killErrorId, setKillErrorId] = (0, react.useState)(void 0);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const selectedRow = (0, react.useMemo)(() => selectedId === void 0 ? void 0 : rows.find((row) => row.job.id === selectedId), [rows, selectedId]);
			const liveCount = (0, react.useMemo)(() => rows.reduce((count, row) => count + (isJobLive(row.job) ? 1 : 0), 0), [rows]);
			const multiOwner = (0, react.useMemo)(() => new Set(rows.map((row) => row.ownerSessionId)).size > 1, [rows]);
			(0, react.useEffect)(() => {
				if (armedId === void 0) return;
				const timer = window.setTimeout(() => {
					setArmedId(void 0);
				}, JOB_KILL_ARM_MS);
				return () => {
					window.clearTimeout(timer);
				};
			}, [armedId]);
			(0, react.useEffect)(() => {
				if (liveCount === 0) return;
				setNow(Date.now());
				const timer = window.setInterval(() => {
					setNow(Date.now());
				}, 1e3);
				return () => {
					window.clearInterval(timer);
				};
			}, [liveCount]);
			(0, react.useEffect)(() => {
				if (selectedId !== void 0 && selectedRow === void 0) setSelectedId(void 0);
			}, [selectedId, selectedRow]);
			const kill = (0, react.useCallback)(async (row) => {
				setKillingId(row.job.id);
				setKillErrorId(void 0);
				try {
					await api.jobKill({ sessionId: row.ownerSessionId }, row.job.id);
				} catch {
					setKillErrorId(row.job.id);
				} finally {
					setKillingId(void 0);
					setArmedId(void 0);
				}
			}, []);
			if (rows.length === 0) return null;
			const countLabel = liveCount > 0 ? t("jobsCountRunning", {
				count: rows.length,
				running: liveCount
			}) : t("jobsCount", { count: rows.length });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SubagentView_module_css_default.jobs,
				"aria-label": t("jobs"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SubagentView_module_css_default.jobsHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SubagentView_module_css_default.jobsTitle,
						children: t("jobs")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SubagentView_module_css_default.jobsCount,
						children: countLabel
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: SubagentView_module_css_default.jobsList,
					"aria-label": t("jobs"),
					children: rows.map((row) => {
						const { job } = row;
						const live = isJobLive(job);
						const selected = selectedId === job.id;
						const armed = armedId === job.id;
						const killing = killingId === job.id;
						const killFailed = killErrorId === job.id;
						const elapsed = live ? now - job.startedAt : (job.finishedAt ?? job.startedAt) - job.startedAt;
						const secondary = [
							...multiOwner ? [row.ownerTitle] : [],
							jobStatusLabel(job.status, t),
							...job.detail !== void 0 && job.detail !== "" ? [job.detail] : [],
							formatJobDuration(elapsed, t)
						].filter(Boolean).join(" · ");
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: clsx(SubagentView_module_css_default.jobsRow, !live && SubagentView_module_css_default.jobsRowSettled, selected && SubagentView_module_css_default.jobsRowSelected),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: SubagentView_module_css_default.jobsRowMain,
									"aria-pressed": selected,
									"aria-label": `${job.label} ${secondary}`,
									onClick: () => {
										setSelectedId(selected ? void 0 : job.id);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: jobDotState(job.status),
										className: SubagentView_module_css_default.jobsDot
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: SubagentView_module_css_default.jobsContent,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: SubagentView_module_css_default.jobsLabelLine,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: SubagentView_module_css_default.jobsKind,
												children: job.kind
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: SubagentView_module_css_default.jobsLabel,
												title: job.label,
												children: job.label
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SubagentView_module_css_default.jobsSecondary,
											children: secondary
										})]
									})]
								}),
								job.status === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: armed ? `${SubagentView_module_css_default.jobsKill} ${SubagentView_module_css_default.jobsKillArmed}` : SubagentView_module_css_default.jobsKill,
									"aria-label": armed ? t("jobKillConfirm") : t("jobKill"),
									title: armed ? t("jobKillConfirm") : t("jobKill"),
									disabled: killing,
									onClick: (event) => {
										event.stopPropagation();
										if (armed) kill(row);
										else setArmedId(job.id);
									},
									children: armed ? t("jobKillConfirm") : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconStopOutline16, { size: 12 })
								}),
								killFailed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SubagentView_module_css_default.jobsKillError,
									children: t("jobKillError")
								})
							]
						}, job.id);
					})
				})]
			}), selectedRow !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobOutputPane, {
				ownerSessionId: selectedRow.ownerSessionId,
				job: selectedRow.job,
				active,
				onClose: () => {
					setSelectedId(void 0);
				}
			})] });
		}
		/**
		* The sidebar's Subagent topology page.
		* @param props - current session id, whether the page is actually visible
		*   (active tab + open panel), the client context, and an optional
		*   jump-notify hook fired right before `openSubagent` (lets the sidebar
		*   shell re-open the Subagent page after the conversation switch lands on
		*   the child session).
		* @returns the main agent's topology tree, or the empty/error/loading states.
		*/
		function SubagentView(props) {
			const { sessionId, active, ctx, onOpenChild } = props;
			const sessions = ctx.sessions;
			const list = (0, react.useSyncExternalStore)((0, react.useMemo)(() => (callback) => sessions.list.subscribe(callback), [sessions]), (0, react.useCallback)(() => sessions.list.getSnapshot(), [sessions]));
			const byId = list.byId;
			const catalogs = (0, react.useMemo)(() => list.subagentsByParent ?? {}, [list.subagentsByParent]);
			const rootId = (0, react.useMemo)(() => rootAncestor(byId, sessionId), [byId, sessionId]);
			const rootCatalog = rootId === void 0 ? void 0 : catalogs[rootId];
			const rootSummary = rootId === void 0 ? void 0 : byId[rootId];
			const live = useSubagentLive(rootId, active);
			/** Catalog owners currently consuming live membership updates. */
			const observedRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			const observe = (0, react.useCallback)((parentSessionId, open) => {
				sessions.setSubagentCatalogOpen?.(parentSessionId, open);
				if (open) observedRef.current.add(parentSessionId);
				else observedRef.current.delete(parentSessionId);
			}, [sessions]);
			(0, react.useEffect)(() => {
				if (rootId === void 0 || !active) return;
				observe(rootId, true);
				return () => {
					for (const parentSessionId of observedRef.current) sessions.setSubagentCatalogOpen?.(parentSessionId, false);
					observedRef.current.clear();
				};
			}, [
				rootId,
				active,
				observe,
				sessions
			]);
			const branches = (0, react.useMemo)(() => collectBranchIds(catalogs, rootId), [catalogs, rootId]);
			(0, react.useEffect)(() => {
				if (!active) return;
				for (const id of branches) if (!observedRef.current.has(id)) observe(id, true);
			}, [
				branches,
				active,
				observe
			]);
			(0, react.useEffect)(() => () => {
				for (const parentSessionId of observedRef.current) sessions.setSubagentCatalogOpen?.(parentSessionId, false);
				observedRef.current.clear();
			}, [sessions]);
			const openChild = (0, react.useCallback)((address) => {
				onOpenChild?.(address);
				try {
					sessions.openSubagent?.(address);
				} catch (error) {
					console.error("[dsh-better-sidebar] openSubagent failed:", error);
				}
			}, [sessions, onOpenChild]);
			/** Jump back to the main agent (the topology root) from its node. */
			const openMain = (0, react.useCallback)(() => {
				if (rootId === void 0) return;
				try {
					sessions.open?.(rootId);
				} catch (error) {
					console.error("[dsh-better-sidebar] open session failed:", error);
				}
			}, [sessions, rootId]);
			const refresh = (0, react.useCallback)((parentSessionId) => {
				sessions.refreshSubagents?.(parentSessionId);
			}, [sessions]);
			const totals = (0, react.useMemo)(() => rootId === void 0 ? {
				count: 0,
				runningCount: 0
			} : countSubagentDescendants(byId, rootId), [byId, rootId]);
			const summaryBackedLoading = rootId !== void 0 && (rootCatalog === void 0 || rootCatalog.state === "ready" && rootCatalog.entries.length === 0) && directChildren(byId, rootId).length > 0;
			const readyEmpty = rootCatalog?.state === "ready" && rootCatalog.entries.length === 0 && directChildren(byId, rootId ?? "").length === 0;
			const countLabel = totals.count === 0 ? void 0 : totals.runningCount > 0 ? t("subagentCountRunning", {
				count: totals.count,
				running: totals.runningCount
			}) : t("subagentCount", { count: totals.count });
			/** Arrow-key tree navigation over the visible rows (official catalog recipe). */
			const bodyRef = (0, react.useRef)(null);
			const focusAt = (0, react.useCallback)((index) => {
				const items = bodyRef.current?.querySelectorAll("[role=\"treeitem\"]:not([aria-disabled=\"true\"])") ?? [];
				if (items.length === 0) return;
				items[(index + items.length) % items.length]?.focus();
			}, []);
			const onTreeKeyDown = (0, react.useCallback)((event) => {
				const items = bodyRef.current?.querySelectorAll("[role=\"treeitem\"]:not([aria-disabled=\"true\"])") ?? [];
				const index = Array.prototype.indexOf.call(items, document.activeElement);
				if (event.key === "ArrowDown") {
					event.preventDefault();
					focusAt(index + 1);
				} else if (event.key === "ArrowUp") {
					event.preventDefault();
					focusAt(index < 0 ? items.length - 1 : index - 1);
				} else if (event.key === "Home") {
					event.preventDefault();
					focusAt(0);
				} else if (event.key === "End") {
					event.preventDefault();
					focusAt(items.length - 1);
				}
			}, [focusAt]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SubagentView_module_css_default.subagent,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SubagentView_module_css_default.subagentHeader,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SubagentView_module_css_default.subagentTitle,
							children: [t("subagent"), rootSummary?.displayTitle !== void 0 && rootSummary.displayTitle !== "" ? ` · ${rootSummary.displayTitle}` : ""]
						}),
						countLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SubagentView_module_css_default.subagentCount,
							children: countLabel
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: SubagentView_module_css_default.subagentRefresh,
							"aria-label": t("refresh"),
							title: t("refresh"),
							disabled: rootId === void 0,
							onClick: () => {
								if (rootId !== void 0) refresh(rootId);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {})
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: bodyRef,
					className: SubagentView_module_css_default.subagentBody,
					onKeyDown: onTreeKeyDown,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "tree",
						"aria-label": t("subagent"),
						"aria-busy": summaryBackedLoading || void 0,
						children: [
							rootId !== void 0 && rootSummary !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "treeitem",
								tabIndex: 0,
								"aria-level": 0,
								"aria-label": `${rootSummary.displayTitle !== "" ? rootSummary.displayTitle : t("subagentMainAgent")} ${t("subagentMainAgent")}`,
								"aria-current": rootId === sessionId ? "true" : void 0,
								className: clsx(SubagentView_module_css_default.subagentRow, rootId === sessionId && SubagentView_module_css_default.subagentRowActive),
								onClick: openMain,
								onKeyDown: (event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										event.stopPropagation();
										openMain();
									}
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: rootSummary.running === true ? "ongoing" : "done",
									className: SubagentView_module_css_default.subagentDot
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SubagentView_module_css_default.subagentContent,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SubagentView_module_css_default.subagentLabel,
										children: rootSummary.displayTitle !== "" ? rootSummary.displayTitle : t("subagentMainAgent")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SubagentView_module_css_default.subagentSecondary,
										children: `${t("subagentMainAgent")} · ${rootSummary.running === true ? t("subagentRunning") : t("subagentInactive")}`
									})]
								})]
							}),
							rootId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SubagentView_module_css_default.subagentChildren,
								role: "group",
								"aria-busy": summaryBackedLoading || void 0,
								children: [summaryBackedLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogLoadingRows, {
									parentSessionId: rootId,
									byId,
									level: 1
								}), !summaryBackedLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CatalogRows, {
									parentSessionId: rootId,
									catalog: rootCatalog,
									catalogs,
									byId,
									level: 1,
									currentSessionId: sessionId,
									live,
									openChild,
									refresh
								})]
							}),
							readyEmpty && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SubagentView_module_css_default.subagentEmpty,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("subagentEmpty") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SubagentView_module_css_default.subagentEmptyHint,
									children: t("subagentEmptyDesc")
								})]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobsSection, {
						byId,
						jobsBySession: list.jobsBySession,
						rootId,
						active
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/sidechat-transcript.ts
		/** Compact token count the way the main conversation prints usage
		*  (517 / 12.2K / 1.2M — the host's own formatter is not exported). */
		function formatTokens(n) {
			const scaled = (v) => v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
			if (n < 1e3) return String(n);
			if (n < 1e6) return `${scaled(n / 1e3)}K`;
			return `${scaled(n / 1e6)}M`;
		}
		/** Compact duration the way the main conversation prints run times
		*  (45.2s / 2m42s — sub-minute keeps one decimal). */
		function formatDurationMs(ms) {
			const seconds = ms / 1e3;
			if (seconds < 60) return `${Math.round(seconds * 10) / 10}s`;
			const whole = Math.round(seconds);
			return `${Math.floor(whole / 60)}m${whole % 60}s`;
		}
		/** Extract the visible text of a content-block list (`text` blocks verbatim,
		*  joined by blank lines); empty reads `…` so rows never render blank. */
		function blockText(content) {
			const parts = [];
			for (const block of content) {
				if (block === null || typeof block !== "object") continue;
				const candidate = block;
				if (candidate.type === "text" && typeof candidate.text === "string") parts.push(candidate.text);
			}
			const text = parts.join("\n\n");
			return text === "" ? "…" : text;
		}
		/** Cap for a tool row's one-line argument summary (display only). */
		const ARGS_SUMMARY_MAX = 80;
		/** The most identifying argument keys, in priority order (bash's command,
		*  fs tools' paths, search's pattern, …). */
		const ARGS_SUMMARY_KEYS = [
			"command",
			"file_path",
			"path",
			"pattern",
			"query",
			"url",
			"prompt"
		];
		function flatTruncate(text) {
			const flat = text.replace(/\s+/g, " ").trim();
			return flat.length > ARGS_SUMMARY_MAX ? `${flat.slice(0, 79)}…` : flat;
		}
		/**
		* One-line summary of a tool call's raw arguments JSON for the collapsed
		* row: the first identifying string field when the JSON parses, else the
		* flattened raw text; empty when there is nothing worth showing.
		*/
		function toolArgsSummary(args) {
			if (args === void 0) return "";
			try {
				const parsed = JSON.parse(args);
				if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) for (const key of ARGS_SUMMARY_KEYS) {
					const value = parsed[key];
					if (typeof value === "string" && value.trim() !== "") return flatTruncate(value);
				}
			} catch {}
			return flatTruncate(args);
		}
		/** The plain text of a tool/result message (text blocks inside its
		*  `tool-result` content block). */
		function resultTextOf(data) {
			const content = data.message?.content;
			if (!Array.isArray(content)) return "";
			const parts = [];
			for (const block of content) {
				if (block === null || typeof block !== "object") continue;
				const candidate = block;
				if (candidate.type !== "tool-result") continue;
				const inner = candidate.content;
				if (!Array.isArray(inner)) continue;
				for (const item of inner) {
					if (item === null || typeof item !== "object") continue;
					const textItem = item;
					if (textItem.type === "text" && typeof textItem.text === "string") parts.push(textItem.text);
				}
			}
			return parts.join("\n");
		}
		/** Index of the last `session/end-seed` event (fork seed marker), or -1. */
		function lastSeedEnd(events) {
			for (let index = events.length - 1; index >= 0; index--) if (events[index]?.type === "session/end-seed") return index;
			return -1;
		}
		/** Parse the tool's raw arguments JSON to an object, or undefined. */
		function parseArgsObject(args) {
			if (args === void 0) return void 0;
			try {
				const parsed = JSON.parse(args);
				if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
				return parsed;
			} catch {
				return;
			}
		}
		/**
		* Call-time card from the raw `tool/call` arguments — the same literal cards
		* the host's own presenters derive before any result exists: bash shows the
		* command line (foreground only), edit/write show the literal replacement.
		* `read` has no call-time window (its structure only exists in the result).
		*/
		function callCard(name, args) {
			const parsed = parseArgsObject(args);
			if (parsed === void 0) return void 0;
			if (name === "bash") {
				const command = typeof parsed.command === "string" && parsed.command !== "" ? parsed.command : void 0;
				if (command === void 0 || parsed.run_in_background === true) return void 0;
				const cwd = typeof parsed.workdir === "string" && parsed.workdir !== "" ? parsed.workdir : void 0;
				return {
					type: "terminal",
					command,
					...cwd !== void 0 ? { cwd } : {}
				};
			}
			if (name === "edit" || name === "write") {
				const path = typeof parsed.file_path === "string" && parsed.file_path !== "" ? parsed.file_path : void 0;
				if (path === void 0) return void 0;
				if (name === "edit") {
					const oldText = typeof parsed.old_string === "string" ? parsed.old_string : "";
					const newText = typeof parsed.new_string === "string" ? parsed.new_string : "";
					return {
						type: "diff",
						diffs: [{
							path,
							oldText: oldText === "" ? null : oldText,
							newText
						}]
					};
				}
				return {
					type: "diff",
					diffs: [{
						path,
						oldText: null,
						newText: typeof parsed.content === "string" ? parsed.content : ""
					}]
				};
			}
		}
		/** The `tool/result` `meta` as an object, or undefined (opaque tool payload). */
		function metaObject(data) {
			const meta = data.meta;
			if (meta === null || typeof meta !== "object" || Array.isArray(meta)) return void 0;
			return meta;
		}
		/** Narrow edit/write's contextual-diff meta (`{ diffs: FileDiff[] }`) to
		*  DiffHunk[], declining on any malformed entry. */
		function diffCardFromMeta(meta) {
			const diffs = meta.diffs;
			if (!Array.isArray(diffs) || diffs.length === 0) return void 0;
			const hunks = [];
			for (const item of diffs) {
				if (item === null || typeof item !== "object" || Array.isArray(item)) return void 0;
				const { path, oldText, newText } = item;
				if (typeof path !== "string" || typeof newText !== "string") return void 0;
				if (oldText !== null && typeof oldText !== "string") return void 0;
				hunks.push({
					path,
					oldText,
					newText
				});
			}
			return {
				type: "diff",
				diffs: hunks
			};
		}
		/** Narrow read's line-window meta (`{ path, offset, lines, totalLines, lang? }`)
		*  to a read card, enforcing the same semantic contract the host does: 1-based
		*  strictly increasing line numbers that never exceed `totalLines`. */
		function readCardFromMeta(meta) {
			const { path, offset, lines, totalLines, lang } = meta;
			if (typeof path !== "string" || typeof offset !== "number" || typeof totalLines !== "number") return void 0;
			if (!Number.isInteger(offset) || offset < 1) return void 0;
			if (!Number.isInteger(totalLines) || totalLines < 0) return void 0;
			if (!Array.isArray(lines)) return void 0;
			const narrowed = [];
			let previous = offset - 1;
			for (const line of lines) {
				if (line === null || typeof line !== "object" || Array.isArray(line)) return void 0;
				const candidate = line;
				if (typeof candidate.number !== "number" || !Number.isInteger(candidate.number)) return void 0;
				if (candidate.number <= previous || candidate.number > totalLines) return void 0;
				if (typeof candidate.text !== "string") return void 0;
				narrowed.push({
					number: candidate.number,
					text: candidate.text
				});
				previous = candidate.number;
			}
			if (lang !== void 0 && typeof lang !== "string") return void 0;
			return {
				type: "read",
				label: path,
				lines: narrowed,
				totalLines,
				...lang !== void 0 ? { lang } : {}
			};
		}
		/** The bash result's trailing exit markers (`[exit code: N]` /
		*  `[killed by signal: X]` — the model-facing text the tool appends), stripped
		*  the same way the host's parseExitStatus recovers the exit pill. */
		const EXIT_SIGNAL_RE = /\n\[killed by signal: ([^\]\n]+)\]$/;
		const EXIT_CODE_RE = /\n\[exit code: (\d+)\]$/;
		/**
		* Result-time card refinement: `meta`-carrying structure wins (edit/write's
		* applied hunks, read's line window), bash's output gets its exit marker
		* stripped into the exit pill, and a failed result always falls back to the
		* generic row (the host's isError path renders generic output too).
		*/
		function resultCard(name, previous, data, resultText) {
			if (name === "bash") {
				if (previous === void 0 || previous.type !== "terminal" || resultText === "") return previous;
				const signal = EXIT_SIGNAL_RE.exec(resultText);
				if (signal?.[1] !== void 0) return {
					...previous,
					output: resultText.slice(0, signal.index),
					exitCode: void 0,
					signal: signal[1]
				};
				const exit = EXIT_CODE_RE.exec(resultText);
				if (exit?.[1] !== void 0) return {
					...previous,
					output: resultText.slice(0, exit.index),
					exitCode: Number(exit[1]),
					signal: void 0
				};
				return {
					...previous,
					output: resultText,
					exitCode: 0,
					signal: void 0
				};
			}
			const meta = metaObject(data);
			if (meta === void 0) return previous;
			if (name === "edit" || name === "write") return diffCardFromMeta(meta) ?? previous;
			if (name === "read") return readCardFromMeta(meta);
			return previous;
		}
		/**
		* Map a thread child's history rows onto compact transcript rows: the
		* inherited fork seed is cut at the last `session/end-seed`, context
		* injections map onto a collapsible injection row, `assistant/live-chunk`
		* deltas accumulate into streaming rows per (turn, step, block) and are
		* superseded by the assembled `assistant/message`, and tool invocations
		* render one expandable line each (arguments, paired result text, failure
		* marker; a still-executing call is marked until its result lands).
		* @param entries - history rows (event + host-computed view) in seq order,
		*   the live deltas of the in-flight attempt appended after the durable tail.
		* @returns display rows in log order.
		*/
		function transcriptRows(entries, prev) {
			const events = entries.map((entry) => entry.event);
			const seedEnd = lastSeedEnd(events);
			const rows = [];
			/** (turn, step, index, kind) key → index of its accumulating stream row. */
			const streamRows = /* @__PURE__ */ new Map();
			/** tool callId → index of its tool row in `rows` (result pairing). */
			const callRows = /* @__PURE__ */ new Map();
			/** turn → envelope time of its `turn/start` (turn-tail duration basis). */
			const turnStarts = /* @__PURE__ */ new Map();
			/** turn → usage aggregate: output accumulates across steps, input takes the
			*  last request's prompt size (earlier steps' input is mostly the same
			*  context re-sent, so summing would double-count). */
			const turnUsage = /* @__PURE__ */ new Map();
			for (let index = 0; index < events.length; index++) {
				if (index <= seedEnd) continue;
				const event = events[index];
				if (event === void 0) continue;
				const data = event.data;
				switch (event.type) {
					case "turn/start": {
						const turn = data.turn;
						if (typeof turn === "number" && Number.isInteger(turn)) turnStarts.set(turn, event.time);
						break;
					}
					case "turn/end": {
						const turn = data.turn;
						if (typeof turn !== "number" || !Number.isInteger(turn)) break;
						const start = turnStarts.get(turn);
						turnStarts.delete(turn);
						const usage = turnUsage.get(turn);
						turnUsage.delete(turn);
						const durationMs = start !== void 0 ? Math.max(0, event.time - start) : void 0;
						if (usage === void 0 && durationMs === void 0) break;
						rows.push({
							kind: "turnSummary",
							seq: event.seq,
							...usage !== void 0 ? {
								inputTokens: usage.inputTokens,
								outputTokens: usage.outputTokens
							} : {},
							...durationMs !== void 0 ? { durationMs } : {}
						});
						break;
					}
					case "user/message": {
						const text = blockText(Array.isArray(data.content) ? data.content : []);
						if (isContextInjectionMessage(data)) {
							if (data.source?.kind === "user" && text.startsWith(`${SIDE_BOUNDARY_PROMPT}\n\n`)) {
								rows.push({
									kind: "injection",
									seq: event.seq,
									text: SIDE_BOUNDARY_PROMPT
								});
								const body = text.slice(SIDE_BOUNDARY_PROMPT.length + 2);
								if (body !== "") rows.push({
									kind: "user",
									seq: event.seq,
									text: body
								});
								break;
							}
							rows.push({
								kind: "injection",
								seq: event.seq,
								text
							});
							break;
						}
						rows.push({
							kind: "user",
							seq: event.seq,
							text
						});
						break;
					}
					case "assistant/live-chunk": {
						const chunk = data.chunk;
						if (chunk === null || typeof chunk !== "object") break;
						const kind = chunk.type === "text-delta" ? "assistant" : chunk.type === "reasoning-delta" ? "reasoning" : null;
						if (kind === null || typeof chunk.text !== "string" || chunk.text === "") break;
						const turn = data.turn;
						const step = data.step;
						const blockIndex = chunk.index;
						const key = `${String(turn)}:${String(step)}:${String(blockIndex)}:${kind}`;
						const existing = streamRows.get(key);
						if (existing !== void 0) {
							const row = rows[existing];
							if (row !== void 0 && row.kind === kind && !row.settled) rows[existing] = {
								...row,
								text: row.text + chunk.text
							};
						} else {
							streamRows.set(key, rows.length);
							rows.push({
								kind,
								seq: event.seq,
								text: chunk.text,
								settled: false
							});
						}
						break;
					}
					case "assistant/message": {
						const usageTurn = data.turn;
						if (typeof usageTurn === "number" && Number.isInteger(usageTurn)) {
							const usage = data.usage;
							const input = typeof usage?.inputTokens === "number" ? usage.inputTokens : void 0;
							const output = typeof usage?.outputTokens === "number" ? usage.outputTokens : void 0;
							if (input !== void 0 && output !== void 0) {
								const aggregate = turnUsage.get(usageTurn);
								if (aggregate === void 0) turnUsage.set(usageTurn, {
									inputTokens: input,
									outputTokens: output
								});
								else turnUsage.set(usageTurn, {
									inputTokens: input,
									outputTokens: aggregate.outputTokens + output
								});
							}
						}
						const prefix = `${String(data.turn)}:${String(data.step)}:`;
						const streamed = [...streamRows.entries()].filter(([key]) => key.startsWith(prefix)).map(([, rowIndex]) => rowIndex);
						for (const key of [...streamRows.keys()]) if (key.startsWith(prefix)) streamRows.delete(key);
						const settled = (Array.isArray(data.message?.content) ? data.message.content : []).flatMap((block) => {
							if (block === null || typeof block !== "object") return [];
							const candidate = block;
							if (candidate.type === "reasoning" && typeof candidate.text === "string" && candidate.text !== "") return [{
								kind: "reasoning",
								seq: event.seq,
								text: candidate.text,
								settled: true
							}];
							if (candidate.type === "text" && typeof candidate.text === "string" && candidate.text !== "") return [{
								kind: "assistant",
								seq: event.seq,
								text: candidate.text,
								settled: true
							}];
							return [];
						});
						if (streamed.length === 0) rows.push(...settled);
						else rows.splice(Math.min(...streamed), streamed.length, ...settled);
						break;
					}
					case "tool/call": {
						const callId = data.callId;
						const name = typeof data.name === "string" ? data.name : "tool";
						const args = typeof data.arguments === "string" ? data.arguments : void 0;
						const card = callCard(name, args);
						const rowIndex = rows.length;
						if (typeof callId === "string") callRows.set(callId, rowIndex);
						rows.push({
							kind: "tool",
							seq: event.seq,
							name,
							failed: false,
							args,
							executing: true,
							...card !== void 0 ? { card } : {}
						});
						break;
					}
					case "tool/result": {
						const source = data.message;
						const callId = typeof source?.source?.callId === "string" ? source.source.callId : void 0;
						const rowIndex = callId === void 0 ? void 0 : callRows.get(callId);
						const failed = data.error !== void 0;
						const resultText = resultTextOf(data);
						if (rowIndex !== void 0) {
							const row = rows[rowIndex];
							if (row !== void 0 && row.kind === "tool") {
								const card = failed ? void 0 : resultCard(row.name, row.card, data, resultText);
								rows[rowIndex] = {
									...row,
									failed: row.failed || failed,
									resultText: resultText === "" ? row.resultText : resultText,
									executing: false,
									...card !== void 0 ? { card } : { card: void 0 }
								};
							}
						} else if (failed || resultText !== "") rows.push({
							kind: "tool",
							seq: event.seq,
							name: callId === void 0 ? "tool" : `tool:${callId.slice(0, 8)}`,
							failed,
							resultText: resultText === "" ? void 0 : resultText
						});
						break;
					}
				}
			}
			return reuseRows(rows, prev);
		}
		/** Whether two rows carry identical display content (identity fields plus
		*  every rendered field of their kind). */
		function rowsEqual(a, b) {
			if (a.kind !== b.kind || a.seq !== b.seq) return false;
			switch (a.kind) {
				case "user":
				case "injection": {
					const other = b;
					return a.text === other.text;
				}
				case "assistant":
				case "reasoning": {
					const other = b;
					return a.text === other.text && a.settled === other.settled;
				}
				case "tool": {
					const other = b;
					return a.name === other.name && a.failed === other.failed && a.args === other.args && a.resultText === other.resultText && a.executing === other.executing;
				}
				case "turnSummary": {
					const other = b;
					return a.inputTokens === other.inputTokens && a.outputTokens === other.outputTokens && a.durationMs === other.durationMs;
				}
			}
		}
		/** Re-adopt the PREVIOUS poll's row objects wherever the content is
		*  unchanged (position-aligned, append-mostly): settled rows keep their
		*  object identity across the 2s polls, so React's reconciler and the
		*  markdown/DOMPurify caches downstream skip them instead of re-rendering
		*  the whole transcript every poll. Comparing the strings is far cheaper
		*  than what a fresh reference costs the row below. Rows past the first
		*  mismatch (an inserted/superseded streaming row) rebuild as usual — that
		*  is exactly the changed tail. */
		function reuseRows(rows, prev) {
			if (prev === void 0) return rows;
			const shared = Math.min(rows.length, prev.length);
			for (let index = 0; index < shared; index++) {
				const before = prev[index];
				const after = rows[index];
				if (before === void 0 || after === void 0) continue;
				if (rowsEqual(before, after)) rows[index] = before;
			}
			return rows;
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/DSH-better-sidebar/DSH-better-sidebar/src/client/SideChatView.module.css.mjs
		const css$1 = "._4BEzFa_sidechat{flex-direction:column;flex:1;min-height:0;display:flex}._4BEzFa_sidechatDetailHeader{border-bottom:1px solid var(--dsw-alias-hairline);flex:none;align-items:center;gap:4px;min-height:36px;padding:4px 8px 4px 12px;display:flex}._4BEzFa_sidechatHeaderDot{flex:none}._4BEzFa_sidechatHeaderSpacer{flex:1;min-width:0}._4BEzFa_sidechatAgentBadge{border:1px solid var(--dsw-alias-hairline);max-width:55%;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;border-radius:999px;flex:none;padding:1px 8px;overflow:hidden}._4BEzFa_sidechatIconBtn{width:26px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;transition:background-color .1s ease-out,color .1s ease-out;display:inline-flex}._4BEzFa_sidechatIconBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._4BEzFa_sidechatIconBtn:disabled{opacity:.4;cursor:default}._4BEzFa_sidechatHero{min-height:0;color:var(--dsw-alias-label-tertiary);text-align:center;flex-direction:column;flex:1;justify-content:center;align-items:center;gap:8px;padding:24px 20px;animation:.2s ease-out _4BEzFa_sidechatFadeIn;display:flex}._4BEzFa_sidechatHeroTitle{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);font-weight:500}._4BEzFa_sidechatHeroDesc{max-width:300px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);line-height:1.6}._4BEzFa_sidechatPrimaryBtn{background:var(--dsw-alias-button-info-fill,var(--dsw-alias-accent));color:var(--dsw-alias-button-info-label,var(--dsw-alias-accent-ink,#fff));font:var(--dsw-font-s-13);cursor:pointer;border:none;border-radius:999px;flex:none;margin-top:4px;padding:6px 14px;transition:opacity .1s ease-out}._4BEzFa_sidechatPrimaryBtn:hover:not(:disabled){opacity:.88}._4BEzFa_sidechatPrimaryBtn:disabled{opacity:.4;cursor:default}._4BEzFa_sidechatHint{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);flex:none;padding:4px 12px}._4BEzFa_sidechatError{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-danger);flex:none;padding:4px 12px}._4BEzFa_sidechatScroll{flex-direction:column;flex:1;gap:10px;min-height:0;padding:10px 12px;display:flex;overflow-y:auto}._4BEzFa_sidechatScroll>*{animation:.18s ease-out _4BEzFa_sidechatRowIn}._4BEzFa_sidechatUser{background:var(--dsw-specific-bubble,var(--dsw-alias-bg-base));max-width:88%;font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;border-radius:18px;align-self:flex-end;padding:8px 14px}._4BEzFa_sidechatAssistant{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;align-self:stretch}._4BEzFa_sidechatRow{align-self:stretch}._4BEzFa_sidechatRowLine{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);align-items:center;gap:6px;padding:1px 0;display:flex}._4BEzFa_sidechatRowSummary{cursor:pointer;user-select:none;list-style:none}._4BEzFa_sidechatRowSummary::-webkit-details-marker{display:none}._4BEzFa_sidechatRowSummary:hover{color:var(--dsw-alias-label-secondary)}._4BEzFa_sidechatRowStatic{cursor:default}._4BEzFa_sidechatRowChevron{flex:none;align-items:center;transition:transform .1s ease-out;display:inline-flex}._4BEzFa_sidechatRow[open] ._4BEzFa_sidechatRowChevron{transform:rotate(90deg)}._4BEzFa_sidechatRowIcon{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}._4BEzFa_sidechatRowLabel{text-overflow:ellipsis;white-space:nowrap;max-width:60%;color:var(--dsw-alias-label-secondary);flex:none;overflow:hidden}._4BEzFa_sidechatRowMono{font-family:var(--dsw-font-mono)}._4BEzFa_sidechatRowMeta{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--dsw-font-mono);color:var(--dsw-alias-label-tertiary);flex:1;overflow:hidden}._4BEzFa_sidechatRowFailed ._4BEzFa_sidechatRowLabel,._4BEzFa_sidechatRowFailed ._4BEzFa_sidechatRowMeta{color:var(--dsw-alias-danger)}._4BEzFa_sidechatRowBody{border-left:1px solid var(--dsw-alias-hairline);margin:2px 0 4px 7px;padding:2px 0 2px 10px}._4BEzFa_sidechatRowProse{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow-y:auto}._4BEzFa_sidechatRowCode{font:var(--dsw-font-xxs-12);font-family:var(--dsw-font-mono);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;margin:0;padding:4px 0;overflow-y:auto}._4BEzFa_sidechatRowCode+._4BEzFa_sidechatRowCode{border-top:1px solid var(--dsw-alias-hairline)}._4BEzFa_sidechatRowBody>*{margin-top:2px}._4BEzFa_sidechatTurnSummary{max-width:88%;font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);user-select:none;align-self:flex-end;padding:0 2px}._4BEzFa_sidechatShimmerText{background-image:linear-gradient(90deg, var(--dsw-alias-label-tertiary) 0%, var(--dsw-alias-label-primary) 50%, var(--dsw-alias-label-tertiary) 100%);color:#0000;background-size:200% 100%;-webkit-background-clip:text;background-clip:text;animation:2.6s linear infinite _4BEzFa_sidechatSweep}._4BEzFa_sidechatStatus{flex:none;align-items:center;gap:8px;padding:2px 14px 6px;animation:.16s ease-out _4BEzFa_sidechatFadeIn;display:flex}._4BEzFa_sidechatStatusText{font:var(--dsw-font-xxs-12);background-image:linear-gradient(90deg, var(--dsw-alias-label-tertiary) 0%, var(--dsw-alias-label-primary) 50%, var(--dsw-alias-label-tertiary) 100%);color:#0000;background-size:200% 100%;-webkit-background-clip:text;background-clip:text;animation:2.6s linear infinite _4BEzFa_sidechatSweep}._4BEzFa_sidechatComposer{border:1px solid var(--dsw-alias-border-l2-darkmode-thin,var(--dsw-alias-hairline));background:var(--dsw-specific-input-major,var(--dsw-alias-bg-base));box-shadow:var(--dsw-shadow-lv2,none);border-radius:16px;flex-direction:column;flex:none;gap:4px;margin:0 8px 8px;padding:8px 8px 6px 14px;display:flex}._4BEzFa_sidechatComposerInput{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-primary);font:var(--dsw-font-s-14);resize:none;background:0 0;border:none;outline:none;max-height:132px;padding:2px 0;line-height:22px}._4BEzFa_sidechatComposerInput::placeholder{color:var(--dsw-alias-label-tertiary)}._4BEzFa_sidechatComposerBar{flex:none;align-items:center;gap:8px;min-height:28px;display:flex}._4BEzFa_sidechatComposerMeta{min-width:0;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}._4BEzFa_sidechatSendBtn{background:var(--dsw-alias-button-info-fill,var(--dsw-alias-accent));width:28px;height:28px;color:var(--dsw-alias-button-info-label,var(--dsw-alias-accent-ink,#fff));cursor:pointer;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;transition:opacity .1s ease-out;animation:.12s ease-out _4BEzFa_sidechatBtnIn;display:inline-flex}._4BEzFa_sidechatSendBtn:hover:not(:disabled){opacity:.88}._4BEzFa_sidechatSendBtn:disabled{opacity:.35;cursor:default}@keyframes _4BEzFa_sidechatRowIn{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes _4BEzFa_sidechatFadeIn{0%{opacity:0}to{opacity:1}}@keyframes _4BEzFa_sidechatBtnIn{0%{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}@keyframes _4BEzFa_sidechatSweep{0%{background-position:200% 0}to{background-position:-200% 0}}@media (prefers-reduced-motion:reduce){._4BEzFa_sidechatScroll>*,._4BEzFa_sidechatHero,._4BEzFa_sidechatStatus,._4BEzFa_sidechatSendBtn{animation:none}._4BEzFa_sidechatStatusText,._4BEzFa_sidechatShimmerText{color:var(--dsw-alias-label-tertiary);background-image:none;animation:none}._4BEzFa_sidechatRowChevron{transition:none}}";
		const tagId$1 = "dsh-better-sidebar/SideChatView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-better-sidebar";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var SideChatView_module_css_default = {
			"sidechatPrimaryBtn": "_4BEzFa_sidechatPrimaryBtn",
			"sidechatRowLine": "_4BEzFa_sidechatRowLine",
			"sidechatBtnIn": "_4BEzFa_sidechatBtnIn",
			"sidechatError": "_4BEzFa_sidechatError",
			"sidechatUser": "_4BEzFa_sidechatUser",
			"sidechatRowBody": "_4BEzFa_sidechatRowBody",
			"sidechatRowProse": "_4BEzFa_sidechatRowProse",
			"sidechatHeroDesc": "_4BEzFa_sidechatHeroDesc",
			"sidechatRowSummary": "_4BEzFa_sidechatRowSummary",
			"sidechatStatusText": "_4BEzFa_sidechatStatusText",
			"sidechatComposerBar": "_4BEzFa_sidechatComposerBar",
			"sidechatStatus": "_4BEzFa_sidechatStatus",
			"sidechatHint": "_4BEzFa_sidechatHint",
			"sidechatComposerInput": "_4BEzFa_sidechatComposerInput",
			"sidechatSweep": "_4BEzFa_sidechatSweep",
			"sidechatHero": "_4BEzFa_sidechatHero",
			"sidechatScroll": "_4BEzFa_sidechatScroll",
			"sidechatTurnSummary": "_4BEzFa_sidechatTurnSummary",
			"sidechatRowIn": "_4BEzFa_sidechatRowIn",
			"sidechatAssistant": "_4BEzFa_sidechatAssistant",
			"sidechatHeaderSpacer": "_4BEzFa_sidechatHeaderSpacer",
			"sidechat": "_4BEzFa_sidechat",
			"sidechatRowIcon": "_4BEzFa_sidechatRowIcon",
			"sidechatRowFailed": "_4BEzFa_sidechatRowFailed",
			"sidechatRow": "_4BEzFa_sidechatRow",
			"sidechatHeroTitle": "_4BEzFa_sidechatHeroTitle",
			"sidechatRowCode": "_4BEzFa_sidechatRowCode",
			"sidechatHeaderDot": "_4BEzFa_sidechatHeaderDot",
			"sidechatFadeIn": "_4BEzFa_sidechatFadeIn",
			"sidechatComposer": "_4BEzFa_sidechatComposer",
			"sidechatAgentBadge": "_4BEzFa_sidechatAgentBadge",
			"sidechatComposerMeta": "_4BEzFa_sidechatComposerMeta",
			"sidechatRowChevron": "_4BEzFa_sidechatRowChevron",
			"sidechatRowLabel": "_4BEzFa_sidechatRowLabel",
			"sidechatDetailHeader": "_4BEzFa_sidechatDetailHeader",
			"sidechatSendBtn": "_4BEzFa_sidechatSendBtn",
			"sidechatShimmerText": "_4BEzFa_sidechatShimmerText",
			"sidechatRowMono": "_4BEzFa_sidechatRowMono",
			"sidechatIconBtn": "_4BEzFa_sidechatIconBtn",
			"sidechatRowMeta": "_4BEzFa_sidechatRowMeta",
			"sidechatRowStatic": "_4BEzFa_sidechatRowStatic"
		};
		//#endregion
		//#region src/client/SideChatView.tsx
		/**
		* Side Chat page: Codex-style side conversations for the current session.
		*
		* EVERY side conversation is its own sidebar tab (侧边对话1/2/3 …): the
		* descriptor's createTab mints a fresh tab flagged `autoCreate` and this
		* view creates the EMPTY thread on mount (one click = one conversation,
		* exactly like the Codex app); the composer owns the first message (the
		* host wraps it with the side boundary + the in-progress snapshot parked
		* at creation, and the thread earns its real label — and the tab its
		* title — from that first message). Closing the tab releases the thread's
		* live agent (its history stays persisted); the header menu reopens any
		* existing thread into a tab (deduped by threadId).
		*
		* Each side thread is a child session the plugin created itself with a
		* custom seed (the parent's full log up to the click moment — see
		* sidechat-core.ts). Transport: EVERY thread operation — creation,
		* follow-up, cancel, dispose, info, and the transcript itself — goes
		* through the plugin's own /sidebar/api sidechat.* routes (subagent-origin
		* identities are fenced from the generic session RPCs, and DSH
		* 0.1.2-alpha.1's Remote-gateway migration removed the client
		* session-history face the transcript used to poll). The transcript route
		* cuts the inherited seed host-side and answers afterSeq deltas; the
		* mapping (boundary row dropped, chunk streaming accumulated) lives in
		* sidechat-transcript.ts.
		*/
		/** Poll cadence while the selected thread is running and the tab visible. */
		const POLL_MS = 2e3;
		/** Textarea auto-grow ceiling (px) — the composer scrolls beyond it. */
		const COMPOSER_MAX_HEIGHT = 132;
		/** The thread a tab is bound to (durable in tab.meta across refreshes). */
		function sidechatThreadIdOf(tab) {
			const meta = tab.meta;
			return typeof meta?.threadId === "string" ? meta.threadId : void 0;
		}
		/** The parked reopen target consumed by the descriptor's createTab (the
		*  service's createTab receives no seed, so a thread-switch parks the id
		*  here and openTab picks it up synchronously — exactly one consume per
		*  park). */
		let parkedReopen;
		/** Park a thread id for the NEXT sidechat openTab to reattach. */
		function parkSidechatReopen(threadId) {
			parkedReopen = threadId;
		}
		/** Consume the parked reopen target (undefined = mint a fresh thread tab). */
		function consumeSidechatSeed() {
			const value = parkedReopen;
			parkedReopen = void 0;
			return value;
		}
		/** In-flight thread creations keyed by tab id (double-mount guard: React
		*  StrictMode / HMR must not mint two threads for one tab). */
		const inFlightStarts = /* @__PURE__ */ new Set();
		/** Merge history entries by event seq (newest wins), log order preserved. */
		function mergeBySeq(previous, incoming) {
			const bySeq = /* @__PURE__ */ new Map();
			for (const entry of previous) bySeq.set(entry.event.seq, entry);
			for (const entry of incoming) bySeq.set(entry.event.seq, entry);
			return [...bySeq.values()].sort((a, b) => a.event.seq - b.event.seq);
		}
		/** The display title of a thread: the durable label minus the 'Side: '
		*  prefix, with the fresh-thread placeholder localized. */
		function threadDisplayTitle(title) {
			if (title === "Side: New thread") return t("sideChatUntitled");
			return title.startsWith("Side: ") ? title.slice(6) : title;
		}
		/**
		* One collapsible context row — the shared Codex-style chrome of tool
		* calls, thinking and context injections: a single quiet line (chevron +
		* label + one-line summary) that expands into an indented body hung on a
		* hairline thread. Rows with nothing to reveal render as a static line.
		*/
		function CollapsibleRow(props) {
			const leading = props.icon === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SideChatView_module_css_default.sidechatRowIcon,
				children: props.icon
			});
			const label = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: clsx(SideChatView_module_css_default.sidechatRowLabel, props.mono === true && SideChatView_module_css_default.sidechatRowMono, props.streaming === true && SideChatView_module_css_default.sidechatShimmerText),
				children: props.label
			});
			const meta = props.meta !== void 0 && props.meta !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SideChatView_module_css_default.sidechatRowMeta,
				children: props.meta
			}) : null;
			if (props.children === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(SideChatView_module_css_default.sidechatRowLine, SideChatView_module_css_default.sidechatRowStatic, props.failed === true && SideChatView_module_css_default.sidechatRowFailed),
				children: [
					leading,
					label,
					meta
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				className: SideChatView_module_css_default.sidechatRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
					className: clsx(SideChatView_module_css_default.sidechatRowLine, SideChatView_module_css_default.sidechatRowSummary, props.failed === true && SideChatView_module_css_default.sidechatRowFailed),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideChatView_module_css_default.sidechatRowChevron,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 })
						}),
						leading,
						label,
						meta
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SideChatView_module_css_default.sidechatRowBody,
					children: props.children
				})]
			});
		}
		/** The host Block body for a structured tool card (main-conversation atoms:
		*  terminal surface, diff hunks, line-numbered read window). */
		function toolCardBody(card, executing, labels) {
			if (card.type === "terminal") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.TerminalBlock, {
				command: card.command,
				cwd: card.cwd,
				output: card.output,
				exitCode: card.exitCode,
				signal: card.signal,
				running: executing,
				labels: labels.terminal
			});
			if (card.type === "diff") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DiffBlock, {
				diffs: card.diffs,
				labels: labels.diff
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.ReadBlock, {
				label: card.label,
				lines: card.lines,
				totalLines: card.totalLines,
				lang: card.lang,
				labels: labels.read
			});
		}
		/** The tool row's 16px leading slot, the way the main conversation draws it
		*  (GenericToolCard's variant table): the tool-kind glyph at 14, replaced by
		*  an error StateDot on failed rows. */
		function toolLeading(name, failed) {
			if (failed) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" });
			switch (name) {
				case "bash":
				case "pwsh": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 14 });
				case "read":
				case "web_fetch": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 });
				case "edit":
				case "write": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 });
				case "grep":
				case "glob":
				case "web_search": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 });
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 });
			}
		}
		/** One row renderer (React keys ride the source event seq). */
		function renderRow(row, labels) {
			switch (row.kind) {
				case "user": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SideChatView_module_css_default.sidechatUser,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { ...markdownTextProps(row.text, labels) })
				}, `${row.kind}:${row.seq}`);
				case "assistant": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SideChatView_module_css_default.sidechatAssistant,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { ...markdownTextProps(row.text, labels) })
				}, `${row.kind}:${row.seq}`);
				case "reasoning": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollapsibleRow, {
					label: labels.thinkLabel,
					streaming: !row.settled,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideChatView_module_css_default.sidechatRowProse,
						children: row.text
					})
				}, `${row.kind}:${row.seq}`);
				case "injection": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollapsibleRow, {
					label: labels.injectionLabel,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideChatView_module_css_default.sidechatRowProse,
						children: row.text
					})
				}, `${row.kind}:${row.seq}`);
				case "turnSummary": {
					const parts = [];
					if (row.inputTokens !== void 0 && row.outputTokens !== void 0) parts.push(t("sideChatTurnUsage", {
						input: formatTokens(row.inputTokens),
						output: formatTokens(row.outputTokens)
					}));
					if (row.durationMs !== void 0) parts.push(formatDurationMs(row.durationMs));
					if (parts.length === 0) return null;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideChatView_module_css_default.sidechatTurnSummary,
						children: parts.join(" · ")
					}, `${row.kind}:${row.seq}`);
				}
				case "tool": {
					const body = row.card !== void 0 ? toolCardBody(row.card, row.executing === true, labels) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [row.args !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: SideChatView_module_css_default.sidechatRowCode,
						children: row.args
					}), row.resultText !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: SideChatView_module_css_default.sidechatRowCode,
						children: row.resultText
					})] });
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollapsibleRow, {
						label: row.name,
						meta: toolArgsSummary(row.args),
						icon: toolLeading(row.name, row.failed),
						mono: true,
						streaming: row.executing === true,
						failed: row.failed,
						...row.args === void 0 && row.resultText === void 0 && row.card === void 0 ? {} : { children: body }
					}, `${row.kind}:${row.seq}`);
				}
			}
		}
		/** One side conversation tab (one thread per tab, Codex-style). */
		function SideChatView(props) {
			const { ctx, scope, tab, visible } = props;
			const rowLabels = (0, react.useMemo)(() => {
				const shared = {
					copy: t("copy"),
					copied: t("copied"),
					collapse: t("sideChatBlockCollapse"),
					collapseAria: t("sideChatBlockCollapseAria"),
					expand: (hidden) => t("sideChatBlockExpand", { hidden }),
					expandAria: (hidden) => t("sideChatBlockExpandAria", { hidden })
				};
				return {
					copyLabel: t("copy"),
					copiedLabel: t("copied"),
					thinkLabel: t("sideChatThink"),
					injectionLabel: t("sideChatInjection"),
					terminal: {
						...shared,
						signal: (signal) => t("sideChatBlockSignal", { signal }),
						exitCode: (exitCode) => t("sideChatBlockExitCode", { code: exitCode }),
						running: t("sideChatBlockRunning"),
						failed: t("sideChatBlockFailed"),
						done: t("sideChatBlockDone"),
						noOutput: t("sideChatBlockNoOutput")
					},
					diff: {
						...shared,
						files: (count) => t("sideChatBlockFiles", { count })
					},
					read: {
						...shared,
						window: (shown, total) => t("sideChatBlockWindow", {
							shown,
							total
						})
					}
				};
			}, []);
			const list = (0, react.useSyncExternalStore)((0, react.useMemo)(() => (callback) => ctx.sessions.list.subscribe(callback), [ctx]), (0, react.useCallback)(() => ctx.sessions.list.getSnapshot(), [ctx]));
			const threads = (0, react.useMemo)(() => sideThreadRows(list.byId, scope.sessionId), [list, scope.sessionId]);
			const threadId = sidechatThreadIdOf(tab);
			const autoCreate = tab.meta?.autoCreate === true;
			const [composer, setComposer] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [saved, setSaved] = (0, react.useState)(false);
			const [revision, setRevision] = (0, react.useState)(0);
			const [info, setInfo] = (0, react.useState)(null);
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const cacheRef = (0, react.useRef)({
				entries: [],
				live: []
			});
			const prevRowsRef = (0, react.useRef)([]);
			const controllerRef = (0, react.useRef)(null);
			const scrollRef = (0, react.useRef)(null);
			const composerRef = (0, react.useRef)(null);
			const summary = threadId === void 0 ? void 0 : list.byId[threadId];
			const running = summary?.running === true;
			const connectionState = (0, react.useSyncExternalStore)((0, react.useMemo)(() => (callback) => ctx.connection?.state.subscribe(callback) ?? (() => {}), [ctx]), (0, react.useCallback)(() => ctx.connection?.state.getSnapshot(), [ctx]));
			/** The agent-identity badge of the thread header (preset · model). */
			const agentBadge = (0, react.useMemo)(() => {
				if (info === null) return "";
				return [info.preset, info.model ?? info.provider].filter(Boolean).join(" · ");
			}, [info]);
			/** Create this tab's thread (immediate-create tabs and hero retries). */
			const startThread = (0, react.useCallback)(async () => {
				if (inFlightStarts.has(tab.id)) return;
				inFlightStarts.add(tab.id);
				setBusy("starting");
				setError(null);
				try {
					const { childId } = await api.sidechatStart(scope.sessionId);
					ctx.get("betterSidebar")?.updateTab(tab.id, { meta: { threadId: childId } });
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					inFlightStarts.delete(tab.id);
					setBusy(null);
				}
			}, [
				ctx,
				scope.sessionId,
				tab.id
			]);
			(0, react.useEffect)(() => {
				if (threadId !== void 0 || !autoCreate || !visible) return;
				startThread();
			}, [
				threadId,
				autoCreate,
				visible,
				startThread
			]);
			(0, react.useEffect)(() => {
				const display = summary?.displayTitle;
				if (display === void 0) return;
				const title = threadDisplayTitle(display);
				if (title !== "" && title !== tab.title) try {
					ctx.get("betterSidebar")?.updateTab(tab.id, { title });
				} catch {}
			}, [
				summary,
				tab.id,
				tab.title,
				ctx
			]);
			/** One transcript pull: the thread's own events beyond the cached tail
			*  (first attach = the whole seed-cut slice; polls = afterSeq deltas),
			*  merged by seq. */
			const fetchThread = (0, react.useCallback)(async (childId) => {
				controllerRef.current?.abort();
				const controller = new AbortController();
				controllerRef.current = controller;
				try {
					const cache = cacheRef.current;
					const afterSeq = cache.entries.at(-1)?.event.seq;
					const { events, live } = await api.sidechatEvents(childId, afterSeq, controller.signal);
					cache.live = live ?? [];
					if (events.length > 0) {
						const incoming = events.map((event) => ({ event }));
						cache.entries = mergeBySeq(cache.entries, incoming);
					}
					setRevision((value) => value + 1);
				} catch {}
			}, []);
			/** The thread header badge pull (live state + preset/model identity). */
			const fetchInfo = (0, react.useCallback)(async (childId) => {
				try {
					setInfo(await api.sidechatInfo(childId));
				} catch {}
			}, []);
			(0, react.useEffect)(() => {
				cacheRef.current = {
					entries: [],
					live: []
				};
				prevRowsRef.current = [];
				controllerRef.current?.abort();
				setError(null);
				setSaved(false);
				setInfo(null);
				if (threadId !== void 0) {
					fetchInfo(threadId);
					window.setTimeout(() => composerRef.current?.focus(), 0);
				}
			}, [threadId, fetchInfo]);
			(0, react.useEffect)(() => {
				if (!visible || threadId === void 0) return;
				fetchThread(threadId);
			}, [
				visible,
				threadId,
				running,
				fetchThread
			]);
			const pollTick = (0, react.useCallback)(async () => {
				if (threadId === void 0) return;
				fetchThread(threadId);
				fetchInfo(threadId);
			}, [
				threadId,
				fetchThread,
				fetchInfo
			]);
			usePolling(visible && running && threadId !== void 0, pollTick, { intervalMs: POLL_MS });
			(0, react.useEffect)(() => () => {
				controllerRef.current?.abort();
			}, []);
			const prevConnectionRef = (0, react.useRef)(connectionState);
			(0, react.useEffect)(() => {
				const previous = prevConnectionRef.current;
				prevConnectionRef.current = connectionState;
				if (previous === "disconnected" && connectionState === "connected" && threadId !== void 0) {
					fetchThread(threadId);
					fetchInfo(threadId);
				}
			}, [
				connectionState,
				threadId,
				fetchThread,
				fetchInfo
			]);
			const rows = (0, react.useMemo)(() => {
				const cache = cacheRef.current;
				const settled = new Set(cache.entries.filter((entry) => entry.event.type === "assistant/message").map((entry) => {
					const data = entry.event.data;
					return `${String(data.turn)}:${String(data.step)}`;
				}));
				const live = cache.live.filter((event) => !settled.has(`${String(event.data.turn)}:${String(event.data.step)}`)).map((event) => ({ event }));
				const next = threadId === void 0 ? [] : transcriptRows([...cache.entries, ...live], prevRowsRef.current);
				prevRowsRef.current = next;
				return next;
			}, [threadId, revision]);
			const canSave = threadId !== void 0 && threadHasCompletedTurn(cacheRef.current.entries);
			const trailingPending = threadId !== void 0 && threadTrailingPending(cacheRef.current.entries);
			const freshThread = threadId !== void 0 && rows.length === 0;
			(0, react.useEffect)(() => {
				const scroller = scrollRef.current;
				if (scroller === null) return;
				scroller.scrollTop = scroller.scrollHeight;
			}, [rows.length, threadId]);
			/** Open a NEW thread tab (createTab mints the autoCreate tab; its view
			*  creates the thread on mount). */
			const openNewThread = () => {
				setMenuOpen(false);
				ctx.get("betterSidebar")?.openTab({ type: "sidechat" }, scope);
			};
			/** Switch to an existing thread: parked for createTab, deduped to the
			*  already-open tab when there is one. */
			const openExistingThread = (id) => {
				setMenuOpen(false);
				if (id === threadId) return;
				parkSidechatReopen(id);
				ctx.get("betterSidebar")?.openTab({ type: "sidechat" }, scope);
			};
			const menuItems = (0, react.useMemo)(() => {
				const items = [{
					id: "$new",
					label: t("sideChatNew"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
				}];
				if (threads.length > 0) {
					items.push({
						type: "separator",
						id: "$sep"
					});
					for (const row of threads) items.push({
						id: row.id,
						label: threadDisplayTitle(row.title),
						...row.running ? { icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
							state: "ongoing",
							size: 8
						}) } : {}
					});
				}
				return items;
			}, [threads]);
			const growComposer = () => {
				const field = composerRef.current;
				if (field === null) return;
				field.style.height = "0px";
				field.style.height = `${Math.min(field.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
			};
			const handleSend = async () => {
				const text = composer.trim();
				if (text === "" || threadId === void 0 || busy !== null) return;
				setBusy("sending");
				setError(null);
				try {
					await api.sidechatPrompt(threadId, text);
					setComposer("");
					const field = composerRef.current;
					if (field !== null) field.style.height = "";
					fetchThread(threadId);
					fetchInfo(threadId);
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setBusy(null);
				}
			};
			const handleCancel = async () => {
				if (threadId === void 0 || busy !== null) return;
				try {
					await api.sidechatCancel(threadId);
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				}
			};
			const handleSave = async () => {
				if (threadId === void 0 || !canSave || busy !== null) return;
				setBusy("saving");
				setError(null);
				setSaved(false);
				try {
					if (ctx.sessions.fork === void 0) throw new Error("session fork is unavailable");
					const newId = await ctx.sessions.fork({
						sessionId: threadId,
						increaseTitle: true
					});
					const title = summary === void 0 ? "" : threadDisplayTitle(summary.displayTitle).trim();
					const binding = ctx.sessions.binding?.(newId);
					if (binding !== void 0 && title !== "") await binding.session.rename(title);
					ctx.sessions.open?.(newId);
					setSaved(true);
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setBusy(null);
				}
			};
			if (threadId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SideChatView_module_css_default.sidechat,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SideChatView_module_css_default.sidechatHero,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: clsx(SideChatView_module_css_default.sidechatHeroTitle, busy === "starting" && SideChatView_module_css_default.sidechatShimmerText),
							children: busy === "starting" ? t("sideChatCreating") : t("sideChatEmpty")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SideChatView_module_css_default.sidechatHeroDesc,
							children: t("sideChatEmptyDesc")
						}),
						error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SideChatView_module_css_default.sidechatError,
							children: t("sideChatError", { message: error })
						}),
						busy !== "starting" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: SideChatView_module_css_default.sidechatPrimaryBtn,
							onClick: () => void startThread(),
							children: error === null ? t("sideChatNew") : t("sideChatRetry")
						})
					]
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideChatView_module_css_default.sidechat,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideChatView_module_css_default.sidechatDetailHeader,
						children: [
							running && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: "ongoing",
								size: 8,
								className: SideChatView_module_css_default.sidechatHeaderDot
							}),
							agentBadge !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideChatView_module_css_default.sidechatAgentBadge,
								children: agentBadge
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SideChatView_module_css_default.sidechatHeaderSpacer }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: menuOpen,
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SideChatView_module_css_default.sidechatIconBtn,
									onClick: () => {
										setMenuOpen((value) => !value);
									},
									title: t("sideChatThreads"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconHistoryOutline16, {})
								}),
								items: menuItems,
								selectedId: threadId,
								onSelect: (id) => {
									if (id === "$new") openNewThread();
									else openExistingThread(id);
								},
								onClose: () => {
									setMenuOpen(false);
								},
								align: "end",
								portal: true,
								dense: true
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SideChatView_module_css_default.sidechatIconBtn,
								onClick: () => void handleSave(),
								disabled: !canSave || busy !== null,
								title: `${t("sideChatSave")} — ${t("sideChatSaveTitle")}`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconSaveOutline16, {})
							})
						]
					}),
					connectionState !== void 0 && connectionState !== "connected" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.ConnectionIndicator, {
						state: connectionState,
						disconnectedLabel: t("sideChatConnDisconnected"),
						reconnectLabel: t("sideChatConnReconnect"),
						connectingLabel: t("sideChatConnConnecting"),
						recoveredLabel: t("sideChatConnRecovered"),
						reconnectActionLabel: t("sideChatConnReconnectAction"),
						restartActionLabel: t("sideChatConnRestartAction"),
						onReconnect: () => {
							ctx.connection?.reconnect();
						}
					}),
					!canSave && !freshThread && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideChatView_module_css_default.sidechatHint,
						children: t("sideChatNoTurn")
					}),
					canSave && trailingPending && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideChatView_module_css_default.sidechatHint,
						children: t("sideChatPendingDrop")
					}),
					saved && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideChatView_module_css_default.sidechatHint,
						children: t("sideChatSaved")
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideChatView_module_css_default.sidechatError,
						children: t("sideChatError", { message: error })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: scrollRef,
						className: SideChatView_module_css_default.sidechatScroll,
						children: rows.map((row) => renderRow(row, rowLabels))
					}),
					running && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideChatView_module_css_default.sidechatStatus,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
							state: "ongoing",
							size: 8
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideChatView_module_css_default.sidechatStatusText,
							children: t("sideChatThinking")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideChatView_module_css_default.sidechatComposer,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: composerRef,
							className: SideChatView_module_css_default.sidechatComposerInput,
							value: composer,
							placeholder: freshThread ? t("sideChatFirstPlaceholder") : t("sideChatComposerPlaceholder"),
							rows: 1,
							onChange: (event) => {
								setComposer(event.target.value);
								growComposer();
							},
							onKeyDown: (event) => {
								if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
								event.preventDefault();
								handleSend();
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideChatView_module_css_default.sidechatComposerBar,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideChatView_module_css_default.sidechatComposerMeta,
								children: running ? "" : agentBadge
							}), running ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SideChatView_module_css_default.sidechatSendBtn,
								onClick: () => void handleCancel(),
								disabled: busy !== null,
								title: t("sideChatCancelTitle"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconStopFill16, {})
							}, "stop") : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SideChatView_module_css_default.sidechatSendBtn,
								onClick: () => void handleSend(),
								disabled: composer.trim() === "" || busy !== null,
								title: t("sideChatSend"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline16, {})
							}, "send")]
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/browser.ts
		/**
		* Decide whether a site can render inside the sidebar iframe. The signals
		* are exactly the ones the BROWSER enforces when it refuses an iframe load:
		* X-Frame-Options DENY/SAMEORIGIN, or a frame-ancestors directive that does
		* not allow `*` ('self' here means the SITE's own origin — never ours, so
		* it also blocks the sidebar). A site we could not reach yields 'unknown'
		* and the plain iframe stays.
		*/
		function embeddabilityOf(probe) {
			if (probe.reachable !== true) return "unknown";
			const xfo = probe.xFrameOptions?.trim().toUpperCase();
			if (xfo === "DENY" || xfo === "SAMEORIGIN") return "blocked";
			if (probe.frameAncestors !== void 0 && !probe.frameAncestors.some((source) => source === "*")) return "blocked";
			return "embeddable";
		}
		/** A loopback hostname (localhost, IPv6 ::1, 127.0.0.0/8, 0.0.0.0). */
		function isLoopbackHostname(hostname) {
			const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
			if (host === "localhost" || host === "::1" || host === "0.0.0.0") return true;
			const parts = host.split(".");
			return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
		}
		/**
		* Normalize one address-bar input against the navigation policy.
		* @param input - raw user text.
		* @param selfOrigin - the GUI's own origin (window.location.origin). The GUI
		* itself may be browsed in the sidebar (the sandbox keeps it opaque), so it
		* is let through BEFORE the loopback check — its host is normally loopback.
		* @param allowedLoopback - comma-separated loopback allowlist from the side
		* card prefs (`browserAllowedLoopback`): bare hosts (`localhost`,
		* `127.0.0.1`) allow every port, `host:port` entries allow exactly that
		* authority. Entries are matched case-insensitively; portless entries match
		* the host on any port. Empty allowlist keeps the default loopback block.
		*/
		/** Schemes that must never reach the iframe, even without `//` (javascript:,
		*  data:, file:, ...). Host:port lookalikes (example.com:8080) are NOT here —
		*  they parse as hosts below. */
		const FORBIDDEN_SCHEMES = /* @__PURE__ */ new Set([
			"javascript",
			"data",
			"file",
			"about",
			"vbscript",
			"blob",
			"mailto",
			"tel",
			"ftp",
			"ftps",
			"ws",
			"wss",
			"sftp",
			"ssh",
			"chrome",
			"chrome-extension",
			"moz-extension",
			"edge",
			"opera",
			"resource",
			"view-source"
		]);
		/** Parse the loopback allowlist into a matcher predicate over host:port. */
		function parseLoopbackAllowlist(allowlist) {
			const entries = allowlist.split(",").map((entry) => entry.trim().toLowerCase()).filter((entry) => entry !== "");
			const exact = new Set(entries);
			const hosts = /* @__PURE__ */ new Set();
			for (const entry of entries) if (!entry.includes(":")) hosts.add(entry.replace(/^\[|\]$/g, ""));
			return (host, port) => {
				const key = `${host}:${port}`;
				if (exact.has(key) || exact.has(host)) return true;
				return port !== "" && hosts.has(host);
			};
		}
		/**
		* Whether a loopback URL is explicitly allowlisted by the side card prefs
		* (`browserAllowedLoopback`). Only allowlisted local addresses may run with
		* `allow-same-origin` in the sidebar iframe — needed for local dev servers
		* (Vite etc.) whose module/HMR/fetch pipeline requires a real origin, while
		* the page stays cross-origin to the GUI and to every other site.
		*/
		function isAllowedLoopbackUrl(url, allowlist) {
			if (allowlist.trim() === "") return false;
			let parsed;
			try {
				parsed = new URL(url);
			} catch {
				return false;
			}
			if (!isLoopbackHostname(parsed.hostname)) return false;
			return parseLoopbackAllowlist(allowlist)(parsed.hostname, parsed.port);
		}
		function normalizeBrowserUrl(input, selfOrigin, allowedLoopback = "") {
			const trimmed = input.trim();
			if (trimmed === "") return { kind: "invalid" };
			const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
			let withScheme;
			if (schemeMatch === null) withScheme = `https://${trimmed}`;
			else {
				const scheme = schemeMatch[1].toLowerCase();
				if (scheme === "http" || scheme === "https") withScheme = trimmed;
				else if (FORBIDDEN_SCHEMES.has(scheme)) return {
					kind: "blocked",
					reason: "scheme"
				};
				else withScheme = `https://${trimmed}`;
			}
			let url;
			try {
				url = new URL(withScheme);
			} catch {
				return { kind: "invalid" };
			}
			if (url.protocol !== "http:" && url.protocol !== "https:") return {
				kind: "blocked",
				reason: "scheme"
			};
			try {
				if (url.origin === new URL(selfOrigin).origin) return {
					kind: "ok",
					url: url.href
				};
			} catch {}
			if (isLoopbackHostname(url.hostname)) {
				if (allowedLoopback.trim() !== "" && parseLoopbackAllowlist(allowedLoopback)(url.hostname, url.port)) return {
					kind: "ok",
					url: url.href
				};
				return {
					kind: "blocked",
					reason: "loopback"
				};
			}
			return {
				kind: "ok",
				url: url.href
			};
		}
		//#endregion
		//#region src/client/SandboxStatusBar.tsx
		/**
		* The live sandbox status row of the two built-in web surfaces (HTML
		* preview and the browser tab): a green "sandbox on" state with a one-tap
		* TEMPORARY unlock, or a RED "sandbox off" state (global setting or the
		* temporary unlock) with a restore action.
		*
		* The temporary unlock is component state only — it never writes the
		* global side card setting (`htmlViewerNoSandbox` / `browserNoSandbox`);
		* it lasts until the surface unmounts (tab switch / file switch) or the
		* user restores the sandbox from the row. When the global setting already
		* drops the sandbox, no unlock/restore action is offered (changing the
		* global setting is the settings page's job) — the red warning stands.
		*/
		function SandboxStatusBar(props) {
			const { sandboxed, local, dangerCopy, onUnlock, onRestore } = props;
			if (sandboxed) {
				const copy = t("sandboxStatusOn");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: clsx(sidebar_module_css_default.sandboxStatus, sidebar_module_css_default.sandboxStatusOn),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: sidebar_module_css_default.sandboxDot }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sidebar_module_css_default.sandboxStatusText,
							title: copy,
							children: copy
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.sandboxAction,
							onClick: onUnlock,
							children: t("sandboxUnlock")
						})
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(sidebar_module_css_default.sandboxStatus, sidebar_module_css_default.sandboxStatusOff),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: sidebar_module_css_default.sandboxDot }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.sandboxStatusText,
						title: dangerCopy,
						children: dangerCopy
					}),
					local && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.sandboxAction,
						onClick: onRestore,
						children: t("sandboxRestore")
					})
				]
			});
		}
		//#endregion
		//#region src/client/BrowserView.tsx
		/**
		* The built-in browser tab: an address bar plus a sandboxed iframe.
		*
		* Security model (see browser.ts + the sandbox tokens below): the iframe is
		* ALWAYS sandboxed without `allow-same-origin` (opaque origin — the visited
		* page can never sit on the GUI's origin, read its storage, or reach
		* /sidebar/api) and without `allow-top-navigation` (a page must not hijack
		* the GUI). The address bar only accepts http(s) and refuses loopback /
		* the GUI's own origin. The side card setting "关闭浏览器沙箱" drops the
		* sandbox attribute entirely for fully trusted sites — the visited page then
		* runs with the GUI's own origin and full session access, so a persistent
		* warning bar renders while it is off.
		*
		* The URL is persisted onto the tab (path/title via the patchTab reducer)
		* so a reload restores the visited page; the back/forward stack only tracks
		* address-bar navigations (in-frame link clicks are cross-origin and
		* invisible — a documented limitation).
		*/
		/**
		* The browser iframe sandbox tokens. NO allow-same-origin (opaque origin —
		* no GUI storage/API access), NO allow-top-navigation (a browsed page must
		* not hijack the GUI). allow-forms/allow-popups/allow-downloads/allow-modals
		* keep login flows working; allow-popups-to-escape-sandbox lets OAuth
		* popups open as normal tabs (they are cross-origin to the GUI either way).
		*/
		const BROWSER_IFRAME_SANDBOX = "allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-popups-to-escape-sandbox";
		/** allow-same-origin appended for explicitly allowlisted local addresses. */
		const BROWSER_IFRAME_SANDBOX_SAME_ORIGIN = `${BROWSER_IFRAME_SANDBOX} allow-same-origin`;
		/**
		* The sandbox tokens for one URL: allowlisted loopback addresses (local dev
		* servers the user explicitly trusts) additionally get `allow-same-origin`
		* so Vite/module/HMR pipelines that need a real origin work; every other
		* site keeps the opaque-origin sandbox. `allow-same-origin` does NOT give
		* the page access to the GUI — it stays cross-origin to it and to every
		* other site — but it does give it its OWN origin privileges (localStorage,
		* fetch without CORS), so it is only granted for the explicit allowlist.
		*
		* The GUI itself is the one hard exception: even when its own host is
		* allowlisted (a bare-host entry covers every port, so the GUI origin
		* matches), a page at the GUI's exact origin must never get
		* `allow-same-origin` — that would make it same-origin with its parent and
		* hand it the GUI's storage/API (and the ability to shed the sandbox). The
		* GUI keeps the opaque-origin sandbox no matter what the allowlist says.
		*/
		function iframeSandboxFor(url, allowedLoopback, selfOrigin) {
			if (url === void 0) return void 0;
			if (selfOrigin !== void 0) {
				let parsed;
				try {
					parsed = new URL(url);
				} catch {
					return BROWSER_IFRAME_SANDBOX;
				}
				if (parsed.origin === selfOrigin) return BROWSER_IFRAME_SANDBOX;
			}
			return isAllowedLoopbackUrl(url, allowedLoopback) ? BROWSER_IFRAME_SANDBOX_SAME_ORIGIN : BROWSER_IFRAME_SANDBOX;
		}
		function BrowserView(props) {
			const { store, tab } = props;
			const [url, setUrl] = (0, react.useState)(tab.path);
			const [input, setInput] = (0, react.useState)(tab.path ?? "");
			/** Blocked/invalid hint shown under the address bar (null = none). */
			const [message, setMessage] = (0, react.useState)(null);
			/** Address-bar navigation history (in-frame clicks are not tracked). */
			const [history, setHistory] = (0, react.useState)(tab.path !== void 0 ? [tab.path] : []);
			const [cursor, setCursor] = (0, react.useState)(tab.path !== void 0 ? 0 : -1);
			/** Bumped on reload to remount the iframe (also remounts on sandbox flip). */
			const [reloadKey, setReloadKey] = (0, react.useState)(0);
			/** TEMPORARY sandbox unlock for THIS surface only (never writes the global
			*  side card setting; lasts until the tab unmounts or the user restores). */
			const [localUnlock, setLocalUnlock] = (0, react.useState)(false);
			const noSandbox = store.getPrefs().browserNoSandbox === true || localUnlock;
			/** A site that refuses to be embedded (X-Frame-Options / frame-ancestors):
			*  the probe verdict shown instead of the blank iframe. */
			const [embedBlocked, setEmbedBlocked] = (0, react.useState)(null);
			/** The user asked to load the refused site anyway (keeps the plain iframe). */
			const [forceEmbed, setForceEmbed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (url === void 0) return;
				let cancelled = false;
				setEmbedBlocked(null);
				setForceEmbed(false);
				api.browserProbe(url).then((probe) => {
					if (!cancelled && embeddabilityOf(probe) === "blocked") setEmbedBlocked(url);
				}).catch(() => {});
				return () => {
					cancelled = true;
				};
			}, [url]);
			const persist = (nextUrl) => {
				let host = nextUrl;
				try {
					host = new URL(nextUrl).hostname;
				} catch {}
				store.reduce((state) => patchTab(state, tab.id, {
					path: nextUrl,
					title: host
				}));
			};
			const navigateTo = (raw) => {
				const result = normalizeBrowserUrl(raw, window.location.origin, store.getPrefs().browserAllowedLoopback);
				if (result.kind === "ok") {
					const next = result.url;
					setUrl(next);
					setInput(next);
					setMessage(null);
					setHistory((previous) => [...previous.slice(0, cursor + 1), next]);
					setCursor((previous) => previous + 1);
					setReloadKey((key) => key + 1);
					persist(next);
					return;
				}
				setMessage(result.kind === "invalid" ? t("browserInvalid") : result.reason === "scheme" ? t("browserBlockedScheme") : t("browserBlockedLoopback"));
			};
			const goBack = () => {
				if (cursor <= 0) return;
				const next = history[cursor - 1];
				setCursor(cursor - 1);
				setUrl(next);
				setInput(next);
				setReloadKey((key) => key + 1);
			};
			const goForward = () => {
				if (cursor >= history.length - 1) return;
				const next = history[cursor + 1];
				setCursor(cursor + 1);
				setUrl(next);
				setInput(next);
				setReloadKey((key) => key + 1);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.browser,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.browserBar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("browserBack"),
								title: t("browserBack"),
								disabled: cursor <= 0,
								onClick: goBack,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("browserForward"),
								title: t("browserForward"),
								disabled: cursor >= history.length - 1,
								onClick: goForward,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("refresh"),
								title: t("refresh"),
								onClick: () => {
									setReloadKey((key) => key + 1);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: sidebar_module_css_default.browserInput,
								value: input,
								placeholder: t("browserPlaceholder"),
								spellCheck: false,
								onChange: (event) => {
									setInput(event.target.value);
								},
								onKeyDown: (event) => {
									if (event.key === "Enter") navigateTo(input);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("browserGo"),
								title: t("browserGo"),
								onClick: () => {
									navigateTo(input);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline14, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.iconButton,
								"aria-label": t("browserOpenExternal"),
								title: t("browserOpenExternal"),
								disabled: url === void 0,
								onClick: () => {
									if (url !== void 0) window.open(url, "_blank", "noopener");
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VscLinkExternal, { size: 15 })
							})
						]
					}),
					message !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.browserMessage,
						children: message
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SandboxStatusBar, {
						sandboxed: !noSandbox,
						local: localUnlock,
						dangerCopy: t("browserNoSandboxWarning"),
						onUnlock: () => {
							setLocalUnlock(true);
						},
						onRestore: () => {
							setLocalUnlock(false);
						}
					}),
					url === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.browserStart,
						children: t("browserStart")
					}) : embedBlocked !== null && !forceEmbed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrowserEmbedBlocked, {
						url: embedBlocked,
						onOpenInBrowser: () => {
							window.open(embedBlocked, "_blank", "noopener");
						},
						onLoadAnyway: () => {
							setForceEmbed(true);
						}
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
						className: sidebar_module_css_default.browserFrame,
						src: url,
						sandbox: noSandbox ? void 0 : iframeSandboxFor(url, store.getPrefs().browserAllowedLoopback, window.location.origin),
						referrerPolicy: "no-referrer",
						allow: "",
						title: url
					}, `${reloadKey}:${noSandbox ? "ns" : "sb"}`)
				]
			});
		}
		/**
		* The embed-refusal panel: shown when the probed site forbids being
		* displayed inside other pages (X-Frame-Options / frame-ancestors) — the
		* iframe would only show the browser's "refused to connect" blank. Explains
		* the reason and offers the real-browser open plus a load-anyway escape.
		* Exported so the copy and the actions are testable without a DOM.
		*/
		function BrowserEmbedBlocked(props) {
			const { url, onOpenInBrowser, onLoadAnyway } = props;
			let host = url;
			try {
				host = new URL(url).hostname;
			} catch {}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.browserBlocked,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 16 }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.browserBlockedTitle,
						children: t("browserEmbedBlocked", { host })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.browserBlockedDesc,
						children: t("browserEmbedBlockedDesc")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sidebar_module_css_default.browserBlockedActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.browserBlockedButton,
							onClick: onOpenInBrowser,
							children: t("browserOpenExternal")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: sidebar_module_css_default.browserBlockedButton,
							onClick: onLoadAnyway,
							children: t("browserEmbedAnyway")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/builtins/tabs.tsx
		/**
		* The 7 built-in tab descriptors: the plugin registers its own pages
		* (editor / git — the unified changes tab / subagent / sidechat / terminal /
		* browser / diff) through
		* the same {@link BetterSidebarService} external plugins use — eating its
		* own dogfood. The terminal descriptor owns its quota (`TERMINAL_LIMIT`)
		* and mints `terminal:<uuid>` ids through `createTab`; the browser mints
		* `browser:<n>` the same way (no quota). The editor IS the files window
		* (the old standalone explorer merged into it).
		*/
		/**
		* Lazy wrapper over the terminal view: xterm (and its stylesheet) is fetched
		* only when a terminal tab is first opened (see chunk-loader.ts). The
		* wrapper keeps the descriptor contract `(props) => ReactNode` — Sidebar
		* calls it as a plain function.
		*
		* TerminalView's props are { scope, tabId, store } — `tabId` is NOT part of
		* TabComponentProps (it carries `tab: SidebarTab` instead), so the
		* descriptor maps it explicitly; a bare pass-through would leave tabId
		* undefined and TerminalView's isAgentTabId(tabId) would crash on
		* `undefined.startsWith` (regression-pinned in tests/lazy-chunk.spec.tsx).
		*/
		const LazyTerminal = lazyChunkComponent("terminal", (mod) => mod.TerminalView);
		/** A client-side uuid for terminal tab identity (not shown in the UI). */
		function terminalUuid() {
			if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
			return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
		}
		/** Count UI-owned terminals (agent:` tabs excluded — they are the model's). */
		function uiTerminalCount(state) {
			return allLeaves(state.bottomSplits).flatMap((leaf) => leaf.tabs).filter((tab) => tab.type === "terminal" && !isAgentTabId(tab.id)).length;
		}
		/** The 6 built-in tab descriptors. */
		function builtinTabs(ctx, options = {}) {
			return [
				{
					id: "editor",
					description: () => t("guideDescFiles"),
					title: () => t("files"),
					icon: filesTabIcon,
					order: 10,
					hidden: false,
					dedupeKey: (tab) => tab.path,
					settings: {
						toggles: [{
							key: "editorExplorer",
							type: "select",
							title: () => t("editorExplorer"),
							desc: () => t("editorExplorerDesc"),
							options: [{
								value: true,
								icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, { size }),
								title: () => t("editorExplorerMerged"),
								desc: () => t("editorExplorerMergedDesc")
							}, {
								value: false,
								icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size }),
								title: () => t("editorExplorerSplit"),
								desc: () => t("editorExplorerSplitDesc")
							}]
						}, {
							key: "workspaceFence",
							title: () => t("settingsFenceTitle"),
							desc: () => t("settingsFenceDesc")
						}],
						render: ({ pluginSettings, updatePluginSetting }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OpenWithSettings, {
							pluginSettings,
							updatePluginSetting
						})
					},
					component: ({ ctx, store, scope, tab, expanded, revealed, onToggleDir, onReferenceFile }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditorHost, {
						ctx,
						store,
						scope,
						tab,
						expanded: expanded ?? [],
						revealed: revealed ?? [],
						onToggleDir: onToggleDir ?? (() => {}),
						onReferenceFile: onReferenceFile ?? (() => {})
					})
				},
				{
					id: "git",
					title: () => t("changes"),
					description: () => t("guideDescGit"),
					icon: changesTabIcon,
					order: 20,
					single: true,
					badge: (_ctx, scope) => {
						const count = opCountOf(scope.sessionId);
						return count === void 0 || count === 0 ? null : count;
					},
					component: ({ ctx, store, scope, tab, visible, onOpenDiff }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangesTab, {
						ctx,
						store,
						scope,
						tab,
						visible,
						onOpenFile: (path) => {
							openSidebarFile(ctx, store, scope.sessionId, path);
						},
						onOpenDiff
					})
				},
				{
					id: "subagent",
					title: () => t("subagent"),
					description: () => t("guideDescSubagent"),
					icon: tasksTabIcon,
					order: 30,
					single: true,
					settings: { toggles: [{
						key: "autoOpenSubagent",
						title: () => t("settingsSubagentTitle"),
						desc: () => t("settingsSubagentDesc")
					}, {
						key: "autoOpenJobs",
						title: () => t("settingsJobsTitle"),
						desc: () => t("settingsJobsDesc")
					}] },
					component: ({ ctx, scope, visible, onSubagentJump }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SubagentView, {
						sessionId: scope.sessionId,
						ctx,
						active: visible,
						onOpenChild: (address) => {
							onSubagentJump?.(address.childSessionId);
						}
					})
				},
				{
					id: "sidechat",
					title: () => t("sideChat"),
					description: () => t("guideDescSidechat"),
					icon: sidechatTabIcon,
					order: 35,
					createTab: () => {
						const threadId = consumeSidechatSeed();
						if (threadId !== void 0) return { tab: {
							id: `sidechat:${threadId}`,
							type: "sidechat",
							title: t("sideChat"),
							meta: { threadId }
						} };
						return { tab: {
							id: `sidechat:new-${crypto.randomUUID()}`,
							type: "sidechat",
							title: t("sideChatUntitled"),
							meta: { autoCreate: true }
						} };
					},
					dedupeKey: (tab) => sidechatThreadIdOf(tab),
					onClose: (tab) => {
						const threadId = sidechatThreadIdOf(tab);
						if (threadId !== void 0) api.sidechatDispose(threadId).catch(() => {});
					},
					component: ({ ctx, scope, tab, visible }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SideChatView, {
						ctx,
						scope,
						tab,
						visible
					})
				},
				{
					id: "terminal",
					title: () => t("terminal"),
					description: () => t("guideDescTerminal"),
					icon: terminalTabIcon,
					order: 40,
					available: (_ctx, _scope, state) => uiTerminalCount(state) < 3,
					settings: { toggles: [
						{
							key: "agentTerminalTools",
							title: () => t("settingsToolsTitle"),
							desc: () => t("settingsToolsDesc")
						},
						{
							key: "bottomPanelAutoTerminal",
							title: () => t("settingsBottomTerminalTitle"),
							desc: () => t("settingsBottomTerminalDesc")
						},
						{
							key: "terminalShell",
							type: "text",
							title: () => t("settingsShellTitle"),
							desc: () => t("settingsShellDesc"),
							placeholder: t("settingsShellPlaceholder")
						},
						{
							key: "terminalShellArgs",
							type: "text",
							title: () => t("settingsShellArgsTitle"),
							desc: () => t("settingsShellArgsDesc"),
							placeholder: t("settingsShellArgsPlaceholder")
						},
						{
							key: "terminalFontFamily",
							type: "text",
							title: () => t("settingsFontFamilyTitle"),
							desc: () => t("settingsFontFamilyDesc"),
							placeholder: t("settingsFontFamilyPlaceholder")
						},
						{
							key: "terminalFontSize",
							type: "number",
							title: () => t("settingsFontSizeTitle"),
							desc: () => t("settingsFontSizeDesc"),
							min: 9,
							max: 32,
							unit: "px"
						}
					] },
					createTab: (state) => {
						if (uiTerminalCount(state) >= 3) return null;
						return {
							tab: {
								id: `terminal:${terminalUuid()}`,
								type: "terminal",
								title: options.terminalTitle?.() ?? t("terminal")
							},
							patch: { nextTerminal: state.nextTerminal + 1 }
						};
					},
					component: ({ tab, scope, store }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyTerminal, {
						scope,
						store,
						tabId: tab.id
					})
				},
				{
					id: "browser",
					title: () => t("browser"),
					description: () => t("guideDescBrowser"),
					icon: browserTabIcon,
					order: 50,
					settings: { toggles: [
						{
							key: "browserNoSandbox",
							title: () => t("settingsBrowserSandboxTitle"),
							desc: () => t("settingsBrowserSandboxDesc")
						},
						{
							key: "browserInterceptLinks",
							title: () => t("settingsBrowserLinksTitle"),
							desc: () => t("settingsBrowserLinksDesc")
						},
						{
							key: "browserInterceptHttp",
							title: () => t("settingsBrowserHttpTitle"),
							desc: () => t("settingsBrowserHttpDesc")
						},
						{
							key: "browserInterceptHttps",
							title: () => t("settingsBrowserHttpsTitle"),
							desc: () => t("settingsBrowserHttpsDesc")
						},
						{
							key: "browserAllowedLoopback",
							type: "text",
							title: () => t("settingsBrowserLoopbackTitle"),
							desc: () => t("settingsBrowserLoopbackDesc"),
							placeholder: t("settingsBrowserLoopbackPlaceholder")
						}
					] },
					createTab: (state) => ({
						tab: {
							id: `browser:${state.nextBrowser}`,
							type: "browser",
							title: t("browser")
						},
						patch: { nextBrowser: state.nextBrowser + 1 }
					}),
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrowserView, { ...props })
				},
				{
					id: "diff",
					title: () => t("changes"),
					icon: changesTabIcon,
					order: -1,
					hidden: true,
					dedupeKey: (tab) => tab.id,
					component: ({ scope, tab }) => tab.diff === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffTab, {
						sessionId: scope.sessionId,
						cwd: scope.cwd,
						diff: tab.diff
					})
				}
			];
		}
		//#endregion
		//#region src/client/builtins/viewers.tsx
		/**
		* The 6 built-in file viewer descriptors: every preview surface is a
		* registered viewer (image / pdf / markdown / html / code /
		* binary-download), exactly like external plugins register theirs. Office
		* previews (.docx / .xlsx / .pptx) are NOT built in anymore — they moved to
		* the recommended office plugin (see plugins-viewers.ts), which registers
		* the same ids through this service.
		*
		* The `binary-download` viewer sniffs NUL bytes via `detect` for unknown
		* binaries and serves legacy doc/xls/ppt by extension; `code` is the
		* catch-all (`exts: []`, lowest priority) that claims any file no other
		* viewer did.
		*
		* The heavy viewers (the CodeMirror-backed markdown/html/code) render
		* through {@link lazyChunkComponent} wrappers — their libraries are fetched
		* only when such a file is first opened (see chunk-loader.ts). The
		* descriptor metadata (id/exts/priority/detect) is identical either way,
		* so matching semantics and external-plugin overrides are unaffected; the
		* `component` wrapper keeps the descriptor contract `(props) => ReactNode`.
		*
		* Every viewer carries the declarative settings-surface fields — `title`
		* and `icon` — so the Side card settings page can render the enable/disable
		* inventory without hardcoding (eating our own dogfood).
		*/
		/**
		* Lazy wrapper over the chunk-resident viewer component. The `pick`
		* function is module-level (stable identity — the wrapper effect depends
		* on it); the cast bridges the chunk exports record to the descriptor prop
		* shape (the view reads only its own subset of FileViewerProps).
		*/
		const LazyTextEditor = lazyChunkComponent("editor", (mod) => mod.TextEditor);
		/** The 6 built-in file viewer descriptors. */
		function builtinViewers() {
			return [
				{
					id: "image",
					title: () => t("viewerImage"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconImageOutline16, { size }),
					exts: [
						"png",
						"jpg",
						"jpeg",
						"gif",
						"webp",
						"svg",
						"bmp",
						"ico",
						"avif"
					],
					fetchStrategy: "mediaUrl",
					component: ({ mediaUrl: url, title }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.editorImageWrap,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: sidebar_module_css_default.editorImage,
							src: url,
							alt: title
						})
					})
				},
				{
					id: "pdf",
					title: () => t("viewerPdf"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPdfOutline16, { size }),
					exts: ["pdf"],
					fetchStrategy: "mediaUrl",
					component: ({ scope, path, title }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PdfView, {
						scope,
						path,
						title
					})
				},
				{
					id: "markdown",
					title: () => t("viewerMarkdown"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconMarkdownOutline16, { size }),
					exts: ["md", "markdown"],
					fetchStrategy: "fsRead",
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyTextEditor, { ...props })
				},
				{
					id: "html",
					title: () => t("viewerHtml"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconHtmlOutline16, { size }),
					exts: ["html", "htm"],
					fetchStrategy: "fsRead",
					settings: { toggles: [{
						key: "htmlViewerNoSandbox",
						title: () => t("settingsHtmlSandboxTitle"),
						desc: () => t("settingsHtmlSandboxDesc")
					}, {
						key: "htmlViewerDefaultUnsafe",
						title: () => t("settingsHtmlDefaultUnsafeTitle"),
						desc: () => t("settingsHtmlDefaultUnsafeDesc")
					}] },
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyTextEditor, { ...props })
				},
				{
					id: "code",
					title: () => t("viewerCode"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size }),
					exts: [],
					priority: -100,
					fetchStrategy: "fsRead",
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LazyTextEditor, { ...props })
				},
				{
					id: "binary-download",
					title: () => t("viewerBinary"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size }),
					exts: [
						"doc",
						"xls",
						"ppt"
					],
					priority: -50,
					fetchStrategy: "binary-download",
					detect: (_path, head) => head.includes(0),
					component: ({ scope, path }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BinaryDownload, {
						scope,
						path
					})
				}
			];
		}
		//#endregion
		//#region src/client/builtins/index.ts
		/**
		* Register all built-in tabs and viewers with the service. Returns a
		* disposer that unregisters everything (cordis auto-invokes it on fiber
		* disposal). The `ctx` is threaded into tab descriptors that need it
		* (EditorHost reads `ctx.betterSidebar` for file-viewer matching).
		*/
		function registerBuiltins(ctx, service, options = {}) {
			const disposers = [];
			for (const tab of builtinTabs(ctx, options)) disposers.push(service.registerTab(tab));
			for (const viewer of builtinViewers()) disposers.push(service.registerFileViewer(viewer));
			return () => {
				for (const d of disposers) try {
					d();
				} catch {}
			};
		}
		//#endregion
		//#region src/client/conversation-draft.ts
		/**
		* Splice `text` into `draft` at `caret` (replacing any live selection) with
		* whitespace-aware joins and report the caret position right after the
		* inserted text. `caret === null` (position unknown) appends at the end,
		* exactly like the original behavior.
		*/
		function spliceInsert(draft, text, caret) {
			if (caret === null || draft === "") {
				const next = draft.trim() === "" ? text : `${draft} ${text}`;
				return {
					draft: next,
					caretAfter: next.length
				};
			}
			const prefix = draft.slice(0, caret.start);
			const suffix = draft.slice(caret.end);
			if (prefix === "" && suffix === "") return {
				draft: text,
				caretAfter: text.length
			};
			const left = prefix === "" || /\s$/.test(prefix) ? "" : " ";
			return {
				draft: `${prefix}${left}${text}${suffix === "" || /^\s/.test(suffix) ? "" : " "}${suffix}`,
				caretAfter: prefix.length + left.length + text.length
			};
		}
		/**
		* Locate the composer `<textarea>` in the conversation column: prefer the
		* `data-phase`-tagged textarea (the composer's marker), falling back to any
		* textarea in the column, then to a bare data-phase textarea (older host
		* layouts without the column attribute). Null in jsdom-less hosts.
		*/
		function findComposerTextarea() {
			if (typeof document === "undefined") return null;
			const column = document.querySelector("#root [data-slot=\"conversation\"]");
			const find = (scope) => scope.querySelector("textarea[data-phase]") ?? scope.querySelector("textarea");
			return column !== null ? find(column) : document.querySelector("textarea[data-phase]");
		}
		/**
		* Resolve the composer's live caret from its DOM `<textarea>`. The draft
		* store has no caret API, so the sidebar reads the composed input's selection
		* directly; the value-sync check (`el.value === draft`) discards stale or
		* wrong-composer reads — a caret must never be applied against a draft it
		* was not measured on.
		*
		* Returns null when the composer is missing, disabled/read-only, out of
		* sync with the store draft, or has no measurable selection (jsdom/odd
		* hosts report null selectionStart/End).
		*/
		function probeComposerCaret(draft) {
			const el = findComposerTextarea();
			if (el === null || el.disabled || el.readOnly) return null;
			if (el.value !== draft) return null;
			let start = el.selectionStart;
			let end = el.selectionEnd;
			if (typeof start !== "number" || typeof end !== "number") return null;
			if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
			start = Math.max(0, Math.min(start, draft.length));
			end = Math.max(start, Math.min(end, draft.length));
			return {
				start,
				end
			};
		}
		/**
		* Restore the composer caret to `caretIndex` after a programmatic
		* `setDraft` commit. A controlled textarea update resets the caret (React
		* commits the value asynchronously and the browser moves the caret to the
		* start/end), so the placement is scheduled and retried across at most two
		* animation frames (setTimeout fallback for jsdom), and only applied when
		* the textarea still matches `expectedDraft` — a newer edit or a different
		* composer wins the race untouched. The caret is clamped into the value
		* bounds, mirroring how browsers clamp type-in positions.
		*/
		function placeComposerCaretAfterInsert(expectedDraft, caretIndex) {
			let remaining = 2;
			let scheduled = false;
			const schedule = (fn) => {
				if (scheduled) return;
				scheduled = true;
				if (typeof requestAnimationFrame === "function") requestAnimationFrame(fn);
				else setTimeout(fn, 0);
			};
			const place = () => {
				scheduled = false;
				if (remaining <= 0) return;
				remaining -= 1;
				const el = findComposerTextarea();
				if (el === null || el.disabled || el.readOnly) return;
				if (el.value !== expectedDraft) {
					schedule(place);
					return;
				}
				const clamped = Math.max(0, Math.min(caretIndex, el.value.length));
				el.setSelectionRange(clamped, clamped);
			};
			schedule(place);
		}
		/**
		* Insert `text` into the session's composer draft at the composer's live
		* caret (see {@link probeComposerCaret}), falling back to appending at the
		* end when the caret cannot be resolved. Returns false — and logs — when the
		* conversation service or the session scope is unavailable.
		*/
		function appendToDraft(ctx, sessionId, text) {
			try {
				const actx = ctx.sessions.scope(sessionId);
				if (actx === void 0) {
					console.warn("[dsh-better-sidebar] draft insert skipped: no session scope", sessionId);
					return false;
				}
				const conversation = ctx.get("conversation");
				if (conversation === void 0) {
					console.warn("[dsh-better-sidebar] draft insert skipped: conversation service unavailable");
					return false;
				}
				const input = conversation.input.for(actx);
				const draft = input.state.getSnapshot().draft;
				const { draft: next, caretAfter } = spliceInsert(draft, text, probeComposerCaret(draft));
				input.setDraft(next);
				placeComposerCaretAfterInsert(next, caretAfter);
				return true;
			} catch (error) {
				console.warn("[dsh-better-sidebar] draft insert failed:", error);
				return false;
			}
		}
		/**
		* The DSH `@file` spelling for one relative path, mirroring the host grammar
		* (`formatFileMention` in `@deepseek-ai/dsh-file-reference`): plain when
		* there is no whitespace, quoted when there is, and `undefined` when the
		* path contains a control character or an embedded quote the editor grammar
		* cannot represent.
		*/
		function fileMention(relativePath) {
			const path = relativePath.replace(/[\\/]+$/, "");
			if (/[\u0000-\u001f\u007f-\u009f"]/u.test(path)) return void 0;
			const mention = /\s/u.test(path) ? `@"${path}"` : `@${path}`;
			const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
			return {
				mention,
				label: at === -1 ? path : path.slice(at + 1)
			};
		}
		/**
		* Insert one FILE reference as a structured chip (like DSH's own `@` picker).
		* The chip displays `@<basename>` but serializes to `@<relative path>` on
		* send, so the reference stays a single link from trigger to basename.
		*
		* Directories are NOT handled here: DSH's folder grammar wants the trailing
		* slash as plain text (`@dir/`) so completion can descend, which
		* `appendToDraft` already covers.
		*/
		function insertFileReference(ctx, sessionId, relativePath) {
			const reference = fileMention(relativePath);
			if (reference === void 0) return false;
			try {
				const actx = ctx.sessions.scope(sessionId);
				if (actx === void 0) return false;
				const conversation = ctx.get("conversation");
				if (conversation === void 0) return false;
				const input = conversation.input.for(actx);
				const before = input.state.getSnapshot();
				if (before.draftRev === void 0) return false;
				actx.emit("slash/input-insert-reference", {
					reference: {
						source: "reference",
						ref: reference.mention,
						label: reference.label,
						appearance: "file",
						clipboardText: reference.mention
					},
					span: {
						draftRev: before.draftRev,
						start: before.draft.length,
						end: before.draft.length
					}
				});
				return input.state.getSnapshot().draftRev !== before.draftRev;
			} catch (error) {
				console.warn("[dsh-better-sidebar] file-reference insert failed:", error);
				return false;
			}
		}
		//#endregion
		//#region src/client/reference-in-chat.ts
		/**
		* Reference one path in the session's conversation draft.
		* @param ctx - the client context.
		* @param sessionId - the session whose draft receives the reference.
		* @param cwd - that session's workspace root (for the relative spelling).
		* @param path - the absolute or workspace-relative path to reference.
		* @param isDir - whether the path is a directory (folder mention vs file chip).
		*/
		function referenceInChat(ctx, sessionId, cwd, path, isDir) {
			const rel = relativeTo(cwd ?? "", path);
			if (isDir) {
				appendToDraft(ctx, sessionId, `@${rel === "." ? "./" : `${rel}/`}`);
				return;
			}
			if (!insertFileReference(ctx, sessionId, rel)) appendToDraft(ctx, sessionId, `@${rel}`);
		}
		//#endregion
		//#region src/client/pinned.ts
		const PINNED_META_KEY = "__pinnedHome";
		const PINNED_VID_PREFIX = "pinned:";
		/** Whether a tab id is a pinned virtual id (prefixed). */
		function isPinnedVirtualId(tabId) {
			return tabId.startsWith(PINNED_VID_PREFIX);
		}
		/** Parse a pinned virtual id into its home session id and original tab id.
		*  Format: `pinned:<homeSessionId>:<originalTabId>` — session ids are UUIDs
		*  (no colons), so the first colon after the prefix delimits the session. */
		function parsePinnedVirtualId(tabId) {
			const rest = tabId.slice(7);
			const sep = rest.indexOf(":");
			if (sep < 0) return {
				homeSessionId: rest,
				tabId: ""
			};
			return {
				homeSessionId: rest.slice(0, sep),
				tabId: rest.slice(sep + 1)
			};
		}
		/** Extract the home scope from a pinned virtual tab's meta (undefined for
		*  regular tabs). */
		function getPinnedHomeScope(tab) {
			return tab.meta?.[PINNED_META_KEY] ?? void 0;
		}
		/** Whether a tab is a pinned virtual tab (injected from another session). */
		function isPinnedVirtualTab(tab) {
			return getPinnedHomeScope(tab) !== void 0;
		}
		/** Create a virtual SidebarTab for a pinned entry. The virtual id is unique
		*  (prefixed with home session) to avoid collision with the viewer's own
		*  tab ids; the original id is stored in meta for TerminalView. */
		function createPinnedVirtualTab(entry) {
			const { tab, homeSessionId } = entry;
			const home = {
				sessionId: homeSessionId,
				cwd: tab.pin?.homeCwd,
				tabId: tab.id
			};
			return {
				...tab,
				id: PINNED_VID_PREFIX + homeSessionId + ":" + tab.id,
				meta: {
					...tab.meta ?? {},
					[PINNED_META_KEY]: home
				}
			};
		}
		/** Inject pinned virtual tabs into the first leaf of a split tree, and
		*  override that leaf's `active` when a pinned tab is activated. Returns
		*  the original tree when there are no pinned tabs and no active override. */
		function injectPinnedIntoTree(tree, pinned, activePinnedId) {
			if (pinned.length === 0 && activePinnedId === null) return tree;
			if (tree.kind === "leaf") return {
				...tree,
				tabs: pinned.length > 0 ? [...tree.tabs, ...pinned] : tree.tabs,
				active: activePinnedId ?? tree.active
			};
			return {
				...tree,
				children: [injectPinnedIntoTree(tree.children[0], pinned, activePinnedId), ...tree.children.slice(1)]
			};
		}
		/**
		* Whether a pinned tab is visible to the viewer session. Conservative on
		* unknown cwd: a `workspace` pin with no `homeCwd` is visible everywhere
		* (the pin was set before the home session's cwd resolved), and a viewer
		* whose cwd is unknown sees every workspace pin (avoids hydration flash).
		*/
		function pinnedVisibleTo(tab, viewer) {
			const pin = tab.pin;
			if (pin === void 0) return false;
			if (pin.scope === "global") return true;
			const home = pin.homeCwd;
			if (home === void 0) return true;
			if (viewer.cwd === void 0) return true;
			return viewer.cwd === home;
		}
		/**
		* Collect every pinned terminal visible to the viewer across ALL cached
		* session states. Excludes the viewer's own session (those tabs are on its
		* own strip). Order is stable: sessions in the cache's insertion order,
		* tabs in tree order within each session — the order tabs were
		* opened/pinned, so the rail never reorders between renders.
		*/
		function collectPinnedTabs(bySession, viewer) {
			const entries = [];
			for (const [homeSessionId, state] of bySession) {
				if (homeSessionId === viewer.sessionId) continue;
				collectFromTree(state.bottomSplits, homeSessionId, viewer, entries);
			}
			return entries;
		}
		/** Walk one split tree depth-first, collecting visible pinned terminals. */
		function collectFromTree(node, homeSessionId, viewer, out) {
			if (node.kind === "leaf") {
				for (const tab of node.tabs) if (tab.type === "terminal" && pinnedVisibleTo(tab, viewer)) out.push({
					tab,
					homeSessionId
				});
				return;
			}
			for (const child of node.children) collectFromTree(child, homeSessionId, viewer, out);
		}
		//#endregion
		//#region src/client/TabBar.tsx
		/**
		* The tab strip of one pane: tabs capped at TAB_MAX_WIDTH (ellipsized),
		* overflow scrolls horizontally, a close button per tab, a four-way split
		* button cluster, and the + menu that opens new tabs (explorer / git /
		* terminal). Tabs are draggable; dropping onto another tab inserts before it,
		* dropping on the strip background appends to this pane. Right-clicking a
		* tab opens the tab context menu (close / close others / close to the left /
		* close to the right, the close ones scoped to this pane).
		*/
		/** Drag payload for tab moves (HTML5 DnD dataTransfer). */
		const TAB_DRAG_TYPE = "application/x-dsh-tab";
		function serializeDrag(payload) {
			return JSON.stringify(payload);
		}
		function parseDrag(raw) {
			try {
				const parsed = JSON.parse(raw);
				if (typeof parsed.tabId === "string" && typeof parsed.paneId === "string") return parsed;
				return null;
			} catch {
				return null;
			}
		}
		/** Global tab-drag flag: PDF iframes become non-interactive synchronously. */
		function setTabDragging(active) {
			if (active) document.body.setAttribute("data-dsh-tab-dragging", "");
			else document.body.removeAttribute("data-dsh-tab-dragging");
		}
		function TabBar(props) {
			const { paneId, tabs, active, onActivate, onClose, onNewTab, newTabOptions, onDropTab, onPinTab, getTabIcon, getTabBadge } = props;
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const [tabMenu, setTabMenu] = (0, react.useState)(null);
			useSubmenuFlip(tabMenu);
			const [dragOver, setDragOver] = (0, react.useState)(false);
			const listRef = (0, react.useRef)(null);
			const tabMenuIndex = tabMenu === null ? -1 : tabs.findIndex((tab) => tab.id === tabMenu.tabId);
			const onCloseRef = (0, react.useRef)(onClose);
			const middlePressed = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				onCloseRef.current = onClose;
			});
			(0, react.useEffect)(() => {
				const onMouseUp = (event) => {
					if (event.button !== 1) return;
					const pressed = middlePressed.current;
					middlePressed.current = null;
					if (pressed !== null && pressed.node.isConnected && pressed.node.contains(event.target)) onCloseRef.current(pressed.id);
				};
				window.addEventListener("mouseup", onMouseUp);
				return () => {
					window.removeEventListener("mouseup", onMouseUp);
				};
			}, []);
			(0, react.useEffect)(() => {
				const el = listRef.current;
				if (el === null) return;
				const onWheel = (event) => {
					if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
					if (el.scrollWidth <= el.clientWidth) return;
					event.preventDefault();
					const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1;
					el.scrollLeft += (event.deltaX + event.deltaY) * unit;
				};
				el.addEventListener("wheel", onWheel, { passive: false });
				return () => {
					el.removeEventListener("wheel", onWheel);
				};
			}, []);
			(0, react.useEffect)(() => {
				const clear = () => {
					setTabDragging(false);
					setDragOver(false);
				};
				window.addEventListener("dragend", clear, true);
				window.addEventListener("drop", clear, true);
				window.addEventListener("blur", clear);
				return () => {
					window.removeEventListener("dragend", clear, true);
					window.removeEventListener("drop", clear, true);
					window.removeEventListener("blur", clear);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: clsx(sidebar_module_css_default.tabBar, dragOver && sidebar_module_css_default.tabBarDrop),
				onDragOver: (event) => {
					event.preventDefault();
					event.stopPropagation();
					setDragOver(true);
				},
				onDragLeave: () => {
					setDragOver(false);
				},
				onDrop: (event) => {
					event.preventDefault();
					event.stopPropagation();
					setDragOver(false);
					setTabDragging(false);
					const payload = parseDrag(event.dataTransfer.getData(TAB_DRAG_TYPE));
					if (payload !== null) onDropTab(payload, null);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: listRef,
					className: sidebar_module_css_default.tabList,
					children: [
						tabs.map((tab) => {
							const pinned = isPinnedVirtualTab(tab) || tab.pin !== void 0;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: clsx(sidebar_module_css_default.tab, active === tab.id && sidebar_module_css_default.tabActive, pinned && sidebar_module_css_default.pinnedTab),
								title: tab.title,
								draggable: !pinned,
								onDragStart: pinned ? void 0 : (event) => {
									setTabDragging(true);
									event.dataTransfer.setData(TAB_DRAG_TYPE, serializeDrag({
										tabId: tab.id,
										paneId
									}));
									event.dataTransfer.effectAllowed = "move";
								},
								onDragEnd: () => {
									setTabDragging(false);
									setDragOver(false);
								},
								onDragOver: (event) => {
									event.preventDefault();
									event.stopPropagation();
								},
								onDrop: (event) => {
									if (pinned) {
										event.stopPropagation();
										return;
									}
									event.preventDefault();
									event.stopPropagation();
									setTabDragging(false);
									const payload = parseDrag(event.dataTransfer.getData(TAB_DRAG_TYPE));
									if (payload !== null) onDropTab(payload, tab.id);
								},
								onClick: () => {
									onActivate(tab.id);
								},
								onMouseDown: (event) => {
									if (event.button === 1) {
										event.preventDefault();
										middlePressed.current = {
											id: tab.id,
											node: event.currentTarget
										};
									}
								},
								onContextMenu: (event) => {
									event.preventDefault();
									setMenuOpen(false);
									setTabMenu({
										tabId: tab.id,
										x: event.clientX,
										y: event.clientY
									});
								},
								children: [
									pinned && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPinOutline16, { size: 16 }),
									getTabIcon?.(tab) ?? null,
									getTabBadge?.(tab) ?? null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: sidebar_module_css_default.tabTitle,
										children: tab.title
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: sidebar_module_css_default.tabClose,
										"aria-label": t("close"),
										onClick: (event) => {
											event.stopPropagation();
											onClose(tab.id);
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
									})
								]
							}, tab.id);
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: menuOpen,
							onClose: () => {
								setMenuOpen(false);
							},
							items: newTabOptions.map((option) => ({
								id: option.id,
								label: option.label,
								...option.disabled === true ? { disabled: true } : {},
								...option.icon !== void 0 ? { icon: option.icon } : {}
							})),
							onSelect: (id) => {
								onNewTab(id);
								setMenuOpen(false);
							},
							portal: true,
							compact: true,
							align: "end",
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.tabBarPlus,
								"aria-label": t("newTab"),
								title: t("newTab"),
								onClick: () => {
									setMenuOpen((v) => !v);
									setTabMenu(null);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: tabMenu !== null && tabMenuIndex >= 0,
							onClose: () => {
								setTabMenu(null);
							},
							items: (() => {
								const targetTab = tabMenuIndex >= 0 ? tabs[tabMenuIndex] : void 0;
								const isTerminal = targetTab?.type === "terminal";
								const isPinnedVirtual = targetTab !== void 0 && isPinnedVirtualTab(targetTab);
								const pinEntries = isTerminal && onPinTab !== void 0 ? targetTab.pin !== void 0 ? [{
									id: "unpin",
									label: t("unpinTerminal")
								}] : [{
									id: "pin",
									label: isAgentTabId(targetTab.id) ? t("pinAgentTerminal") : t("pinTerminal"),
									submenu: [{
										id: "pinWorkspace",
										label: t("pinToWorkspace")
									}, {
										id: "pinGlobal",
										label: t("pinToGlobal")
									}]
								}] : [];
								if (isPinnedVirtual) return [...pinEntries, {
									id: "close",
									label: t("close")
								}];
								return [
									...pinEntries,
									{
										id: "close",
										label: t("close")
									},
									{
										id: "closeOthers",
										label: t("closeOtherTabs"),
										...tabs.length <= 1 ? { disabled: true } : {}
									},
									{
										id: "closeLeft",
										label: t("closeLeftTabs"),
										...tabMenuIndex <= 0 ? { disabled: true } : {}
									},
									{
										id: "closeRight",
										label: t("closeRightTabs"),
										...tabMenuIndex >= tabs.length - 1 ? { disabled: true } : {}
									}
								];
							})(),
							onSelect: (id) => {
								const target = tabMenu;
								if (target === null) return;
								setTabMenu(null);
								const index = tabs.findIndex((tab) => tab.id === target.tabId);
								if (index < 0) return;
								if (id === "pinWorkspace") onPinTab?.(target.tabId, "workspace");
								else if (id === "pinGlobal") onPinTab?.(target.tabId, "global");
								else if (id === "unpin") onPinTab?.(target.tabId, null);
								else if (id === "close") onClose(target.tabId);
								else if (id === "closeOthers") {
									for (const tab of tabs) if (tab.id !== target.tabId) onClose(tab.id);
								} else if (id === "closeLeft") for (const tab of tabs.slice(0, index)) onClose(tab.id);
								else if (id === "closeRight") for (const tab of tabs.slice(index + 1)) onClose(tab.id);
							},
							portal: true,
							compact: true,
							align: "start",
							getAnchorRect: () => tabMenu === null ? null : new DOMRect(tabMenu.x, tabMenu.y, 0, 0),
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/split-pane.tsx
		/**
		* The split-pane workbench: renders the recursive split tree. A split lays
		* children out row- or column-wise with draggable dividers (fractional
		* sizes); a leaf renders its tab strip plus the active tab's content.
		*
		* Splitting is VSCode-style DRAG-TO-EDGE, not buttons: while dragging a tab
		* over a pane, a drop overlay shows five zones — four edges (left/right/up/
		* down) that split the pane with the tab in a fresh leaf, and the center
		* that merges the tab into the pane. The tree and all operations live in
		* state.ts; this file is pure presentation over them.
		*/
		/** One divider: pointer-capture drag translating px deltas into fractions.
		* Deltas are incremental — each move reports the displacement since the
		* previous move — because the store adds every reported delta to the pane
		* sizes; a cumulative (since-pointer-down) delta would be re-added on each
		* move and the divider would run away from the cursor.
		*
		* The moves are BATCHED per frame (createFrameBatcher): a pointer stream
		* fires faster than the display refresh, and applying each move is a store
		* reduce that re-renders both workbenches (terminals, editors, trees) per
		* event — the visible drag lag on slower CPUs (#315). The batch accumulates
		* the incremental deltas in a ref and applies the summed fraction at most
		* once per frame; the sum equals what the per-event application would have
		* produced (the reducer clamps each application, and at a settled position
		* a clamped sum is clamped to the same boundary), so the result is
		* indistinguishable at rest and at most one frame behind the cursor.
		*/
		function Divider(props) {
			const { dir, onResize } = props;
			const last = (0, react.useRef)({
				x: 0,
				y: 0,
				size: 0
			});
			const [dragging, setDragging] = (0, react.useState)(false);
			const pendingDelta = (0, react.useRef)(0);
			const batcher = (0, react.useRef)(createFrameBatcher()).current;
			(0, react.useEffect)(() => () => batcher.dispose(), [batcher]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: clsx(sidebar_module_css_default.divider, dir === "row" ? sidebar_module_css_default.dividerRow : sidebar_module_css_default.dividerCol, dragging && sidebar_module_css_default.dividerActive),
				onPointerDown: (event) => {
					event.preventDefault();
					event.currentTarget.setPointerCapture(event.pointerId);
					const box = event.currentTarget.parentElement?.getBoundingClientRect();
					last.current = {
						x: event.clientX,
						y: event.clientY,
						size: box === void 0 ? 1 : dir === "row" ? box.width : box.height
					};
					setDragging(true);
				},
				onPointerMove: (event) => {
					if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
					const delta = dir === "row" ? event.clientX - last.current.x : event.clientY - last.current.y;
					pendingDelta.current += delta;
					batcher.schedule(() => {
						const accumulated = pendingDelta.current;
						pendingDelta.current = 0;
						if (accumulated !== 0) onResize(accumulated / Math.max(1, last.current.size));
					});
					last.current.x = event.clientX;
					last.current.y = event.clientY;
				},
				onPointerUp: (event) => {
					if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
					batcher.flushNow();
					event.currentTarget.releasePointerCapture(event.pointerId);
					setDragging(false);
				}
			});
		}
		/** Map a pointer position inside a pane to the VSCode drop zone (25% edges). */
		function zoneAt(event, pane) {
			const rect = pane.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return "center";
			const x = (event.clientX - rect.left) / rect.width;
			const y = (event.clientY - rect.top) / rect.height;
			if (x < .25) return "left";
			if (x > .75) return "right";
			if (y < .25) return "up";
			if (y > .75) return "down";
			return "center";
		}
		/** The icon of one openable type card (mirror of the + menu options). */
		/**
		* An empty pane's welcome cards: the openable types as cards, clicked to
		* open (instead of a bare "this pane is empty" message).
		*/
		function PaneEmptyCards(props) {
			const { newTabOptions, onNewTab } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: sidebar_module_css_default.paneEmptyCards,
				children: newTabOptions.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: sidebar_module_css_default.paneCard,
					disabled: option.disabled === true,
					title: option.label,
					onClick: () => {
						onNewTab(option.id);
					},
					children: [option.icon ?? null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: option.label })]
				}, option.id))
			});
		}
		/** A leaf: tab strip + active content + VSCode-style drop target for tabs. */
		function LeafView(props) {
			const { leaf, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge } = props;
			const [dropZone, setDropZone] = (0, react.useState)(null);
			const activeTab = leaf.tabs.find((tab) => tab.id === leaf.active) ?? leaf.tabs[leaf.tabs.length - 1];
			(0, react.useEffect)(() => {
				const clear = () => {
					setDropZone(null);
				};
				window.addEventListener("dragend", clear, true);
				window.addEventListener("drop", clear, true);
				window.addEventListener("blur", clear);
				return () => {
					window.removeEventListener("dragend", clear, true);
					window.removeEventListener("drop", clear, true);
					window.removeEventListener("blur", clear);
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(sidebar_module_css_default.pane, dropZone !== null && sidebar_module_css_default.paneDrop),
				"data-dsh-pane": leaf.id,
				onPointerDown: () => {
					actions.focusPane(leaf.id);
				},
				onDragOver: (event) => {
					event.preventDefault();
					const zone = zoneAt(event, event.currentTarget);
					setDropZone(zone);
				},
				onDragLeave: (event) => {
					if (!event.currentTarget.contains(event.relatedTarget)) setDropZone(null);
				},
				onDrop: (event) => {
					event.preventDefault();
					const zone = dropZone ?? zoneAt(event, event.currentTarget);
					setDropZone(null);
					const payload = parseDrag(event.dataTransfer.getData("application/x-dsh-tab"));
					if (payload !== null) actions.moveTabToEdge(payload, leaf.id, zone);
				},
				children: [
					dropZone !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: clsx(sidebar_module_css_default.dropOverlay, sidebar_module_css_default[`drop${dropZone[0].toUpperCase()}${dropZone.slice(1)}`]) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabBar, {
						paneId: leaf.id,
						tabs: leaf.tabs,
						active: leaf.active,
						onActivate: (tabId) => {
							actions.activateTab(leaf.id, tabId);
						},
						onClose: (tabId) => {
							actions.closeTab(leaf.id, tabId);
						},
						onNewTab,
						newTabOptions,
						getTabIcon,
						getTabBadge,
						onDropTab: (payload, before) => {
							if (before === null) actions.moveTabToEdge(payload, leaf.id, "center");
							else actions.moveTabBefore(payload, leaf.id, before);
						},
						onPinTab: actions.pinTab
					}),
					leaf.tabs.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sidebar_module_css_default.paneContent,
						children: leaf.tabs.map((tab) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: clsx(sidebar_module_css_default.paneTab, tab.id !== activeTab?.id && sidebar_module_css_default.paneTabHidden),
							children: renderTab(tab, tab.id === activeTab?.id, leaf.id)
						}, tab.id))
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneEmptyCards, {
						newTabOptions,
						onNewTab
					})
				]
			});
		}
		/** Recursive node renderer. */
		function NodeView(props) {
			const { node, state, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge } = props;
			if (node.kind === "leaf") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LeafView, {
				leaf: node,
				newTabOptions,
				actions,
				onNewTab,
				renderTab,
				getTabIcon,
				getTabBadge
			});
			const isRow = node.dir === "row";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: clsx(sidebar_module_css_default.split, isRow ? sidebar_module_css_default.splitRow : sidebar_module_css_default.splitCol),
				children: node.children.map((child, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [index > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Divider, {
					dir: node.dir,
					onResize: (deltaFrac) => {
						actions.resizeSplit(node.id, index - 1, deltaFrac);
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.splitChild,
					style: {
						flexGrow: node.sizes[index],
						flexBasis: 0,
						minWidth: 0,
						minHeight: 0
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeView, {
						node: child,
						state,
						newTabOptions,
						actions,
						onNewTab,
						renderTab,
						getTabIcon,
						getTabBadge
					})
				})] }, child.id))
			});
		}
		/** The workbench: the split tree filling the sidebar body. `tree` selects
		*  which tree renders (the right panel's by default; the bottom panel passes
		*  `state.bottomSplits` — the actions route by pane id, so one action set
		*  serves both). */
		function Workbench(props) {
			const { state, tree, newTabOptions, actions, onNewTab, renderTab, getTabIcon, getTabBadge } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: sidebar_module_css_default.workbench,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeView, {
					node: tree ?? state.bottomSplits,
					state,
					newTabOptions,
					actions,
					onNewTab,
					renderTab,
					getTabIcon,
					getTabBadge
				})
			});
		}
		/** Whether a viewport width is narrow (mobile). */
		function isNarrowWidth(width) {
			return width < 768;
		}
		/**
		* Live narrow-viewport flag for components. Reads `window.innerWidth` and
		* re-measures on resize (rAF-throttled, the repo's existing drag pattern).
		* Deliberately avoids `matchMedia` (jsdom does not implement it) — the
		* resize listener is equally exact for a breakpoint that never changes
		* while the page is open.
		*/
		function useViewportSize() {
			const [size, setSize] = (0, react.useState)(() => ({
				width: typeof window === "undefined" ? 0 : window.innerWidth,
				height: typeof window === "undefined" ? 0 : window.innerHeight
			}));
			(0, react.useEffect)(() => {
				if (typeof window === "undefined") return;
				let frame = null;
				const measure = () => {
					frame = null;
					setSize({
						width: window.innerWidth,
						height: window.innerHeight
					});
				};
				const onResize = () => {
					if (frame === null) frame = requestAnimationFrame(measure);
				};
				window.addEventListener("resize", onResize);
				return () => {
					window.removeEventListener("resize", onResize);
					if (frame !== null) cancelAnimationFrame(frame);
				};
			}, []);
			return size;
		}
		//#endregion
		//#region src/client/layout-push.ts
		/**
		* Size written to `--dsh-sidebar-height`. The conversation column (output +
		* composer) must keep at least {@link CONVERSATION_MIN} of the viewport after
		* the bottom workbench claims height; a closed workbench pushes 0. The right
		* column belongs to DSH's native Sidebar, so this shell pushes no width.
		*/
		function finiteNonNegative(value) {
			return Number.isFinite(value) ? Math.max(0, value) : 0;
		}
		/** Compute the live layout-push height for the bottom workbench. */
		function bottomPushHeight(input) {
			if (!input.open) return 0;
			const viewportHeight = finiteNonNegative(input.viewportHeight);
			const maxHeight = Math.max(0, viewportHeight - Math.min(280, viewportHeight));
			return Math.min(finiteNonNegative(input.height), maxHeight);
		}
		//#endregion
		//#region src/client/desktop-env.ts
		let cached;
		/** Read the shell's desktop stamps (memoized per page; SSR-safe). */
		function parseDesktopEnv() {
			if (cached !== void 0) return cached;
			const hasWindow = typeof window !== "undefined";
			const hasPreloadMarker = hasWindow && typeof window.__DSH_DESKTOP_FILE_PATH__ !== "undefined";
			const params = hasWindow ? new URLSearchParams(window.location.search.replace(/^\?/, "")) : new URLSearchParams();
			const modeParam = params.get("dsh-desktop-mode");
			const mode = modeParam === "compatibility" || modeParam === "advanced" ? modeParam : null;
			const platformParam = params.get("dsh-desktop-platform");
			const platform = platformParam !== null && platformParam !== "" ? platformParam.toLowerCase() : null;
			cached = {
				desktop: mode !== null || hasPreloadMarker,
				mode,
				platform,
				titlebarInset: parseTitlebarInset(params.get("dsh-desktop-titlebar-inset"))
			};
			return cached;
		}
		/** Clamp the contract inset parameter into 0–120 (invalid/absent → 0). */
		function parseTitlebarInset(raw) {
			if (raw === null) return 0;
			const parsed = Number(raw);
			if (!Number.isFinite(parsed)) return 0;
			return Math.min(120, Math.max(0, Math.round(parsed)));
		}
		//#endregion
		//#region src/client/wco.ts
		/** Snapshot when the API is unavailable (plain browser / non-overlay shell). */
		const WCO_NONE = Object.freeze({
			present: false,
			height: 0
		});
		let source;
		let snapshot = WCO_NONE;
		let attached = false;
		let sourceListener;
		const listeners = /* @__PURE__ */ new Set();
		function read() {
			if (source === void 0) return WCO_NONE;
			try {
				if (source.visible !== true) return {
					present: false,
					height: 0
				};
				const rect = source.getTitlebarAreaRect();
				const height = Math.round(rect.height);
				return Number.isFinite(height) && height > 0 ? {
					present: true,
					height
				} : {
					present: true,
					height: 0
				};
			} catch {
				return {
					present: false,
					height: 0
				};
			}
		}
		function onGeometryChange() {
			snapshot = read();
			emit();
		}
		function emit() {
			for (const listener of listeners) listener();
		}
		/** Attach the native geometrychange listener (once). */
		function attach() {
			if (attached) return;
			attached = true;
			const candidate = source ?? navigator.windowControlsOverlay;
			if (candidate === void 0) return;
			source = candidate;
			sourceListener = onGeometryChange;
			snapshot = read();
			source.addEventListener("geometrychange", sourceListener);
		}
		/** Detach the native listener (last subscriber left or source swapped). */
		function detach() {
			if (source !== void 0 && sourceListener !== void 0) source.removeEventListener("geometrychange", sourceListener);
			sourceListener = void 0;
			attached = false;
		}
		/** Read the current snapshot (returns the frozen NONE when unavailable). */
		function getWcoSnapshot() {
			return snapshot;
		}
		/**
		* Subscribe to overlay geometry changes. Attaches to the real
		* `navigator.windowControlsOverlay` on first subscribe; the disposer
		* detaches the native listener when the last subscriber leaves.
		*/
		function subscribeWco(onChange) {
			listeners.add(onChange);
			attach();
			return () => {
				listeners.delete(onChange);
				if (listeners.size === 0) detach();
			};
		}
		//#endregion
		//#region src/client/shell-presets.ts
		/**
		* Built-in desktop-shell presets for the "位置兼容模式" secondary setting
		* (scheme `preset`). DATA-DRIVEN by design: each shell's adaptation lives
		* in one entry (strip values / optional CSS), the core applies it through
		* the SAME generic strip variable and CSS-injection mechanism — adding a
		* shell is adding data, never a code path.
		*
		* Inclusion rule (maintained in docs/external-plugin-guide.md §12): only shells that (a) appear
		* in this repo's issues/PRs (a user actually hit a problem) and (b) have
		* 100+ GitHub stars (a real user base). The mechanism is opt-in: auto
		* detection never applies a preset — the settings badge only SUGGESTS it.
		*/
		const PRESETS = [{
			id: "dsh-desktop",
			title: "DeepSeek Harness Desktop",
			desc: () => t("presetDshDesktopDesc"),
			stripFor: (env) => {
				if (env.mode !== "advanced") return void 0;
				if (env.platform === "darwin") return 20;
				if (env.platform === "win32") return 32;
			},
			detect: (env) => env.mode === "advanced"
		}];
		/** All built-in shell presets (registration order = settings list order). */
		function getShellPresets() {
			return PRESETS;
		}
		/** One preset by id, or undefined for an unknown/empty id. */
		function getShellPreset(id) {
			return PRESETS.find((preset) => preset.id === id);
		}
		/** The strip the active preset contributes for the given environment. */
		function presetStripFor(preset, env) {
			return preset?.stripFor?.(env);
		}
		//#endregion
		//#region src/client/titlebar-strip.ts
		function computeTitleBarStrip(env, wco, scheme, preset, customStripPx) {
			if (scheme === "web") return 0;
			if (wco.present) return wco.height;
			if (env.titlebarInset > 0) return env.titlebarInset;
			if (scheme === "preset") return presetStripFor(preset, env) ?? 0;
			if (scheme === "custom") return customStripPx;
			return 0;
		}
		//#endregion
		//#region src/client/OrphanedTab.tsx
		function OrphanedTab(props) {
			const { tab } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sidebar_module_css_default.editor,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: sidebar_module_css_default.editorHeader,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.editorTitle,
						title: tab.type,
						children: tab.title
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: sidebar_module_css_default.editorPlaceholder,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("pluginNotLoaded") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
						className: sidebar_module_css_default.orphanedType,
						children: tab.type
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/RenderBoundary.tsx
		/**
		* The generic render error boundary for the sidebar tree: a render error in
		* the wrapped subtree shows a dismissible error strip (retry re-renders the
		* children) instead of blanking the shell. Used at two scopes:
		*
		* - ROOT (index.tsx, `css.boundaryError`): last-resort containment for
		*   errors in the sidebar shell itself (Workbench, drag layout, …) — a full
		*   swap keeps the page alive.
		* - PER-TAB (Sidebar.tsx TabContent, `css.tabBoundaryError`): a crashing
		*   viewer/editor shows a strip inside ITS OWN pane; the workbench shell, the
		*   other tabs, and the panel itself stay alive (issue #31 — a tab crash
		*   must never take down the whole sidebar).
		*
		* The className prop selects the strip's geometry: the root's full-height
		* fixed rail vs. the tab's pane-filling block.
		*/
		var RenderBoundary = class extends react.Component {
			state = { error: null };
			static getDerivedStateFromError(error) {
				return { error: error instanceof Error ? error.message : String(error) };
			}
			componentDidCatch(error, info) {
				console.error("[dsh-better-sidebar] render error:", error, info.componentStack);
			}
			render() {
				if (this.state.error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: this.props.className,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["dsh-better-sidebar: ", this.state.error] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: sidebar_module_css_default.terminalRetry,
						onClick: () => {
							this.setState({ error: null });
						},
						children: t("terminalRetry")
					})]
				});
				return this.props.children;
			}
		};
		//#endregion
		//#region src/client/tab-content-memo.ts
		/** True when the cell may skip a re-render (all render-affecting fields
		*  unchanged). Callback/context identities are deliberately ignored: their
		*  captured dependencies are stable or covered by the compared fields
		*  (onReferenceFile → sessionId/cwd, onSubagentJump/onToggleDir → stable
		*  refs/closures, onOpenDiff → paneId). */
		function tabContentCompare(prev, next) {
			return prev.tab === next.tab && prev.paneId === next.paneId && prev.sessionId === next.sessionId && prev.cwd === next.cwd && prev.visible === next.visible && prev.expanded === next.expanded && prev.revealed === next.revealed && prev.localeRevision === next.localeRevision && prev.tabsVersion === next.tabsVersion && prev.effectiveTabId === next.effectiveTabId;
		}
		//#endregion
		//#region src/client/sidebar/TabContent.tsx
		/**
		* The tab-content cell + the + menu builder, extracted from Sidebar.tsx
		* (behavior identical): one memoized cell dispatches a tab to its registry
		* descriptor's component, and buildNewTabOptions derives the + menu rows
		* from the same registry.
		*/
		/** Render the content of one tab (dispatched by type). */
		const TabContent = (0, react.memo)(function TabContent(props) {
			const { tab, effectiveTabId, sessionId, cwd, expanded, revealed, onToggleDir, onReferenceFile, ctx, store, visible, onSubagentJump, onOpenDiff } = props;
			const scope = {
				sessionId,
				cwd
			};
			const descriptor = ctx.get("betterSidebar")?.getTab(tab.type);
			if (descriptor === void 0 || typeof descriptor.component !== "function") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OrphanedTab, {
				ctx,
				store,
				scope,
				tab,
				visible
			});
			const componentTab = effectiveTabId !== void 0 ? {
				...tab,
				id: effectiveTabId
			} : tab;
			return (0, react.createElement)(RenderBoundary, { className: sidebar_module_css_default.tabBoundaryError }, (0, react.createElement)(descriptor.component, {
				ctx,
				store,
				scope,
				tab: componentTab,
				visible,
				expanded,
				revealed,
				onToggleDir,
				onReferenceFile,
				onOpenDiff,
				onSubagentJump
			}));
		}, tabContentCompare);
		/** The + menu options for the current state, driven by the tab registry.
		* Hidden tabs (editor/diff) never show; `available` returning false shows
		* a disabled row (e.g. terminal at capacity) instead of hiding the option.
		* Tabs the user disabled in the side card settings are filtered out
		* entirely — re-enabling them is the settings page's job. */
		function buildNewTabOptions(state, ctx, scope) {
			const service = ctx.get("betterSidebar");
			if (service === void 0) return [];
			return service.getTabs().filter((d) => !d.hidden && service.isTabEnabled(d.id)).sort((a, b) => (a.order ?? 100) - (b.order ?? 100)).map((d) => ({
				id: d.id,
				label: typeof d.title === "function" ? d.title() : d.title,
				disabled: !(d.available?.(ctx, scope, state) ?? true),
				icon: typeof d.icon === "function" ? d.icon(14) : d.icon
			}));
		}
		//#endregion
		//#region src/client/center-column.ts
		/**
		* Anchor selectors for the DSH AppFrame conversation slot host, newest first:
		*
		* - DSH 0.1.5-alpha.2 replaced the root `conversation` slot with a root-scoped
		*   keyed `main` slot, so the conversation renders under `main.conversation`
		*   (ConversationPanel -> `renderSlot('main.conversation')`);
		* - alpha.1 and earlier spell the same host `conversation`.
		*
		* Both keys are accepted deliberately so one build spans the alpha.1 → alpha.2
		* boundary; only one exists in any given host.
		*/
		const CENTER_COLUMN_SELECTOR = "#root [data-slot=\"main.conversation\"], #root [data-slot=\"conversation\"]";
		/** Last full DOM validation for each center-column node. Weak keys avoid leaks. */
		const validatedAt = /* @__PURE__ */ new WeakMap();
		/**
		* The html-style watcher is an HMR/layout resync signal. Remember the last
		* fingerprint per document so a style change can bypass the connected-node
		* fast path immediately, without requiring Sidebar to run a second locator.
		*/
		const documentStyleState = /* @__PURE__ */ new WeakMap();
		/**
		* From the matched conversation slot host, walk up through transparent slot
		* hosts to the real column: DSH slot hosts render with `display: contents`,
		* so on alpha.2 the `main.conversation` host (and any further keyed slot
		* wrappers above it) contributes no box, and the center column is the first
		* ancestor whose computed display is NOT `contents`.
		*/
		function columnOfSlotHost(host) {
			const view = host.ownerDocument.defaultView;
			let node = host.parentElement;
			while (node !== null && (view?.getComputedStyle(node).display ?? "") === "contents") node = node.parentElement;
			return node;
		}
		/**
		* Resolve the AppFrame center column while keeping streaming mutations cheap.
		*
		* Sidebar intentionally keeps both recovery mechanisms that predate #403:
		* the `#root` subtree MutationObserver catches boot/HMR DOM swaps, and the
		* 1.5s interval is a last-resort safety net for interleavings no observer is
		* guaranteed to see (#248). The expensive part was letting every scheduled
		* locate scan `#root` with querySelector at streaming-token cadence.
		*
		* Once a connected column is cached, normal calls therefore reuse it without
		* a document query. A full query is still forced when either:
		* - the cached node disconnects;
		* - `<html style>` changes (the existing HMR/layout resync signal); or
		* - 1.5s has elapsed since the last full validation (the safety-net cadence).
		*
		* This preserves recovery semantics while bounding whole-tree selector work
		* to low-frequency validation instead of chat mutation frequency.
		*/
		function resolveCenterColumn(current, options = {}) {
			const doc = options.document ?? current?.ownerDocument ?? document;
			const now = (options.now ?? Date.now)();
			const revalidateMs = options.revalidateMs ?? 1500;
			const htmlStyle = (options.htmlStyle ?? (() => doc.documentElement.getAttribute("style")))();
			const previousStyle = documentStyleState.get(doc);
			const styleChanged = previousStyle !== void 0 && previousStyle !== htmlStyle;
			documentStyleState.set(doc, htmlStyle);
			if (current !== null && current.isConnected) {
				const lastValidation = validatedAt.get(current);
				if (lastValidation === void 0 && !styleChanged) {
					validatedAt.set(current, now);
					return current;
				}
				if (!styleChanged && lastValidation !== void 0 && now - lastValidation < revalidateMs) return current;
			}
			const host = (options.query ?? (() => doc.querySelector(CENTER_COLUMN_SELECTOR)))();
			const col = host === null || host === void 0 ? null : columnOfSlotHost(host);
			if (col === null || col === void 0 || !col.isConnected) return void 0;
			validatedAt.set(col, now);
			return col;
		}
		//#endregion
		//#region src/client/sidebar/use-center-column.ts
		/**
		* Center-column tracking (extracted from Sidebar.tsx, behavior identical):
		* the bottom workbench spans ONLY the app shell's center column ("squeezes
		* the agent output area") — it starts at the app sidebar's right edge and
		* ends at the details column's left edge. Measured directly from the
		* AppFrame's center column DOM (center-column.ts anchors on the conversation
		* slot host — `main.conversation` on DSH 0.1.5-alpha.2+, `conversation` on
		* alpha.1 — and walks up the transparent `display: contents` slot hosts to
		* the column; layout.css's center column) so the workbench tracks the
		* column's
		* real horizontal edges, including the animated track moves while DSH's
		* native right Sidebar opens/closes; a frame that never appears keeps the
		* initial zero-size fallback (the panel renders at 0 width until measured).
		* The rect lives in a REF (not state): the open/close transition resizes
		* the center column EVERY frame for its duration, and reacting per frame
		* with setState re-renders the whole Sidebar (every mounted tab) at
		* animation cadence — the visible toggle jank (#315). measureCenter
		* writes the bottom panel's edges directly (same DOM-write pattern as
		* applyDrag), so the panel still tracks the column per frame with zero
		* React work; `centerMeasured` flips ONCE to gate the hidden→visible
		* first-paint fallback.
		*/
		function useCenterColumn(bottomRef, bottomOpen) {
			const centerRectRef = (0, react.useRef)({
				left: 0,
				right: 0
			});
			const [centerMeasured, setCenterMeasured] = (0, react.useState)(false);
			const centerColRef = (0, react.useRef)(null);
			const draggingRef = (0, react.useRef)(false);
			const measureCenter = (0, react.useCallback)(() => {
				if (draggingRef.current) return;
				const col = centerColRef.current;
				if (col === null) return;
				if (!col.isConnected) {
					centerColRef.current = null;
					return;
				}
				const rect = col.getBoundingClientRect();
				centerRectRef.current = {
					left: rect.left,
					right: rect.right
				};
				const bottom = bottomRef.current;
				if (bottom !== null) {
					bottom.style.setProperty("left", `${rect.left}px`);
					bottom.style.setProperty("right", `${window.innerWidth - rect.right}px`);
				}
				setCenterMeasured((prev) => prev ? prev : true);
			}, [bottomRef]);
			(0, react.useEffect)(() => {
				let disposed = false;
				let observer;
				const locate = () => {
					if (disposed) return;
					const col = resolveCenterColumn(centerColRef.current);
					if (col === void 0 || !col.isConnected) {
						if (centerColRef.current !== null) {
							centerColRef.current.removeAttribute("data-dsh-center-col");
							centerColRef.current = null;
							observer?.disconnect();
							observer = void 0;
						}
						return;
					}
					if (centerColRef.current !== col) {
						centerColRef.current?.removeAttribute("data-dsh-center-col");
						centerColRef.current = col;
						col.setAttribute("data-dsh-center-col", "");
						observer?.disconnect();
						observer = new ResizeObserver(measureCenter);
						observer.observe(col);
						measureCenter();
					}
				};
				locate();
				let locateFrame = null;
				const scheduleLocate = () => {
					if (locateFrame !== null) return;
					if (draggingRef.current) return;
					locateFrame = requestAnimationFrame(() => {
						locateFrame = null;
						locate();
					});
				};
				const watcher = new MutationObserver(scheduleLocate);
				const root = document.getElementById("root");
				if (root !== null) watcher.observe(root, {
					childList: true,
					subtree: true
				});
				const htmlStyleWatcher = new MutationObserver(scheduleLocate);
				htmlStyleWatcher.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ["style"]
				});
				const retry = window.setInterval(locate, 1500);
				return () => {
					disposed = true;
					if (locateFrame !== null) cancelAnimationFrame(locateFrame);
					window.clearInterval(retry);
					observer?.disconnect();
					watcher.disconnect();
					htmlStyleWatcher.disconnect();
					centerColRef.current?.removeAttribute("data-dsh-center-col");
					centerColRef.current = null;
				};
			}, [measureCenter, bottomOpen]);
			return {
				centerColRef,
				centerRectRef,
				centerMeasured,
				measureCenter,
				draggingRef
			};
		}
		//#endregion
		//#region src/client/sidebar/use-host-feeds.ts
		/**
		* Host-feed subscriptions (extracted from Sidebar.tsx, behavior identical):
		* the WebSocket pushes (agent terminals, agent opens) and the session-list
		* driven auto-activation triggers (subagent, background jobs, topology
		* jump-back). All of it reacts to the host's live feeds for the CURRENT
		* session; the sidebar shell only consumes the returned jump-back ref.
		*/
		/** How many consecutive reconnect failures stop the agent-terminals push loop
		* (mirror of the terminal view's own cap; the loop restarts on session switch). */
		const FAILURE_LIMIT = 3;
		/**
		* Subagent auto-open debounce (ms). The host delivers a new child's origin
		* and its title in SEPARATE frames: a Side Chat thread's first visible
		* frame still shows a fallback title (no 'Side: ' prefix), so an immediate
		* 0→N decision mistakes it for a genuine subagent and pops the task page.
		* The trigger therefore re-evaluates against the live snapshot once the
		* title frame has had time to land.
		*/
		const AUTO_OPEN_DEBOUNCE_MS = 500;
		/**
		* Activate the Tasks page (the `subagent` tab type) in DSH's native right
		* Sidebar — the landing the two auto-open switches promise: the right column
		* IS the sidebar the user means, while the plugin's own bottom workbench only
		* serves its own flows (its `+` menu and the first-expansion terminal). Every
		* other open in this plugin already lands there, so a `target: 'bottom'` here
		* puts the Tasks page in the bottom bar instead.
		*
		* A background activation must not take over a narrow viewport: below 768px
		* the host draws that column FULLSCREEN, so the tab is placed and the column
		* is put back to collapsed — parked, waiting behind the expand control,
		* instead of covering the chat. The host expands on every open
		* (`openContent` plans `setExpanded(true)`) and offers no option to suppress
		* it, hence the read-then-restore pair: both commits land in one React batch,
		* so the column never renders the intermediate state. The viewport is read
		* when the activation FIRES (the debounced subagent trigger included), so a
		* resize while arming is honoured.
		*
		* @param ctx - the client context (`ctx.sidebarRight` + `ctx.betterSidebar`).
		* @param sessionId - the session the feed reports the activity for.
		* @param options.background - `true` for background activity (parks on narrow
		*   viewports); `false` for the explicit topology jump-back, which is a user
		*   gesture and always leaves the column as the host expanded it.
		*/
		function activateTasksPage(ctx, sessionId, options) {
			const column = ctx.get("sidebarRight");
			const park = options.background && ctx.sessions.list.getSnapshot().current === sessionId && isNarrowWidth(window.innerWidth) && column?.isExpanded?.() === false;
			ctx.get("betterSidebar")?.openTab({
				type: "subagent",
				title: t("subagent")
			});
			// Fenglin: feed-driven activation must not leave the right column expanded.
			// Host openContent always expands; collapse after the host commit lands.
			try {
				if (options.background || park) {
					const collapse = () => {
						try {
							if (column?.isExpanded?.() === true) column?.toggleExpanded?.();
						} catch {}
					};
					collapse();
					window.setTimeout(collapse, 0);
					window.setTimeout(collapse, 50);
				}
			} catch {}
		}
		function useHostFeeds(feeds) {
			const { ctx, store, sessionList, sessionId } = feeds;
			/**
			* Agent terminals push: subscribe to the host's live list of agent-owned
			* terminals for this session (created by the model through the
			* `terminal_create` tool). The host pushes a JSON array on every
			* create / close / exit; the sidebar reconciles the list into tabs
			* (id `agent:<uuid>`, title from the agent). A disconnected socket
			* retries with a short backoff so a refresh or transient drop reattaches
			* the same shell without losing the agent's work — capped like the
			* terminal view's own reconnect loop, so a refused endpoint never spins
			* forever (the next session switch restarts the loop).
			* While the terminal tab type is disabled in settings, pushes add / remove
			* no tabs — but the authoritative wait map is STILL mirrored (see the
			* branch below); re-enabling makes the next push converge on both.
			*/
			(0, react.useEffect)(() => {
				if (sessionId === void 0) return;
				let socket = null;
				let retry;
				let closed = false;
				let failures = 0;
				const connect = () => {
					if (closed) return;
					const url = new URL("/sidebar/ws/agent-terminals", location.origin);
					url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
					url.search = new URLSearchParams({ sessionId }).toString();
					socket = new WebSocket(url.toString());
					socket.onmessage = (event) => {
						if (typeof event.data !== "string") return;
						try {
							const list = JSON.parse(event.data);
							if (!Array.isArray(list)) return;
							store.reduce((s) => ctx.get("betterSidebar")?.isTabEnabled("terminal") === false ? mirrorAgentWaits(s, list) : reconcileAgentTerminals(s, list));
						} catch {}
					};
					socket.onclose = () => {
						if (closed) return;
						failures += 1;
						if (failures >= FAILURE_LIMIT) {
							console.error("[dsh-better-sidebar] agent-terminals connection failed; stopping reconnect loop", sessionId);
							return;
						}
						retry = window.setTimeout(connect, 2e3);
					};
					socket.onerror = () => {
						socket?.close();
					};
				};
				connect();
				return () => {
					closed = true;
					window.clearTimeout(retry);
					socket?.close();
				};
			}, [
				sessionId,
				ctx,
				store
			]);
			/**
			* Agent opens push: subscribe to the host's `sidebar_open` requests for
			* this session (the model actively opens a file / folder / HTTP(S) page).
			* The host pushes one JSON request per open; the sidebar routes it to the
			* matching built-in tab: a file opens in the editor (per-path dedupe), a
			* folder opens a file window whose tree is rooted at the folder
			* (`meta.dir`), and a URL opens in the browser tab. A disconnected socket
			* retries with a short backoff (mirror of the agent-terminals loop): the
			* host queue keeps undelivered requests and replays them on the first
			* attach, so a refresh or a session switch lands the opens the model
			* queued while no view was connected.
			* While the side-card setting is off, pushes are ignored as a defensive
			* gate — the host already unregisters the tool and drains the queue.
			*/
			(0, react.useEffect)(() => {
				if (sessionId === void 0) return;
				let socket = null;
				let retry;
				let closed = false;
				let failures = 0;
				const connect = () => {
					if (closed) return;
					const url = new URL("/sidebar/ws/agent-opens", location.origin);
					url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
					url.search = new URLSearchParams({ sessionId }).toString();
					socket = new WebSocket(url.toString());
					socket.onmessage = (event) => {
						if (typeof event.data !== "string") return;
						try {
							const request = JSON.parse(event.data);
							if (request === null || typeof request !== "object") return;
							if (request.kind !== "file" && request.kind !== "folder" && request.kind !== "url") return;
							if (typeof request.target !== "string" || request.target === "") return;
							if (store.getPrefs().agentOpenTools !== true) return;
							const scope = { sessionId };
							const title = typeof request.title === "string" && request.title !== "" ? request.title : void 0;
							if (request.kind === "url") ctx.get("betterSidebar")?.openTab({
								type: "browser",
								url: request.target,
								title
							}, scope);
							else if (request.kind === "folder") ctx.get("betterSidebar")?.openTab({
								type: "editor",
								title,
								path: request.target,
								id: `editor:${request.target}`,
								meta: { dir: true }
							}, scope);
							else ctx.get("betterSidebar")?.openFile(scope, request.target, title);
						} catch {}
					};
					socket.onclose = () => {
						if (closed) return;
						failures += 1;
						if (failures >= FAILURE_LIMIT) {
							console.error("[dsh-better-sidebar] agent-opens connection failed; stopping reconnect loop", sessionId);
							return;
						}
						retry = window.setTimeout(connect, 2e3);
					};
					socket.onerror = () => {
						socket?.close();
					};
				};
				connect();
				return () => {
					closed = true;
					window.clearTimeout(retry);
					socket?.close();
				};
			}, [
				sessionId,
				ctx,
				store
			]);
			/**
			* Subagent auto-activation: the moment the current conversation spawns its
			* FIRST direct subagent (a 0 → N transition on the list feed), the "auto
			* open" pref is on, and the Tasks tab type is enabled in settings, activate
			* the Tasks page in DSH's native right Sidebar. Single-instance semantics
			* focus an existing tab in place; a new tab lands in that column and is
			* never duplicated. Landing it EXPANDS the column on wide viewports, while
			* a narrow viewport (where the host draws that column fullscreen) parks the
			* tab instead of taking the screen over — see {@link activateTasksPage}.
			* Switching to a session that already has subagents never triggers — its
			* baseline starts at the current count — so a deliberate layout is never
			* fought.
			*
			* The decision is DEBOUNCED (AUTO_OPEN_DEBOUNCE_MS): a Side Chat thread
			* is also a subagent-origin child, and its 'Side: ' title lands one frame
			* after its origin — an immediate check would misread that first frame as
			* a new subagent and pop this page on every thread creation. The timer
			* re-evaluates the ORIGINAL baseline against the live snapshot; by then
			* the title filter (isSideThreadSummary) sees the settled label.
			*/
			const listBaselineRef = (0, react.useRef)(void 0);
			const autoOpenPendingRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const prev = listBaselineRef.current;
				listBaselineRef.current = sessionList;
				if (sessionId === void 0 || prev === void 0) return;
				if (autoOpenPendingRef.current !== null) return;
				if (!detectNewDirectSubagent(prev, sessionList, sessionId)) return;
				const baseline = prev;
				const timer = window.setTimeout(() => {
					autoOpenPendingRef.current = null;
					if (!detectNewDirectSubagent(baseline, ctx.sessions.list.getSnapshot(), sessionId)) return;
					if (!store.getPrefs().autoOpenSubagent) return;
					if (ctx.get("betterSidebar")?.isTabEnabled("subagent") === false) return;
					activateTasksPage(ctx, sessionId, { background: true });
				}, AUTO_OPEN_DEBOUNCE_MS);
				autoOpenPendingRef.current = {
					baseline,
					timer
				};
			}, [
				sessionList,
				sessionId,
				store,
				ctx
			]);
			(0, react.useEffect)(() => () => {
				const pending = autoOpenPendingRef.current;
				if (pending !== null) window.clearTimeout(pending.timer);
				autoOpenPendingRef.current = null;
			}, [sessionId]);
			/**
			* Job auto-activation: the moment a NEW background job appears for the
			* current conversation (a job id the previous snapshot lacked), the
			* auto-open pref is on, and the Tasks tab type is enabled, activate the Tasks
			* page that contains the background-jobs section — in DSH's native right
			* Sidebar, expanded on wide viewports and parked on narrow ones exactly like
			* the subagent trigger ({@link activateTasksPage}). Unlike that trigger
			* (0 → N only), ANY new job id triggers: the agent may start several jobs in
			* one session, and each should surface. A fresh page load never triggers —
			* its baseline starts at the current snapshot.
			*/
			const jobBaselineRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				const prev = jobBaselineRef.current;
				jobBaselineRef.current = sessionList;
				if (sessionId === void 0 || prev === void 0) return;
				if (!detectNewJob(prev, sessionList, sessionId)) return;
				if (!store.getPrefs().autoOpenJobs) return;
				if (ctx.get("betterSidebar")?.isTabEnabled("subagent") === false) return;
				activateTasksPage(ctx, sessionId, { background: true });
			}, [
				sessionList,
				sessionId,
				store,
				ctx
			]);
			/**
			* Topology jump-back: clicking a subagent node on the Subagent page calls
			* the official `openSubagent`, which switches the sidebar to that child
			* session's OWN layout (a fresh child session defaults to the explorer).
			* The README contract says the Subagent page must stay open with the jumped
			* node highlighted — so once the current session becomes the recorded jump
			* target, re-open the Tasks page on top of the child's layout, in DSH's
			* native right Sidebar. This one is an explicit user gesture, so it always
			* takes the host's expansion (no narrow-viewport parking). Only this node
			* click arms the flag, so switching to a subagent session by any other means
			* keeps that session's own layout untouched.
			*/
			const subagentJumpRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				const pending = subagentJumpRef.current;
				if (pending === void 0 || sessionId !== pending) return;
				subagentJumpRef.current = void 0;
				activateTasksPage(ctx, sessionId, { background: false });
			}, [
				sessionId,
				store,
				ctx
			]);
			return { subagentJumpRef };
		}
		//#endregion
		//#region src/client/sidebar/use-pinned-tabs.ts
		/**
		* Inline pinned terminals (extracted from Sidebar.tsx, behavior identical):
		* pinned tabs from OTHER sessions inject as VIRTUAL tabs into the first
		* leaf of the bottom workbench's split tree, and the workbench actions are
		* wrapped so virtual ids route back to the HOME session. The shell only
		* consumes the augmented tree and the wrapped actions.
		*/
		function usePinnedTabs(input) {
			const { store, sessionId, cwd, snapshot, actions } = input;
			const state = snapshot.state;
			/**
			* Inline pinned terminals (v0.17.0+): pinned tabs from OTHER sessions
			* inject as VIRTUAL tabs into the first leaf of the bottom workbench's
			* split tree. The virtual tabs have unique ids (prefixed with the home session)
			* and carry the home scope in meta. Clicking a virtual tab sets
			* `activePinnedTabId` — the augmented tree overrides the leaf's `active`
			* so the pinned tab's content renders in-place (TerminalView connects to
			* the home session's PTY via WS, no session jump).
			*
			* Closing/unpinning a virtual tab targets the HOME session via reduceFor
			* (which doesn't notify — targeted opens must not re-render the active
			* session). The `pinnedRevision` state bump forces the pinnedEntries
			* useMemo to recompute after such an action.
			*/
			const [activePinnedTabId, setActivePinnedTabId] = (0, react.useState)(null);
			const [pinnedRevision, setPinnedRevision] = (0, react.useState)(0);
			/**
			* Cross-session pinned-tab collection. Recomputed on every store notify,
			* session-list change, and pinned action (the revision bump covers
			* reduceFor updates that don't notify). Only tabs from OTHER sessions —
			* the viewer's own pinned tabs are already on its tab strip.
			*/
			const pinnedEntries = (0, react.useMemo)(() => {
				if (sessionId === void 0) return [];
				return collectPinnedTabs(store.getSessionStates(), {
					sessionId,
					cwd
				});
			}, [
				store,
				sessionId,
				cwd,
				snapshot,
				pinnedRevision
			]);
			/** Virtual SidebarTab objects for the pinned entries (stable references
			*  via useMemo so TabContent's memo comparator holds). */
			const pinnedVirtualTabs = (0, react.useMemo)(() => pinnedEntries.map(createPinnedVirtualTab), [pinnedEntries]);
			return {
				augmentedTree: (0, react.useMemo)(() => state === void 0 ? void 0 : injectPinnedIntoTree(state.bottomSplits, pinnedVirtualTabs, activePinnedTabId), [
					state,
					pinnedVirtualTabs,
					activePinnedTabId
				]),
				wrappedActions: (0, react.useMemo)(() => {
					if (pinnedVirtualTabs.length === 0) return actions;
					const closePinnedInHome = (virtualId) => {
						const { homeSessionId, tabId: originalId } = parsePinnedVirtualId(virtualId);
						const vtab = pinnedVirtualTabs.find((t) => t.id === virtualId);
						const homeCwd = vtab !== void 0 ? getPinnedHomeScope(vtab)?.cwd : void 0;
						store.reduceFor(homeSessionId, (s) => {
							const leaf = leafWithTab(s.bottomSplits, originalId);
							return leaf === void 0 ? s : closeTab(s, leaf.id, originalId);
						});
						if (isAgentTabId(originalId)) api.agentPtyClose(agentUuidOf(originalId)).catch(() => {});
						else api.ptyClose({
							sessionId: homeSessionId,
							...homeCwd !== void 0 ? { cwd: homeCwd } : {}
						}, originalId).catch(() => {});
						if (activePinnedTabId === virtualId) setActivePinnedTabId(null);
						setPinnedRevision((v) => v + 1);
					};
					return {
						...actions,
						activateTab: (paneId, tabId) => {
							if (isPinnedVirtualId(tabId)) setActivePinnedTabId(tabId);
							else {
								setActivePinnedTabId(null);
								actions.activateTab(paneId, tabId);
							}
						},
						closeTab: (paneId, tabId) => {
							if (isPinnedVirtualId(tabId)) closePinnedInHome(tabId);
							else actions.closeTab(paneId, tabId);
						},
						moveTabBefore: (payload, toPane, beforeTabId) => {
							if (isPinnedVirtualId(payload.tabId)) return;
							if (isPinnedVirtualId(beforeTabId)) actions.moveTabToEdge(payload, toPane, "center");
							else actions.moveTabBefore(payload, toPane, beforeTabId);
						},
						moveTabToEdge: (payload, toPane, zone) => {
							if (isPinnedVirtualId(payload.tabId)) return;
							actions.moveTabToEdge(payload, toPane, zone);
						},
						pinTab: (tabId, scope) => {
							if (isPinnedVirtualId(tabId)) {
								if (scope !== null) return;
								const { homeSessionId, tabId: originalId } = parsePinnedVirtualId(tabId);
								store.reduceFor(homeSessionId, (s) => setTabPin(s, originalId, null));
								if (activePinnedTabId === tabId) setActivePinnedTabId(null);
								setPinnedRevision((v) => v + 1);
							} else actions.pinTab?.(tabId, scope);
						}
					};
				}, [
					actions,
					pinnedVirtualTabs,
					activePinnedTabId,
					store
				])
			};
		}
		//#endregion
		//#region src/client/Sidebar.tsx
		/**
		* The sidebar shell: ONE surface — the bottom workbench docked to the
		* conversation column.
		*
		* DSH 0.1.5 owns the right column: its native Sidebar hosts every tab type
		* this plugin registers (client/native/), so this shell renders no right
		* panel of its own. What remains plugin-owned is the bottom workbench: it
		* spans ONLY the AppFrame's center column (the agent output area), from the
		* app shell's own left sidebar to the details column's left edge, so neither
		* sidebar gives up any position. Its height drags from its top edge, and the
		* expand/collapse control is a header button registered into DSH's
		* `conversation.session.header.utilities` list slot
		* (sidebar/bottom-toggle.tsx) — the header's right corner belongs to the
		* native sidebar's own expand control.
		*
		* The panel is mounted inside the unified panel host — a fixed,
		* viewport-sized containing block ([data-dsh-panel-host]) appended to
		* document.body — instead of a fixed-position element, so a desktop shell's
		* intermediate wrapper transforms can never hijack its containing block.
		* The whole layout lives in the per-session store, so switching
		* conversations swaps the workbench.
		*
		* The shell binds the workbench actions to the store and dispatches tab
		* content to the views. New tabs come from the + menu (explorer / git /
		* terminal; editors open from the explorer).
		*/
		/**
		* OS file drags over the sidebar belong to the sidebar, not to the chat:
		* DSH's composer (InputBar) listens for file drags on the DOCUMENT and
		* answers with a full-screen "drop image here" mask plus image intake on
		* drop. The panel host swallows the whole event quartet —
		* enter/over/leave/drop — so the region is a black hole to that document
		* listener. All four must be stopped: InputBar keeps an enter/leave depth
		* counter, and a leave that escapes without its matching enter unbalances
		* the count (this was the full-screen mask flickering over the sidebar).
		* The conversation column keeps DSH's native overlay and intake untouched;
		* gated on the 'Files' type so in-app drags (tab reorder, split zones)
		* propagate exactly as before.
		*/
		const swallowOsFileDrag = (event) => {
			if (!(event.dataTransfer?.types.includes("Files") ?? false)) return;
			event.preventDefault();
			event.stopPropagation();
		};
		/** The four drag events a file drag must never carry past the panel host. */
		const osFileDragShield = {
			onDragEnter: swallowOsFileDrag,
			onDragOver: swallowOsFileDrag,
			onDragLeave: swallowOsFileDrag,
			onDrop: swallowOsFileDrag
		};
		/**
		* Append one user-space stylesheet (preset or custom CSS) as a tagged
		* `<style>` element. The tag attribute carries the source identity so the
		* running configuration is inspectable in DevTools; the returned tag is
		* removed by the caller's effect cleanup.
		*/
		function injectUserCss(attr, id, cssText) {
			const tag = document.createElement("style");
			tag.setAttribute(attr, id);
			tag.textContent = cssText;
			document.head.appendChild(tag);
			return tag;
		}
		function Sidebar(props) {
			const { ctx, store } = props;
			const localeRevision = (0, react.useSyncExternalStore)((0, react.useMemo)(() => (callback) => ctx.locale.subscribe(callback), [ctx]), (0, react.useCallback)(() => ctx.locale.getSnapshot().active, [ctx]));
			const betterLocaleStore = typeof ctx.get === "function" ? ctx.get("betterLocale") : void 0;
			(0, react.useSyncExternalStore)((0, react.useMemo)(() => {
				const store = betterLocaleStore;
				if (store === void 0) return (_cb) => () => {};
				return (callback) => store.subscribe(callback);
			}, [betterLocaleStore]), (0, react.useMemo)(() => {
				const store = betterLocaleStore;
				if (store === void 0) return () => void 0;
				return () => store.active;
			}, [betterLocaleStore]));
			const [tabsVersion, setTabsVersion] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				const service = ctx.get("betterSidebar");
				if (service === void 0) return;
				return service.subscribe(() => setTabsVersion((version) => version + 1));
			}, [ctx]);
			const viewport = useViewportSize();
			const [keyboardInset, setKeyboardInset] = (0, react.useState)(0);
			const [visualViewportHeight, setVisualViewportHeight] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const vv = window.visualViewport;
				if (vv === null || vv === void 0) return;
				let frame = null;
				const measure = () => {
					frame = null;
					const inset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
					setKeyboardInset(inset > 1 ? Math.round(inset) : 0);
					setVisualViewportHeight(Math.max(0, Math.round(vv.height)));
				};
				const onResize = () => {
					if (frame === null) frame = requestAnimationFrame(measure);
				};
				vv.addEventListener("resize", onResize);
				vv.addEventListener("scroll", onResize);
				measure();
				return () => {
					vv.removeEventListener("resize", onResize);
					vv.removeEventListener("scroll", onResize);
					if (frame !== null) cancelAnimationFrame(frame);
				};
			}, []);
			const layoutViewportHeight = visualViewportHeight ?? viewport.height;
			const sessionList = (0, react.useSyncExternalStore)((0, react.useMemo)(() => (callback) => ctx.sessions.list.subscribe(callback), [ctx]), (0, react.useCallback)(() => ctx.sessions.list.getSnapshot(), [ctx]));
			const current = sessionList.current;
			const snapshot = (0, react.useSyncExternalStore)((0, react.useCallback)((callback) => store.subscribe(callback), [store]), (0, react.useCallback)(() => store.getSnapshot(), [store]));
			(0, react.useEffect)(() => {
				store.setSession(current);
			}, [current, store]);
			const state = snapshot.state;
			const sessionId = snapshot.sessionId;
			const summaryCwd = sessionId === void 0 ? void 0 : sessionList.byId[sessionId]?.cwd;
			const desktopEnv = parseDesktopEnv();
			const wco = (0, react.useSyncExternalStore)((0, react.useMemo)(() => subscribeWco, []), getWcoSnapshot);
			const scheme = snapshot.prefs.titleBarScheme;
			const preset = scheme === "preset" ? getShellPreset(snapshot.prefs.titleBarPresetId) : void 0;
			const titleBarStrip = computeTitleBarStrip(desktopEnv, wco, scheme, preset, snapshot.prefs.titleBarStripPx);
			const titleBarCompat = titleBarStrip > 0;
			(0, react.useEffect)(() => {
				const root = document.documentElement;
				if (titleBarCompat) {
					document.body.setAttribute("data-dsh-title-bar-compat", "");
					root.style.setProperty("--dsh-title-bar-strip", `${titleBarStrip}px`);
				} else {
					document.body.removeAttribute("data-dsh-title-bar-compat");
					root.style.removeProperty("--dsh-title-bar-strip");
				}
				return () => {
					document.body.removeAttribute("data-dsh-title-bar-compat");
					root.style.removeProperty("--dsh-title-bar-strip");
				};
			}, [titleBarCompat, titleBarStrip]);
			const presetCss = scheme === "preset" ? preset?.css ?? "" : "";
			const customCss = scheme === "custom" ? snapshot.prefs.customCss : "";
			(0, react.useEffect)(() => {
				const tags = [];
				if (presetCss !== "") tags.push(injectUserCss("data-dsh-preset-css", preset?.id ?? "", presetCss));
				if (customCss !== "") tags.push(injectUserCss("data-dsh-custom-css", "custom", customCss));
				return () => {
					for (const tag of tags) tag.remove();
				};
			}, [
				presetCss,
				customCss,
				preset?.id
			]);
			const [fetchedCwd, setFetchedCwd] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				setFetchedCwd(void 0);
				if (sessionId === void 0 || summaryCwd !== void 0) return;
				let cancelled = false;
				api.sessionCwd({ sessionId }).then((result) => {
					if (!cancelled) setFetchedCwd(result.cwd);
				}).catch(() => {});
				return () => {
					cancelled = true;
				};
			}, [sessionId, summaryCwd]);
			const cwd = summaryCwd ?? fetchedCwd;
			const newTabOptions = (0, react.useMemo)(() => state === void 0 || sessionId === void 0 ? [] : buildNewTabOptions(state, ctx, {
				sessionId,
				cwd
			}), [
				state,
				ctx,
				sessionId,
				cwd
			]);
			const { subagentJumpRef } = useHostFeeds({
				ctx,
				store,
				sessionList,
				sessionId
			});
			const bottomRef = (0, react.useRef)(null);
			const { centerRectRef, centerMeasured, measureCenter, draggingRef } = useCenterColumn(bottomRef, state?.bottomOpen);
			/**
			* Bottom-panel first-expansion auto terminal: the FIRST time the user
			* expands the bottom panel in a session, try to open a fresh terminal tab
			* there. "Try" is literal — the terminal's own quota and enable switch
			* gate the attempt (a full quota or a disabled terminal type makes it a
			* no-op). Gated on the bottomPanelAutoTerminal pref (the terminal tab's
			* nested settings toggle, default on). Only a false→true TRANSITION fires
			* (a panel persisted open never counts as an expansion), and the session's
			* bottomOpenedOnce flag is set atomically with the first fire so later
			* expansions never repeat it.
			*/
			const bottomWasOpenRef = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				if (state === void 0) return;
				const wasOpen = bottomWasOpenRef.current;
				bottomWasOpenRef.current = state.bottomOpen;
				if (wasOpen === void 0 || wasOpen || !state.bottomOpen) return;
				if (state.bottomOpenedOnce) return;
				if (store.getPrefs().bottomPanelAutoTerminal === false) return;
				if (ctx.get("betterSidebar")?.isTabEnabled("terminal") === false) return;
				store.reduce((s) => ({
					...s,
					activePane: firstLeaf(s.bottomSplits).id,
					bottomOpenedOnce: true
				}));
				ctx.get("betterSidebar")?.openTab({
					type: "terminal",
					target: "bottom"
				});
			}, [
				state,
				store,
				ctx
			]);
			const bottomDrag = (0, react.useRef)({
				startY: 0,
				startHeight: 0
			});
			const [draggingBottom, setDraggingBottom] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				draggingRef.current = draggingBottom;
				if (!draggingBottom) measureCenter();
			}, [
				draggingBottom,
				measureCenter,
				draggingRef
			]);
			const clampHeight = (height) => Math.min(Math.max(120, Math.round(height)), Math.max(120, window.innerHeight - 280));
			/** Single writer for the layout-push variable: the app shell gives up the
			*  workbench's height while it is open (0 while collapsed) through
			*  layout.css's margin on the center column. Every size change — drag
			*  frames and committed state — flows through here so the push never
			*  forks between paths. The right column is DSH's native Sidebar, so no
			*  width is written. */
			const writeGeometry = (height) => {
				document.documentElement.style.setProperty("--dsh-sidebar-height", `${height}px`);
			};
			/** Last height a drag actually applied to the DOM (updated by applyDrag).
			*  When a pointer stream dies without any position info (issue #247: an
			*  ultra-fast flick whose release events carried no usable coordinates),
			*  the abort path adopts this instead of rolling back to the pre-drag
			*  value — the DOM's current size is the only truthful record left. */
			const lastDragHeight = (0, react.useRef)(null);
			/** Apply a drag height to the DOM without touching React state or the
			*  store. The layout push rides the shared writer (writeGeometry). */
			const applyDrag = (height) => {
				lastDragHeight.current = height;
				bottomRef.current?.style.setProperty("height", `${height}px`);
				const push = state?.bottomOpen === true ? height + keyboardInset : 0;
				writeGeometry(push);
			};
			const dragFrame = (0, react.useRef)(null);
			const pendingDrag = (0, react.useRef)(null);
			const scheduleDrag = (height) => {
				pendingDrag.current = height;
				if (dragFrame.current !== null) return;
				dragFrame.current = requestAnimationFrame(() => {
					dragFrame.current = null;
					const pending = pendingDrag.current;
					if (pending !== null) {
						pendingDrag.current = null;
						applyDrag(pending);
					}
				});
			};
			/** Flush any pending drag write and stop scheduling (the store commit on
			*  pointer up applies the final clamped values). */
			const stopDragScheduling = () => {
				if (dragFrame.current !== null) {
					cancelAnimationFrame(dragFrame.current);
					dragFrame.current = null;
				}
				pendingDrag.current = null;
			};
			/**
			* Finalize the drag on pointer up: flush the LAST drag frame to the DOM
			* synchronously, then commit the SAME clamped value to the store. A fast
			* release cancels the rAF before it ran — without the flush the DOM would
			* sit at the pre-drag size until React re-renders with the committed
			* value, and a value that never made it into a move handler would never
			* be applied at all. The measurement pause ends here too: the center
			* column is re-measured BEFORE the committed re-render lands, so the
			* panel's React-rendered edges already reflect the new height.
			*/
			const commitDrag = (height) => {
				stopDragScheduling();
				applyDrag(height);
				draggingRef.current = false;
				measureCenter();
				store.reduce((s) => setBottomHeight(s, height));
			};
			/** Set once a drag's pointerup handler commits — premature capture loss
			*  (pointercancel / lostpointercapture without pointerup) must then be told
			*  apart from a normal release. */
			const dragCommitted = (0, react.useRef)(false);
			/**
			* Abort a drag whose pointer stream was interrupted (pointercancel, or
			* capture lost before pointerup): no pointerup will arrive, so without
			* this the dragging state would stick true and center-column measurement
			* would stay paused forever — the panel freezes at stale edges and stops
			* tracking layout changes.
			*
			* A FAST release is the common trigger: browsers merge pointermove bursts,
			* and an ultra-fast flick can cancel the stream before ANY move lands.
			* The commit order is therefore: the LAST KNOWN dragged size (the rAF
			* pending value) first, then the interrupting event's own pointer
			* position (only pointercancel is trusted to carry coordinates —
			* lostpointercapture's coordinates are not guaranteed, so the handlers
			* pass the event only from pointercancel), and finally the size the drag
			* last APPLIED to the DOM (lastDragHeight). A drag that produced none of
			* those (pure down+up at the same spot) commits the store's own height —
			* a no-op, never an explicit rollback (issue #247).
			*
			* Every commit path marks the drag committed, so the interrupt
			* double-fire (pointercancel → lostpointercapture) cannot commit once
			* and then roll the same drag back.
			*/
			const abortDrag = (reset, event) => {
				if (dragCommitted.current) return;
				const pending = pendingDrag.current;
				let height;
				if (pending !== null) height = pending;
				else if (event !== void 0) height = clampHeight(bottomDrag.current.startHeight + (bottomDrag.current.startY - event.clientY));
				if (height !== void 0) {
					dragCommitted.current = true;
					stopDragScheduling();
					applyDrag(height);
					draggingRef.current = false;
					measureCenter();
					store.reduce((s) => setBottomHeight(s, height));
				} else {
					dragCommitted.current = true;
					stopDragScheduling();
					const adopted = clampHeight(lastDragHeight.current ?? state?.bottomHeight ?? 120);
					applyDrag(adopted);
					draggingRef.current = false;
					measureCenter();
					store.reduce((s) => setBottomHeight(s, adopted));
				}
				reset();
			};
			(0, react.useEffect)(() => {
				const height = bottomPushHeight({
					open: snapshot.state?.bottomOpen === true,
					height: snapshot.state?.bottomHeight ?? 0,
					viewportHeight: layoutViewportHeight
				});
				writeGeometry(snapshot.state?.bottomOpen === true ? height + keyboardInset : 0);
			}, [
				snapshot.state?.bottomOpen,
				snapshot.state?.bottomHeight,
				layoutViewportHeight,
				keyboardInset
			]);
			(0, react.useEffect)(() => {
				return () => {
					document.documentElement.style.removeProperty("--dsh-sidebar-height");
				};
			}, []);
			(0, react.useEffect)(() => {
				if (draggingBottom) document.body.setAttribute("data-dsh-sidebar-dragging", "");
				else document.body.removeAttribute("data-dsh-sidebar-dragging");
			}, [draggingBottom]);
			const { augmentedTree, wrappedActions } = usePinnedTabs({
				store,
				sessionId,
				cwd,
				snapshot,
				actions: (0, react.useMemo)(() => ({
					closeTab: (paneId, tabId) => {
						const current = store.getSnapshot().state;
						const tab = (current === void 0 ? void 0 : leafWithTab(current.bottomSplits, tabId))?.tabs.find((candidate) => candidate.id === tabId);
						ctx.get("betterSidebar")?.closeTab(tabId, sessionId === void 0 ? void 0 : {
							sessionId,
							cwd
						});
						if (tab?.type === "terminal") {
							if (isAgentTabId(tabId)) {
								const uuid = agentUuidOf(tabId);
								api.agentPtyClose(uuid).catch(() => {});
							} else if (sessionId !== void 0) api.ptyClose({
								sessionId,
								cwd
							}, tabId).catch(() => {});
						}
					},
					activateTab: (paneId, tabId) => {
						ctx.get("betterSidebar")?.activateTab(tabId, sessionId === void 0 ? void 0 : {
							sessionId,
							cwd
						});
					},
					focusPane: (paneId) => {
						store.reduce((s) => ({
							...s,
							activePane: paneId
						}));
					},
					moveTabToEdge: (payload, toPane, zone) => {
						store.reduce((s) => moveTabToEdge(s, payload.paneId, payload.tabId, toPane, zone));
					},
					moveTabBefore: (payload, toPane, beforeTabId) => {
						store.reduce((s) => {
							let index = -1;
							const source = leafWithTab(s.bottomSplits, beforeTabId);
							if (source !== void 0 && source.id === toPane) index = source.tabs.findIndex((tab) => tab.id === beforeTabId);
							return moveTab(s, payload.paneId, payload.tabId, toPane, index);
						});
					},
					resizeSplit: (splitId, index, deltaFrac) => {
						store.reduce((s) => resizeSplitIn(s, splitId, index, deltaFrac));
					},
					pinTab: (tabId, scope) => {
						store.reduce((s) => setTabPin(s, tabId, scope === null ? null : {
							scope,
							homeCwd: cwd
						}));
					}
				}), [
					store,
					sessionId,
					cwd,
					ctx
				])
			});
			/**
			* The explorer's @-reference button. Directories append the folder mention
			* (`@dir/`) as plain text so DSH's folder decoration and completion keep
			* working; files insert a structured chip like the native `@` picker, so
			* the whole reference stays one link instead of decorating only the
			* leading folder. Resolves the session-scope ctx and the conversation
			* input service at click time; a missing service or scope degrades to a
			* logged no-op, never a crash. Defined above the no-session early return
			* — a hook must never sit behind a conditional return (React counts hooks
			* per render).
			*/
			const referenceInChat$1 = (0, react.useCallback)((path, isDir) => {
				if (sessionId === void 0) return;
				referenceInChat(ctx, sessionId, cwd, path, isDir);
			}, [
				ctx,
				sessionId,
				cwd
			]);
			if (state === void 0 || sessionId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-dsh-panel-host": true,
				...osFileDragShield
			});
			const bottomPanelHeight = bottomPushHeight({
				open: true,
				height: state.bottomHeight,
				viewportHeight: layoutViewportHeight
			});
			const onNewTab = (optionId) => {
				const service = ctx.get("betterSidebar");
				const descriptor = service?.getTab(optionId);
				if (service === void 0 || descriptor === void 0) return;
				const title = typeof descriptor.title === "function" ? descriptor.title() : descriptor.title;
				service.openTab({
					type: optionId,
					title,
					target: "bottom"
				}, {
					sessionId,
					cwd
				});
			};
			/**
			* The tab icon from the tab-type registry. An editor tab WITH a file path
			* (the per-path windows of split mode — `meta.dir` marks folder windows,
			* which keep the folder glyph) shows the same file icon the tree row shows
			* (`fileIcon`, feature `fileIcons`); every other tab uses its tab-type
			* descriptor icon.
			*/
			const tabIconOf = (tab) => {
				if (tab.type === "editor" && tab.path !== void 0 && tab.meta?.dir !== true) return ctx.get("betterSidebar")?.fileIcon(tab.path, 14) ?? null;
				const descriptor = ctx.get("betterSidebar")?.getTab(tab.type);
				if (descriptor === void 0) return null;
				return typeof descriptor.icon === "function" ? descriptor.icon(14) : descriptor.icon;
			};
			/**
			* The tab badge from the tab-type registry: a count (99+ capped) or a
			* short text pill. A throwing badge is swallowed (no pill) — the tab
			* strip must never break because a plugin's badge computation failed.
			*/
			const tabBadgeOf = (tab) => {
				if (isAgentTabId(tab.id)) {
					if (state.agentWaits?.[agentUuidOf(tab.id)] !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sidebar_module_css_default.tabBadge,
						children: "⏳"
					});
				}
				const descriptor = ctx.get("betterSidebar")?.getTab(tab.type);
				if (descriptor?.badge === void 0) return null;
				let value;
				try {
					value = descriptor.badge(ctx, {
						sessionId,
						cwd
					}, state);
				} catch (error) {
					console.error("[dsh-better-sidebar] tab badge error:", error);
					return null;
				}
				if (value === null || value === void 0 || value === "") return null;
				const text = typeof value === "number" ? value > 99 ? "99+" : String(value) : String(value);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: sidebar_module_css_default.tabBadge,
					children: text
				});
			};
			/**
			* Render one tab's content. `active` (from the workbench) tells whether
			* this tab is the active one in its pane; combined with the panel's
			* open/closed state it gates live views (the Subagent topology pauses its
			* polling while the page is not actually visible). The pane id travels
			* with the tab so diff tabs can split below their source pane.
			*/
			const renderTab = (tab, active, paneId) => {
				const home = getPinnedHomeScope(tab);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabContent, {
					tab,
					effectiveTabId: home?.tabId,
					paneId,
					sessionId: home?.sessionId ?? sessionId,
					cwd: home?.cwd ?? cwd,
					expanded: state.expanded,
					revealed: state.revealed ?? [],
					onToggleDir: (path) => {
						store.reduce((s) => toggleExpanded(s, path));
					},
					onReferenceFile: referenceInChat$1,
					ctx,
					store,
					visible: state.bottomOpen && active,
					onSubagentJump: (childSessionId) => {
						subagentJumpRef.current = childSessionId;
					},
					onOpenDiff: (diffTab) => {
						store.reduce((s) => openDiffTab(s, paneId, diffTab));
					},
					localeRevision,
					tabsVersion
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-dsh-panel-host": true,
				...osFileDragShield,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: bottomRef,
					className: clsx(sidebar_module_css_default.bottomPanel, !state.bottomOpen && sidebar_module_css_default.bottomPanelHidden),
					"data-dsh-panel": true,
					"data-dsh-bottom-panel": true,
					style: {
						height: bottomPanelHeight,
						left: centerRectRef.current.left,
						bottom: keyboardInset > 0 ? `${keyboardInset}px` : void 0,
						right: window.innerWidth - centerRectRef.current.right,
						visibility: centerMeasured ? void 0 : "hidden"
					},
					"data-dragging": draggingBottom || void 0,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: clsx(sidebar_module_css_default.bottomResize, draggingBottom && sidebar_module_css_default.bottomResizeActive),
							onPointerDown: (event) => {
								event.preventDefault();
								event.currentTarget.setPointerCapture(event.pointerId);
								dragCommitted.current = false;
								bottomDrag.current = {
									startY: event.clientY,
									startHeight: state.bottomHeight
								};
								setDraggingBottom(true);
							},
							onPointerMove: (event) => {
								if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
								const { startY, startHeight } = bottomDrag.current;
								scheduleDrag(clampHeight(startHeight + (startY - event.clientY)));
							},
							onPointerUp: (event) => {
								if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
								if (dragCommitted.current) return;
								dragCommitted.current = true;
								event.currentTarget.releasePointerCapture(event.pointerId);
								const { startY, startHeight } = bottomDrag.current;
								commitDrag(clampHeight(startHeight + (startY - event.clientY)));
								setDraggingBottom(false);
							},
							onPointerCancel: (event) => {
								abortDrag(() => setDraggingBottom(false), event);
							},
							onLostPointerCapture: () => {
								abortDrag(() => setDraggingBottom(false));
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: t("collapseBottomPanel"),
							side: "bottom",
							delayMs: 500,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: sidebar_module_css_default.bottomClose,
								"aria-label": t("collapseBottomPanel"),
								onClick: () => {
									store.reduce(toggleBottomPanel);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: sidebar_module_css_default.panelBody,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Workbench, {
								state,
								tree: augmentedTree,
								newTabOptions,
								actions: wrappedActions,
								onNewTab,
								renderTab,
								getTabIcon: tabIconOf,
								getTabBadge: tabBadgeOf
							})
						})
					]
				})
			});
		}
		/** The header control that expands/collapses the bottom workbench (see
		*  sidebar/bottom-toggle.tsx — registered into DSH's session header). */
		function fenglinSafeTooltip(tooltipProps, buttonEl) {
			const Tip = _deepseek_ai_dsh_client_ui_primitives?.Tooltip;
			if (typeof Tip !== "function") return buttonEl;
			try {
				return (0, react_jsx_runtime.jsx)(Tip, { ...tooltipProps, children: buttonEl });
			} catch {
				return buttonEl;
			}
		}
		function fenglinRealSid(value) {
			const syn = (v) => v === void 0 || v === null || v === "" || String(v) === "current" || String(v).startsWith("__fenglin");
			if (!syn(value)) return String(value);
			try {
				const g = globalThis.__dshBetterSidebarSessionId;
				if (typeof g === "function") {
					const raw = g();
					if (!syn(raw)) return String(raw);
				}
			} catch {}
			try {
				if (typeof SidebarStore.resolveCurrentSessionId === "function") {
					const raw = SidebarStore.resolveCurrentSessionId();
					if (!syn(raw)) return String(raw);
				}
			} catch {}
			return value;
		}
		function BottomDockToggle(props) {
			const { store } = props;
			const open = (0, react.useSyncExternalStore)((0, react.useCallback)((callback) => store.subscribe(callback), [store]), (0, react.useCallback)(() => store.getSnapshot(), [store])).state?.bottomOpen === true;
			const label = open ? t("collapseBottomPanel") : t("expandBottomPanel");
			const btn = (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: sidebar_module_css_default.toggleButton,
				"data-dsh-bottom-toggle": true,
				"data-active": open ? "true" : void 0,
				"aria-label": label,
				"aria-pressed": open,
				onClick: () => {
					try {
						const snap = store.getSnapshot();
						const syn = (v) => v === void 0 || v === null || v === "" || String(v) === "current" || String(v).startsWith("__fenglin");
						if (syn(snap.sessionId) || snap.state === void 0) {
							const real = fenglinRealSid(snap.sessionId);
							if (!syn(real)) store.setSession(real);
						}
					} catch {}
					store.reduce(toggleBottomPanel);
				},
				children: typeof IconPanelBottomOutline16 === "function"
					? (0, react_jsx_runtime.jsx)(IconPanelBottomOutline16, {})
					: null
			});
			return fenglinSafeTooltip({ label, side: "bottom", delayMs: 500 }, btn);
		}
		//#endregion
		//#region src/client/native/tab-adapter.tsx
		/**
		* The plugin's side of a native right-Sidebar tab.
		*
		* A plugin tab descriptor is one registration in the plugin's own registry
		* (`ctx.betterSidebar`); this module adapts the native tab record to that
		* descriptor's component contract. The native surface carries the tab's
		* record (id, kind, title, content identity, navigation params, lifetime
		* signal); the plugin's components expect a `SidebarTab` plus the explorer
		* state the plugin's own layout used to hold — both live here.
		*
		* The adapter owns three things the native layout does not carry:
		*
		* - a synthetic plugin `SidebarTab` per native tab id, minted from the native
		*   record + `navigation.params` and kept live across navigations, so a
		*   component that retitles itself (`updateTab`) or rewrites its path (the
		*   editor's in-place file switch) keeps working;
		* - the explorer's per-tab expansion/reveal sets;
		* - the per-kind instance counter behind titles like "Terminal 2".
		*
		* Nothing here is a singleton: the registry is created once per client
		* activation and handed to every registration.
		*/
		/** The chip glyph's size: the tab strip's own icon scale. */
		const CHIP_ICON_SIZE = 14;
		/** The editor kind: a chip for a file row shows the file's own glyph. */
		const EDITOR_KIND$1 = "editor";
		/** Create the record registry for one client activation. */
		function createNativeTabRecords() {
			const views = /* @__PURE__ */ new Map();
			const instances = /* @__PURE__ */ new Map();
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const listener of listeners) listener();
			};
			const put = (id, view) => {
				views.set(id, {
					...view,
					version: view.version + 1
				});
				notify();
			};
			return {
				ensure({ id, kind, title, params, scope, mint }) {
					const existing = views.get(id);
					if (existing === void 0) {
						const seeded = params?.title === void 0 && params?.meta === void 0 ? mint?.() : void 0;
						const meta = params?.meta ?? seeded?.meta;
						const minted = {
							tab: {
								id,
								type: kind,
								title: params?.title ?? seeded?.title ?? title,
								...params?.path === void 0 ? {} : { path: params.path },
								...params?.diff === void 0 ? {} : { diff: params.diff },
								...meta === void 0 ? {} : { meta }
							},
							scope,
							expanded: [],
							revealed: [],
							version: 0
						};
						views.set(id, minted);
						return minted;
					}
					const patch = {};
					if (params?.path !== void 0 && params.path !== existing.tab.path) patch.path = params.path;
					if (params?.diff !== void 0) patch.diff = params.diff;
					if (params?.url !== void 0) patch.meta = {
						...typeof existing.tab.meta === "object" && existing.tab.meta !== null ? existing.tab.meta : {},
						url: params.url
					};
					if (existing.scope.cwd !== scope.cwd) {
						views.set(id, {
							...existing,
							scope,
							tab: {
								...existing.tab,
								...patch
							}
						});
						return views.get(id);
					}
					if (Object.keys(patch).length === 0) return existing;
					const next = {
						...existing,
						tab: {
							...existing.tab,
							...patch
						}
					};
					views.set(id, next);
					return next;
				},
				get: (id) => views.get(id),
				has: (id) => views.has(id),
				update(id, patch) {
					const entry = views.get(id);
					if (entry === void 0) return;
					put(id, {
						...entry,
						tab: {
							...entry.tab,
							...patch
						}
					});
				},
				drop(id) {
					if (views.delete(id)) notify();
				},
				toggleExpanded(id, path) {
					const entry = views.get(id);
					if (entry === void 0) return;
					const expanded = entry.expanded.includes(path) ? entry.expanded.filter((candidate) => candidate !== path) : [...entry.expanded, path];
					put(id, {
						...entry,
						expanded
					});
				},
				nextInstance(kind) {
					const next = (instances.get(kind) ?? 0) + 1;
					instances.set(kind, next);
					return next;
				},
				versionOf: (id) => views.get(id)?.version ?? 0,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				}
			};
		}
		/** Subscribe a component to its own record's mutations. */
		function useRecordVersion(records, id) {
			return (0, react.useSyncExternalStore)((listener) => records.subscribe(listener), () => records.versionOf(id));
		}
		/** The current session's workspace root, live from the client session list. */
		function useSessionCwd(ctx, sessionId) {
			return (0, react.useSyncExternalStore)((0, react.useMemo)(() => (listener) => ctx.sessions.list.subscribe(listener), [ctx]), () => ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd);
		}
		/**
		* One plugin tab rendered inside the native right Sidebar: the descriptor's
		* own component with the plugin's props, over a synthetic record minted from
		* the native tab and dropped when the record ends.
		*/
		function NativeTabBody(props) {
			const { ctx, store, service, records, descriptorId, useTabInfo } = props;
			const info = useTabInfo();
			const nativeTab = info.tab;
			useRecordVersion(records, nativeTab.id);
			const sessionId = props.sessionIdOf?.(info) ?? props.sessionId;
			const cwd = useSessionCwd(ctx, sessionId);
			const scope = (0, react.useMemo)(() => ({
				sessionId,
				cwd
			}), [sessionId, cwd]);
			const derived = props.paramsOf?.(info);
			const params = derived === void 0 && nativeTab.navigation.params === void 0 ? void 0 : {
				...derived,
				...nativeTab.navigation.params
			};
			const descriptor = service.getTab(descriptorId);
			const view = records.ensure({
				id: nativeTab.id,
				kind: nativeTab.kind,
				title: nativeTab.title,
				params,
				scope,
				mint: () => {
					const state = store.getSnapshot().state;
					if (descriptor?.createTab === void 0 || state === void 0) return void 0;
					const minted = descriptor.createTab(state);
					return minted === null ? void 0 : {
						title: minted.tab.title,
						meta: minted.tab.meta
					};
				}
			});
			(0, react.useEffect)(() => () => {
				records.drop(nativeTab.id);
			}, [records, nativeTab.id]);
			if (descriptor === void 0 || typeof descriptor.component !== "function") return (0, react.createElement)("div", {
				className: sidebar_module_css_default.nativeTabHost,
				"data-dsh-native-tab-host": ""
			}, (0, react.createElement)(OrphanedTab, {
				ctx,
				store,
				scope,
				tab: view.tab,
				visible: nativeTab.visible
			}));
			return (0, react.createElement)(RenderBoundary, { className: sidebar_module_css_default.tabBoundaryError }, (0, react.createElement)("div", {
				className: sidebar_module_css_default.nativeTabHost,
				"data-dsh-native-tab-host": ""
			}, (0, react.createElement)(descriptor.component, {
				ctx,
				store,
				scope,
				tab: view.tab,
				visible: nativeTab.visible,
				expanded: view.expanded,
				revealed: view.revealed,
				onToggleDir: (path) => {
					records.toggleExpanded(nativeTab.id, path);
				},
				onReferenceFile: (path, isDir) => {
					referenceInChat(ctx, sessionId, cwd, path, isDir);
				},
				onOpenDiff: (tab) => {
					service.openTab({
						type: "diff",
						title: tab.title,
						id: tab.id,
						...tab.diff === void 0 ? {} : { diff: tab.diff }
					}, scope);
				},
				onSubagentJump: (childSessionId) => {
					service.openTab({
						type: "subagent",
						meta: { childSessionId }
					}, scope);
				}
			})));
		}
		/**
		* A live tab chip: the type's glyph followed by the synthetic record's title
		* (the editor rewrites it on an in-place file switch, the side chat on the
		* thread's first prompt). Without this registration the chip would keep the
		* title captured when the tab opened.
		*
		* The host's tab definition has no icon field — a chip is drawn from the
		* `title` text alone — but this slot IS the chip's content, so the glyph is
		* ours to add. Placement follows the plugin's own semantics: an editor tab
		* with a path shows that file's icon (the same glyph the tree row shows), and
		* every other tab shows its descriptor's icon. Both ride
		* `descriptor.icon`, so the workbench strip, the guide capsules and the chip
		* cannot drift apart.
		*/
		function NativeTabTitle(props) {
			const { records, service, descriptorId, useTabInfo } = props;
			const nativeTab = useTabInfo().tab;
			(0, react.useSyncExternalStore)((listener) => records.subscribe(listener), () => records.versionOf(nativeTab.id));
			const record = records.get(nativeTab.id);
			const title = record?.tab.title ?? nativeTab.title;
			const descriptor = service.getTab(descriptorId) ?? service.getTab(record?.tab.type ?? nativeTab.kind);
			const path = record?.tab.path;
			const glyph = (path !== void 0 && descriptorId === EDITOR_KIND$1 ? service.fileIcon(path, CHIP_ICON_SIZE) : void 0) ?? (typeof descriptor?.icon === "function" ? descriptor.icon(CHIP_ICON_SIZE) : descriptor?.icon);
			if (glyph === void 0 || glyph === null) return title;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: sidebar_module_css_default.chipIcon,
				"aria-hidden": "true",
				children: glyph
			}), title] });
		}
		//#endregion
		//#region src/client/resource-address.ts
		/**
		* The DSH resource-address grammar for files (`dsh-resource://file/…`).
		*
		* DSH's right Sidebar opens content by ADDRESS, and a file's address IS the
		* tab's content identity: the same address is the same tab. Two scopes exist:
		*
		* - `dsh-resource://file/session/<sessionId>/<path>` names a file by its path
		*   relative to that session's workspace root OR by its absolute path kept
		*   absolute inside the session scope (`src/a.ts` vs `/outside/a.ts` — the
		*   leading `/` survives; the host resolves it against the root it holds for
		*   the session);
		* - `dsh-resource://file/absolute/<path>` names a file by its absolute path
		*   with the leading `/` dropped (`absolute/home/me/x.txt`; Windows
		*   `absolute/C:/x/y.txt`; a UNC path keeps an empty first segment,
		*   `absolute//server/share/x.txt`). It carries no session. `fileAddressFor`
		*   no longer produces this scope on DSH 0.1.5-alpha.2, but it must keep
		*   parsing: legacy and third-party addresses still spell it.
		*
		* Every id and path segment is component-encoded, so a name carrying `#`, `?`
		* or a space survives the round trip; `:` stays literal so a drive letter
		* reads as written.
		*
		* The plugin parses these addresses itself instead of importing
		* `@deepseek-ai/dsh-util-workspace-path`: the client bundle's purity gate
		* forbids value-importing an unlisted `@deepseek-ai/*` package. This module
		* mirrors that package's implementation — `packages/util/workspace-path/src/file-address.ts`
		* and `fileAddressFor` in `packages/util/workspace-path/src/index.ts` in
		* DSH 0.1.5-alpha.2 (github.com/deepseek-ai/deepseek-harness, tag
		* `dsh-v0.1.5-alpha.2`) — and is pinned by tests/resource-address.spec.ts.
		*/
		/** The scheme and type every file address opens with. */
		const FILE_ADDRESS_PREFIX = "dsh-resource://file/";
		/** Component-encode one id or path segment, keeping `:` literal for drive letters. */
		function encodeSegment(segment) {
			return encodeURIComponent(segment).replace(/%3A/gi, ":");
		}
		/** Encode a `/`-separated path segment by segment. */
		function encodePath(path) {
			return path.split("/").map(encodeSegment).join("/");
		}
		/** Whether a decoded first path segment is a Windows drive (`C:`). */
		function isDriveSegment(segment) {
			return segment !== void 0 && /^[A-Za-z]:$/.test(segment);
		}
		/**
		* Build the address of a file read through one session.
		* @param sessionId - the session whose workspace root resolves the path.
		* @param path - absolute or workspace-relative path; backslashes are normalized
		*   to `/`, and leading `./` prefixes are dropped (a leading `/` is KEPT: an
		*   absolute path stays absolute inside the session scope).
		* @returns the `dsh-resource://file/session/<sessionId>/<path>` address.
		*/
		function sessionFileAddress(sessionId, path) {
			const normalized = path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
			return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`;
		}
		/**
		* Read a file address back into its parts without resolving `.` or `..`.
		* Query and fragment suffixes are ignored; encoded path segments are decoded.
		* @param address - a candidate address.
		* @returns the parts, or `undefined` when the string is not a
		*   `dsh-resource://file/` URI in a known scope with a path, or a segment is
		*   not validly encoded.
		*/
		function parseFileAddress(address) {
			try {
				if (!address.startsWith("dsh-resource://file/")) return void 0;
				const end = address.search(/[?#]/);
				const [scope, ...rest] = address.slice(20, end === -1 ? void 0 : end).split("/");
				if (scope === "session") {
					const [id, ...segments] = rest;
					if (id === void 0 || id === "" || segments.length === 0) return void 0;
					return {
						scope,
						sessionId: decodeURIComponent(id),
						path: segments.map(decodeURIComponent).join("/")
					};
				}
				if (scope === "absolute") {
					const unc = rest[0] === "" && rest.length > 1;
					const segments = (unc ? rest.slice(1) : rest).map(decodeURIComponent);
					if (segments.length === 0 || segments[0] === "") return void 0;
					if (unc) return {
						scope,
						path: `//${segments.join("/")}`
					};
					return {
						scope,
						path: isDriveSegment(segments[0]) ? segments.join("/") : `/${segments.join("/")}`
					};
				}
				return;
			} catch {
				return;
			}
		}
		/** Whether a path is absolute in either spelling the host accepts. */
		function isAbsolutePath(path) {
			return path.startsWith("/") || /^[A-Za-z]:[/\\]/.test(path) || path.startsWith("\\\\");
		}
		/**
		* The address for a path as a caller holds it: ALWAYS session-scoped. A
		* relative path, or an absolute path inside the session's workspace, becomes
		* the relative spelling; an absolute path outside it, or one whose workspace
		* root is unknown, keeps its absolute path in that session's address. (Mirror
		* of `fileAddressFor` — on alpha.2 this helper no longer produces the
		* `absolute` scope, though such addresses still parse.)
		* @param sessionId - the session the path is read in.
		* @param cwd - that session's workspace root, when known.
		* @param path - absolute or workspace-relative path, either separator spelling.
		* @returns the `dsh-resource://file/…` address.
		*/
		function fileAddressFor(sessionId, cwd, path) {
			const normalized = path.replace(/\\/g, "/");
			if (!isAbsolutePath(normalized)) return sessionFileAddress(sessionId, normalized);
			const root = cwd === void 0 ? "" : cwd.replace(/\\/g, "/").replace(/\/+$/, "");
			if (root !== "" && normalized === root) return sessionFileAddress(sessionId, "");
			if (root !== "" && normalized.startsWith(`${root}/`)) return sessionFileAddress(sessionId, normalized.slice(root.length + 1));
			return sessionFileAddress(sessionId, normalized);
		}
		//#endregion
		//#region src/client/native/index.ts
		/** The kind the plugin's files window owns (page + file viewer). */
		const EDITOR_KIND = "editor";
		/** The built-in page kind this plugin takes over. */
		const FILES_KIND = "files";
		/** The plugin's implementation id for a descriptor (unique across kinds). */
		function nativeId(descriptorId) {
			return `dsh-better-sidebar:${descriptorId}`;
		}
		/** The descriptor's title text, evaluated fresh for the current locale. */
		function titleOf(descriptor) {
			return typeof descriptor.title === "function" ? descriptor.title() : descriptor.title;
		}
		/**
		* The guide fields carrying the descriptor's own description line, evaluated
		* fresh for the current locale. DSH 0.1.5-rc.1+ renders `description` only
		* while the guide lists at most 4 entries, and a descriptor that declares
		* none must reach the host with NO `description` field at all — the host has
		* no fallback of its own, so an empty string would render as a blank second
		* line rather than a clean title-only capsule.
		* @param descriptor - the tab descriptor owning the guide entry.
		* @returns the `description` field, or an empty object.
		*/
		function guideDescriptionOf(descriptor) {
			const description = descriptor?.description;
			return description === void 0 ? {} : { description: () => typeof description === "function" ? description() : description };
		}
		/**
		* The guide row's glyph for a descriptor icon (nothing when it has none).
		* The native guide renders `entry.icon`, so a takeover registered without one
		* is the only row in the list with a blank leading slot.
		* @param icon - the descriptor's icon value.
		* @returns the guide-entry icon fields, or an empty object.
		*/
		function guideIconOf(icon) {
			return typeof icon === "function" ? { icon: (props) => icon(props.size ?? 16) } : {};
		}
		/**
		* The chip title of a file address: its own file name. A resource tab is
		* identified by its address, so the strip must name the FILE — the
		* descriptor's title ("Files") would make every open file look identical.
		* @param address - the native tab's content address.
		* @returns the file name, or undefined when the address is not a file.
		*/
		function fileTitleOf(address) {
			const parsed = parseFileAddress(address);
			if (parsed === void 0) return void 0;
			const segments = parsed.path.split("/").filter((segment) => segment !== "");
			return segments.length === 0 ? void 0 : segments[segments.length - 1];
		}
		/**
		* Register the plugin's tabs into the native right Sidebar and keep them in
		* step with the plugin's own registry and settings.
		* @param deps - client context, the plugin store/service, and the records.
		* @returns a disposer unregistering everything.
		*/
		function registerNativeSurface(deps) {
			const { ctx, store, service, records } = deps;
			const seat = ctx.inject(["sidebarRightTabs"], (injected) => {
				const tabs = injected.get("sidebarRightTabs");
				if (tabs === void 0) return;
				const live = /* @__PURE__ */ new Map();
				const fileParamsOf = (info) => {
					const address = parseFileAddress(info.tab.contentId);
					return address === void 0 ? void 0 : { path: address.path };
				};
				const fileSessionIdOf = (info) => {
					const address = parseFileAddress(info.tab.contentId);
					return address !== void 0 && address.scope === "session" ? address.sessionId : void 0;
				};
				/** Register the body + chip-title slots for one native implementation id. */
				const registerSlots = (id, injected, params) => [ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: id,
					inject: (sessionId) => ({
						...injected,
						...params,
						sessionId
					})
				}, NativeTabBody)), ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
					name: "sidebar.right.pane.tab.title",
					key: id,
					inject: () => ({
						records,
						service,
						descriptorId: injected.descriptorId
					})
				}, NativeTabTitle))];
				/** One descriptor's native type + body + title, as one disposable. */
				const registerDescriptor = (descriptor) => {
					const id = nativeId(descriptor.id);
					const isEditor = descriptor.id === EDITOR_KIND;
					const icon = descriptor.icon;
					const disposeType = tabs.register({
						id,
						kind: descriptor.id,
						...isEditor ? {
							patterns: ["dsh-resource://file/**"],
							canOpen: (address) => parseFileAddress(address) !== void 0
						} : {},
						priority: "extension",
						title: (address) => isEditor ? fileTitleOf(address) ?? titleOf(descriptor) : titleOf(descriptor),
						...descriptor.hidden === true || isEditor ? {} : { guide: [{
							order: descriptor.order ?? 100,
							title: () => titleOf(descriptor),
							...guideDescriptionOf(descriptor),
							...guideIconOf(icon)
						}] }
					});
					const slots = registerSlots(id, {
						ctx,
						store,
						service,
						records,
						descriptorId: descriptor.id
					}, isEditor ? {
						paramsOf: fileParamsOf,
						sessionIdOf: fileSessionIdOf
					} : {});
					return () => {
						for (const dispose of slots.reverse()) dispose();
						disposeType();
					};
				};
				/** One `files`-kind takeover: the plugin's explorer under the built-in kind. */
				const registerFilesKind = (editor) => {
					const id = "dsh-better-sidebar:files";
					const disposeType = tabs.register({
						id,
						kind: FILES_KIND,
						priority: "extension",
						title: () => t("files"),
						guide: [{
							order: 10,
							title: () => t("files"),
							...guideDescriptionOf(editor),
							...guideIconOf(editor?.icon)
						}]
					});
					const slots = registerSlots(id, {
						ctx,
						store,
						service,
						records,
						descriptorId: EDITOR_KIND
					}, {});
					return () => {
						for (const dispose of slots.reverse()) dispose();
						disposeType();
					};
				};
				/** Bring the live registrations in line with the registry + the settings. */
				const sync = () => {
					const wanted = /* @__PURE__ */ new Map();
					for (const descriptor of service.getTabs()) {
						if (!service.isTabEnabled(descriptor.id)) continue;
						wanted.set(descriptor.id, () => registerDescriptor(descriptor));
					}
					for (const [descriptorId, registration] of live) {
						if (wanted.has(descriptorId)) continue;
						registration.dispose();
						live.delete(descriptorId);
					}
					for (const [descriptorId, create] of wanted) {
						if (live.has(descriptorId)) continue;
						live.set(descriptorId, { dispose: create() });
					}
					const wantsFiles = service.isTabEnabled(EDITOR_KIND);
					const hasFiles = live.has(FILES_KIND);
					if (wantsFiles && !hasFiles) live.set(FILES_KIND, { dispose: registerFilesKind(service.getTab(EDITOR_KIND)) });
					if (!wantsFiles && hasFiles) {
						live.get(FILES_KIND)?.dispose();
						live.delete(FILES_KIND);
					}
				};
				const disposeSubscriptions = [service.subscribe(sync), store.subscribe(sync)];
				sync();
				return () => {
					for (const registration of live.values()) registration.dispose();
					live.clear();
					for (const dispose of disposeSubscriptions.reverse()) dispose();
				};
			});
			return () => {
				seat.dispose();
			};
		}
		//#endregion
		//#region src/client/sidebar/bottom-toggle.tsx
		/** Register the header toggle; returns the disposer. */
		function registerBottomToggle(ctx, store) {
			return ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "dsh-better-sidebar:bottom-toggle",
				order: 10,
				registrant: "dsh-better-sidebar"
			}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BottomDockToggle, { store })));
		}
		//#endregion
		//#region src/client/native/surface.ts
		/** The active session id, as the client list reports it. */
		function activeSessionId(ctx) {
			try {
				return ctx.sessions.list.getSnapshot().current;
			} catch {
				return;
			}
		}
		/**
		* Bind the plugin's write face to the native controller.
		* @param ctx - the client context (session list + `ctx.sidebarRight`).
		* @param records - the plugin's native tab record registry.
		* @returns the surface, plus a disposer unbinding its session subscription.
		*/
		function createNativeSurface(ctx, records) {
			const pending = [];
			const controller = () => ctx.get("sidebarRight");
			const place = (entry) => {
				const api = controller();
				if (api === void 0) return false;
				const active = activeSessionId(ctx);
				const onScreen = active !== void 0 && active === entry.sessionId;
				if (entry.kind === "tab") {
					const options = {
						params: entry.params,
						revealIfOpened: entry.revealIfOpened
					};
					if (onScreen) {
						api.openTab(entry.tabKind, options);
						return true;
					}
					if (api.openTabIn !== void 0) {
						api.openTabIn(entry.sessionId, entry.tabKind, options);
						return true;
					}
					return false;
				}
				const options = {
					...entry.line === void 0 ? {} : { params: { line: entry.line } },
					revealIfOpened: entry.revealIfOpened
				};
				if (onScreen) {
					api.openResource(entry.address, options);
					return true;
				}
				if (api.openResourceIn !== void 0) {
					api.openResourceIn(entry.sessionId, entry.address, options);
					return true;
				}
				return false;
			};
			const flushPending = () => {
				if (pending.length === 0) return;
				for (let index = pending.length - 1; index >= 0; index--) {
					const entry = pending[index];
					if (entry !== void 0 && place(entry)) pending.splice(index, 1);
				}
			};
			const enqueue = (entry) => {
				if (!place(entry)) pending.push(entry);
			};
			const unsubscribe = ctx.sessions.list.subscribe(flushPending);
			return {
				openTab({ sessionId, kind, params, revealIfOpened }) {
					enqueue({
						kind: "tab",
						sessionId,
						tabKind: kind,
						params,
						revealIfOpened
					});
				},
				openResource({ sessionId, address, line, revealIfOpened }) {
					enqueue({
						kind: "resource",
						sessionId,
						address,
						line,
						revealIfOpened
					});
				},
				fileAddress(sessionId, cwd, path) {
					return fileAddressFor(sessionId, cwd, path);
				},
				close(sessionId, tabId) {
					const record = records.get(tabId);
					if (record === void 0) return void 0;
					records.drop(tabId);
					const api = controller();
					if (api !== void 0) {
						if (sessionId === activeSessionId(ctx)) api.close(tabId);
						else if (api.closeIn !== void 0) api.closeIn(sessionId, tabId);
					}
					return {
						type: record.tab.type,
						title: record.tab.title
					};
				},
				update(tabId, patch) {
					if (!records.has(tabId)) return false;
					records.update(tabId, patch);
					return true;
				},
				activate(tabId) {
					return records.has(tabId);
				},
				has: (tabId) => records.has(tabId),
				flushPending,
				dispose: () => {
					unsubscribe();
				}
			};
		}
		//#endregion
		//#region src/client/link-intercept.ts
		/**
		* Chat/GUI external-link interception: clicking an http(s) link that points
		* OUTSIDE the GUI (chat messages, tool rows, prose mentions) opens the
		* sidebar instead of a new browser tab. Gated by the caller through
		* `takeoverEnabled(url)` — the `browserInterceptLinks` master, the URL's
		* protocol flag (`browserInterceptHttp` / `browserInterceptHttps`) and the
		* target tab's enable switch — and a Ctrl/Cmd/Shift/Alt-modified click
		* always bypasses the takeover so the user can still force a real browser
		* tab.
		*
		* Only the GUI's OWN document is watched — links inside the browser tab's
		* sandboxed iframe live in another document and never bubble here (and
		* their clicks must keep working inside the sidebar).
		*/
		/** The pure decision: the URL to open in the sidebar, or null to let the
		*  click fall through. Extracted so the policy is unit-testable without a
		*  DOM. `anchorHref` must be the ABSOLUTE href (`<a>.href` already is).
		*  The protocol/same-origin policy lives HERE; the prefs gates (master +
		*  protocol flags + target enablement) live in the caller's
		*  `takeoverEnabled(url)` callback. */
		function shouldInterceptLink(anchorHref, selfOrigin) {
			let url;
			try {
				url = new URL(anchorHref);
			} catch {
				return null;
			}
			if (url.protocol !== "http:" && url.protocol !== "https:") return null;
			try {
				if (url.origin === new URL(selfOrigin).origin) return null;
			} catch {}
			return url.href;
		}
		/** Whether a left-click may be taken over (unmodified left click only). */
		function isPlainLeftClick(event) {
			return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
		}
		/**
		* Register the document-level click capture that funnels external links
		* into the sidebar. Returns the disposer (HMR-safe).
		*/
		function registerLinkInterception(opts) {
			const onClick = (event) => {
				if (!isPlainLeftClick(event)) return;
				if (event.defaultPrevented) return;
				const target = event.target;
				if (target === null || typeof target.closest !== "function") return;
				const anchor = target.closest("a[href]");
				if (anchor === null) return;
				const url = shouldInterceptLink(anchor.href, opts.selfOrigin);
				if (url === null) return;
				if (!opts.takeoverEnabled(new URL(url))) return;
				event.preventDefault();
				opts.openInSidebar(url);
			};
			document.addEventListener("click", onClick, true);
			return () => {
				document.removeEventListener("click", onClick, true);
			};
		}
		//#endregion
		//#region src/client/settings-nav-icon.ts
		/**
		* Mark this plugin's row in the DSH settings navigation so its bundled CSS
		* can replace the shell's fallback gear with the Side card glyph.
		*
		* DSH 0.1.x projects only `id`, `order`, and `label` from a
		* `settings.section` registration, then chooses icons inside the settings
		* shell from a closed list of built-in ids. Until that public contract grows
		* an icon field, the plugin identifies only its own localized row after the
		* dialog mounts. The marker owns no shell structure and is removed on fiber
		* disposal, so the adaptation remains HMR-safe.
		*/
		const SETTINGS_NAV_MARKER = "data-dsh-better-sidebar-settings-nav";
		/**
		* Keep the marker on the settings-nav button whose visible text is this
		* plugin's current localized section label.
		* @param label - locale-aware label resolver used by the section registration.
		* @returns disposer that disconnects observation and removes owned markers.
		*/
		function registerSettingsNavIcon(label) {
			let disposed = false;
			const sync = () => {
				if (disposed) return;
				const currentLabel = label().trim();
				const buttons = document.querySelectorAll("[role=\"dialog\"] nav button");
				for (const button of buttons) if (currentLabel.length > 0 && button.textContent?.trim() === currentLabel) button.setAttribute(SETTINGS_NAV_MARKER, "");
				else button.removeAttribute(SETTINGS_NAV_MARKER);
			};
			sync();
			const observer = new MutationObserver(sync);
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				characterData: true
			});
			return () => {
				disposed = true;
				observer.disconnect();
				document.querySelectorAll(`[${SETTINGS_NAV_MARKER}]`).forEach((element) => {
					element.removeAttribute(SETTINGS_NAV_MARKER);
				});
			};
		}
		//#endregion
		//#region src/client/plugins-shared.ts
		/**
		* Shared vocabulary of the recommended plugin catalogs: the entry shape and
		* the GitHub topic URL. The two catalogs live in sibling modules —
		* `plugins-tabs.ts` (tab registrations) and `plugins-viewers.ts` (file
		* previewer registrations) — and are shown in the two "add plugin" modals
		* (Side card settings → the dashed cards at the end of the 侧边栏内容 /
		* 文件预览 grids).
		*/
		/** The GitHub topic page listing every repo tagged `dsh-better-sidebar`. */
		const PLUGIN_TOPIC_URL = "https://github.com/topics/dsh-better-sidebar";
		//#endregion
		//#region src/client/plugins-tabs.ts
		/**
		* The built-in catalog of TAB-registration plugins (sidebar pages),
		* shown in the "add tab plugin" modal (Side card settings → 侧边栏内容 grid
		* → the dashed card). Adding an entry: append one object here (unique
		* `id` = npm package name, `name` / `description` = i18n-friendly (add a
		* `pluginXxxName` / `pluginXxxDesc` key in locales.ts), `url` = GitHub repo,
		* `install` = the full one-line install script — it starts with `cd ~/.dsh`
		* so the install runs with the DSH home as the working directory). Data
		* integrity is guarded by `tests/plugin-list.spec.ts`.
		*/
		/** Tab-registration plugins (alphabetical order). */
		const builtinTabPlugins = [
			{
				id: "@dsh-external/dsh-sentinel",
				name: () => t("pluginSentinelName"),
				url: "https://github.com/fuhefei/dsh-sentinel",
				description: () => t("pluginSentinelDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add \"github:fuhefei/dsh-sentinel#v0.7.0\""
			},
			{
				id: "@dsh-external/ego-browser",
				name: () => t("pluginEgoBrowserName"),
				url: "https://github.com/Fisfzy/ego-browser",
				description: () => t("pluginEgoBrowserDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add git+https://github.com/Fisfzy/ego-browser.git"
			},
			{
				id: "dsh-better-overleaf",
				name: () => t("pluginBetterOverleafName"),
				url: "https://github.com/Hoemr/dsh-better-overleaf",
				description: () => t("pluginBetterOverleafDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add dsh-better-overleaf"
			},
			{
				id: "dsh-docs-panel",
				name: () => t("pluginDocsPanelName"),
				url: "https://github.com/mlosun/dsh-docs-panel",
				description: () => t("pluginDocsPanelDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add dsh-docs-panel"
			},
			{
				id: "dsh-flowglass",
				name: () => t("pluginFlowglassName"),
				url: "https://github.com/Iwctwbh/dsh-flowglass",
				description: () => t("pluginFlowglassDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add dsh-flowglass"
			},
			{
				id: "dsh-git-forge",
				name: () => t("pluginGitForgeName"),
				url: "https://github.com/thirsty5034/dsh-git-forge",
				description: () => t("pluginGitForgeDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add \"dsh-git-forge@github:thirsty5034/dsh-git-forge\""
			},
			{
				id: "dsh-git-remotes",
				name: () => t("pluginGitRemotesName"),
				url: "https://github.com/yq04/dsh-git-remotes",
				description: () => t("pluginGitRemotesDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add git+https://github.com/yq04/dsh-git-remotes.git"
			},
			{
				id: "dsh-github-workbench",
				name: () => t("pluginGithubWorkbenchName"),
				url: "https://github.com/meyaomiao/dsh-github-workbench",
				description: () => t("pluginGithubWorkbenchDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add \"github:meyaomiao/dsh-github-workbench#v0.1.0\""
			},
			{
				id: "dsh-sidebar-qa",
				name: () => t("pluginSidebarQaName"),
				url: "https://github.com/ChenRuoT/dsh-sidebar-qa",
				description: () => t("pluginSidebarQaDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add git+https://github.com/ChenRuoT/dsh-sidebar-qa.git"
			},
			{
				id: "dsh-sidenote",
				name: () => t("pluginSidenoteName"),
				url: "https://github.com/g-yixuan/dsh-sidenote",
				description: () => t("pluginSidenoteDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add dsh-sidenote"
			},
			{
				id: "dsh-server-deck",
				name: () => t("pluginServerDeckName"),
				url: "https://github.com/meyaomiao/DSH-server-deck",
				description: () => t("pluginServerDeckDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add dsh-server-deck@latest"
			},
			{
				id: "dsh-suhuang-scroll",
				name: () => t("pluginSuhuangScrollName"),
				url: "https://github.com/YZDame/dsh-suhuang-scroll",
				description: () => t("pluginSuhuangScrollDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add dsh-suhuang-scroll"
			},
			{
				id: "dsh-ssh-tunnel",
				name: () => t("pluginSshTunnelName"),
				url: "https://github.com/thirsty5034/dsh-ssh-tunnel",
				description: () => t("pluginSshTunnelDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add \"dsh-ssh-tunnel@github:thirsty5034/dsh-ssh-tunnel\""
			},
			{
				id: "dsh-turn-review",
				name: () => t("pluginTurnReviewName"),
				url: "https://github.com/yq04/dsh-turn-review",
				description: () => t("pluginTurnReviewDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add git+https://github.com/yq04/dsh-turn-review.git"
			},
			{
				id: "dsh-bilingual-reader",
				name: () => t("pluginBilingualReaderName"),
				url: "https://github.com/Johnblur/dsh-bilingual-reader",
				description: () => t("pluginBilingualReaderDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-better-sidebar && dsh plugin --profile web add github:Johnblur/dsh-bilingual-reader"
			}
		];
		//#endregion
		//#region src/client/plugins-viewers.ts
		/**
		* The built-in catalog of FILE-PREVIEWER plugins (file-type previewers),
		* shown in the "add preview plugin" modal (Side card settings → 文件预览
		* grid → the dashed card). Adding an entry: append one object here (unique
		* `id` = npm package name, `name` / `description` = i18n-friendly (add a
		* `pluginXxxName` / `pluginXxxDesc` key in locales.ts), `url` = GitHub repo,
		* `install` = the full shell command pre-filled into the
		* install terminal — it starts with `cd ~/.dsh` so the install runs with
		* the DSH home as the working directory). Data integrity is guarded by
		* `tests/plugin-list.spec.ts`.
		*/
		/** File-previewer plugins (alphabetical order). */
		const builtinViewerPlugins = [
			{
				id: "@huanlin/dsh-plugin-better-sidebar-plugin-office",
				name: () => t("pluginOfficeName"),
				url: "https://github.com/HuanLinOTO/dsh-plugin-better-sidebar-plugin-office",
				description: () => t("pluginOfficeDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add @huanlin/dsh-plugin-better-sidebar-plugin-office"
			},
			{
				id: "dsh-md-export",
				name: () => t("pluginMdExportName"),
				url: "https://github.com/AnakinCao/dsh-md-export",
				description: () => t("pluginMdExportDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-md-export"
			},
			{
				id: "dsh-code-nav",
				name: () => t("pluginCodeNavName"),
				url: "https://github.com/AnakinCao/dsh-code-nav",
				description: () => t("pluginCodeNavDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add https://github.com/AnakinCao/dsh-code-nav.git"
			},
			{
				id: "dsh-video-preview",
				name: () => t("pluginVideoPreviewName"),
				url: "https://github.com/zemul/dsh-video-preview",
				description: () => t("pluginVideoPreviewDesc"),
				install: "cd ~/.dsh && dsh plugin --profile web add dsh-video-preview"
			}
		];
		//#endregion
		//#region src/client/add-plugin-modal.tsx
		/**
		* The "add plugin" modals (Side card settings → the dashed cards at the
		* end of the 侧边栏内容 / 文件预览 grids): declare that the sidebar's
		* extension points — tab pages and file previewers — are open to plugins
		* (registered through `ctx.betterSidebar`), point at the GitHub topic page
		* for discovery, and show the repo's recommended plugin catalog of the
		* matching kind (name / url / description / install script).
		*
		* Per entry there are two actions:
		* - 「跳转」opens the plugin's repo in a REAL new browser tab (window.open
		*   — a button, so the sidebar link takeover cannot reroute it);
		* - 「安装」only COPIES the install script to the clipboard (writeClipboard)
		*   with a transient "已复制" feedback on the button — the user pastes and
		*   runs it wherever they manage their DSH profile. No terminal is opened,
		*   nothing is closed, nothing can fail outward.
		*
		* The body is extracted as {@link PluginListBody} so tests render it
		* directly — the Modal primitive runs hooks unconditionally, so an open
		* Modal must never be renderToString'd (same rule as the settingsFor popup
		* in SideCardSection); the modal itself mounts only while open.
		*/
		/** The catalog of one kind (kept in two repo files: plugins-tabs.ts /
		*  plugins-viewers.ts). */
		function catalogOf(kind) {
			return kind === "tab" ? builtinTabPlugins : builtinViewerPlugins;
		}
		/** How long the "已复制" feedback stays on the copy button. */
		const COPIED_FEEDBACK_MS = 1500;
		/** The modal body: the GitHub topic button + the recommended plugin list
		*  with per-entry jump/copy buttons (extracted for direct testing). */
		function PluginListBody(props) {
			const { kind } = props;
			const [copiedId, setCopiedId] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const catalog = catalogOf(kind);
			const needle = query.trim().toLowerCase();
			const matches = (entry) => {
				if (needle === "") return true;
				const name = typeof entry.name === "function" ? entry.name() : entry.name;
				const description = typeof entry.description === "function" ? entry.description() : entry.description;
				return name.toLowerCase().includes(needle) || entry.id.toLowerCase().includes(needle) || description.toLowerCase().includes(needle);
			};
			const filtered = catalog.filter(matches);
			const groups = /* @__PURE__ */ new Map();
			for (const entry of filtered) {
				const key = entry.category === void 0 ? void 0 : typeof entry.category === "function" ? entry.category() : entry.category;
				const list = groups.get(key);
				if (list === void 0) groups.set(key, [entry]);
				else list.push(entry);
			}
			/** Copy the entry's install script to the clipboard and flash the button's
			*  "已复制" label for a moment. The feedback ONLY appears after a
			*  successful write — when the clipboard is unavailable or denied
			*  (writeClipboard resolves false) nothing is shown, so the user is never
			*  told to paste a command that was not placed on the clipboard. Never
			*  closes anything, never throws outward. */
			const copy = async (entry) => {
				if (!await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(entry.install)) return;
				setCopiedId(entry.id);
				window.setTimeout(() => {
					setCopiedId((current) => current === entry.id ? null : current);
				}, COPIED_FEEDBACK_MS);
			};
			/** Open the plugin's repo in a REAL new browser tab (window.open — a
			*  button, so the sidebar link takeover cannot reroute it). */
			const jump = (entry) => {
				window.open(entry.url, "_blank", "noopener");
			};
			/** One catalog row (extracted so the group render stays flat). The name
			*  resolves like the description (string or () => string) so it follows
			*  the active locale; a plain-string entry keeps its raw name. */
			const renderEntry = (entry) => {
				const name = typeof entry.name === "function" ? entry.name() : entry.name;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SideCardSection_module_css_default.pluginEntry,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.pluginEntryHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SideCardSection_module_css_default.pluginName,
								"aria-label": `${t("openPlugin")}: ${name}`,
								onClick: () => {
									jump(entry);
								},
								children: name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SideCardSection_module_css_default.pluginEntryActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SideCardSection_module_css_default.pluginJumpBtn,
									"aria-label": `${t("openPlugin")}: ${name}`,
									onClick: () => {
										jump(entry);
									},
									children: t("openPlugin")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SideCardSection_module_css_default.pluginCopyBtn,
									"aria-label": `${t("copyInstall")}: ${name}`,
									onClick: () => {
										copy(entry);
									},
									children: copiedId === entry.id ? t("copied") : t("copy")
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SideCardSection_module_css_default.pluginDesc,
							children: typeof entry.description === "function" ? entry.description() : entry.description
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
							className: SideCardSection_module_css_default.pluginInstall,
							children: entry.install
						})
					]
				}, entry.id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.pluginList,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SideCardSection_module_css_default.pluginTopicBtn,
						onClick: () => {
							window.open(PLUGIN_TOPIC_URL, "_blank", "noopener");
						},
						children: t("addPluginsBrowseMore")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "search",
						className: SideCardSection_module_css_default.pluginSearch,
						placeholder: t("addPluginsSearch"),
						"aria-label": t("addPluginsSearch"),
						value: query,
						onChange: (event) => {
							setQuery(event.currentTarget.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.groupHeading,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("addPluginsRecommended") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideCardSection_module_css_default.count,
							children: filtered.length
						})]
					}),
					catalog.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideCardSection_module_css_default.pluginEmpty,
						children: t("addPluginsEmpty")
					}) : filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideCardSection_module_css_default.pluginEmpty,
						children: t("addPluginsNoMatch")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideCardSection_module_css_default.pluginEntries,
						children: [...groups.entries()].map(([category, entries]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.pluginGroup,
							children: [category !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: SideCardSection_module_css_default.pluginGroupHeading,
								children: category
							}), entries.map(renderEntry)]
						}, category ?? "\0"))
					})
				]
			});
		}
		/** The modal itself (mounted only while open — see the module comment). */
		function AddPluginModal(props) {
			const { service, onClose, kind } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: kind === "tab" ? t("addPluginsTabCard") : t("addPluginsViewerCard"),
				description: kind === "tab" ? t("addPluginsTabDesc") : t("addPluginsViewerDesc"),
				closeLabel: t("close"),
				className: SideCardSection_module_css_default.pluginModal,
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: SideCardSection_module_css_default.done,
					onClick: onClose,
					children: t("settingsDone")
				}),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginListBody, {
					service,
					kind
				})
			});
		}
		//#endregion
		//#region src/client/SideCardSection.tsx
		/**
		* "Side card" settings section: the user-facing preferences for the sidebar
		* panel, rendered natively in the DSH Settings shell (nav label "Side card").
		*
		* The section is DECLARATIVE — it renders the enable/disable inventory from
		* the sidebar service's registries instead of hardcoding rows:
		*  - 常规: new conversations open the panel by default (a toggle row), the
		*    default panel width as a percent of the window (number input row), and
		*    the open-path interception toggle — the DSH settings-row recipe
		*    (title/desc left + control right, hairline separators).
		*  - 侧边栏内容: one SMALL CARD per REGISTERED tab type (built-ins and
		*    external plugins alike), laid out in a responsive grid that wraps
		*    several cards per row — icon chip + title + type id, clicked to toggle
		*    the switch persisted in `prefs.tabsEnabled[id]`.
		*  - 文件预览: one SMALL CARD per REGISTERED file viewer — icon chip + title
		*    + the extensions it covers, clicked to toggle `prefs.viewersEnabled[id]`.
		*
		* Every group lives in a container card (the DSH PluginCard recipe: l2
		* hairline, 16px radius, layer-3 fill) with a heading and an inventory count
		* badge (the settings catalogHeading recipe); the section opens with a
		* one-line intro (the DSH section heading+intro recipe).
		*
		* A card's on/off state is its VISUAL STATE: enabled = highlighted (brand
		* border + tinted fill + a compact switch knob at the card's far right),
		* disabled = neutral and dimmed. Features that declare
		* `settings.toggles` carry a labeled settings strip at the card's bottom
		* edge that opens a native Modal (wider than the primitive default) with
		* the related settings as title/desc + custom-switch rows and a Done
		* footer; the popup body scrolls internally when a feature declares many
		* rows (e.g. Terminal's six). The toggles themselves are custom
		* switches: a real checkbox (native semantics and focus) driving a styled
		* track/thumb.
		*
		* Writes ride the plugin's own fenced settings route (the host calls the
		* settings seam in-process — the DSH settings RPC domain does not serve
		* third-party namespaces to configuration clients); the shared SidebarStore
		* is refreshed on success so the very next brand-new session seeds from the
		* new values and the sidebar's consumption points (the + menu, derived
		* flows) re-render immediately. Any failure reverts the optimistic UI and
		* shows the wire error inline — a broken settings surface never crashes the
		* shell.
		*/
		/** Map one wire failure to the inline message (the conflict gets friendly copy). */
		function messageOf(error) {
			if (error instanceof Error && "code" in error && error.code === "settings-conflict") return `${t("settingsSaveFailed")} ${t("settingsConflict")}`;
			return `${t("settingsSaveFailed")} ${error instanceof Error ? error.message : String(error)}`;
		}
		/** Resolve an i18n-friendly string-or-function value. */
		function textOf(value) {
			if (value === void 0) return "";
			return typeof value === "function" ? value() : value;
		}
		/** Resolve a descriptor icon (ReactNode or size function). */
		function iconOf(icon, size) {
			if (icon === void 0) return null;
			return typeof icon === "function" ? icon(size) : icon;
		}
		/** Tab inventory order: hidden types (editor/diff) last, then + menu order. */
		function tabOrder(a, b) {
			if (a.hidden !== b.hidden) return a.hidden === true ? 1 : -1;
			return (a.order ?? 100) - (b.order ?? 100);
		}
		/**
		* The scheme dropdown's current value: the plain scheme, or `preset:<id>`
		* while a preset is active. Falls back to `auto` when the stored preset id
		* is no longer registered (the strip resolves to 0 then anyway).
		*/
		function titleBarSchemeValue(prefs) {
			if (prefs.titleBarScheme !== "preset") return prefs.titleBarScheme;
			const preset = getShellPreset(prefs.titleBarPresetId);
			return preset !== void 0 ? `preset:${preset.id}` : "auto";
		}
		/** Viewer inventory order: priority desc (the catch-all `code` comes last). */
		function viewerOrder(a, b) {
			return (b.priority ?? 0) - (a.priority ?? 0);
		}
		/** Whether a feature declares any secondary settings (gear button shows). */
		function hasSettings(feature) {
			const settings = feature.settings;
			return settings !== void 0 && ((settings.toggles?.length ?? 0) > 0 || (settings.pluginToggles?.length ?? 0) > 0 || settings.render !== void 0);
		}
		/** A feature's display name (viewers fall back to their id). */
		function featureNameOf(feature) {
			return textOf("title" in feature ? feature.title : void 0) || feature.id;
		}
		/**
		* Merge one plugin-owned setting into a pluginSettings map (pure, v0.12.0+).
		* Sequential merges are additive: each call spreads the map it was GIVEN,
		* so building from the latest optimistic map keeps earlier keys intact
		* (two same-tick writes must not drop each other).
		*/
		function mergePluginSetting(pluginSettings, descriptorId, key, value) {
			return {
				...pluginSettings,
				[descriptorId]: {
					...pluginSettings[descriptorId] ?? {},
					[key]: value
				}
			};
		}
		/**
		* Render a custom settings panel (`settings.render`) with error containment:
		* a throwing panel shows an inline error line instead of breaking the whole
		* settings page.
		*/
		function SettingsRender(props) {
			let content;
			try {
				content = props.render(props.renderProps);
			} catch (error) {
				content = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SideCardSection_module_css_default.error,
					role: "alert",
					children: [
						t("settingsSaveFailed"),
						" ",
						error instanceof Error ? error.message : String(error)
					]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: content });
		}
		/**
		* The custom switch: a real checkbox (hidden, native semantics and focus)
		* driving a styled track/thumb. Used by the general toggle rows and the
		* secondary settings popup rows.
		*/
		function Switch(props) {
			const { checked, onChange, label } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: SideCardSection_module_css_default.switch,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					className: SideCardSection_module_css_default.switchInput,
					checked,
					"aria-label": label,
					onChange: (event) => {
						onChange(event.currentTarget.checked);
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SideCardSection_module_css_default.switchTrack,
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SideCardSection_module_css_default.switchThumb })
				})]
			});
		}
		/**
		* The body of a feature's secondary settings popup: one row (title/desc +
		* control) per declared setting. Switches render the custom switch; text and
		* number rows render a free-form / numeric input committed on blur/Enter
		* (clamped to the declared min/max). Extracted so the rows are testable
		* without opening the Modal (the Modal portal renders only while open).
		*/
		function FeatureSettingsRows(props) {
			const { toggles, prefs, onToggle, onCommit, onSelectValue, valueSource } = props;
			const read = valueSource ?? ((key) => prefs[key]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SideCardSection_module_css_default.popupRows,
				children: toggles.map((toggle) => {
					const title = textOf(toggle.title);
					if (toggle.type === "select") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
						toggle,
						title,
						value: read(toggle.key),
						onSelectValue
					}, toggle.key);
					if ((toggle.type ?? "switch") === "switch") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.popupRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SideCardSection_module_css_default.rowText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.title,
								children: title
							}), textOf(toggle.desc) !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.desc,
								children: textOf(toggle.desc)
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
							label: title,
							checked: read(toggle.key) === true,
							onChange: (next) => {
								onToggle(toggle, next);
							}
						})]
					}, toggle.key);
					const value = String(read(toggle.key) ?? "");
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TypedRow, {
						toggle,
						title,
						value,
						onCommit
					}, `${toggle.key}:${value}`);
				})
			});
		}
		/**
		* One text/number row: a controlled input whose draft is local state,
		* committed on blur/Enter through the parent's onCommit. The parent's
		* canonical return is adopted (clamped numbers, stored value for invalid
		* input); a `unit` suffix renders after the input (e.g. 'px').
		*/
		function TypedRow(props) {
			const { toggle, title, value, onCommit } = props;
			const [draft, setDraft] = (0, react.useState)(value);
			const commit = () => {
				const canonical = onCommit?.(toggle, draft) ?? draft;
				setDraft(canonical);
			};
			const number = toggle.type === "number";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.popupRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: SideCardSection_module_css_default.rowText,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.title,
						children: title
					}), textOf(toggle.desc) !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.desc,
						children: textOf(toggle.desc)
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: SideCardSection_module_css_default.control,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
						type: number ? "number" : "text",
						className: number ? SideCardSection_module_css_default.typedInputNumber : SideCardSection_module_css_default.typedInput,
						value: draft,
						min: toggle.min,
						max: toggle.max,
						step: 1,
						placeholder: toggle.placeholder,
						"aria-label": title,
						onChange: (event) => {
							setDraft(event.currentTarget.value);
						},
						onBlur: commit,
						onKeyDown: (event) => {
							if (event.key === "Enter") event.currentTarget.blur();
						}
					}), toggle.unit !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.suffix,
						children: toggle.unit
					})]
				})]
			});
		}
		/**
		* The multi-line custom-CSS input (scheme `custom`): a monospace textarea
		* whose draft is local state, committed on blur or Cmd/Ctrl+Enter through
		* the parent's handler. Keyed by the stored value so an external commit
		* remounts it with the canonical text (same pattern as TypedRow).
		*/
		function CssDraft(props) {
			const { value, onCommit, label, placeholder } = props;
			const [draft, setDraft] = (0, react.useState)(value);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
				className: SideCardSection_module_css_default.cssTextArea,
				rows: 6,
				value: draft,
				placeholder,
				"aria-label": label,
				spellCheck: false,
				onChange: (event) => {
					setDraft(event.currentTarget.value);
				},
				onBlur: () => {
					onCommit(draft);
				},
				onKeyDown: (event) => {
					if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.blur();
				}
			});
		}
		/**
		* The reusable dropdown — the primitives Menu, NOT a native <select>: a
		* closed anchor button (picked option text + chevron) opening one Menu item
		* per option (big-icon cards when any option carries an icon). Single-pick
		* commits the option's value and closes; `multi` toggles membership and
		* commits the picked values as an array (in options order), staying open.
		* Shared by the declarative select rows (SelectRow) and the title-bar
		* scheme dropdown on the General row.
		*/
		function SelectMenu(props) {
			const { label, value, options, multi, onSelect, placeholder } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const hasIcons = options.some((option) => option.icon !== void 0);
			const picked = multi ? Array.isArray(value) ? value : [] : [value];
			const selected = options.filter((option) => picked.includes(option.value));
			/** Commit one picked option (toggle semantics under multi). */
			const pick = (index) => {
				const option = options[index];
				if (option === void 0) return;
				if (!multi) {
					onSelect(option.value);
					setOpen(false);
					return;
				}
				const current = Array.isArray(value) ? [...value] : [];
				const at = current.indexOf(option.value);
				if (at >= 0) current.splice(at, 1);
				else current.push(option.value);
				onSelect(options.filter((o) => current.includes(o.value)).map((o) => o.value));
			};
			const anchor = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: SideCardSection_module_css_default.selectAnchor,
				"aria-label": label,
				"aria-haspopup": "listbox",
				"aria-expanded": open,
				onClick: () => {
					setOpen((now) => !now);
				},
				children: [
					!multi && hasIcons && selected[0] !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.selectAnchorIcon,
						children: iconOf(selected[0].icon, 16)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.selectAnchorText,
						children: selected.length === 0 ? placeholder ?? "—" : selected.map((option) => textOf(option.title)).join(", ")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 })
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				anchor,
				items: options.map((option, index) => ({
					id: String(index),
					label: hasIcons ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: SideCardSection_module_css_default.selectOption,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideCardSection_module_css_default.selectOptionIcon,
							children: iconOf(option.icon, 24)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SideCardSection_module_css_default.selectOptionText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.title,
								children: textOf(option.title)
							}), textOf(option.desc) !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.desc,
								children: textOf(option.desc)
							})]
						})]
					}) : textOf(option.title)
				})),
				selectedId: !multi && selected[0] !== void 0 ? String(options.indexOf(selected[0])) : void 0,
				selectedIds: multi ? selected.map((option) => String(options.indexOf(option))) : void 0,
				onSelect: (id) => {
					pick(Number(id));
				},
				onClose: () => {
					setOpen(false);
				},
				portal: true
			});
		}
		/**
		* One select row: a dropdown over the toggle's declared `options` (the
		* shared SelectMenu). When any option carries an icon, the dropdown renders
		* big-icon option cards (icon + title + desc) and the closed anchor shows
		* the selected option's icon as well; without icons both are a single line
		* of text. Single-pick commits the option's value and closes; `multi`
		* toggles membership, commits the picked values as an array (in options
		* order), and stays open.
		*/
		function SelectRow(props) {
			const { toggle, title, value, onSelectValue } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.popupRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: SideCardSection_module_css_default.rowText,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.title,
						children: title
					}), textOf(toggle.desc) !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SideCardSection_module_css_default.desc,
						children: textOf(toggle.desc)
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SideCardSection_module_css_default.control,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
						label: title,
						value,
						options: toggle.options ?? [],
						multi: toggle.multi === true,
						onSelect: (next) => {
							onSelectValue?.(toggle, next);
						}
					})
				})]
			});
		}
		/**
		* The secondary settings popup body of one feature (tab or viewer):
		* - the host-prefs `toggles` rows, then the plugin-owned `pluginToggles`
		*   rows (their values live in `pluginSettings[feature.id]`, projected onto
		*   the prefs face so the shared row renderer reads them);
		* - `settings.render` (custom panel) AFTER those rows when declared — the
		*   custom panel is an extension of the row list, not a replacement, so a
		*   feature can keep its declarative rows (e.g. the editor's
		*   open-behavior picker) and still ship a custom configuration area.
		*/
		function SettingsBody(props) {
			const { feature, prefs, store, service, onToggle, onCommit, onSelectValue, onPluginToggle, onPluginCommit, onPluginSelectValue, onPluginWrite, onClose } = props;
			const render = feature.settings?.render;
			const toggles = feature.settings?.toggles ?? [];
			const pluginToggles = feature.settings?.pluginToggles ?? [];
			if (render === void 0 && toggles.length === 0 && pluginToggles.length === 0) return null;
			const pluginBlob = prefs.pluginSettings[feature.id] ?? {};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [(toggles.length > 0 || pluginToggles.length > 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.popupRows,
				children: [toggles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FeatureSettingsRows, {
					toggles,
					prefs,
					onToggle,
					onCommit,
					onSelectValue
				}), pluginToggles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FeatureSettingsRows, {
					toggles: pluginToggles,
					prefs,
					onToggle: onPluginToggle,
					onCommit: onPluginCommit,
					onSelectValue: onPluginSelectValue,
					valueSource: (key) => pluginBlob[key]
				})]
			}), render !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsRender, {
				render,
				renderProps: {
					store,
					service,
					prefs,
					pluginSettings: prefs.pluginSettings[feature.id] ?? {},
					updatePluginSetting: onPluginWrite,
					close: onClose
				}
			})] });
		}
		/**
		* Render the Side card preferences section.
		* @param props - composed slot props (runtime share + injected store/service).
		* @returns the section element tree.
		*/
		function SideCardSection({ store, service }) {
			const [prefs, setPrefs] = (0, react.useState)(() => store.getPrefs());
			const [error, setError] = (0, react.useState)(null);
			const [settingsFor, setSettingsFor] = (0, react.useState)(null);
			const [stripSettingsOpen, setStripSettingsOpen] = (0, react.useState)(false);
			const detectedEnv = (0, react.useMemo)(() => parseDesktopEnv(), []);
			const [addPluginsOpen, setAddPluginsOpen] = (0, react.useState)(null);
			const optimisticRef = (0, react.useRef)(prefs);
			(0, react.useEffect)(() => {
				optimisticRef.current = prefs;
			}, [prefs]);
			const [tabs, setTabs] = (0, react.useState)(() => [...service.getTabs()].sort(tabOrder));
			const [viewers, setViewers] = (0, react.useState)(() => [...service.getFileViewers()].sort(viewerOrder));
			(0, react.useEffect)(() => service.subscribe(() => {
				setTabs([...service.getTabs()].sort(tabOrder));
				setViewers([...service.getFileViewers()].sort(viewerOrder));
			}), [service]);
			const revisionRef = (0, react.useRef)(void 0);
			const dirtyRef = (0, react.useRef)(false);
			const inFlightRef = (0, react.useRef)(Promise.resolve());
			(0, react.useEffect)(() => {
				let cancelled = false;
				api.settingsGet().then((view) => {
					if (cancelled) return;
					revisionRef.current = view.revision;
					if (dirtyRef.current) return;
					setPrefs(parsePrefs(view.value));
				}).catch(() => {});
				return () => {
					cancelled = true;
				};
			}, []);
			/** Persist one patch through the settings route (serialized, revision-guarded). */
			const commit = (patch) => {
				dirtyRef.current = true;
				const run = inFlightRef.current.then(async () => {
					const view = await api.settingsUpdate({ ...patch }, revisionRef.current);
					const next = parsePrefs(view.value);
					revisionRef.current = view.revision;
					store.setPrefs(next);
					return next;
				});
				inFlightRef.current = run.then(() => void 0, () => void 0);
				return run.then((next) => ({
					ok: true,
					prefs: next
				}), (caught) => {
					setError(messageOf(caught));
					return {
						ok: false,
						prefs
					};
				});
			};
			/** Settle one commit: success adopts the server values, failure reverts. */
			const applyOutcome = (previous, outcome) => {
				setPrefs(outcome.ok ? outcome.prefs : previous);
			};
			/** Optimistically apply one pref patch, then commit (revert on failure). */
			const applyPref = (patch) => {
				const previous = optimisticRef.current;
				const next = {
					...previous,
					...patch
				};
				optimisticRef.current = next;
				setPrefs(next);
				setError(null);
				commit(patch).then((outcome) => applyOutcome(previous, outcome));
			};
			/** Flip one per-tab enable switch (merge into the tabsEnabled map). */
			const onToggleTab = (id, next) => {
				applyPref({ tabsEnabled: {
					...optimisticRef.current.tabsEnabled,
					[id]: next
				} });
			};
			/** Flip one per-viewer enable switch (merge into the viewersEnabled map). */
			const onToggleViewer = (id, next) => {
				applyPref({ viewersEnabled: {
					...optimisticRef.current.viewersEnabled,
					[id]: next
				} });
			};
			/** Flip one declaratively-declared toggle (a SidebarPrefs boolean field). */
			const onToggleSetting = (toggle, next) => {
				applyPref({ [toggle.key]: next });
			};
			/** Commit one declaratively-declared select row (the option's value, or an
			*  array of values under `multi`). */
			const onSelectSetting = (toggle, next) => {
				applyPref({ [toggle.key]: next });
			};
			/**
			* Commit one declaratively-declared text/number row. Numbers are parsed
			* and clamped to the toggle's declared min/max (an unparsable input falls
			* back to the CURRENT stored value, mirroring the width row); text rows
			* persist as-is (empty is meaningful, e.g. the theme-default font).
			* Returns the canonical value the row should display.
			*/
			const onCommitSetting = (toggle, raw) => {
				if (toggle.type === "number") {
					const parsed = Number(raw);
					const fallback = String(prefs[toggle.key] ?? "");
					if (!Number.isFinite(parsed)) return fallback;
					let clamped = Math.round(parsed);
					if (toggle.min !== void 0) clamped = Math.max(toggle.min, clamped);
					if (toggle.max !== void 0) clamped = Math.min(toggle.max, clamped);
					applyPref({ [toggle.key]: clamped });
					return String(clamped);
				}
				applyPref({ [toggle.key]: raw });
				return raw;
			};
			/**
			* Pick the title-bar / shell compatibility scheme. Mirrors the legacy
			* `titleBarCompat` flag (true = anything but the conservative auto) so
			* documents stay readable by older plugin versions.
			*/
			/**
			* Pick the title-bar / shell compatibility scheme from the dropdown. The
			* option values are `auto` | `web` | `custom` | `preset:<id>`; selecting
			* a preset stores both the scheme and its id. Mirrors the legacy
			* `titleBarCompat` flag (true for preset/custom) so documents stay
			* readable by older plugin versions.
			*/
			const onSchemeSelect = (value) => {
				if (typeof value !== "string") return;
				if (value === "auto" || value === "web" || value === "custom") {
					applyPref({
						titleBarScheme: value,
						titleBarCompat: value === "custom"
					});
					return;
				}
				if (value.startsWith("preset:") && getShellPreset(value.slice(7)) !== void 0) applyPref({
					titleBarScheme: "preset",
					titleBarPresetId: value.slice(7),
					titleBarCompat: true
				});
			};
			/** Commit the free-form custom CSS (scheme `custom`). */
			const commitCustomCss = (raw) => {
				applyPref({ customCss: raw });
			};
			/** Persist one plugin-owned setting of one descriptor (merged into the pluginSettings blob). */
			const applyPluginSetting = (descriptorId, key, value) => {
				applyPref({ pluginSettings: mergePluginSetting(optimisticRef.current.pluginSettings, descriptorId, key, value) });
			};
			/** Flip one plugin-owned switch row (same row shape, plugin-scoped key). */
			const onPluginToggle = (descriptorId, toggle, next) => {
				applyPluginSetting(descriptorId, toggle.key, next);
			};
			/** Commit one plugin-owned text/number row (clamped like the host rows). */
			const onPluginCommitSetting = (descriptorId, toggle, raw) => {
				if (toggle.type === "number") {
					const parsed = Number(raw);
					const blob = prefs.pluginSettings[descriptorId] ?? {};
					const fallback = String(blob[toggle.key] ?? "");
					if (!Number.isFinite(parsed)) return fallback;
					let clamped = Math.round(parsed);
					if (toggle.min !== void 0) clamped = Math.max(toggle.min, clamped);
					if (toggle.max !== void 0) clamped = Math.min(toggle.max, clamped);
					applyPluginSetting(descriptorId, toggle.key, clamped);
					return String(clamped);
				}
				applyPluginSetting(descriptorId, toggle.key, raw);
				return raw;
			};
			/**
			* One SMALL toggle card for the responsive inventory grid: the card's main
			* area is the switch (click to flips, visual state IS the state), the icon
			* sits in a rounded chip, the check badge pins to the far right, and a
			* feature that declares related settings gets a labeled SETTINGS STRIP
			* across the card's bottom edge (gear icon + text) opening its settings
			* popup — discoverable at rest, not a hover-only ghost corner button.
			*/
			const renderCard = (props) => {
				const hasSettings = props.onOpenSettings !== void 0;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: clsx(SideCardSection_module_css_default.card, props.enabled && SideCardSection_module_css_default.cardOn),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: SideCardSection_module_css_default.cardMain,
						"aria-pressed": props.enabled,
						title: props.desc,
						onClick: () => {
							props.onToggle(!props.enabled);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SideCardSection_module_css_default.cardTop,
							children: [
								props.icon !== null && props.icon !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardIconChip,
									children: props.icon
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardTitle,
									children: props.title
								}),
								props.enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardSwitch,
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardSwitchTrack,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SideCardSection_module_css_default.cardSwitchThumb })
									})
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideCardSection_module_css_default.cardDesc,
							children: props.desc
						})]
					}), hasSettings && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: SideCardSection_module_css_default.cardSettings,
						"aria-label": `${props.title} ${t("settingsPopup")}`,
						onClick: props.onOpenSettings,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, { size: 12 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("settingsPopup") })]
					})]
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SideCardSection_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SideCardSection_module_css_default.intro,
						children: t("settingsIntro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.versionBadge,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SideCardSection_module_css_default.versionBadgeName,
							children: "DSH-better-sidebar"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SideCardSection_module_css_default.versionBadgeTag,
							children: ["v", service.version]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.group,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: SideCardSection_module_css_default.groupHeading,
								children: t("settingsGeneralTitle")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("settingsOpenToolsTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("settingsOpenToolsDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
									label: t("settingsOpenToolsTitle"),
									checked: prefs.agentOpenTools,
									onChange: (next) => {
										applyPref({ agentOpenTools: next });
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SideCardSection_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.title,
										children: t("settingsTitleBarTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.desc,
										children: t("settingsTitleBarDesc")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.control,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
										label: t("settingsTitleBarTitle"),
										value: titleBarSchemeValue(prefs),
										options: [
											{
												value: "auto",
												title: t("settingsSchemeAutoTitle"),
												desc: t("settingsSchemeAutoDesc")
											},
											{
												value: "web",
												title: t("settingsSchemeWebTitle"),
												desc: t("settingsSchemeWebDesc")
											},
											...getShellPresets().map((preset) => ({
												value: `preset:${preset.id}`,
												title: preset.title,
												desc: preset.detect?.(detectedEnv) === true ? `${textOf(preset.desc)}（${t("settingsSchemeDetectedSuffix")}）` : textOf(preset.desc)
											})),
											{
												value: "custom",
												title: t("settingsSchemeCustomTitle"),
												desc: t("settingsSchemeCustomDesc")
											}
										],
										onSelect: onSchemeSelect
									}), prefs.titleBarScheme === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SideCardSection_module_css_default.rowGear,
										"aria-label": `${t("settingsTitleBarTitle")} ${t("settingsPopup")}`,
										title: t("settingsPopup"),
										onClick: () => {
											setStripSettingsOpen(true);
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, { size: 14 })
									})]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.group,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.groupHeading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("settingsTabsTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.count,
								children: tabs.length
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.grid,
							children: [tabs.map((tab) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: renderCard({
								title: textOf(tab.title),
								desc: tab.id,
								icon: iconOf(tab.icon, 16),
								enabled: prefs.tabsEnabled[tab.id] !== false,
								onToggle: (next) => {
									onToggleTab(tab.id, next);
								},
								onOpenSettings: prefs.tabsEnabled[tab.id] !== false && hasSettings(tab) ? () => {
									setSettingsFor(tab);
								} : void 0
							}) }, tab.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: clsx(SideCardSection_module_css_default.card, SideCardSection_module_css_default.addCard),
								onClick: () => {
									setAddPluginsOpen("tab");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.cardTop,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardIconChip,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 16 })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardTitle,
										children: t("addPluginsTabCard")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardDesc,
									children: t("addPluginsTabCardDesc")
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SideCardSection_module_css_default.group,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.groupHeading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("settingsViewersTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SideCardSection_module_css_default.count,
								children: viewers.length
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.grid,
							children: [viewers.map((viewer) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: renderCard({
								title: textOf(viewer.title) || viewer.id,
								desc: viewer.exts.length === 0 ? t("settingsViewerCatchAll") : viewer.exts.join(" · "),
								icon: iconOf(viewer.icon, 16),
								enabled: prefs.viewersEnabled[viewer.id] !== false,
								onToggle: (next) => {
									onToggleViewer(viewer.id, next);
								},
								onOpenSettings: prefs.viewersEnabled[viewer.id] !== false && hasSettings(viewer) ? () => {
									setSettingsFor(viewer);
								} : void 0
							}) }, viewer.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: clsx(SideCardSection_module_css_default.card, SideCardSection_module_css_default.addCard),
								onClick: () => {
									setAddPluginsOpen("viewer");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SideCardSection_module_css_default.cardTop,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardIconChip,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 16 })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SideCardSection_module_css_default.cardTitle,
										children: t("addPluginsViewerCard")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SideCardSection_module_css_default.cardDesc,
									children: t("addPluginsViewerCardDesc")
								})]
							})]
						})]
					}),
					settingsFor !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => {
							setSettingsFor(null);
						},
						title: featureNameOf(settingsFor),
						description: t("settingsPopupDesc", { feature: featureNameOf(settingsFor) }),
						closeLabel: t("close"),
						className: SideCardSection_module_css_default.popupDialog,
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: SideCardSection_module_css_default.done,
							onClick: () => {
								setSettingsFor(null);
							},
							children: t("settingsDone")
						}),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsBody, {
							feature: settingsFor,
							prefs,
							onToggle: onToggleSetting,
							onCommit: onCommitSetting,
							onSelectValue: onSelectSetting,
							onPluginToggle: (toggle, next) => {
								onPluginToggle(settingsFor.id, toggle, next);
							},
							onPluginCommit: (toggle, raw) => onPluginCommitSetting(settingsFor.id, toggle, raw),
							onPluginSelectValue: (toggle, next) => {
								applyPluginSetting(settingsFor.id, toggle.key, next);
							},
							onPluginWrite: (key, value) => {
								applyPluginSetting(settingsFor.id, key, value);
							},
							onClose: () => {
								setSettingsFor(null);
							},
							store,
							service
						})
					}),
					stripSettingsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => {
							setStripSettingsOpen(false);
						},
						title: t("settingsTitleBarTitle"),
						description: t("settingsPopupDesc", { feature: t("settingsTitleBarTitle") }),
						closeLabel: t("close"),
						className: SideCardSection_module_css_default.popupDialog,
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: SideCardSection_module_css_default.done,
							onClick: () => {
								setStripSettingsOpen(false);
							},
							children: t("settingsDone")
						}),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SideCardSection_module_css_default.popupRows,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FeatureSettingsRows, {
								toggles: [{
									key: "titleBarStripPx",
									type: "number",
									title: () => t("settingsTitleBarStripTitle"),
									desc: () => t("settingsTitleBarStripDesc"),
									min: 0,
									max: 120,
									unit: "px"
								}],
								prefs,
								onToggle: onToggleSetting,
								onCommit: onCommitSetting
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CssDraft, {
								value: prefs.customCss,
								label: t("settingsCustomCssTitle"),
								placeholder: t("settingsCustomCssPlaceholder"),
								onCommit: commitCustomCss
							}, prefs.customCss)]
						})
					}),
					addPluginsOpen !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AddPluginModal, {
						service,
						onClose: () => {
							setAddPluginsOpen(null);
						},
						kind: addPluginsOpen
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SideCardSection_module_css_default.error,
						role: "alert",
						children: error
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/DSH-better-sidebar/DSH-better-sidebar/src/client/layout.css.mjs
		const css = "/**\n * Layout push: the bottom workbench occupies layout instead of floating over\n * the conversation. The right column belongs to DSH's native Sidebar, so this\n * stylesheet pushes no width — only the workbench's height.\n *\n * The workbench squeezes only the conversation column. The anchor is the\n * [data-dsh-center-col] tag the Sidebar shell's locator writes on the\n * frame's measured center grid item (Sidebar.tsx locate — not a positional\n * path: the frame also contains an overlay layer and drag handles). A\n * stretched grid item shrinks by its bottom margin, so the conversation\n * output and composer lift without touching either sidebar.\n *\n * The size rides a CSS variable updated by the Sidebar shell (0 while\n * collapsed). Expand/collapse uses the host theme duration; drags disable\n * transitions so the reserved edge tracks the pointer.\n */\n/* The AppFrame's center column. The Sidebar shell's locator (Sidebar.tsx\n   locate/measureCenter, resolving via center-column.ts) tags the measured\n   column node with [data-dsh-center-col] — one attribute write per node\n   lifetime. The locator anchors on the conversation slot host\n   (`main.conversation` on DSH 0.1.5-alpha.2+, `conversation` on alpha.1)\n   and skips the transparent display:contents slot hosts above it. The rule\n   used to anchor on a structural has()-selector over the conversation slot\n   wrapper, whose match cache invalidates on every #root subtree mutation\n   (the streaming chat mutates it constantly), re-evaluating the selector\n   against the whole document; the tag is evaluated once per node instead.\n   A stretched grid item shrinks by its margins, so the conversation\n   content (output + input bar) lifts without touching the sidebars. */\n#root [data-dsh-center-col] {\n  margin-bottom: var(--dsh-sidebar-height, 0px);\n  /* Grid/flex items default to min-height:auto. A long unbreakable token\n     (OAuth URL) then grows this column past the viewport and clips the\n     composer + left-rail Settings row. min-height:0 lets the cell shrink;\n     overflow-wrap lets the token wrap instead of forcing its intrinsic\n     size. The host's own descendants remain responsible for scrolling. */\n  min-height: 0;\n  overflow-wrap: anywhere;\n  transition: margin-bottom var(--ds-transition-duration-slow) var(--ds-ease-in-out);\n}\n\n/* When the sidebar is collapsed, the toggle cluster reclaims the top-right\n   corner. Push the DSH session header's right padding out so its right-aligned\n   utilities (the \"Session log\" download capsule) yield the corner instead of\n   hiding under the cluster. The header default right-pads 28px; the 2-button\n   cluster spans right 10→70px, so 78px clears it with an 8px gap. Anchor on\n   the header's slot host wrapper ([data-slot=\"conversation.session.header\"])\n   rather than a positional path: DSH 0.1.x nests the header several levels\n   under the center column. The Sidebar shell toggles the body attribute with\n   the panel open state. */\nbody[data-dsh-sidebar-collapsed] [data-slot=\"conversation.session.header\"] > header {\n  padding-right: 78px;\n}\n\nbody[data-dsh-sidebar-dragging] #root [data-dsh-center-col] {\n  transition: none;\n}\n\n/* DSH 0.1.x gives external settings sections a generic gear and exposes no\n   icon field in the settings.section contract. settings-nav-icon.ts marks\n   only this plugin's localized row; render the requested Lucide\n   gallery-horizontal-end SVG as a currentColor mask so it follows the native\n   nav hover/active colors without changing the shell's 16px icon rhythm. */\n[data-dsh-better-sidebar-settings-nav] > svg:first-child {\n  display: none;\n}\n\n[data-dsh-better-sidebar-settings-nav]::before {\n  content: '';\n  flex: none;\n  width: 16px;\n  height: 16px;\n  background: currentColor;\n  -webkit-mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 7v10'/%3E%3Cpath d='M6 5v14'/%3E%3Crect width='12' height='18' x='10' y='3' rx='2'/%3E%3C/svg%3E\") center / contain no-repeat;\n  mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 7v10'/%3E%3Cpath d='M6 5v14'/%3E%3Crect width='12' height='18' x='10' y='3' rx='2'/%3E%3C/svg%3E\") center / contain no-repeat;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  #root [data-dsh-center-col] {\n    transition: none;\n  }\n}\n\n/* Context-menu submenu flip (viewport clamping for the portaled menus).\n *\n * The ui-primitives Menu clamps its main portal list into the viewport but\n * positions nested submenus with static CSS only — anchored at the parent\n * row's bottom, growing UP and to the RIGHT — with no clamp whatsoever.\n * Both defaults are the worst case for our menus: a tall \"open with\" submenu\n * escapes past the viewport top when the row menu opens near the top, and\n * past the right edge in a narrow workbench pane (a pane can be far narrower\n * than the card 218 + gap + submenu 165 a submenu needs).\n *\n * menu-flip.ts publishes `data-dsh-sidebar-submenu` on <body> — with the\n * words \"down\" and/or \"left\" — for exactly the lifetime of one of OUR\n * submenu-bearing menus (FileTree row menu, TabBar tab menu). The tokens\n * flip the growth direction; the attribute's absence restores the\n * primitive's own geometry untouched, and host-owned menus are never\n * affected because they never open while the attribute exists (each side\n * closes on the other's outside pointerdown).\n *\n * No max-height/overflow scroll cap here on purpose: overflow clipping\n * would cut the submenu's ::before hover bridge (the corridor that keeps\n * itemWrap's mouseleave from closing the card mid-crossing). */\n\n/* Visual tether, part 1 — the parent row stays lit while its submenu is\n * open. The primitive only styles :hover, so once the pointer crossed into\n * the side card the parent row's fill cleared and the floating card read as\n * unrelated. The Menu marks the open parent row with aria-expanded=\"true\"\n * (host-rendered, stable), so the same hover token re-applies for the\n * submenu's whole lifetime. */\nbody[data-dsh-sidebar-submenu] div[role=\"menu\"] button[aria-expanded=\"true\"] {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n/* Visual tether, part 2 — the side card hugs its parent (10px → 4px gap),\n * with the ::before hover corridor narrowed to match. Ordered BEFORE the\n * flip overrides below so their left/right flips still win. */\nbody[data-dsh-sidebar-submenu] div[role=\"menu\"] div[role=\"menu\"] {\n  left: calc(100% + 4px);\n}\n\nbody[data-dsh-sidebar-submenu] div[role=\"menu\"] div[role=\"menu\"]::before {\n  left: -4px;\n  width: 4px;\n}\n\nbody[data-dsh-sidebar-submenu~=\"down\"] div[role=\"menu\"] div[role=\"menu\"] {\n  top: -4px;\n  bottom: auto;\n}\n\nbody[data-dsh-sidebar-submenu~=\"left\"] div[role=\"menu\"] div[role=\"menu\"] {\n  left: auto;\n  right: calc(100% + 4px);\n}\n\n/* The hover bridge follows the card to the left side of the parent row. */\nbody[data-dsh-sidebar-submenu~=\"left\"] div[role=\"menu\"] div[role=\"menu\"]::before {\n  left: auto;\n  right: -4px;\n}\n";
		const tagId = "dsh-better-sidebar/layout.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-better-sidebar";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* Client half of dsh-better-sidebar: resolves the user's "Side card"
		* preferences through the plugin's own fenced settings route, mounts the
		* right sidebar portal (inside an error boundary so a rendering failure
		* shows an error strip instead of a blank panel), registers the turn-tail
		* interception, and contributes the Side card settings section to the DSH
		* Settings shell. Requires the runtime's slots and sessions services; the
		* bundle itself is a module-table consumer only (react + ui-primitives +
		* xterm, all provided or inlined).
		*/
		/** Services required before mounting (provided by the client runtime; the
		*  locale service backs the sidebar's copy — see locales.ts). `modules`
		*  (rc.8+) is the client module system the chunk loader resolves its
		*  externals through; `connection` (0.1.2-alpha.2+) is the Remote transport's
		*  recovery lifecycle the side chat's disconnect banner reads — Cordis guards
		*  service access without inject. The `remote.session` namespace is NOT here:
		*  it mounts asynchronously, so the open-path interception reaches it through
		*  `ctx.inject` (see intercept.tsx). */
		const inject = [
			"slots",
			"sessions",
			"locale",
			"modules",
			"connection"
		];
		/**
		* Error boundary over the sidebar tree (root scope): a render error in the
		* sidebar SHELL itself must never blank the page silently — the shared
		* RenderBoundary shows a dismissible error strip and logs the stack. The
		* per-tab scope (Sidebar.tsx) catches viewer/editor crashes first; this root
		* boundary stays as the last resort for Workbench/shell errors.
		*/
		/**
		* Client plugin body.
		* @param ctx - the client cordis context (slots, sessions).
		*/
		function apply(ctx) {
			attachLocale(ctx.locale);
			ctx.effect(() => {
				const offZh = ctx.locale.register(LOCALE_NS, "zh", zh);
				const offEn = ctx.locale.register(LOCALE_NS, "en", en);
				return () => {
					offZh();
					offEn();
				};
			}, "dsh-better-sidebar: dictionaries");
			ctx.effect(() => {
				let dispose;
				let generation = 0;
				const sync = () => {
					generation += 1;
					dispose?.();
					dispose = void 0;
					const store = ctx.get("betterLocale");
					attachBetterLocale(store);
					if (store !== void 0) {
						const myGeneration = generation;
						loadChunk("locale").then((mod) => {
							if (myGeneration !== generation) return;
							dispose = store.register(LOCALE_NS, mod.localeDicts);
						}).catch(() => {});
					}
				};
				sync();
				const unsubscribe = ctx.locale.subscribe(sync);
				return () => {
					generation += 1;
					unsubscribe();
					dispose?.();
					attachBetterLocale(void 0);
				};
			}, "dsh-better-sidebar: better-locale lazy integration");
			const sidebarStore = createSidebarStore();
			try {
				const syn = (v) => v === void 0 || v === null || v === "" || String(v) === "current" || String(v).startsWith("__fenglin");
				SidebarStore.resolveCurrentSessionId = () => {
					try {
						const snap = ctx.sessions?.list?.getSnapshot();
						if (!snap) return void 0;
						if (!syn(snap.current)) return String(snap.current);
						const rows = Object.values(snap.byId ?? {}).filter((r) => r != null);
						const mainView = rows.find((r) => ((r.retainedBy && r.retainedBy.mainView || 0) > 0) && r.id !== void 0);
						if (mainView !== void 0) return String(mainView.id);
						const any = rows.find((r) => r.id !== void 0);
						return any === void 0 ? void 0 : String(any.id);
					} catch { return void 0; }
				};
				globalThis.__dshBetterSidebarSessionId = SidebarStore.resolveCurrentSessionId;
				const bind = () => {
					try {
						const cur = SidebarStore.resolveCurrentSessionId();
						if (!syn(cur)) sidebarStore.setSession(String(cur));
					} catch {}
				};
				bind();
				const list = ctx.sessions?.list;
				if (list !== void 0 && typeof list.subscribe === "function") {
					ctx.effect(() => list.subscribe(bind), "dsh-better-sidebar: bind store session");
				}
			} catch {}
			try {
				if (typeof document !== "undefined" && document.getElementById("fenglin-skill-entry-ensure") === null) {
					const skillCss = document.createElement("style");
					skillCss.id = "fenglin-skill-entry-ensure";
					skillCss.textContent = [
						"[data-dsh-skill-explorer-entry]{box-sizing:border-box!important;width:100%!important;height:36px!important;margin:0!important;padding:0 10px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;border:none!important;border-radius:8px!important;background:0 0!important;color:var(--dsw-alias-label-secondary)!important;font-size:13px!important;text-align:left!important;cursor:pointer!important;white-space:nowrap!important}",
						"[data-dsh-skill-explorer-entry] [class*=\"entryIcon\"]{flex:none!important;width:24px!important;height:24px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}",
						"[data-dsh-skill-explorer-entry] svg{width:18px!important;height:18px!important;display:block!important}"
					].join("");
					document.head.appendChild(skillCss);
				}
			} catch {}
			const service = createBetterSidebarService(sidebarStore);
			ctx.provide("betterSidebar", service);
			const nativeRecords = createNativeTabRecords();
			const nativeSurface = createNativeSurface(ctx, nativeRecords);
			service.setSurface(nativeSurface);
			ctx.effect(() => registerNativeSurface({
				ctx,
				store: sidebarStore,
				service,
				records: nativeRecords
			}), "dsh-better-sidebar: native right-Sidebar registrations");
			ctx.effect(() => registerBottomToggle(ctx, sidebarStore), "dsh-better-sidebar: bottom-workbench toggle");
			ctx.effect(() => () => {
				nativeSurface.dispose();
				service.setSurface(void 0);
			}, "dsh-better-sidebar: native right-Sidebar surface");
			const fallbackTitle = t("terminal");
			let terminalTitle = fallbackTitle;
			api.shellGet().then(({ name }) => {
				terminalTitle = name;
				const snapshot = service.getSnapshot();
				if (snapshot.state === void 0) return;
				const tabs = allLeaves(snapshot.state.bottomSplits).flatMap((leaf) => leaf.tabs);
				for (const tab of tabs) if (tab.type === "terminal" && !isAgentTabId(tab.id) && tab.title === fallbackTitle) service.updateTab(tab.id, { title: name });
			}).catch(() => {});
			ctx.effect(() => registerBuiltins(ctx, service, { terminalTitle: () => terminalTitle }), "dsh-better-sidebar: register built-in tabs and viewers");
			const fail = (phase, error) => {
				console.error(`[dsh-better-sidebar] ${phase} error:`, error);
				try {
					const bar = document.createElement("div");
					bar.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483000;max-width:70vw;padding:8px 12px;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-state-error-primary,#f2a1a1);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-base,#1b1b22));border:1px solid var(--dsw-alias-state-error-primary,#f2a1a1);border-radius:8px;white-space:pre-wrap";
					bar.textContent = `[dsh-better-sidebar] ${phase} error: ${error instanceof Error ? error.message : String(error)}`;
					document.body.appendChild(bar);
				} catch {}
			};
			try {
				setChunkModuleSystem(ctx.modules);
				revalidateChunksOnReactivate();
				ctx.effect(() => {
					let disposed = false;
					let root;
					let host;
					let mounted = false;
					let bodyObserver;
					let hostCheckFrame = null;
					const unmount = () => {
						if (!mounted) return;
						mounted = false;
						bodyObserver?.disconnect();
						bodyObserver = void 0;
						if (hostCheckFrame !== null) {
							cancelAnimationFrame(hostCheckFrame);
							hostCheckFrame = null;
						}
						root?.unmount();
						root = void 0;
						host?.remove();
						host = void 0;
					};
					/** Re-attach the host if the page (a desktop shell wrapper, SPA
					*  navigation, …) ever removes it from <body>. Cheap: childList only,
					*  no subtree, no attribute filtering. */
					const guardAnchor = () => {
						if (bodyObserver !== void 0) return;
						bodyObserver = new MutationObserver(() => {
							if (host !== void 0 && !document.body.contains(host)) document.body.appendChild(host);
						});
						bodyObserver.observe(document.body, { childList: true });
					};
					/** One-shot geometry self-check: if the host page transforms
					*  <html>/<body> itself (exotic shells), a fixed panel host would
					*  track the transformed box instead of the viewport. Flip the
					*  degraded mode and pin the host to the viewport every frame until
					*  the ancestor transform is actually gone. The normal path (no
					*  page-level transform) never runs the sync loop. */
					const scheduleHostCheck = () => {
						hostCheckFrame ??= requestAnimationFrame(() => {
							hostCheckFrame = null;
							const layer = host?.querySelector("[data-dsh-panel-host]");
							if (layer === null || layer === void 0) return;
							const rect = layer.getBoundingClientRect();
							if (!(Math.abs(rect.left) > 8 || Math.abs(rect.top) > 8 || Math.abs(rect.width - window.innerWidth) > 8 || Math.abs(rect.height - window.innerHeight) > 8)) {
								layer.removeAttribute("data-dsh-panel-host-degraded");
								layer.style.transform = "";
								return;
							}
							layer.setAttribute("data-dsh-panel-host-degraded", "");
							console.warn("[dsh-better-sidebar] panel host geometry mismatch — a page-level transform was detected; using degraded viewport sync");
							let applied = {
								x: 0,
								y: 0
							};
							const sync = () => {
								const r = layer.getBoundingClientRect();
								const rawLeft = r.left - applied.x;
								const rawTop = r.top - applied.y;
								if (Math.abs(rawLeft) <= 1 && Math.abs(rawTop) <= 1 && Math.abs(r.width - window.innerWidth) <= 1 && Math.abs(r.height - window.innerHeight) <= 1) {
									layer.removeAttribute("data-dsh-panel-host-degraded");
									layer.style.transform = "";
									return;
								}
								const next = {
									x: -rawLeft,
									y: -rawTop
								};
								if (next.x !== applied.x || next.y !== applied.y) {
									applied = next;
									layer.style.transform = `translate(${applied.x}px, ${applied.y}px)`;
								}
								hostCheckFrame = requestAnimationFrame(sync);
							};
							hostCheckFrame = requestAnimationFrame(sync);
						});
					};
					const mount = () => {
						if (mounted || disposed) return;
						try {
							host = document.createElement("div");
							host.setAttribute("data-dsh-better-sidebar", "");
							document.body.appendChild(host);
							root = (0, react_dom_client.createRoot)(host);
							root.render((0, react.createElement)(RenderBoundary, { className: sidebar_module_css_default.boundaryError }, (0, react.createElement)(Sidebar, {
								ctx,
								store: sidebarStore
							})));
							mounted = true;
							guardAnchor();
							scheduleHostCheck();
						} catch (error) {
							fail("mount", error);
						}
					};
					const sync = async () => {
						if (disposed) return;
						const decision = await Promise.race([loadBootDecision(api), new Promise((resolve) => {
							window.setTimeout(() => resolve(null), 2e3);
						})]);
						if (disposed) return;
						if (decision !== null) {
							sidebarStore.setPrefs(decision.prefs);
							sidebarStore.setSuspended(decision.suspended);
						}
						if (decision?.suspended) unmount();
						else mount();
					};
					sync();
					const offRemote = ctx.get("remote")?.$on?.("settings/document-updated", () => {
						sync();
					});
					return () => {
						disposed = true;
						offRemote?.();
						unmount();
					};
				}, "dsh-better-sidebar: sidebar mount");
				ctx.effect(() => {
					try {
						return registerTurnTailInterception(ctx, sidebarStore);
					} catch (error) {
						fail("interception", error);
						return () => {};
					}
				}, "dsh-better-sidebar: turn-tail interception");
				ctx.effect(() => {
					try {
						const urlTargetOf = (url) => {
							const prefs = sidebarStore.getPrefs();
							return matchUrlTarget(service.getTabs().filter((tab) => prefs.tabsEnabled[tab.id] !== false), url)?.id;
						};
						return registerLinkInterception({
							takeoverEnabled: (url) => {
								if (sidebarStore.getSuspended()) return false;
								const prefs = sidebarStore.getPrefs();
								if (prefs.browserInterceptLinks === false) return false;
								if (!(url.protocol === "https:" ? prefs.browserInterceptHttps !== false : prefs.browserInterceptHttp !== false)) return false;
								return urlTargetOf(url) !== void 0 || prefs.tabsEnabled["browser"] !== false;
							},
							openInSidebar: (url) => {
								let title;
								try {
									title = new URL(url).hostname;
								} catch {}
								const type = urlTargetOf(new URL(url)) ?? "browser";
								ctx.get("betterSidebar")?.openTab({
									type,
									url,
									title
								});
							},
							selfOrigin: window.location.origin
						});
					} catch (error) {
						fail("interception", error);
						return () => {};
					}
				}, "dsh-better-sidebar: link interception");
				ctx.effect(() => {
					try {
						return registerImeGuard();
					} catch (error) {
						fail("ime guard", error);
						return () => {};
					}
				}, "dsh-better-sidebar: IME composition guard");
				ctx.effect(() => registerSettingsNavIcon(() => t("settingsNav")), "dsh-better-sidebar: settings navigation icon");
				ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "better-sidebar",
					order: 100,
					label: () => t("settingsNav"),
					inject: () => ({
						store: sidebarStore,
						service
					})
				}, SideCardSection));
			} catch (error) {
				fail("load", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map