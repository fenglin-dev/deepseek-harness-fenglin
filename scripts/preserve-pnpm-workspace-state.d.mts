export function preservePnpmWorkspaceState<T>(root: string, action: () => Promise<T>): Promise<T>
