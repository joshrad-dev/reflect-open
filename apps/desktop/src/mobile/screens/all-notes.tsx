import { useDeferredValue, useMemo, useRef, type ReactElement } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, FileText, SearchX } from 'lucide-react'
import {
  foldTag,
  listNoteTags,
  parseHighlights,
  searchWithFilters,
  type FilteredSearchHit,
  type NoteTagFacet,
} from '@reflect/core'
import { Spinner } from '@/components/ui/spinner.tsx'
import { useBridgeReady } from '@/hooks/use-bridge-ready.ts'
import { queryKeys } from '@/lib/query-client.ts'
import { FilterBar } from '@/mobile/search-filters/filter-bar.tsx'
import {
  buildAllNotesSearch,
  pendingTagToken,
  searchPlanFor,
  type AllNotesFilters,
} from '@/mobile/search-filters/filter-state.ts'
import { NoteRowList } from '@/mobile/note-row-list.tsx'
import { SearchInput } from '@/mobile/search-input.tsx'
import type { NoteRowModel } from '@/mobile/swipeable-note-row.tsx'
import {
  MobileTopBar,
  MobileTopBarIconButton,
  MobileTopBarRow,
  MobileTopBarScrollableRow,
} from '@/mobile/top-bar.tsx'
import { useArrivalFocus } from '@/mobile/use-arrival-focus.ts'
import { useGraph } from '@/providers/graph-provider.tsx'
import { DEFAULT_NOTE_SORT, noteDirectories, sortNotes, type NoteSort } from '@/lib/note-browser.ts'
import { NoteSortHeader } from '@/components/all-notes/note-sort-header.tsx'
import { NoteBreadcrumbs } from '@/components/all-notes/note-breadcrumbs.tsx'
import { useNoteBrowserPaths } from '@/hooks/use-note-browser-paths.ts'
import { useRouter } from '@/routing/router.tsx'

/** A search hit resolved into the shared row shape. */
export function rowForHit(hit: FilteredSearchHit): NoteRowModel {
  return {
    path: hit.path,
    titleSegments: parseHighlights(hit.highlightedTitle),
    mtime: hit.mtime,
    isPinned: hit.isPinned,
    canDelete: hit.dailyDate === null,
    snippet:
      hit.snippet !== null
        ? parseHighlights(hit.snippet)
        : hit.preview === ''
          ? []
          : [{ text: hit.preview, highlighted: false }],
  }
}

/** The tags matching a half-typed `#…` token, by folded-substring match. */
export function matchingTagFacets(facets: NoteTagFacet[], partial: string): NoteTagFacet[] {
  const needle = foldTag(partial)
  return facets.filter((facet) => foldTag(facet.tag).includes(needle))
}

interface MobileAllNotesProps {
  /** The live search text — lifted to the shell so it survives navigation. */
  query: string
  /** Directory being browsed; null shows every saved note. */
  directory?: string | null
  sort?: NoteSort | undefined
  onQueryChange: (query: string) => void
  /** The active tag filter from the `allNotes` route (`null` = every note). */
  tag: string | null
  /** The badge filters — lifted to the shell so they survive navigation. */
  filters: AllNotesFilters
  onFiltersChange: (filters: AllNotesFilters) => void
}

/**
 * The All tab (Plan 19, V1 parity): a virtualized fixed-row note list with an
 * embedded search bar and AND-composed filter badges. Everything is one
 * search path ({@link buildAllNotesSearch} → `searchWithFilters`, run per
 * {@link searchPlanFor}): the plain list is the empty query's recall feed
 * (regular and daily notes, pinned first, uncapped), badges and typed tokens narrow it,
 * and free text switches to ranked FTS. A trailing `#…` token switches the bar into
 * tag matching (V1): suggestions replace the badge row until the tag is
 * picked or the token completed. The route's tag (a tag tap landed here)
 * rides along as a badge with a back affordance.
 */
export function MobileAllNotes({
  query,
  directory = null,
  sort,
  onQueryChange,
  tag,
  filters,
  onFiltersChange,
}: MobileAllNotesProps): ReactElement {
  const { graph } = useGraph()
  const { navigate, back, arrivalSeq, arrivalFocusEditor } = useRouter()
  const browserPaths = useNoteBrowserPaths()
  const selectedSort = sort ?? DEFAULT_NOTE_SORT
  const directories = noteDirectories(browserPaths, directory)
  if (selectedSort.column === 'title' && selectedSort.direction === 'descending')
    directories.reverse()
  const queryClient = useQueryClient()
  const bridgeReady = useBridgeReady()
  const enabled = bridgeReady && graph !== null

  // The All-tab double-tap (`focusEditor` arrivals) lands in the search bar,
  // the tab's capture surface — the daily double-tap's All-flavored twin.
  const searchInputRef = useRef<HTMLInputElement>(null)
  useArrivalFocus({ arrivalSeq, arrivalFocusEditor, target: searchInputRef })

  // Defer the query the index sees (desktop's search debounce): fast typing
  // coalesces while the input stays live, and a seeded query (a `search`
  // history entry) catches up within a frame instead of a fixed delay.
  const deferredQuery = useDeferredValue(query)
  const pending = pendingTagToken(query)
  const parsed = useMemo(
    () => buildAllNotesSearch(deferredQuery, filters, tag),
    [deferredQuery, filters, tag],
  )

  const { data: facets } = useQuery({
    queryKey: queryKeys.index.allNotesTags(graph?.root),
    queryFn: () => listNoteTags(),
    enabled,
  })
  const { data: hits } = useQuery({
    queryKey: queryKeys.index.mobileAllNotesWithSearch(graph?.root, parsed, directory),
    queryFn: () =>
      searchWithFilters(parsed, {
        ...searchPlanFor(parsed),
        directory,
        includeDescendants: true,
      }),
    enabled,
    // Typing re-keys the query as the deferred value settles; holding the
    // previous rows avoids a blank flash between keystrokes.
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey.at(-1) === directory ? previousData : undefined,
  })

  const rows = useMemo(
    () =>
      sortNotes(
        (hits ?? []).map((hit) => ({ ...hit, snippet: hit.preview, tags: [], hit })),
        selectedSort,
      ).map((entry) => rowForHit(entry.hit)),
    [hits, selectedSort],
  )
  const pristine = parsed.text === '' && !parsed.filtered

  const removeDeletedRow = (path: string): void => {
    queryClient.setQueriesData<FilteredSearchHit[]>(
      { queryKey: queryKeys.index.mobileAllNotes(graph?.root) },
      (cachedHits) => cachedHits?.filter((hit) => hit.path !== path),
    )
    // Do not invalidate yet: the index can still contain the deleted row and
    // would briefly resurrect it. `deleteNote`'s local-write echo reindexes,
    // then invalidates the full index scope (including tag facets) once the
    // projection has caught up.
  }

  const addPendingTag = (facet: NoteTagFacet): void => {
    const key = foldTag(facet.tag)
    if (!filters.tags.includes(key)) {
      onFiltersChange({ ...filters, tags: [...filters.tags, key] })
    }
    onQueryChange(pending?.rest ?? '')
  }

  return (
    <div
      className="flex h-full w-screen flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <MobileTopBar>
        <MobileTopBarRow className="h-auto min-h-12 py-2">
          <NoteBreadcrumbs
            directory={directory}
            onNavigate={(next) =>
              navigate({
                kind: 'allNotes',
                tag,
                directory: next,
                ...(sort === undefined ? {} : { sort }),
              })
            }
          />
        </MobileTopBarRow>
        <MobileTopBarRow>
          {tag !== null && (
            <MobileTopBarIconButton edge="leading" aria-label="Back" onClick={back}>
              <ChevronLeft />
            </MobileTopBarIconButton>
          )}
          <SearchInput
            ref={searchInputRef}
            placeholder="Search anything…"
            aria-label="Search notes"
            value={query}
            onValueChange={onQueryChange}
          />
        </MobileTopBarRow>
        <MobileTopBarScrollableRow>
          {pending !== null ? (
            <TagSuggestions
              facets={matchingTagFacets(facets ?? [], pending.partial)}
              onPick={addPendingTag}
            />
          ) : (
            <FilterBar
              filters={filters}
              onFiltersChange={onFiltersChange}
              facets={facets ?? []}
              routeTag={tag}
              onClearRouteTag={() =>
                navigate({
                  kind: 'allNotes',
                  tag: null,
                  directory,
                  ...(sort === undefined ? {} : { sort }),
                })
              }
            />
          )}
        </MobileTopBarScrollableRow>
      </MobileTopBar>
      <NoteSortHeader
        sort={selectedSort}
        onSort={(next) => navigate({ kind: 'allNotes', tag, directory, sort: next })}
        columns={['title', 'updated']}
        className="grid grid-cols-[1fr_auto] gap-4 px-4"
      />
      {/* Undefined hits mean "still fetching" only while the query can run —
          with no bridge/graph it never will, and the empty state is honest. */}
      {enabled && hits === undefined ? (
        <div className="flex flex-1 items-center justify-center" aria-label="Loading notes">
          <Spinner className="size-5 text-text-muted" />
        </div>
      ) : (hits ?? []).length === 0 && directories.length === 0 ? (
        pristine ? (
          <Empty
            icon={<FileText className="size-6" />}
            message={directory === null ? 'No notes yet' : 'No notes in this folder'}
          />
        ) : (
          <Empty icon={<SearchX className="size-6" />} message="No matches" />
        )
      ) : (
        <NoteRowList
          key={directory ?? 'all'}
          rows={rows}
          paths={browserPaths}
          directory={directory}
          sort={selectedSort}
          emptyMessage={pristine ? undefined : 'No matches'}
          onOpen={(path) => navigate({ kind: 'note', path })}
          onDeleted={removeDeletedRow}
        />
      )}
    </div>
  )
}

/** The `#…` tag-matching mode's suggestion row (replaces the badge row). */
function TagSuggestions({
  facets,
  onPick,
}: {
  facets: NoteTagFacet[]
  onPick: (facet: NoteTagFacet) => void
}): ReactElement {
  if (facets.length === 0) {
    return <p className="pb-1 text-xs text-text-muted">No matching tags</p>
  }
  return (
    <div className="flex gap-1.5 w-max pb-2" role="listbox" aria-label="Matching tags">
      {facets.map((facet) => (
        <button
          key={facet.tag}
          type="button"
          role="option"
          aria-selected={false}
          onClick={() => onPick(facet)}
          className="flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border px-3 text-xs font-medium text-text-muted"
        >
          #{facet.tag}
          <span className="opacity-60">{facet.count}</span>
        </button>
      ))}
    </div>
  )
}

function Empty({ icon, message }: { icon: ReactElement; message: string }): ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-muted">
      {icon}
      <p className="text-sm">{message}</p>
    </div>
  )
}
