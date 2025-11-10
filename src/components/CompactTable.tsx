import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CompactTableProps {
  children: ReactNode;
  className?: string;
  striped?: boolean;
  stickyHeader?: boolean;
  compact?: boolean;
}

export function CompactTable({ 
  children, 
  className, 
  striped = false,
  stickyHeader = false,
  compact = true 
}: CompactTableProps) {
  return (
    <div className={cn("rounded-md border", className)}>
      <Table className={cn(compact && "text-xs")}>
        {children}
      </Table>
    </div>
  );
}

interface CompactTableHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function CompactTableHeader({ children, className, sticky = false }: CompactTableHeaderProps) {
  return (
    <TableHeader className={cn(
      sticky && "sticky top-0 z-10 bg-background",
      className
    )}>
      {children}
    </TableHeader>
  );
}

interface CompactTableRowProps {
  children: ReactNode;
  className?: string;
  striped?: boolean;
  index?: number;
  onClick?: () => void;
}

export function CompactTableRow({ 
  children, 
  className, 
  striped = false,
  index = 0,
  onClick 
}: CompactTableRowProps) {
  return (
    <TableRow 
      className={cn(
        striped && index % 2 === 0 && "bg-muted/30",
        onClick && "cursor-pointer hover:bg-muted/50",
        "transition-colors",
        className
      )}
      onClick={onClick}
    >
      {children}
    </TableRow>
  );
}

// Re-export other table components for convenience
export { TableBody, TableCell, TableHead };
