import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-x-auto rounded-xl border border-border/70 bg-card/60 shadow-sm">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground", className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b border-border/70 transition-colors hover:bg-muted/30", className)} {...props} />
);

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("px-4 py-3 text-left font-medium", className)} {...props} />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-middle text-sm text-foreground", className)} {...props} />
);

export const TableFooter = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tfoot className={cn("bg-muted/50 font-medium", className)} {...props} />
);
