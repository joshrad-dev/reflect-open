import { useQuery } from '@tanstack/react-query'
import { listNotes } from '@reflect/core'
import { useBridgeReady } from '@/hooks/use-bridge-ready.ts'
import { queryKeys } from '@/lib/query-client.ts'
import { useGraph } from '@/providers/graph-provider.tsx'

/** Saved note paths for folder navigation, independent of search and tag filters. */
export function useNoteBrowserPaths(): string[] {
  const { graph } = useGraph()
  const bridgeReady = useBridgeReady()
  const { data } = useQuery({
    queryKey: queryKeys.index.allNotesWithTag(graph?.root, null),
    queryFn: () => listNotes(),
    enabled: bridgeReady && graph !== null,
  })
  return (data ?? []).map((note) => note.path)
}
