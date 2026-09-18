import { Button } from './Button';

export const Pagination = ({ page, totalPages, totalRecords, onChange, disabled = false }: {
  page: number; totalPages: number; totalRecords: number;
  onChange: (page: number) => void; disabled?: boolean;
}) => <nav aria-label="Results pages" className="flex items-center justify-between gap-3 py-4">
  <Button variant="outline" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
  <span className="text-sm text-slate-600">Page {page} of {Math.max(1, totalPages)} · {totalRecords} results</span>
  <Button variant="outline" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
</nav>;
