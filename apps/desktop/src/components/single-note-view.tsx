import type { ReactElement, ReactNode } from 'react'
import { dailyDateForNotePath } from '@/lib/note-browser.ts'
import { formatDayLabel } from '@/lib/dates.ts'
import { useSettings } from '@/providers/settings-provider.tsx'
import { NotePane } from '@/components/note-pane.tsx'
import { ScrollRestored } from '@/routing/scroll-restore.tsx'

interface SingleNoteViewProps {
  /** Graph-relative path of the note filling this view. */
  path: string
  /**
   * The day this pane shows, when the note is a daily — forwarded to
   * {@link NotePane} so daily behavior (day-keyed handles) holds outside the
   * stream.
   */
  dailyDate?: string
  /**
   * Chrome rendered above the pane inside the scrolling column — the note
   * window's day label, standing in for the title a daily doesn't carry.
   */
  heading?: ReactNode
}

/**
 * One note filling the viewport: the note route's layout, shared with the
 * secondary note window (which renders dailies this way too). The vertical
 * padding lives on the inner column — not the scroll container — so
 * `min-h-full` fills the viewport exactly, and the flex chain stretches the
 * editor over any leftover space. The reading gutter is the editor's own
 * padding, so clicking anywhere in the note body (blank side margins
 * included) focuses it.
 */
export function SingleNoteView({ path, dailyDate, heading }: SingleNoteViewProps): ReactElement {
  const { settings } = useSettings()
  const date = dailyDate ?? dailyDateForNotePath(path)
  const noteHeading =
    heading ??
    (date !== null ? (
      <h2 className="reflect-daily-subject reflect-content-gutter mb-3">
        {formatDayLabel(date, settings.dateFormat)}
      </h2>
    ) : null)
  return (
    <ScrollRestored className="h-full overflow-auto px-0">
      <div className="mx-auto flex min-h-full w-full max-w-full flex-col py-8">
        {noteHeading}
        <NotePane
          path={path}
          {...(date !== null ? { dailyDate: date } : {})}
          lazy
          autoFocus
          className="flex grow flex-col"
          gutterClassName="reflect-content-gutter"
          editorClassName="grow"
        />
      </div>
    </ScrollRestored>
  )
}
