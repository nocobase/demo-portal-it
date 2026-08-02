import { useTranslate } from "@refinedev/core";
import { useEffect, useRef, useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DEFAULT_PAGE_SIZE = 20;

// Kanban columns and grouped sections cannot paginate — a column has to show a
// contiguous run of cards to be draggable, and a group has to stay whole to
// mean anything. They cap instead, and reveal the rest on demand.
export const COLUMN_PAGE_SIZE = 20;

/**
 * Debounce a fast-changing value (a search box) before it reaches the API, so
 * typing does not fire one list request per keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Page state for a server-paginated list. `resetKey` is a snapshot of the
 * active filters: when it changes we go back to page 1, so narrowing a filter
 * never strands the user on a page that no longer exists.
 */
export function useListPagination(
  resetKey: string,
  initialPageSize: number = DEFAULT_PAGE_SIZE
) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeValue] = useState(initialPageSize);
  const lastResetKey = useRef(resetKey);

  // Adjusting state during render (rather than in an effect) means the reset
  // lands before the list query runs, so changing a filter never fires a
  // throwaway request for the old page.
  if (lastResetKey.current !== resetKey) {
    lastResetKey.current = resetKey;
    setCurrentPage(1);
  }

  const setPageSize = (size: number) => {
    setPageSizeValue(size);
    setCurrentPage(1);
  };

  return { currentPage, setCurrentPage, pageSize, setPageSize };
}

/**
 * Footer pagination bar shared by the IT list pages. Wraps the template's
 * DataTablePagination so the standalone lists get the same control and styling
 * as tables built on DataTable.
 */
export function ListPagination({
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  total,
  className,
}: {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  total?: number;
  className?: string;
}) {
  const rowCount = total ?? 0;
  if (rowCount <= 0) return null;

  return (
    <div className={cn("py-1", className)}>
      <DataTablePagination
        currentPage={currentPage}
        pageCount={Math.max(1, Math.ceil(rowCount / pageSize))}
        setCurrentPage={setCurrentPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        total={rowCount}
      />
    </div>
  );
}

/**
 * Per-column "show more" limits for a board or a grouped list. Each key keeps
 * its own cap so revealing one column never re-fetches the others.
 */
export function useColumnLimits<K extends string>(
  keys: readonly K[],
  step: number = COLUMN_PAGE_SIZE
) {
  const [limits, setLimits] = useState<Record<string, number>>(() =>
    Object.fromEntries(keys.map((key) => [key, step]))
  );

  return {
    limitFor: (key: K) => limits[key] ?? step,
    showMore: (key: K) =>
      setLimits((current) => ({ ...current, [key]: (current[key] ?? step) + step })),
  };
}

/**
 * Footer for a capped column: reveals the next batch, or nothing once the
 * column is fully loaded.
 */
export function ShowMore({
  loaded,
  total,
  onClick,
  className,
}: {
  loaded: number;
  total?: number;
  onClick: () => void;
  className?: string;
}) {
  const translate = useTranslate();
  const remaining = (total ?? 0) - loaded;
  if (remaining <= 0) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("w-full text-xs text-muted-foreground", className)}
    >
      {/* Interpolated as `n`, not `count`: `count` would send i18next down its
          plural-suffix lookup and miss the key. */}
      {translate(
        "it.common.showMore",
        { ns: "starter", n: remaining },
        `Show ${remaining} more`
      )}
    </Button>
  );
}
