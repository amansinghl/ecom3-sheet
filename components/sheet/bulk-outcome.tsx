import { toast } from 'sonner';
import type { RejectedRow } from '@/lib/utils/bulk-excel';

const PREVIEW_ROWS = 5;
const OUTCOME_TOAST_MS = 12000;

interface RejectedRowListProps {
  rows: RejectedRow[];
  footer?: React.ReactNode;
}

/** First few skipped rows with their reasons, plus a "+N more" tail. */
export function RejectedRowList({ rows, footer }: RejectedRowListProps) {
  const preview = rows.slice(0, PREVIEW_ROWS);
  const remaining = rows.length - preview.length;

  return (
    <div className="mt-1 space-y-0.5 text-xs">
      {preview.map((entry) => (
        <div key={entry.row}>
          Row {entry.row}: {entry.reason}
        </div>
      ))}
      {remaining > 0 && <div>+{remaining} more</div>}
      {footer && <div className="pt-1">{footer}</div>}
    </div>
  );
}

interface BulkOutcome {
  toastId: string;
  /** Rows sent to the API. */
  sent: number;
  /** Rows the API accepted. */
  succeeded: number;
  rejected: RejectedRow[];
  /** Past-tense verb for the partial/failed variants, e.g. "Uploaded". */
  verb: string;
  /** What a row becomes, e.g. "records" / "tickets". */
  noun: string;
  success: { title: string; description?: string };
}

/**
 * Rows are validated independently server-side, so a 200 does not mean every
 * row landed. Report what the API actually did and name the rows it skipped.
 */
export function notifyBulkOutcome({
  toastId,
  sent,
  succeeded,
  rejected,
  verb,
  noun,
  success,
}: BulkOutcome) {
  if (rejected.length === 0) {
    toast.success(success.title, {
      id: toastId,
      description: success.description,
      duration: success.description ? OUTCOME_TOAST_MS : undefined,
    });
    return;
  }

  const description = <RejectedRowList rows={rejected} />;

  if (succeeded > 0) {
    toast.warning(
      `${verb} ${succeeded} of ${sent} ${noun} - ${rejected.length} skipped`,
      { id: toastId, duration: OUTCOME_TOAST_MS, description }
    );
  } else {
    toast.error(
      `No ${noun} were ${verb.toLowerCase()} - all ${rejected.length} rows were rejected`,
      { id: toastId, duration: OUTCOME_TOAST_MS, description }
    );
  }
}
