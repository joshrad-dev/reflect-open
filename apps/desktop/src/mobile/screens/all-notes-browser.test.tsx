import { useState, type ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  searchWithFilters,
  type FilteredSearchHit,
  type FilteredSearchOptions,
  type ParsedSearchQuery,
} from '@reflect/core'
import { RouterProvider, useRouter } from '@/routing/router.tsx'
import { EMPTY_ALL_NOTES_FILTERS } from '@/mobile/search-filters/filter-state.ts'
import { MobileAllNotes } from './all-notes.tsx'

const hits = vi.hoisted((): FilteredSearchHit[] => [
  {
    path: 'daily/2026-06-09.md',
    title: 'June 9, 2026',
    highlightedTitle: 'June 9, 2026',
    dailyDate: '2026-06-09',
    preview: 'Journal entry',
    snippet: null,
    mtime: 10,
    isPinned: false,
  },
  {
    path: 'notes/work.md',
    title: 'Work',
    highlightedTitle: 'Work',
    dailyDate: null,
    preview: 'Work notes',
    snippet: null,
    mtime: 20,
    isPinned: false,
  },
])

vi.mock('@reflect/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@reflect/core')>()),
  listNotes: vi.fn(async () => hits.map((hit) => ({ ...hit, snippet: hit.preview, tags: [] }))),
  listNoteTags: vi.fn(async () => []),
  searchWithFilters: vi.fn(
    async (_parsed: ParsedSearchQuery, options: FilteredSearchOptions = {}) =>
      hits.filter(
        (hit) => options.directory == null || hit.path.startsWith(`${options.directory}/`),
      ),
  ),
}))
vi.mock('@/hooks/use-bridge-ready.ts', () => ({ useBridgeReady: () => true }))
vi.mock('@/providers/graph-provider.tsx', () => ({
  useGraph: () => ({ graph: { root: '/g', name: 'g', generation: 1 } }),
}))
vi.mock('@/providers/settings-provider.tsx', () => ({
  useSettings: () => ({ settings: { dateFormat: 'mdy', timeFormat: '12h' } }),
}))

function BrowserScreen(): ReactElement {
  const { route, back } = useRouter()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_ALL_NOTES_FILTERS)
  return (
    <>
      <button type="button" onClick={back}>
        History back
      </button>
      {route.kind === 'allNotes' ? (
        <div style={{ width: 390, height: 844 }}>
          <MobileAllNotes
            query={query}
            onQueryChange={setQuery}
            tag={route.tag}
            directory={route.directory ?? null}
            sort={route.sort}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      ) : (
        <output>{JSON.stringify(route)}</output>
      )}
    </>
  )
}

afterEach(async () => {
  await cleanup()
  vi.mocked(searchWithFilters).mockClear()
})

describe('mobile note browser', () => {
  it('shows both note kinds, opens a daily alone, and returns to its folder', async () => {
    await render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider initialRoute={{ kind: 'allNotes', tag: null }}>
          <BrowserScreen />
        </RouterProvider>
      </QueryClientProvider>,
    )
    await expect.element(page.getByText('Journal entry', { exact: true })).toBeVisible()
    await expect.element(page.getByText('Work notes', { exact: true })).toBeVisible()
    expect(page.getByRole('button', { name: 'Browse folders' }).query()).toBeNull()
    await page
      .getByRole('group', { name: 'Sort notes' })
      .getByRole('button', { name: 'Updated', exact: true })
      .click()
    await expect
      .element(
        page
          .getByRole('group', { name: 'Sort notes' })
          .getByRole('button', { name: 'Updated', exact: true }),
      )
      .toHaveAttribute('title', 'Sorted ascending; click to reverse')
    await page
      .getByRole('group', { name: 'Sort notes' })
      .getByRole('button', { name: 'Updated', exact: true })
      .click()
    await expect
      .element(
        page
          .getByRole('group', { name: 'Sort notes' })
          .getByRole('button', { name: 'Updated', exact: true }),
      )
      .toHaveAttribute('title', 'Sorted descending; click to reverse')
    await expect
      .element(page.getByRole('button', { name: 'Folder daily' }))
      .toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: 'Folder daily' }).click()
    expect(page.getByText('Journal entry', { exact: true }).query()).toBeNull()
    await expect.element(page.getByText('Work notes', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Folder daily' }).click()
    await expect.element(page.getByText('Journal entry', { exact: true })).toBeVisible()
    expect(vi.mocked(searchWithFilters).mock.calls.at(-1)?.[1]).toMatchObject({
      directory: null,
      includeDescendants: true,
      limit: null,
    })
    await page.getByRole('button', { name: /June 9, 2026/ }).click()
    await expect.element(page.getByText('"kind":"note"', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'History back' }).click()
    await expect.element(page.getByRole('button', { name: 'All notes', exact: true })).toBeVisible()
    await expect.element(page.getByText('Journal entry', { exact: true })).toBeVisible()
  })
})
