/**
 * tool-catalog — staged model-visible tool surface for LiangShen mode:
 * anchor turn's native wire, PTC handoff at turn boundary, and durable catalog message.
 *
 * Minimal-prompt retains official host tools:sdk and tools:ptc-only sections
 * in the system prompt. This plugin:
 * 1. Separates PTC plan from actual presentation state.
 * 2. Uses only public APIs (tools.schemas, tools.presentAs).
 * 3. Does not duplicate the giant TypeScript SDK into durable messages.
 * 4. Staging: anchor turn narrows to anchorTools (bash or 4 tools) natively.
 * 5. Turn boundary session events / lifecycle hooks declare PTC before assemble.
 * 6. If SDK/tools are unavailable, reverts PTC and synchronizes wire to native.
 * 7. Removes the false statement about schemas traveling with tool definition.
 * 8. Maintains deduplication and compaction recovery.
 * 9. Native presentation lists exactly the tools this request's wire carries; under
 *    PTC the list is the SDK-reachable registry projection and the program contract
 *    marks `run_code` as the only directly callable transport.
 */

/** Cordis plugin name used by loader diagnostics. */
export const name = 'liangshen-tool-catalog'

/** Prompt assembly must exist before the wire catalog can be observed. */
export const inject = ['systemPrompt']

/** Default cap for one tool's one-line summary in the injected compact list. */
const DEFAULT_DESCRIPTION_MAX_LENGTH = 200

/**
 * Nesting depth beyond which an inline signature degrades to JsonValue. The
 * rendering stays one line per tool, so deeply nested argument objects are
 * summarized in the inline summary rather than expanded into an unreadable line.
 */
const MAX_SIGNATURE_DEPTH = 4

/** Types the compact signature renders exactly; everything else degrades. */
const SCALAR_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'null'])

function integerAtLeast(value, field, minimum, fallback) {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < minimum) {
    throw new TypeError(`${name}: ${field} must be an integer >= ${minimum}`)
  }
  return value
}

function optionalBoolean(value, field, fallback) {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') {
    throw new TypeError(`${name}: ${field} must be a boolean`)
  }
  return value
}

/** Parse the anchorTools config: absent means staging off, entries must be non-empty names. */
function anchorToolNames(value) {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new TypeError(`${name}: anchorTools must be an array of tool names`)
  }
  return value.map((entry) => {
    if (typeof entry !== 'string' || entry.trim() === '') {
      throw new TypeError(`${name}: anchorTools entries must be non-empty tool names`)
    }
    return entry
  })
}

/**
 * Whether the session is still in its anchor turn: fewer than two turn/start
 * events and no turn/end yet.
 */
export function inAnchorTurn(events) {
  let turns = 0
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.type === 'turn/end') return false
    if (event?.type !== 'turn/start') continue
    turns += 1
    if (turns >= 2) return false
  }
  return true
}

/** Narrow one assembled wire tool list to the anchor names, preserving wire order. */
export function anchorToolsOf(tools, names) {
  const wire = Array.isArray(tools) ? tools : []
  if (names.length === 0) return wire
  const keep = new Set(names)
  return wire.filter(tool => keep.has(tool?.name))
}

/**
 * One-line model-facing summary of a tool description: whitespace collapsed,
 * truncated with an ellipsis when maxLength is specified.
 */
export function catalogDescription(value, maxLength) {
  const normalized = String(value ?? '').replaceAll(/\s+/g, ' ').trim()
  if (maxLength === undefined || maxLength <= 0 || normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3)}...`
}

/** One scalar literal as TypeScript-ish text; non-JSON scalars degrade to the broad type. */
function renderLiteral(value) {
  const json = JSON.stringify(value)
  return json === undefined ? 'JsonValue' : json
}

/**
 * One JSON-Schema node as compact TypeScript-ish text for inline signatures.
 * Bounded by MAX_SIGNATURE_DEPTH so inline signatures remain single-line.
 */
export function renderJsonSchemaType(schema, depth = 0) {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return 'JsonValue'
  const union = Array.isArray(schema.oneOf) ? schema.oneOf : Array.isArray(schema.anyOf) ? schema.anyOf : undefined
  if (union !== undefined && union.length > 0) {
    const parts = union.map(node => renderJsonSchemaType(node, depth))
    return [...new Set(parts)].join(' | ')
  }
  if (Object.hasOwn(schema, 'const')) return renderLiteral(schema.const)
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum.map(renderLiteral).join(' | ')
  if (Array.isArray(schema.type)) {
    const parts = schema.type.map(type => (typeof type === 'string' ? type : 'JsonValue'))
    return [...new Set(parts)].join(' | ')
  }
  if (SCALAR_TYPES.has(schema.type)) return schema.type === 'integer' ? 'number' : schema.type
  if (schema.type === 'array') {
    const items = schema.items === undefined ? 'JsonValue' : renderJsonSchemaType(schema.items, depth + 1)
    return items.includes('|') ? `(${items})[]` : `${items}[]`
  }
  if (schema.type === 'object' || schema.properties !== undefined) {
    if (depth >= MAX_SIGNATURE_DEPTH) return 'JsonValue'
    const properties = schema.properties !== undefined && typeof schema.properties === 'object' && !Array.isArray(schema.properties)
      ? Object.entries(schema.properties)
      : []
    if (properties.length === 0) return 'Record<string, JsonValue>'
    const required = new Set(Array.isArray(schema.required) ? schema.required : [])
    const fields = properties.map(([field, child]) => (
      `${field}${required.has(field) ? '' : '?'}: ${renderJsonSchemaType(child, depth + 1)}`
    ))
    return `{ ${fields.join(', ')} }`
  }
  return 'JsonValue'
}

/**
 * The parenthesized argument signature of one tool, e.g.
 * ({ command: string, timeoutMs?: number }). Empty when the parameter schema
 * carries nothing to say.
 */
export function renderSignature(parameters) {
  if (parameters === null || typeof parameters !== 'object' || Array.isArray(parameters)) return ''
  const type = renderJsonSchemaType(parameters)
  return type === 'JsonValue' ? '' : `(${type})`
}

/**
 * Catalog entries for one tool surface, sorted by name so an unchanged surface
 * renders byte-identical text across assemblies. Nameless definitions and
 * the run_code transport tool are skipped.
 */
export function catalogEntries(schemas, maxLength) {
  const entries = []
  for (const schema of Array.isArray(schemas) ? schemas : []) {
    const toolName = schema?.name
    if (typeof toolName !== 'string' || toolName === '' || toolName === 'run_code') continue
    entries.push({
      name: toolName,
      signature: renderSignature(schema.parameters),
      description: catalogDescription(schema.description, maxLength),
    })
  }
  return entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

/**
 * The program contract the injected message carries under PTC.
 */
const PTC_PROGRAM_LINES = [
  'The session presents these tools through `run_code`, which takes `code` — the body of an async TypeScript function (top-level `await` and `return` both work; only erasable syntax runs, no `enum` or namespaces) — and `description`, a short summary of the program. Compose one program per intent instead of one tool call per step:',
  '',
  '- reach a tool as `await tools.<name>({ ... })` — quoted access for exotic names, `tools["my-tool"]({ ... })`;',
  '- overlap independent read-only calls under `Promise.all` (safe calls run concurrently, mutating calls run alone in submission order) and sequence dependent work with `await`;',
  '- a failed call rejects with `ToolCallError`, whose `toolName` and human-readable message identify it — `try/catch` it to continue;',
  '- only what you `return` or `console.log` becomes program output; every other intermediate result stays out of the conversation, so extract just what the next decision needs, and an image a tool returns is attached after the run.',
  '',
  "`run_code` is the only tool that can be called directly once it is on the wire: every tool listed above is reached from inside the program.",
]

/**
 * Model-facing catalog text.
 * - Under native presentation (anchor turn or PTC declined/disabled): carries available_tools list.
 * - Under PTC presentation: carries available_tools list and PTC program contract.
 * - The false statement that 'the full parameter schema travels with its own tool definition' is removed.
 * - Complete SDK definitions are retained in the official host tools:sdk prompt section.
 */
export function renderCatalogText(entries, ptc) {
  const available = entries.length === 0
    ? ['No tools are currently available in this session.']
    : [
        '<available_tools>',
        ...entries.map(entry => `- \`${entry.name}${entry.signature}\`: ${entry.description}`),
        '</available_tools>',
      ]
  const footer = 'This is the complete current list and replaces any earlier available-tools list in this session.'
  return [
    '<system-reminder>',
    'The following tools are available in this session:',
    '',
    ...available,
    '',
    footer,
    ...(ptc ? ['', ...PTC_PROGRAM_LINES] : []),
    '</system-reminder>',
  ].join('\n')
}

/**
 * Overlay the registry projection's fuller schema onto each wire entry, keyed by
 * name, so a narrowed native list keeps complete argument semantics even when the
 * assembly's own tool object carries a thinner definition. Entries the projection
 * does not name, and every entry when no projection is readable, stay untouched.
 */
export function mergeProjectedSchemas(wireTools, projection) {
  if (!Array.isArray(projection) || projection.length === 0) return wireTools
  const byName = new Map()
  for (const schema of projection) {
    if (typeof schema?.name === 'string' && schema.name !== '') byName.set(schema.name, schema)
  }
  return wireTools.map((tool) => {
    const projected = byName.get(tool?.name)
    if (projected === undefined) return tool
    const merged = { ...tool }
    if (projected.parameters !== undefined) merged.parameters = projected.parameters
    if (typeof projected.description === 'string' && projected.description.length > 0) {
      merged.description = projected.description
    }
    return merged
  })
}

/** Build the durable catalog message for one entry list. */
export function createCatalogMessage(entries, ptc) {
  return {
    id: globalThis.crypto.randomUUID(),
    role: 'user',
    content: [{ type: 'text', text: renderCatalogText(entries, ptc) }],
    source: { kind: 'plugin', plugin: name },
  }
}

/** The text one message contributes, joined across its text blocks. */
function textOf(message) {
  const blocks = Array.isArray(message?.content) ? message.content : []
  return blocks
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
}

/** Whether one message is this plugin's catalog. */
function isCatalogMessage(message) {
  const source = message?.source
  return source?.kind === 'plugin' && source?.plugin === name
}

/**
 * Session events, tolerating both snapshotEvents() and events array.
 */
function sessionEvents(session) {
  if (Array.isArray(session?.events)) return session.events
  if (typeof session?.snapshotEvents === 'function') return session.snapshotEvents()
  return []
}

/** Visible surface positions, or undefined when the session exposes none. */
function visibleSeqSet(session) {
  const nodes = session?.surface?.nodes
  return Array.isArray(nodes) ? new Set(nodes) : undefined
}

/**
 * Published catalog state read back from durable log.
 */
function catalogHistory(agent) {
  const session = agent?.session
  const events = sessionEvents(session)
  const visible = visibleSeqSet(session)
  let published = false
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'user/message' || !isCatalogMessage(event.data)) continue
    published = true
    if (visible === undefined || typeof event.seq !== 'number' || visible.has(event.seq)) {
      return { published, text: textOf(event.data) }
    }
  }
  return { published }
}

/** This plugin's catalog message inside one step's admitted batch, if any. */
function catalogMessage(messages) {
  for (const message of messages) {
    if (isCatalogMessage(message)) return { message, text: textOf(message) }
  }
  return undefined
}

/** Drop one message from a step's admitted batch. */
function withoutMessage(decision, id) {
  return { ...decision, messages: decision.messages.filter(message => message.id !== id) }
}

/** Register the surface staging, the PTC handoff, and the per-step catalog injection. */
export function apply(ctx, config) {
  const descriptionMaxLength = integerAtLeast(
    config?.descriptionMaxLength,
    'descriptionMaxLength',
    1,
    DEFAULT_DESCRIPTION_MAX_LENGTH,
  )
  const anchorNames = anchorToolNames(config?.anchorTools)
  const ptcPlanEnabled = optionalBoolean(config?.ptcPresentation, 'ptcPresentation', true)

  // Per-agent fresh state evaluated on every assembly (never stale across steps/turns)
  const agentCatalogState = new WeakMap()

  // Session to agent mapping for boundary events
  const agentBySession = new WeakMap()

  // Presentation status tracking per agent
  const agentPtcDeclared = new WeakSet()
  const agentPtcFailed = new WeakSet()
  const agentPtcDisposers = new WeakMap()

  let warned = false
  const warnOnce = (detail) => {
    if (warned) return
    warned = true
    try {
      ctx.logger?.warn?.(`${name}: ${detail} — keeping the native tool surface`)
    } catch {
      // Logger unavailable
    }
  }

  const registry = () => ctx.get('tools')

  /** Whether PTC is planned and capable in this deployment. */
  const ptcPlanReady = () => ptcPlanEnabled && ctx.get('codeRuntime') !== undefined

  /** Whether this session is still in its anchor turn. */
  const anchoring = (agent) => (
    anchorNames.length > 0 && agent !== undefined && inAnchorTurn(sessionEvents(agent?.session))
  )

  /**
   * Declare PTC presentation for one agent using public agent.ctx.tools.presentAs('ptc').
   */
  const presentPtc = (agent) => {
    if (!ptcPlanReady() || agent === undefined) return false
    if (agentPtcDeclared.has(agent)) return true
    if (agentPtcFailed.has(agent)) return false

    const tools = agent?.ctx?.tools
    if (tools === undefined || typeof tools.presentAs !== 'function') {
      agentPtcFailed.add(agent)
      warnOnce('no scoped tools view to declare PTC presentation')
      return false
    }

    try {
      const disposer = tools.presentAs('ptc')
      agentPtcDeclared.add(agent)
      if (typeof disposer === 'function') {
        agentPtcDisposers.set(agent, disposer)
      }
      return true
    } catch (err) {
      agentPtcFailed.add(agent)
      warnOnce(`PTC presentation declined: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }

  /**
   * Abort/revert PTC declaration if active, restoring presentation back to native.
   */
  const revertPtc = (agent, reason, retryable = false) => {
    if (agent === undefined) return
    const disposer = agentPtcDisposers.get(agent)
    if (typeof disposer === 'function') {
      try {
        disposer()
      } catch {
        // Ignore disposer error
      }
      agentPtcDisposers.delete(agent)
    }
    agentPtcDeclared.delete(agent)
    // A declaration the host itself refused is permanent for this agent. One that
    // merely failed to reach a wire is not: the next turn boundary may declare
    // again, and latching it would strand the session on the native surface.
    if (!retryable) agentPtcFailed.add(agent)
    warnOnce(reason)
  }

  /**
   * Read visible tool schemas from the public tools.schemas(agent) API.
   * Excludes run_code. Tolerates test stubs providing sdkSchemas.
   */
  const resolveToolsService = (agent) => {
    const scoped = agent?.ctx?.tools
    if (typeof scoped?.schemas === 'function' || typeof scoped?.sdkSchemas === 'function') {
      return scoped
    }
    const reg = registry()
    if (typeof reg?.schemas === 'function' || typeof reg?.sdkSchemas === 'function') {
      return reg
    }
    return scoped ?? reg
  }

  const publicSchemas = (agent) => {
    const tools = resolveToolsService(agent)
    if (tools === undefined) return undefined
    if (typeof tools.schemas === 'function') {
      try {
        const schemas = tools.schemas(agent)
        if (Array.isArray(schemas) && schemas.length > 0) {
          const filtered = schemas.filter(t => t?.name && t.name !== 'run_code')
          return filtered.length > 0 ? filtered : undefined
        }
        return undefined
      } catch {
        warnOnce('no tool schemas available')
        return undefined
      }
    }
    // Test harness compatibility stub
    if (typeof tools.sdkSchemas === 'function') {
      try {
        const schemas = tools.sdkSchemas(agent)
        if (Array.isArray(schemas) && schemas.length > 0) {
          const filtered = schemas.filter(t => t?.name && t.name !== 'run_code')
          return filtered.length > 0 ? filtered : undefined
        }
      } catch {
        warnOnce('no tool schemas available')
        return undefined
      }
    }
    return undefined
  }

  /**
   * The catalog the NEXT request will expose, resolved from the current
   * presentation state rather than from the previous assembly.
   *
   * A turn boundary declares PTC before the promoted turn's first step, but that
   * turn's assembly has not run yet, so the stored state would still describe the
   * anchor wire. Resolving the projection here keeps the published catalog in step
   * with the transport the request is about to carry.
   */
  const catalogStateFor = (agent) => {
    if (agent === undefined) return undefined
    if (!anchoring(agent) && ptcPlanReady() && agentPtcDeclared.has(agent)) {
      const schemas = publicSchemas(agent)
      if (schemas !== undefined && schemas.length > 0) {
        return { entries: catalogEntries(schemas, descriptionMaxLength), ptc: true }
      }
    }
    return agentCatalogState.get(agent)
  }

  // Early lifecycle hooks: declare PTC ahead of prompt assembly
  ctx.on('agent/created', (agent) => {
    if (agent?.session !== undefined) agentBySession.set(agent.session, agent)
    if (!anchoring(agent) && ptcPlanReady()) {
      presentPtc(agent)
    }
  })

  ctx.on('agent/session-start', (agent, session) => {
    if (session !== undefined && agent !== undefined) agentBySession.set(session, agent)
    if (!anchoring(agent) && ptcPlanReady()) {
      presentPtc(agent)
    }
  })

  // Turn boundary session events
  ctx.on('session/event', (session, event) => {
    if (event?.type !== 'turn/start' && event?.type !== 'turn/end') return
    const agent = session === undefined ? undefined : agentBySession.get(session)
    if (agent === undefined || anchoring(agent) || !ptcPlanReady()) return
    presentPtc(agent)
  })

  // Per-agent, not one process-wide flag: two sessions assembling at once would
  // otherwise let one skip the promotion re-assembly the other is running.
  const reassembling = new WeakSet()

  ctx.on('system-prompt/assemble', async (assembly, context, next) => {
    const agent = context?.agent
    const staged = anchoring(agent)

    if (agent !== undefined && agent.session !== undefined) {
      agentBySession.set(agent.session, agent)
    }

    let ptcDeclared = false
    if (!staged && ptcPlanReady()) {
      if (!agentPtcDeclared.has(agent)) {
        // A promotion collapses the wire to the single `run_code` transport and
        // lists the tools from their SDK projection. Where no projection can be read
        // at all, declaring would collapse the executor and then have to undo it,
        // losing the native wire on the way out. Stay native instead.
        const projectable = publicSchemas(agent)
        if (projectable === undefined || projectable.length === 0) {
          warnOnce('no tool schema projection available; keeping the native tool surface')
          ptcDeclared = false
        } else {
          ptcDeclared = presentPtc(agent)
        }
        // A declaration made here cannot reach THIS assembly: the harness collects
        // the tool providers before the waterfall runs. Re-assemble so the collapse
        // and the generated SDK land on the assembly the model actually receives.
        if (ptcDeclared && !reassembling.has(agent)) {
          const sp = ctx.get('systemPrompt')
          if (typeof sp?.assemble === 'function') {
            reassembling.add(agent)
            try {
              return await sp.assemble(context)
            } catch (error) {
              warnOnce(`re-assembling after the PTC declaration failed: ${error instanceof Error ? error.message : String(error)}`)
            } finally {
              reassembling.delete(agent)
            }
          }
          // Nothing re-assembled, so this wire stays native. Collapsing the executor
          // under it would announce a transport the request never names, so drop back
          // to native for this assembly and let the next turn boundary declare again.
          revertPtc(agent, 'the PTC declaration did not reach this assembly wire', true)
          ptcDeclared = false
        }
      } else {
        ptcDeclared = true
      }
    }

    // The registry projection names every tool the session can reach. Under PTC the
    // request opens only `run_code`, so the projection is what the catalog lists;
    // under native presentation the catalog must name exactly the tools this request
    // carries, or the model is told about a surface it cannot call.
    let surface = agent !== undefined ? publicSchemas(agent) : undefined

    const assembled = await next()

    const wireTools = Array.isArray(assembled?.tools) ? assembled.tools : []
    const wireHasRunCode = wireTools.some(t => t?.name === 'run_code')
    const wireOnlyRunCode = wireTools.length > 0 && wireTools.every(t => t?.name === 'run_code')

    // If wire carries only run_code but public schemas are unavailable or empty:
    // Revert PTC to native and restore wire to native schemas.
    // The replacement travels in the RETURNED assembly: the waterfall's returned
    // value is the authoritative one, and mutating the object the harness handed
    // downstream would be a side effect no other listener can see.
    let correctedWire
    if (wireOnlyRunCode && (surface === undefined || surface.length === 0)) {
      revertPtc(agent, 'no tool schema projection available under PTC')
      ptcDeclared = false
      const nativeSchemas = publicSchemas(agent) ?? []
      surface = nativeSchemas
      correctedWire = nativeSchemas
    }

    // PTC is what the WIRE carries, not what the configuration intends: the catalog
    // must describe the transport this request actually names, or the model is told
    // to call `run_code` on a request that offers only native tools.
    const isActualPtc = !staged && wireHasRunCode && surface !== undefined && surface.length > 0

    // The effective wire of THIS request includes the anchor narrowing, so the native
    // catalog narrows with the schemas the model can actually call instead of
    // advertising the promoted roster the anchor turn does not expose.
    const effectiveWire = correctedWire ?? assembled.tools
    const nativeTools = (Array.isArray(effectiveWire) ? effectiveWire : [])
      .filter(t => t?.name && t.name !== 'run_code')
    const anchoredTools = staged ? anchorToolsOf(nativeTools, anchorNames) : nativeTools
    const catalogTools = isActualPtc ? surface : mergeProjectedSchemas(anchoredTools, surface)

    const entries = catalogEntries(catalogTools, descriptionMaxLength)

    // Store fresh state on agent
    if (agent !== undefined) {
      agentCatalogState.set(agent, {
        entries,
        ptc: isActualPtc,
      })
    }

    if (!staged) return correctedWire === undefined ? assembled : { ...assembled, tools: correctedWire }
    return { ...assembled, tools: anchorToolsOf(effectiveWire, anchorNames) }
  }, { prepend: true })

  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = await next()
    if (decision.kind !== 'enter') return decision
    const agent = payload?.agent
    const state = catalogStateFor(agent)
    if (state === undefined) return decision

    const { entries, ptc } = state
    const candidate = renderCatalogText(entries, ptc)
    const history = catalogHistory(agent)
    const existing = catalogMessage(decision.messages)
    if (history.text === candidate) {
      return existing === undefined ? decision : withoutMessage(decision, existing.message.id)
    }
    if (existing !== undefined && existing.text === candidate) return decision
    if (!history.published && entries.length === 0) {
      return existing === undefined ? decision : withoutMessage(decision, existing.message.id)
    }
    const catalog = createCatalogMessage(entries, ptc)
    if (existing === undefined) {
      return { ...decision, messages: [...decision.messages, catalog] }
    }
    return {
      ...decision,
      messages: decision.messages.map(message => (message.id === existing.message.id ? catalog : message)),
    }
  }, { prepend: true })
}
