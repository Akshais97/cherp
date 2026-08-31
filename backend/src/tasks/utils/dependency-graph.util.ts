export async function detectCycleInDependencies(
  taskId: string,
  newDependsOn: string[],
  getTaskDependencies: (id: string) => Promise<string[]>
): Promise<boolean> {
  const visited = new Set<string>()

  async function dfs(currentId: string): Promise<boolean> {
    if (currentId === taskId) {
      return true
    }
    if (visited.has(currentId)) {
      return false
    }
    visited.add(currentId)

    const parentDeps = await getTaskDependencies(currentId)
    for (const depId of parentDeps) {
      if (await dfs(depId)) {
        return true
      }
    }

    return false
  }

  for (const depId of newDependsOn) {
    if (depId === taskId) return true
    if (await dfs(depId)) return true
  }

  return false
}
