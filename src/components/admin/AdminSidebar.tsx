"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Compass,
  FileText,
  Users,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  BookOpen,
  PenTool,
  Mic,
  Headphones,
  Book,
  Globe,
  Trophy,
  Mail,
  BarChart2,
  CheckSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Box } from "@/components/ui/Box";

interface SidebarItem {
  key: string;
  label: string;
  icon: any;
  href: string;
  subItems?: SidebarItem[];
}

interface SidebarGroup {
  label?: string;
  items: SidebarItem[];
}

const mainItems: SidebarGroup = {
  items: [
    { key: "overview", label: "Overview", icon: LayoutDashboard, href: "/cms/dashboard" },
    { key: "onboarding", label: "Onboarding", icon: Compass, href: "/cms/dashboard?tab=onboarding" },
    { key: "onboarding-new", label: "Onboarding New", icon: Compass, href: "/cms/dashboard?tab=onboarding-new" },
    { key: "plans", label: "Plans", icon: ClipboardList, href: "/cms/dashboard/plans" },
    { key: "withdrawal-requests", label: "Withdrawals", icon: FileText, href: "/cms/dashboard/withdrawal-requests" },
    { key: "refund-requests", label: "Refund Requests", icon: FileText, href: "/cms/dashboard/refund-requests" },
    { key: "users", label: "Users", icon: Users, href: "/cms/dashboard/users" },
    { key: "cancellation-surveys", label: "Cancellation Reasons", icon: FileText, href: "/cms/dashboard/cancellation-surveys" },
    { key: "lead-capture", label: "Lead Capture", icon: Mail, href: "/cms/dashboard/lead-capture" },
    { key: "league", label: "League", icon: Trophy, href: "/cms/dashboard/league" },
  ],
};

const examItems: SidebarGroup = {
  label: "Exams",
  items: [
    { key: "exam-create", label: "Create Exam", icon: ClipboardList, href: "/cms/dashboard/exam/create" },
    { key: "exam-list", label: "List Exams", icon: ClipboardList, href: "/cms/dashboard/exam" },
  ],
};

const practiceItems: SidebarGroup = {
  label: "Practice",
  items: [
    { key: "practice-list", label: "List Practices", icon: BookOpen, href: "/cms/dashboard/practice" },
  ],
};

const reportItems: SidebarGroup = {
  label: "Reports",
  items: [
    { key: "reports-quick", label: "Quick Report", icon: BarChart2, href: "/cms/dashboard/reports/quick" },
    { key: "reports-analytics", label: "Analytics", icon: BarChart2, href: "/cms/dashboard/reports/analytics" },
    { key: "reports-google-ads", label: "Google Ads", icon: Globe, href: "/cms/dashboard/reports/google-ads" },
    { key: "reports-search-console", label: "Search Console", icon: Globe, href: "/cms/dashboard/reports/search-console" },
    { key: "reports-stripe", label: "Stripe", icon: ClipboardList, href: "/cms/dashboard/reports/stripe" },
  ],
};

const contentItems: SidebarGroup = {
  label: "Content",
  items: [
    { key: "tasks", label: "Tasks", icon: CheckSquare, href: "/cms/dashboard/tasks" },
    { key: "blog", label: "Blog", icon: PenTool, href: "/cms/dashboard/blog" },
    { key: "wiki", label: "Wiki", icon: Book, href: "/cms/dashboard/wiki" },
    { key: "seo", label: "SEO Links", icon: Globe, href: "/cms/dashboard/seo/internal-links" },
  ],
};

const settingsItem: SidebarItem = { key: "settings", label: "Settings", icon: Settings, href: "/cms/settings" };

export function AdminSidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [collapsed, setCollapsed] = useState(false);

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (href: string, key: string) => {
    if (key === "overview") {
      return pathname === "/cms" || (pathname === "/cms/dashboard" && !currentTab);
    }
    if (key === "onboarding") {
      return pathname === "/cms/dashboard" && currentTab === "onboarding";
    }
    if (key === "onboarding-new") {
      return pathname === "/cms/dashboard" && currentTab === "onboarding-new";
    }
    if (key === "withdrawal-requests") {
      return pathname === "/cms/dashboard" && currentTab === "withdrawal-requests";
    }

    // Exact match for most items
    if (href === pathname) return true;

    // Active state for parent routes
    if (key === "users" && pathname.startsWith("/cms/dashboard/users")) return true;
    if (key === "reports" && pathname.startsWith("/cms/dashboard/reports")) return true;
    if (key === "lead-capture" && pathname.startsWith("/cms/dashboard/lead-capture")) return true;
    if (key === "league" && pathname.startsWith("/cms/dashboard/league")) return true;
    if (key === "tasks" && pathname.startsWith("/cms/dashboard/tasks")) return true;
    if (key === "blog" && pathname.startsWith("/cms/dashboard/blog")) return true;
    if (key === "wiki" && pathname.startsWith("/cms/dashboard/wiki")) return true;
    if (key === "seo" && pathname.startsWith("/cms/dashboard/seo")) return true;

    return false;
  };

  const NavItem = ({ item, isSubItem = false }: { item: SidebarItem, isSubItem?: boolean }) => {
    const active = isActive(item.href, item.key);
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems[item.key];

    return (
      <>
        <div className="relative">
          <Link
            href={item.href}
            onClick={(e) => {
              if (hasSubItems) {
                // If it has subitems, clicking the main link should still navigate, 
                // but we might want to expand automatically or let the arrow handle it.
                // For now, let's just close mobile menu if it's a link.
                if (!mobileOpen) return;
                setMobileOpen(false);
              } else {
                setMobileOpen(false);
              }
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
              active
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center px-2",
              isSubItem && "pl-9 text-xs"
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground")} />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}

            {!collapsed && hasSubItems && (
              <button
                onClick={(e) => toggleExpand(item.key, e)}
                className="ml-auto p-1 rounded-sm hover:bg-accent/50 text-muted-foreground"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}

            {active && !isSubItem && (
              <Box className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full" />
            )}
          </Link>
        </div>

        {!collapsed && hasSubItems && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.subItems!.map((subItem) => (
              <NavItem key={subItem.key} item={subItem} isSubItem={true} />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <Box
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <Box
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-card shadow-sm transition-all duration-300 md:sticky md:top-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-[70px]" : "w-64"
        )}
      >
        {/* Header */}
        <Box className="flex h-16 items-center justify-between px-4 border-b">
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">
              Admin
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden md:flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile close button inside sidebar */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-2 rounded-md hover:bg-accent text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </Box>

        {/* Scrollable Content */}
        <Box className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-none">
          {/* Main Items */}
          <Box className="space-y-1">
            {mainItems.items.map((item) => (
              <NavItem key={item.key} item={item} />
            ))}
          </Box>

          {/* Grouped Items */}
          {[examItems, practiceItems, reportItems, contentItems].map((group, idx) => (
            <Box key={idx} className="space-y-1">
              {!collapsed && group.label && (
                <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">
                  {group.label}
                </h4>
              )}
              {collapsed && <div className="h-px bg-border my-2" />}
              {group.items.map((item) => (
                <NavItem key={item.key} item={item} />
              ))}
            </Box>
          ))}

          {/* Settings at the bottom */}
          <Box className="mt-auto pt-4 border-t">
            <NavItem item={settingsItem} />
          </Box>
        </Box>
      </Box>
    </>
  );
}
