import { LayoutGrid, Users, Boxes, Swords, Globe2, FileSearch, Compass, FileText } from "lucide-react";

// available(report) -> boolean ; unavailableReason for empty state
export const SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutGrid, testid: "sidebar-nav-overview",
    available: () => true },
  { key: "customer", label: "Customer Intelligence", icon: Users, testid: "sidebar-nav-customer",
    available: (r) => !!r },
  { key: "product", label: "Product Intelligence", icon: Boxes, testid: "sidebar-nav-product",
    available: (r) => !!r },
  { key: "competitive", label: "Competitive Intelligence", icon: Swords, testid: "sidebar-nav-competitive",
    available: (r) => !!r },
  { key: "market", label: "Market Intelligence", icon: Globe2, testid: "sidebar-nav-market",
    available: (r) => !!r },
  { key: "evidence", label: "Evidence Explorer", icon: FileSearch, testid: "sidebar-nav-evidence",
    available: (r) => !!r },
  { key: "strategic", label: "Strategic Intelligence", icon: Compass, testid: "sidebar-nav-strategic",
    available: (r) => !!r },
  { key: "reports", label: "Reports", icon: FileText, testid: "sidebar-nav-reports",
    available: (r) => !!r },
];
