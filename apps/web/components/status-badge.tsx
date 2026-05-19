import { CSSProperties } from "react";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

function getStatusStyle(status: string): CSSProperties {
  switch (status) {
    case "ACTIVE":
      return {
        backgroundColor: "var(--info-bg)",
        color: "var(--info)",
        border: "1px solid var(--info)",
      };
    case "DRAFT":
      return {
        backgroundColor: "var(--warning-bg)",
        color: "var(--warning)",
        border: "1px solid var(--warning)",
      };
    case "CLOSED":
    case "SAFE":
      return {
        backgroundColor: "var(--success-bg)",
        color: "var(--success)",
        border: "1px solid var(--success)",
      };
    case "NEED_HELP":
      return {
        backgroundColor: "oklch(0.977 0.013 17.38)",
        color: "var(--destructive)",
        border: "1px solid var(--destructive)",
      };
    default:
      return {
        backgroundColor: "var(--muted)",
        color: "var(--muted-foreground)",
        border: "1px solid var(--border)",
      };
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ""}`}
      style={getStatusStyle(status)}
    >
      {status}
    </span>
  );
}
