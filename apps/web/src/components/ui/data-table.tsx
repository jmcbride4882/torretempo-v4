import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Check } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
   Kresna DataTable — Redesigned for HR (Laura) persona
   Architecture doc requirements:
   - Dense 8-10 column layout
   - Checkbox bulk select with select-all
   - Sortable headers with visual indicators
   - Sticky header on scroll
   - Row hover actions
   - Keyboard navigation (j/k for rows)
   - Rounded card wrapper
   ────────────────────────────────────────────────────────────── */

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  width?: string;
}

export interface DataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  toolbar?: React.ReactNode;
  stickyHeader?: boolean;
}

function DataTableInner<T>(
  {
    className,
    columns,
    data,
    keyExtractor,
    onRowClick,
    searchable,
    searchPlaceholder = 'Search...',
    emptyMessage = 'No data found',
    isLoading,
    selectable = false,
    selectedKeys,
    onSelectionChange,
    toolbar,
    stickyHeader = true,
    ...props
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = React.useState('');
  const [focusedRow, setFocusedRow] = React.useState(-1);
  const tableRef = React.useRef<HTMLTableElement>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredData = React.useMemo(() => {
    if (!search) return data;
    const lower = search.toLowerCase();
    return data.filter(item =>
      columns.some(col => {
        const val = (item as Record<string, unknown>)[col.key];
        return String(val ?? '').toLowerCase().includes(lower);
      })
    );
  }, [data, search, columns]);

  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  // Selection helpers
  const internalSelected = selectedKeys ?? new Set<string>();
  const allSelected = sortedData.length > 0 && sortedData.every(item => internalSelected.has(keyExtractor(item)));
  const someSelected = sortedData.some(item => internalSelected.has(keyExtractor(item)));

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sortedData.map(item => keyExtractor(item))));
    }
  };

  const toggleSelectRow = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set(internalSelected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  };

  // Keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRow(prev => Math.min(prev + 1, sortedData.length - 1));
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRow(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusedRow >= 0 && onRowClick) {
      e.preventDefault();
      onRowClick(sortedData[focusedRow]!);
    }
  }, [sortedData, focusedRow, onRowClick]);

  const selectedCount = internalSelected.size;

  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {/* Search + Toolbar */}
      {(searchable || toolbar) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-kresna-gray" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  'w-full pl-10 pr-4 h-11 rounded-2xl border border-kresna-border bg-white text-sm text-charcoal',
                  'placeholder:text-kresna-gray-medium focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent',
                  'transition-all duration-200'
                )}
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 ml-auto">{toolbar}</div>}
        </div>
      )}

      {/* Selection bar */}
      {selectable && selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-2xl bg-primary-50 border border-primary-200 text-body-sm">
          <span className="font-medium text-primary-700">{selectedCount} selected</span>
          <button
            onClick={() => onSelectionChange?.(new Set())}
            className="text-primary-600 hover:text-primary-800 font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-x-auto rounded-2xl border border-kresna-border bg-white"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="grid"
      >
        <table ref={tableRef} className="data-table">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-white' : ''}>
            <tr className="border-b-2 border-kresna-border">
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <button
                    onClick={toggleSelectAll}
                    className={cn(
                      'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-150',
                      allSelected
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : someSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-kresna-border hover:border-kresna-gray-medium'
                    )}
                    aria-label="Select all"
                  >
                    {(allSelected || someSelected) && <Check className="h-3 w-3" />}
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'text-left text-caption font-semibold text-kresna-gray uppercase tracking-wider px-4 py-3.5',
                    col.sortable && 'cursor-pointer select-none hover:text-charcoal transition-colors',
                    sortKey === col.key && 'text-charcoal',
                    col.className
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key ? (
                        sortDir === 'asc'
                          ? <ChevronUp className="h-3.5 w-3.5 text-primary-500" />
                          : <ChevronDown className="h-3.5 w-3.5 text-primary-500" />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-kresna-light">
                  {selectable && (
                    <td className="px-4 py-3.5">
                      <div className="h-5 w-5 rounded-md bg-kresna-light animate-pulse" />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="h-4 rounded-lg bg-kresna-light animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-16 text-center">
                  <span className="text-kresna-gray text-body-sm">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              sortedData.map((item, index) => {
                const key = keyExtractor(item);
                const isSelected = internalSelected.has(key);
                const isFocused = focusedRow === index;

                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={cn(
                      'border-b border-kresna-light transition-colors duration-150',
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-primary-50/50',
                      isFocused && 'bg-primary-50/30 ring-1 ring-inset ring-primary-200',
                      !isSelected && !isFocused && 'hover:bg-kresna-light/50'
                    )}
                    data-selected={isSelected || undefined}
                  >
                    {selectable && (
                      <td className="px-4 py-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectRow(key);
                          }}
                          className={cn(
                            'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-150',
                            isSelected
                              ? 'bg-primary-500 border-primary-500 text-white'
                              : 'border-kresna-border hover:border-kresna-gray-medium'
                          )}
                          aria-label={`Select row ${index + 1}`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key} className={cn('px-4 py-3.5 text-body-sm text-kresna-gray-dark', col.className)}>
                        {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Use type assertion for generic forwardRef
const DataTable = React.forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

export { DataTable };
