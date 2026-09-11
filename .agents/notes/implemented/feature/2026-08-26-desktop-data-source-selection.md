# Agent Note: Validated desktop data source selection

Status: implemented

English | [中文](2026-08-26-desktop-data-source-selection.zh.md)

## Problem

The first-run desktop chooser treated any nonempty default `~/.dsh` directory as official Harness data and skipped the chooser completely when that directory was absent or empty. Users with a custom `DSH_HOME`, a portable copy, or a backup could not select it, while unrelated files could expose import and reuse actions that would later fail.

## Decision

The chooser always opens when the desktop-owned Harness home has no prior selection or data. The initial categories are official Harness data, existing Open DeepSeek Harness Desktop data, and fresh setup; existing categories retain separate source selections. One source panel reports both detection results and provides a dedicated picker for each category. Development checks the installed desktop root as its automatic community candidate, while an installed build checks the development root, so neither candidate overlaps its own empty first-run target. A recognized default source selects an independent import for official data or an independent copy for community data; an absent or unreadable default selects fresh setup while leaving the source-appropriate independent operation and direct use available through the directory picker.

Electron owns directory selection and validation. A source is recognized when it or its `.dsh` child contains supported user state or a Profile. For community sources, a saved `data-home-setup.json` selects the active absolute home; invalid records or missing targets reject selection without falling back to stale data. Without a record, a recognized `dsh-home` child or actual Harness home is accepted. The renderer submits only an official/community category to the sender-checked source picker. Import and fresh setup then expose a separate destination step: the desktop-managed default remains selected unless the user chooses an existing empty folder. The renderer receives a short-lived opaque destination id rather than a forgeable path. Electron resolves the source and rechecks the selected destination immediately after the user confirms its displayed path; nonempty, unrelated, unreadable, or expired selections remain on the chooser with a bounded correction message.

Source development runs expose a bilingual toggle that temporarily renders the genuine “default source missing” state. The toggle preserves the detected source and current selection in memory, restores both when disabled, and never changes a saved setup. Packaged applications do not receive the development capability flag, so the control stays hidden there.

Independent import or copy writes from either the detected default or the selected custom source into the default or a custom empty-folder destination. Official DeepSeek Harness sources use the compatibility-import path and reset only the copied onboarding acknowledgement; community desktop sources use a full-home copy path and preserve onboarding. Direct use records the normalized source as the active `DSH_HOME`, uses its `allowBuilds` unchanged, and creates no copy; startup validates that recorded source so a removed or unreadable directory returns to the chooser. Fresh setup does not require a source and can initialize the same two destination choices. The chooser first explains the selected source category. Continue replaces this explanation with direct use plus source-appropriate import or copy choices; the independent operation adds a destination step, while direct use proceeds immediately. Only official direct use warns that both applications can edit the same directory; community direct use simply continues with that desktop configuration. The question-mark comparison is rebuilt for the current source, operation, or destination step. All nine desktop locales include this copy. Source validation failures permit correction and retry; no user data is changed before final selection.

Community copying preserves the same-computer plugin deployment instead of using the official allowlist. The copier verifies files, preserves modes, rebases internal links and refuses external links. Copied setups skip automatic seed and restore installation. Users close the source first; before/after inventories detect observed writes but are not a filesystem snapshot. Windows junctions still require native platform validation.

After first-run setup, General Settings exposes a narrower switch-only control. It can select the current build's independent home, the recognized official home, a recognized custom home, or an empty folder for a new configuration through Electron's native directory picker. Existing-home and empty-folder selections are distinct capabilities. The renderer receives an opaque, purpose-bound, renderer-bound, five-minute selection identifier rather than a path it can forge; Electron resolves or rechecks emptiness immediately before atomically replacing the setup record and requesting a full application restart. A new empty-folder home uses the durable `created` setup mode so the next boot can initialize it before it contains recognizable data, then follows the ordinary Profile repair and bundled-plugin seeding flow. Switching performs no copy, merge, move, overwrite, or deletion. A launch-time explicit `DSH_HOME` keeps authority and hides the control.

## Alternatives considered

**Add “custom import” as a fourth data strategy:** rejected because directory location and data-sharing behavior are independent decisions. A persistent source panel keeps custom paths available without creating a second import mode with identical semantics.

**Hide import and reuse when `~/.dsh` is absent:** rejected because absence at the default location does not prove that the user has never used DSH. The existing-source categories keep their picker available without requiring a detected default.

**Accept any nonempty directory:** rejected because unrelated files are not evidence of a usable Harness home and defer a correctable error until import or startup.

**Switch by copying or moving data:** rejected because that is migration, with conflict, rollback, and partial-copy semantics unrelated to selecting which existing home Harness should open. Directory switching changes only the durable pointer.

## Consequences

- First-time users without official DSH data see the language-aware chooser and can continue with fresh setup without extra configuration.
- Users with default or custom Harness homes can import into isolation or deliberately share the selected directory.
- Independent import and fresh setup can use either the application default or a user-selected empty destination without weakening source validation.
- Selecting a user-home parent automatically resolves its `.dsh` child when that child contains recognized data.
- A directory containing only unsupported files cannot be imported or reused.
- Custom reused paths are durable, but moving or revoking access to the directory requires selecting a source again.
- Existing environments can be revisited without rerunning first-run import, while their sessions, settings, plugins, and safety state remain isolated from one another.
- An empty custom directory can become a new independent environment without changing the app-owned default home; a nonempty directory is rejected rather than overwritten.
- Switching requires a complete desktop restart because the Harness process, Profile managers, command-line entry, and browser session bind to the selected home at application startup.
