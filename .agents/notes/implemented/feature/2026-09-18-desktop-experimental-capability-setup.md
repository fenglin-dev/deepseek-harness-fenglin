# Agent Note: Desktop setup for experimental capabilities

Status: implemented

English | [中文](2026-09-18-desktop-experimental-capability-setup.zh.md)

## Problem

The upstream Browser Use and Computer Use providers are ordinary plugins rather than profile bundles. Adding only a provider package leaves its shared service and Loader row absent, so Settings can report a downloaded dependency that no Session can use. Browser launch providers also default to Playwright's separately downloaded Chrome for Testing when the profile does not name an executable, even when the computer already has Chrome. Auto review is a bundle, but installation alone does not select its permission preset for the current Session.

## Decision

The community Desktop presents Browser Use, Computer Use, and Auto review as experimental capabilities above external product connections in one Tools & capabilities section. Each setup dialog explains the available provider choices and the conditions where each choice fits.

Browser Use and Computer Use installation crosses the Desktop Remote as a closed recipe identifier paired with one exact reviewed provider package. The Host rejects mismatched profile, package, and recipe combinations, then installs the shared service, installs the provider, and invokes one CLI composition operation through the existing observable and cancellable plugin job. The CLI replaces only a community-owned block in the Web profile patch, validates the result, and includes that patch in the existing plugin transaction and snapshot files.

Visible Playwright MCP and Chrome DevTools MCP launch recipes reuse an installed system Chrome or Chromium executable with an isolated profile. The CLI checks standard macOS, Windows, and Linux locations and accepts an explicit `CHROME_PATH`; absence fails the recipe instead of downloading Chrome for Testing. Existing-browser attachment and Stagehand remain download-only until Settings can collect their endpoint or model configuration.

Auto review keeps its bundle-owned profile patch. After that bundle installs, Settings switches the current live Session to `/permission auto`; absence of a live Session is reported without treating the installation as failed.

## Alternatives considered

**Treat every capability as another external tool.** Rejected because experimental runtime capabilities configure the current Harness execution environment, while Codex, Claude Code, and WorkBuddy connect separate products. One undifferentiated list hides different permission and restart consequences.

**Send arbitrary Loader rows and configuration over the Remote.** Rejected because renderer-controlled package names and YAML would widen the installation authority. Closed recipes keep the package versions, dependencies, and configuration under Host and CLI ownership.

**Rely on each provider's upstream browser discovery.** Rejected because Playwright MCP selects Chrome for Testing and asks for another large browser download. The Desktop setup promises to reuse the installed system browser for isolated launch.

**Replace the complete profile patch.** Rejected because the file also belongs to the user and other features. The Desktop owns only marked capability blocks, and the transaction restores the complete file if installation does not finish.

## Consequences

Installing a composed Browser Use or Computer Use choice now produces one restart-applied profile change and retains terminal progress, pause, stop, rollback, and snapshot behavior. Resuming a paused job repeats its original closed recipe. System-browser discovery is platform-specific and fails with a correction when no supported executable exists. The setup does not reuse daily browser data unless the user chooses attachment, and it does not claim that download-only choices are active.

## Testing

CLI tests cover system-browser discovery, explicit no-browser failure, owned-block replacement, and coexistence with user rows. Host tests pin the recipe allowlist and ordered mutation steps. Client tests cover the two-column layout, option-specific guidance, controlled install progress, restart behavior, paused-recipe resumption, Auto review activation, and inventory state after restart.
