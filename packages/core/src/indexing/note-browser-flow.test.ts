import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setBridge } from '../ipc/bridge.ts'
import { applyProjection, connectIndex, openMigratedIndex, project } from './flow-test-harness.ts'
import { parseSearchQuery } from './filter-query.ts'
import { searchWithFilters } from './filtered-search.ts'
import { listNotes, listNoteTags } from './note-list.ts'

describe('saved-note browser', () => {
  let database: ReturnType<typeof openMigratedIndex>

  beforeEach(() => {
    database = openMigratedIndex()
    applyProjection(database, project('daily/2026-06-09.md', 'Daily work\n#journal', 10))
    applyProjection(database, project('notes/work.md', '# Work\n', 20))
    applyProjection(database, project('notes/projects/plan.md', '# Work plan\n', 30))
    applyProjection(database, project('notes/📚_%/book.md', '# Work book\n', 40))
    applyProjection(database, project('notes/📚XY/book.md', '# Work other\n', 50))
    database
      .prepare('INSERT INTO tags(note_path, tag, tag_key) VALUES (?, ?, ?)')
      .run('daily/2026-06-09.md', 'journal', 'journal')
    connectIndex(database)
  })

  afterEach(() => {
    setBridge(null)
    database.close()
  })

  it('lists all saved daily and regular notes, with daily-only tags available', async () => {
    expect((await listNotes()).map((note) => note.path)).toContain('daily/2026-06-09.md')
    expect(await listNoteTags()).toContainEqual({ tag: 'journal', count: 1 })
    expect(await searchWithFilters(parseSearchQuery(''), { limit: null })).toHaveLength(5)
  })

  it('browses only direct files and scopes ranked search before applying its cap', async () => {
    const direct = await searchWithFilters(parseSearchQuery(''), {
      directory: 'notes',
      limit: null,
    })
    expect(direct.map((note) => note.path)).toEqual(['notes/work.md'])
    const ranked = await searchWithFilters(parseSearchQuery('work'), {
      directory: 'notes/projects',
      limit: 1,
    })
    expect(ranked.map((note) => note.path)).toEqual(['notes/projects/plan.md'])
    const recursive = await searchWithFilters(parseSearchQuery('work'), {
      directory: 'notes',
      includeDescendants: true,
      limit: null,
    })
    expect(recursive).toHaveLength(4)
  })

  it('treats unicode and SQL wildcard characters as literal folder names', async () => {
    const notes = await searchWithFilters(parseSearchQuery(''), {
      directory: 'notes/📚_%',
      limit: null,
    })
    expect(notes.map((note) => note.path)).toEqual(['notes/📚_%/book.md'])
  })

  it('combines folder scope with the tag-only recall path', async () => {
    expect(
      await searchWithFilters(parseSearchQuery('#journal'), { directory: 'notes', limit: null }),
    ).toEqual([])
    expect(
      (
        await searchWithFilters(parseSearchQuery('#journal'), { directory: 'daily', limit: null })
      ).map((note) => note.path),
    ).toEqual(['daily/2026-06-09.md'])
  })
})
