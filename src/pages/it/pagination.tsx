import { useEffect, useRef, useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { cn } from "@/lib/utils";

export const DEFAULT_PAGE_SIZE = 20;

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
