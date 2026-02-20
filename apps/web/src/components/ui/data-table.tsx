import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
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
    ...props
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = React.useState('');

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

  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {searchable && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kresna-gray dark:text-kresna-gray" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border border-kresna-border bg-white text-sm text-charcoal',
              'placeholder:text-kresna-gray focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent',
              'dark:border-kresna-border dark:bg-charcoal dark:text-kresna-light dark:placeholder:text-kresna-gray',
              'transition-colors duration-200'
            )}
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-kresna-border dark:border-kresna-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-kresna-border dark:border-kresna-border bg-kresna-light dark:bg-charcoal/50">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={cn(
                    'text-left text-xs font-medium text-kresna-gray dark:text-kresna-gray uppercase tracking-wider px-4 py-3',
                    col.sortable && 'cursor-pointer select-none hover:text-kresna-gray-dark dark:hover:text-kresna-gray',
                    col.className
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
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
                <tr key={i} className="border-b border-kresna-border dark:border-charcoal">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 rounded bg-kresna-light dark:bg-kresna-gray-dark animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-kresna-gray dark:text-kresna-gray">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map(item => (
                <tr
                  key={keyExtractor(item)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={cn(
                    'border-b border-kresna-border dark:border-charcoal transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-kresna-light dark:hover:bg-charcoal/50'
                  )}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-kresna-gray-dark dark:text-kresna-gray', col.className)}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
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
