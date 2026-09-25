from pathlib import Path
p = Path(r'D:\10140\deepseek-harness-v2-wt-clean\packages\client\ui-settings-plugin-inventory\src\client\external-tool-compatibility-bridge.ts')
t = p.read_text(encoding='utf-8')
old = "import type { ExperimentalCapabilityRecipe, PluginInstallRequest } from '@deepseek-ai/dsh-host-plugin-inventory/types'"
new = (
    "export type ExperimentalCapabilityRecipe = "
    "'browser-use-playwright-visible' | 'browser-use-devtools-visible' | 'computer-use-native' | 'computer-use-mcp'\n"
    "export interface PluginInstallRequest {\n"
    "  readonly packageSpec: string\n"
    "  readonly dependencies?: readonly string[]\n"
    "  readonly experimentalCapability?: string\n"
    "}"
)
if old in t:
    t = t.replace(old, new)
    p.write_text(t, encoding='utf-8')
    print('bridge import replaced')
else:
    print('pattern not found')
    print(t[:300])
