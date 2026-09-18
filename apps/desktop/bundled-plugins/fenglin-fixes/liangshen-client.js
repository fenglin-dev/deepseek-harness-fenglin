window.__ModuleLoader__.load({
	id: "@linxin666/dsh-liangshen",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:packages/dsh-liangshen/src/client/LiangShenLever.module.css.mjs
		const css = ".hYkIZq_lever{align-items:center;font-size:12px;line-height:1;display:inline-flex;position:relative}.hYkIZq_control{color:var(--dsw-alias-label-secondary,inherit);font:inherit;cursor:pointer;touch-action:none;background:0 0;border:none;border-radius:999px;align-items:center;gap:6px;margin:0;padding:2px 8px 2px 4px;transition:background-color .16s,color .16s;display:inline-flex}.hYkIZq_control:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#0000000f)}.hYkIZq_control:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,currentColor);outline-offset:2px}.hYkIZq_control:disabled{cursor:default;opacity:.55}.hYkIZq_track{background:linear-gradient(#2b2f36,#14161a);border-radius:8px;justify-content:center;align-items:flex-end;width:24px;height:28px;display:inline-flex;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px #ffffff24,inset 0 6px 10px #0000008c}.hYkIZq_track:after{content:\"\";background:#ffffff38;border-radius:2px;height:3px;position:absolute;bottom:2px;left:3px;right:3px}.hYkIZq_arm{transform-origin:50% 24px;width:16px;height:26px;margin-left:-8px;transition:transform .34s cubic-bezier(.2,1.7,.32,1);position:absolute;bottom:2px;left:50%;transform:rotate(-24deg)}.hYkIZq_lever[data-state=on] .hYkIZq_arm{transform:rotate(24deg)}.hYkIZq_rod{fill:#c9ced6;transition:fill .2s}.hYkIZq_knob{fill:#e04a33;stroke:#00000059;stroke-width:.6px;transition:fill .2s}.hYkIZq_lever[data-state=on] .hYkIZq_rod{fill:#ffd76a}.hYkIZq_lever[data-state=on] .hYkIZq_knob{fill:#f7c637}.hYkIZq_lever[data-state=on] .hYkIZq_track{box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l3,#0000001f), 0 0 10px #f7c6378c}.hYkIZq_lever[data-busy=true] .hYkIZq_arm{animation:.42s ease-in-out infinite hYkIZq_lever-jitter}.hYkIZq_readout{white-space:nowrap;letter-spacing:.02em;min-width:4.4em}.hYkIZq_lever[data-state=on] .hYkIZq_readout{color:var(--dsw-alias-label-primary,inherit);font-weight:600}.hYkIZq_error{background:var(--dsw-alias-bg-layer-3,#0000000f);max-width:22ch;color:var(--dsw-alias-state-error-primary,#c0392b);text-overflow:ellipsis;white-space:nowrap;border-radius:6px;margin-left:4px;padding:2px 6px;overflow:hidden}.hYkIZq_burst{z-index:2147483000;pointer-events:none;place-items:center;display:grid;position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:hidden}.hYkIZq_flash{background:radial-gradient(circle at 50% 62%,#fff6c8eb,#ffd04a73 38%,#ffa00000 72%);animation:.72s ease-out both hYkIZq_burst-flash;position:absolute;inset:0}.hYkIZq_ring{border:6px solid #ffd65ad9;border-radius:50%;width:220px;height:220px;animation:1.1s cubic-bezier(.16,.9,.3,1) both hYkIZq_burst-ring;position:absolute}.hYkIZq_ring:nth-of-type(2){animation-delay:.12s}.hYkIZq_ring:nth-of-type(3){animation-delay:.24s}.hYkIZq_banner{color:#ffe9a8;text-align:center;background:linear-gradient(160deg,#181004f0,#402604eb);border-radius:22px;flex-direction:column;align-items:center;gap:6px;padding:22px 40px;animation:.6s cubic-bezier(.16,1.5,.3,1) both hYkIZq_banner-slam,.5s ease-in-out .6s 2 hYkIZq_banner-shake;display:flex;position:relative;box-shadow:0 0 0 2px #ffd65abf,0 24px 70px #00000073}.hYkIZq_bannerName{letter-spacing:.16em;background:linear-gradient(#fff6d0,#ffc93c 55%,#b8730a);color:#0000;text-shadow:0 0 24px #ffc93ca6;-webkit-background-clip:text;background-clip:text;font-size:44px;font-weight:800}.hYkIZq_line{letter-spacing:.08em;font-size:15px}.hYkIZq_code{font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, monospace);letter-spacing:.06em;opacity:.82;font-size:11px;animation:.5s steps(2,end) 6 hYkIZq_code-blink}.hYkIZq_sparks{place-items:center;display:grid;position:absolute;inset:0}.hYkIZq_spark{transform-origin:50%;background:linear-gradient(#ffeca0f2,#ffaa1400);border-radius:3px;grid-area:1/1;width:3px;height:30px;animation:.95s ease-out both hYkIZq_spark-fly}@keyframes hYkIZq_lever-jitter{0%,to{transform:rotate(-22deg)}50%{transform:rotate(-8deg)}}@keyframes hYkIZq_burst-flash{0%{opacity:0;transform:scale(.6)}18%{opacity:1}to{opacity:0;transform:scale(1.5)}}@keyframes hYkIZq_burst-ring{0%{opacity:.9;transform:scale(.2)}to{opacity:0;transform:scale(3.4)}}@keyframes hYkIZq_banner-slam{0%{opacity:0;transform:scale(3.6)rotate(-9deg)}55%{opacity:1;transform:scale(.94)rotate(1.5deg)}75%{transform:scale(1.06)rotate(-1deg)}to{opacity:1;transform:scale(1)rotate(0)}}@keyframes hYkIZq_banner-shake{0%,to{transform:translate(0)}25%{transform:translate(-9px)rotate(-.6deg)}75%{transform:translate(9px)rotate(.6deg)}}@keyframes hYkIZq_spark-fly{0%{opacity:0;transform:translateY(-40px)scaleY(.3)}18%{opacity:1}to{opacity:0;transform:translateY(-300px)scaleY(1.15)}}@keyframes hYkIZq_code-blink{0%,to{opacity:.35}50%{opacity:1}}@media (prefers-reduced-motion:reduce){.hYkIZq_arm,.hYkIZq_control,.hYkIZq_rod,.hYkIZq_knob{transition:none}.hYkIZq_lever[data-busy=true] .hYkIZq_arm,.hYkIZq_flash,.hYkIZq_ring,.hYkIZq_banner,.hYkIZq_code,.hYkIZq_spark{animation:none}.hYkIZq_burst{animation:.3s ease-out both hYkIZq_burst-flash}.hYkIZq_spark{display:none}}";
		const tagId = "@linxin666/dsh-liangshen/packages/dsh-liangshen/src/client/LiangShenLever.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-liangshen";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var LiangShenLever_module_css_default = {
			"arm": "hYkIZq_arm",
			"banner": "hYkIZq_banner",
			"banner-shake": "hYkIZq_banner-shake",
			"banner-slam": "hYkIZq_banner-slam",
			"bannerName": "hYkIZq_bannerName",
			"burst": "hYkIZq_burst",
			"burst-flash": "hYkIZq_burst-flash",
			"burst-ring": "hYkIZq_burst-ring",
			"code": "hYkIZq_code",
			"code-blink": "hYkIZq_code-blink",
			"control": "hYkIZq_control",
			"error": "hYkIZq_error",
			"flash": "hYkIZq_flash",
			"knob": "hYkIZq_knob",
			"lever": "hYkIZq_lever",
			"lever-jitter": "hYkIZq_lever-jitter",
			"line": "hYkIZq_line",
			"readout": "hYkIZq_readout",
			"ring": "hYkIZq_ring",
			"rod": "hYkIZq_rod",
			"spark": "hYkIZq_spark",
			"spark-fly": "hYkIZq_spark-fly",
			"sparks": "hYkIZq_sparks",
			"track": "hYkIZq_track"
		};
		//#endregion
		//#region src/client/LiangShenLever.tsx
		/**
		* The homepage lever: a slot-machine arm beside the model selector.
		*
		* Pull it down and the session about to start becomes LiangShen mode; push it
		* up and the preset the user was on comes back. The arm tracks the real preset
		* (never a local guess), and the theatrical part — flash, shockwave, sparks,
		* and the three-language jackpot banner — plays only once the switch actually
		* landed, so a refused switch never celebrates.
		*
		* The component is pure: every fact and verb arrives through the injected face.
		* A pointer drag past {@link DRAG_THRESHOLD_PX} counts as a pull or a push; a
		* plain click or a keyboard activation toggles instead.
		*/
		/** Vertical travel that separates a pull or push from a plain click. */
		const DRAG_THRESHOLD_PX = 14;
		/** How long the burst overlay stays mounted, matching its CSS duration. */
		const BURST_MS = 2200;
		/** Jackpot lines that read the same in every language. */
		const BINARY = "01001100 01001001 01000001 01001110 01000111";
		const MORSE = "-.. . . .--. ... . . -.- / .... .- .-. -. . ... ...";
		/** One spark per spoke of the burst. */
		const SPARKS = Array.from({ length: 14 }, (_, index) => index);
		/** Slot entry for `conversation.input.right` (left of the model selector). */
		function LiangShenLever(face) {
			const { state, restoreLabel, busy, error, burst } = (0, react.useSyncExternalStore)(face.store.subscribe, face.store.getSnapshot);
			const [burstKey, setBurstKey] = (0, react.useState)(0);
			const seen = (0, react.useRef)(burst);
			const drag = (0, react.useRef)(void 0);
			const actionable = !busy;;
			const on = state === "on";
			const errorText = error === void 0 ? void 0 : error.kind === "locked" ? face.t("lever.failed.locked") : error.kind === "missing" ? face.t("lever.failed.missing") : error.kind === "timeout" ? face.t("lever.failed.timeout") : face.t("lever.failed.failed", { reason: error.reason });
			(0, react.useEffect)(() => {
				if (burst > seen.current) setBurstKey(burst);
				seen.current = burst;
			}, [burst]);
			(0, react.useEffect)(() => {
				if (burstKey === 0) return;
				const timer = setTimeout(() => {
					setBurstKey(0);
				}, BURST_MS);
				return () => {
					clearTimeout(timer);
				};
			}, [burstKey]);
			/* Fenglin: keep lever visible so 0.1.6 graph gaps are debuggable. */
			const toggle = () => {
				if (!actionable) return;
				if (on) face.push();
				else face.pull();
			};
			const onPointerDown = (event) => {
				if (!actionable) return;
				drag.current = {
					y: event.clientY,
					fired: false
				};
				event.currentTarget.setPointerCapture?.(event.pointerId);
			};
			const onPointerMove = (event) => {
				const pending = drag.current;
				if (pending === void 0 || pending.fired) return;
				const travel = event.clientY - pending.y;
				if (travel >= DRAG_THRESHOLD_PX) {
					pending.fired = true;
					face.pull();
				} else if (travel <= -14) {
					pending.fired = true;
					face.push();
				}
			};
			const onPointerUp = () => {
				const pending = drag.current;
				drag.current = void 0;
				if (pending === void 0 || pending.fired) return;
				toggle();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: LiangShenLever_module_css_default.lever,
				"data-dsh-plugin": "liangshen",
				"data-dsh-part": "lever",
				"data-state": state,
				"data-busy": busy ? "true" : void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						role: "switch",
						"aria-checked": on,
						"aria-label": face.t("lever.a11y"),
						"aria-busy": busy,
						title: hint(face, state, restoreLabel),
						className: LiangShenLever_module_css_default.control,
						disabled: !actionable,
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onPointerCancel: onPointerUp,
						onClick: (event) => {
							if (event.detail === 0) toggle();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LiangShenLever_module_css_default.track,
							"data-dsh-part": "lever-track",
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								className: LiangShenLever_module_css_default.arm,
								"data-dsh-part": "lever-arm",
								viewBox: "0 0 16 26",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									className: LiangShenLever_module_css_default.rod,
									x: "6.5",
									y: "3.5",
									width: "3",
									height: "21",
									rx: "1.5"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
									className: LiangShenLever_module_css_default.knob,
									cx: "8",
									cy: "4",
									r: "3.4"
								})]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LiangShenLever_module_css_default.readout,
							children: busy ? face.t("lever.busy") : on ? face.t("lever.state.on") : (state === "locked" ? "会话已开始" : state === "missing" ? "预设缺失" : face.t("lever.state.off"))
						})]
					}),
					errorText !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LiangShenLever_module_css_default.error,
						role: "status",
						title: errorText,
						children: errorText
					}),
					burstKey !== 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Burst, { face }, burstKey)
				]
			});
		}
		/** The hover hint: what this gesture would do right now. */
		function hint(face, state, restoreLabel) {
			if (state === "locked") return face.t("lever.hint.locked");
			if (state === "missing") return face.t("lever.hint.missing");
			if (state === "on") return face.t("lever.hint.push", { preset: restoreLabel === "" ? face.t("lever.state.off") : restoreLabel });
			return face.t("lever.hint.pull");
		}
		/** The jackpot overlay: flash, shockwave rings, sparks, and the banner. */
		function Burst({ face }) {
			const hostRef = react.useRef(null);
			react.useEffect(function() {
				// Fenglin: rehost jackpot overlay on <body> so composer transforms cannot pull it downward.
				const el = hostRef.current;
				if (el == null || typeof document === "undefined") return;
				if (el.parentNode !== document.body) document.body.appendChild(el);
				return function() {
					try { el.remove(); } catch (e) {}
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				ref: hostRef,
				className: LiangShenLever_module_css_default.burst,
				"data-dsh-part": "lever-burst",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: LiangShenLever_module_css_default.flash }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: LiangShenLever_module_css_default.ring }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: LiangShenLever_module_css_default.ring }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: LiangShenLever_module_css_default.ring }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: LiangShenLever_module_css_default.banner,
						"data-dsh-part": "lever-banner",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LiangShenLever_module_css_default.bannerName,
								children: face.t("lever.name")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LiangShenLever_module_css_default.line,
								children: face.t("burst.line1")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LiangShenLever_module_css_default.line,
								children: face.t("burst.line2")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LiangShenLever_module_css_default.code,
								children: BINARY
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LiangShenLever_module_css_default.code,
								children: MORSE
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LiangShenLever_module_css_default.sparks,
						children: SPARKS.map((spoke) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
							className: LiangShenLever_module_css_default.spark,
							style: { rotate: `${spoke * (360 / SPARKS.length)}deg` }
						}, spoke))
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-store-engine
		const platform = ["@deepseek-ai/dsh-client", "-store"].join("");
		const legacy = ["@deepseek-ai/dsh-client-runtime", "/client"].join("");
		let engine;
		try {
			engine = require(platform);
		} catch {
			engine = require(legacy);
		}
		const createSnapshotStore = engine.createSnapshotStore;
		engine.defineStore;
		engine.shallowEqual;
		//#endregion
		//#region src/core/lever.ts
		/**
		* LiangShen lever logic — framework-free, no DOM, compiled by both programs.
		*
		* The lever is a homepage control beside the model selector: pulling it down
		* turns the current session's preset into LiangShen mode, pushing it up
		* restores the preset the user was on before. The facts it needs are the
		* current session's preset, whether that session may still change preset at
		* all, and the preset roster; the decisions are pure so they can be tested
		* without the browser runtime.
		*
		* A preset is fixed once a session starts (the host refuses the switch with
		* `agent-preset/locked`), so the lever is only meaningful while the session is
		* blank — which is exactly the new-session screen it renders on.
		*/
		/** The preset id this lever turns on; also the preset directory name. */
		const LIANGSHEN_PRESET_ID = "liangshen";
		/** Resolve what the lever shows for one set of facts. */
		function leverState(facts) {
			if (!facts.available.includes("liangshen")) return "missing";
			// Fenglin: only lock when the session is explicitly non-blank.
			if (facts.blank === false) return "locked";
			return facts.agentPreset === "liangshen" ? "on" : "off";
		}
		/**
		* The preset a push-up restores: the preset the user was on before pulling the
		* lever, else the deployment default. A candidate is skipped when it is the
		* LiangShen preset itself (restoring it would be a no-op) or when the roster
		* no longer supplies it.
		*/
		function restoreTarget(facts) {
			for (const candidate of [facts.previous, facts.fallback]) {
				if (candidate === void 0 || candidate === "liangshen") continue;
				if (facts.available.includes(candidate)) return candidate;
			}
		}
		/** Whether the lever can act at all in its current state. */
		function isActionable(state) {
			return state === "on" || state === "off";
		}
		/** Read the preset a session summary reports, when it reports one. */
		function presetOf(session) {
			const value = session?.projectionValues?.["agentPreset"];
			return typeof value === "string" ? value : void 0;
		}
		/** The lever controller: roster read, session facts, and the preset switch. */
		var LeverController = class {
			ctx;
			store;
			/**
			* The browser services this controller reads, resolved defensively: the
			* context proxy throws on any service the fiber did not inject, so a
			* deployment that cannot answer one of them must leave the lever inert
			* rather than take the plugin (and the composer row) down with it.
			*/
			sessions;
			remote;
			/** Roster rows as last read; empty until the first read lands. */
			rows = [];
			/** The preset the user was on before the last pull-down. */
			previous;
			/**
			 * Fenglin: last preset the host accepted. alpha.2 session summaries can
			 * omit projectionValues.agentPreset after select(); the settings seat UI
			 * already trusts the RPC return value, so the lever must too.
			 */
			applied;
			/** Session id the applied preset belongs to. */
			appliedSessionId;
			/** Host-accepted select timestamp; ignore stale projection briefly after it. */
			selectLandedAt;
			loading = false;
			/** Ceiling on one in-flight switch, so a lost Remote answer cannot hang the row. */
			selectTimeoutMs;
			disposers = [];
			constructor(ctx, options = {}) {
				this.ctx = ctx;
				this.selectTimeoutMs = options.selectTimeoutMs ?? 1e4;
				this.sessions = readService(() => ctx.sessions);
				this.remote = readService(() => ctx.remote.agentPresets);
				this.store = createSnapshotStore({
					state: "off",
					restoreLabel: "",
					busy: false,
					burst: 0
				});
			}
			/** The snapshot store the view subscribes to. */
			snapshot() {
				return this.store;
			}
			/** Follow the roster and the current session, then read the roster once. */
			start() {
				const list = this.sessions?.list;
				if (list !== void 0) this.disposers.push(list.subscribe(() => {
					this.refresh();
				}));
				const remote = readService(() => this.ctx.remote);
				if (typeof remote?.$on === "function") this.disposers.push(remote.$on("settings/document-updated", (ns) => {
					if (ns === "agent-presets") this.load();
				}));
				this.refresh();
				if (this.remote !== void 0) this.load();
			}
			/** Release every subscription. Idempotent. */
			dispose() {
				for (const dispose of this.disposers.splice(0)) dispose();
			}
			/** The inject face handed to the slot entry. */
			face() {
				return {
					store: this.store,
					pull: () => {
						this.toggle("down");
					},
					push: () => {
						this.toggle("up");
					},
					t: (key, vars) => {
						const translate = readService(() => this.ctx.locale.bind("liangshen"));
						return translate === void 0 ? key : translate(key, vars);
					}
				};
			}
			/** Read the roster; a refusal leaves the lever as it was. */
			async load() {
				if (this.loading) return;
				const remote = this.remote ?? readService(() => this.ctx.remote?.agentPresets);
				if (remote === void 0) return;
				this.loading = true;
				try {
					const result = await remote.list();
					if (result.ok) this.rows = result.value.presets;
				} catch {} finally {
					this.loading = false;
					this.refresh();
				}
			}
			/**
			* Recompute the snapshot from the current session and the last roster read.
			* Only the derived fields are written: an in-flight switch, the last refusal,
			* and the burst counter belong to the gesture, not to a session refresh.
			*/
			refresh() {
				const facts = this.facts();
				const snapshot = this.store.getSnapshot();
				const state = leverState(facts);
				const target = restoreTarget(facts);
				const restoreLabel = target === void 0 ? "" : this.labelOf(target);
				if (snapshot.state === state && snapshot.restoreLabel === restoreLabel) return;
				this.store.set({
					...snapshot,
					state,
					restoreLabel
				});
			}
			/** The verb behind one gesture direction. */
			async toggle(direction) {
				const snapshot = this.store.getSnapshot();
				if (snapshot.busy) return;
				const remote = this.remote ?? readService(() => this.ctx.remote?.agentPresets);
				if (remote === void 0) return;
				const facts = this.facts();
				if (!isActionable(leverState(facts))) return;
				const target = direction === "down" ? LIANGSHEN_PRESET_ID : restoreTarget(facts);
				// Fenglin: current session first; on the hero composer `list.current` can
				// be empty — fall back to the same blank mainView session the preset seat
				// uses. Never pick an arbitrary non-blank byId row.
				const sessionId = this.resolveSessionId();
				if (target === void 0 || remote === void 0) return;
				if (sessionId === void 0) {
					this.store.set({ ...this.store.getSnapshot(), busy: false, error: { kind: "failed", reason: "no session id" } });
					return;
				}
				if (facts.agentPreset === target) {
					this.refresh();
					return;
				}
				this.store.set({
					...snapshot,
					busy: true,
					error: void 0
				});
				let result;
				try {
					result = await withTimeout(remote.select(sessionId, target), this.selectTimeoutMs);
				} catch (error) {
					const mapped = error instanceof SwitchTimeout ? { kind: "timeout" } : {
						kind: "failed",
						reason: message(error)
					};
					this.store.set({
						...this.store.getSnapshot(),
						busy: false,
						error: mapped
					});
					this.refresh();
					return;
				}
				if (!result.ok) {
					this.store.set({
						...this.store.getSnapshot(),
						busy: false,
						error: refusal(result.error)
					});
					this.refresh();
					return;
				}
				this.previous = direction === "down" ? facts.agentPreset : void 0;
				const landed = typeof result.value === "string" && result.value.length > 0 ? result.value : target;
				this.applied = landed;
				this.appliedSessionId = sessionId;
				this.selectLandedAt = Date.now();
				const next = this.store.getSnapshot();
				this.store.set({
					...next,
					busy: false,
					error: void 0,
					state: landed === LIANGSHEN_PRESET_ID ? "on" : "off",
					burst: direction === "down" ? next.burst + 1 : next.burst
				});
				this.refresh();
			}
			/** The facts one decision reads, from the live session and the roster. */
			facts() {
				const summary = this.currentSession();
				let available = this.rows.filter((row) => row.broken === void 0).map((row) => row.id); if (this.remote === void 0 && available.length === 0) { available = ["liangshen"]; /* Fenglin: default roster when remote.agentPresets is absent */ }
				const fallback = this.rows.find((row) => row.isDefault)?.id;
				const projected = presetOf(summary);
				const sessionId = this.resolveSessionId();
				if (sessionId !== this.appliedSessionId) {
					this.applied = projected;
					this.appliedSessionId = sessionId;
					this.selectLandedAt = void 0;
				} else if (projected !== void 0) {
					const freshSelect = this.selectLandedAt !== void 0 && Date.now() - this.selectLandedAt < 2000;
					if (this.applied === void 0) this.applied = projected;
					else if (projected === this.applied) this.selectLandedAt = void 0;
					else if (!freshSelect) this.applied = projected;
				}
				return {
					blank: summary === void 0 || summary.blank === true,
					agentPreset: this.applied ?? projected,
					available,
					fallback,
					previous: this.previous
				};
			}
			currentSessionId() {
				try {
					const current = this.sessions?.list.getSnapshot().current;
					return current === void 0 ? void 0 : String(current);
				} catch {
					return void 0;
				}
			}
			/** Hero composer may have no `list.current`; match the official seat lookup. */
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
			/** Prefer current session; blank sessions only — never lock a new chat from an old transcript. */
			resolveSessionId() {
				return this.currentSessionId() ?? this.mainBlankSessionId();
			}
			currentSession() {
				try {
					const state = this.sessions?.list.getSnapshot();
					if (state === void 0) return void 0;
					const id = this.resolveSessionId();
					if (id === void 0) return void 0;
					return state.byId[id];
				} catch {
					return void 0;
				}
			}
			/** Display name of one preset id, falling back to the id itself. */
			labelOf(id) {
				return this.rows.find((candidate) => candidate.id === id)?.name ?? id;
			}
		};
		/** Raised when one switch outlives {@link SELECT_TIMEOUT_MS}. */
		var SwitchTimeout = class extends Error {
			constructor() {
				super("the preset switch did not answer in time");
				this.name = "SwitchTimeout";
			}
		};
		/** Resolve with `work`, or reject with a {@link SwitchTimeout} after `ms`. */
		function withTimeout(work, ms) {
			return new Promise((resolve, reject) => {
				const timer = setTimeout(() => {
					reject(new SwitchTimeout());
				}, ms);
				work.then((value) => {
					clearTimeout(timer);
					resolve(value);
				}, (error) => {
					clearTimeout(timer);
					reject(error instanceof Error ? error : new Error(String(error)));
				});
			});
		}
		/**
		* Read one context service, treating the proxy's "without inject" refusal (and
		* any other resolution fault) as the service being absent.
		*/
		function readService(read) {
			try {
				return read();
			} catch {
				return;
			}
		}
		/** The host's own reason for a refusal, mapped to lever copy. */
		function refusal(error) {
			if (error.code === "agent-preset/locked") return { kind: "locked" };
			if (error.code === "agent-preset/not-found") return { kind: "missing" };
			const details = error.details;
			if (typeof details === "object" && details !== null && typeof details.reason === "string") return {
				kind: "failed",
				reason: details.reason
			};
			return {
				kind: "failed",
				reason: error.message ?? error.code ?? "unknown"
			};
		}
		function message(error) {
			return error instanceof Error ? error.message : String(error);
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Lever copy: zh-first dictionary with an English counterpart. The zh side is
		* the key-set source of truth; `packages/dsh-i18n` mirrors the keys into the
		* centralized ru dictionary and `pnpm i18n:check` enforces the parity.
		*/
		/** Lever copy, key source of truth. */
		const zh = {
			"lever.a11y": "梁神模式拨杆",
			"lever.name": "梁神模式",
			"lever.hint.pull": "拨下拨杆：开启「梁神模式」",
			"lever.hint.push": "上拨拨杆：返回「{preset}」",
			"lever.hint.locked": "会话已开始，模式不可再更改",
			"lever.hint.missing": "未找到「梁神模式」预设，请先启用该插件行",
			"lever.state.on": "梁神模式",
			"lever.state.off": "普通模式",
			"lever.busy": "正在切换…",
			"lever.failed.locked": "会话已经开始，模式已锁定",
			"lever.failed.missing": "没有找到「梁神模式」预设",
			"lever.failed.timeout": "切换超时，请重试",
			"lever.failed.failed": "切换失败：{reason}",
			"burst.line1": "三秒，三辈子的代码",
			"burst.line2": "文言文 · 二进制 · 摩斯电码"
		};
		/** English counterpart; the key set mirrors {@link zh} exactly. */
		const en = {
			"lever.a11y": "LiangShen mode lever",
			"lever.name": "LiangShen mode",
			"lever.hint.pull": "Pull the lever down to turn on LiangShen mode",
			"lever.hint.push": "Push the lever up to return to \"{preset}\"",
			"lever.hint.locked": "The session has started, so its mode can no longer change",
			"lever.hint.missing": "The LiangShen preset is not installed; enable that plugin row first",
			"lever.state.on": "LiangShen",
			"lever.state.off": "Standard",
			"lever.busy": "Switching…",
			"lever.failed.locked": "The session already started, so the mode is locked",
			"lever.failed.missing": "The LiangShen preset was not found",
			"lever.failed.timeout": "The switch timed out; try again",
			"lever.failed.failed": "Switch failed: {reason}",
			"burst.line1": "Three seconds, three lifetimes of code",
			"burst.line2": "Classical Chinese · Binary · Morse code"
		};
		//#endregion
		//#region src/client/index.ts
		/** Locale namespace this half owns. */
		const NS = "liangshen";
		/**
		* Required client services: the slot registry, locale, sessions, and the roster
		* Remote. Both `remote` and `remote.agentPresets` are declared: the context
		* proxy refuses an uninjected service, and a nested service name does not imply
		* its parent, so reading `ctx.remote.agentPresets` needs `remote` as well.
		*/
		const inject = ["slots", "locale", "sessions", "remote", "remote.agentPresets"];
		/**
		* Mount the lever: register the copy, follow the roster and the current
		* session, and claim the composer tool row.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			ctx.effect(() => {
				try {
					return ctx.locale.register(NS, {
						zh,
						en
					});
				} catch {
					return () => {};
				}
			}, "liangshen: lever dictionaries");
			const controller = new LeverController(ctx);
			ctx.effect(() => () => controller.dispose(), "liangshen: lever controller");
			try {
				controller.start();
			} catch {}
			ctx.slots.inject("conversation.input.right", () => {
				try {
					const unregister = ctx.slots.register({
						name: "conversation.input.right",
						id: "liangshen-lever",
						order: 20,
						inject: () => controller.face()
					}, LiangShenLever);
					return () => {
						unregister();
					};
				} catch {
					return () => {};
				}
			});
		}
		//#endregion
		exports.LIANGSHEN_PRESET_ID = LIANGSHEN_PRESET_ID;
		exports.LeverController = LeverController;
		exports.LiangShenLever = LiangShenLever;
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		exports.leverState = leverState;
		exports.restoreTarget = restoreTarget;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map