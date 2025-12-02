"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

const examItems = [
  {
    key: "create",
    label: "Create",
    icon: "➕",
    href: "/cms/dashboard/exam/create",
  },
  {
    key: "list",
    label: "List",
    icon: "📋",
    href: "/cms/dashboard/exam",
  },
] as const;

const practiceItems = [
  {
    key: "list",
    label: "List",
    icon: "📋",
    href: "/cms/dashboard/practice",
  },
] as const;

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hrefFor = (key: string) => {
    if (key === "overview") return "/cms/dashboard";
    if (key === "onboarding") return "/cms/dashboard?tab=onboarding";
    if (key === "onboarding-new") return "/cms/dashboard?tab=onboarding-new";
    if (key === "withdrawal-requests") return "/cms/dashboard/withdrawal-requests";
    if (key === "plans") return "/cms/dashboard/plans";
    return `/cms/${key}`;
  };
  const isActive = (key: string) => {
    if (key === "overview") {
      return (
        pathname === "/cms" || (pathname === "/cms/dashboard" && !currentTab)
      );
    }
    if (key === "onboarding") {
      return pathname === "/cms/dashboard" && currentTab === "onboarding";
    }
    if (key === "onboarding-new") {
      return pathname === "/cms/dashboard" && currentTab === "onboarding-new";
    }
    if (key === "withdrawal-requests") {
      return (
        pathname === "/cms/dashboard" && currentTab === "withdrawal-requests"
      );
    }
    return pathname === `/cms/${key}`;
  };
  return (
    <div className="min-h-screen w-full md:flex md:flex-row">
      <div className="flex items-center justify-between p-3 border-b md:hidden bg-white sticky top-0 z-40">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-gray-700 rounded-md border border-gray-300"
        >
          ☰
        </button>
        <div className="text-lg font-semibold">Dashboard</div>
      </div>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-200 ease-in-out z-50 w-64 md:sticky md:top-0 md:z-30 md:translate-x-0 md:w-auto h-[100dvh] shrink-0 border-b md:border-b-0 md:border-r bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 ${collapsed ? "md:w-16" : "md:w-64"
          }`}
      >
        <div className="px-3 py-3 md:py-6">
          <div className="mb-3 flex items-center justify-end md:justify-between">
            {!collapsed && (
              <div className="hidden md:block text-sm font-semibold text-gray-700">
                Menu
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <span aria-hidden>{collapsed ? "»" : "«"}</span>
            </button>
          </div>
          <nav
            className={`flex md:block overflow-x-auto md:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${collapsed ? "md:text-center" : ""
              }`}
          >
            {/* Top-level items */}
            <ul
              className={`flex md:block gap-2 md:gap-1 ${collapsed ? "md:space-y-1" : ""
                }`}
            >
              {/* Overview */}
              <li>
                <Link
                  href={hrefFor("overview")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                    } gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive("overview")
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  aria-current={isActive("overview") ? "page" : undefined}
                  title="Overview"
                >
                  <span aria-hidden>🏠</span>
                  {!collapsed && <span>Overview</span>}
                </Link>
              </li>
              {/* Onboarding */}
              <li className="mt-3">
                <Link
                  href={hrefFor("onboarding")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                    } gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive("onboarding")
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  aria-current={isActive("onboarding") ? "page" : undefined}
                  title="Onboarding"
                >
                  <span aria-hidden>🧭</span>
                  {!collapsed && <span>Onboarding</span>}
                </Link>
              </li>
              {/* New Onboarding */}
              <li className="mt-3">
                <Link
                  href={hrefFor("onboarding-new")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                    } gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive("onboarding-new")
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  aria-current={isActive("onboarding-new") ? "page" : undefined}
                  title="Onboarding New"
                >
                  <span aria-hidden>🧭</span>
                  {!collapsed && <span>Onboarding New</span>}
                </Link>
              </li>
              <li className="mt-3">
                <Link
                  href={hrefFor("plans")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                    } gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive("plans")
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  aria-current={isActive("plans") ? "page" : undefined}
                  title="Plans"
                >
                  <span aria-hidden>📋</span>
                  {!collapsed && <span>Plans</span>}
                </Link>
              </li>
              <li className="mt-3">
                <Link
                  href={hrefFor("withdrawal-requests")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                    } gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive("withdrawal-requests")
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  aria-current={
                    isActive("withdrawal-requests") ? "page" : undefined
                  }
                  title="Withdrawal Requests"
                >
                  <span aria-hidden>🧭</span>
                  {!collapsed && <span>Withdrawal Requests</span>}
                </Link>
              </li>

              {/* Users Management */}
              <li className="mt-3">
                <Link
                  href="/cms/dashboard/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                    } gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname.startsWith("/cms/dashboard/users")
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  aria-current={
                    pathname.startsWith("/cms/dashboard/users")
                      ? "page"
                      : undefined
                  }
                  title="User Management"
                >
                  <span aria-hidden>👥</span>
                  {!collapsed && <span>Users</span>}
                </Link>
              </li>

              {/* League Management */}
              <li className="mt-3">
                <Link
                  href="/cms/dashboard/league"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                    } gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname.startsWith("/cms/dashboard/league")
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  aria-current={
                    pathname.startsWith("/cms/dashboard/league")
                      ? "page"
                      : undefined
                  }
                  title="League Management"
                >
                  <span aria-hidden>🏆</span>
                  {!collapsed && <span>League</span>}
                </Link>
              </li>

              {/* Exams group header */}
              <li className="mt-1 md:mt-3">
                {!collapsed && (
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Exams
                  </div>
                )}
                <ul className={`${collapsed ? "ml-0" : "ml-2"} space-y-1`}>
                  {examItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                            } gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          aria-current={active ? "page" : undefined}
                          title={item.label}
                        >
                          <span aria-hidden>{item.icon}</span>
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
              <li className="mt-1 md:mt-3">
                {!collapsed && (
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Practices
                  </div>
                )}
                <ul className={`${collapsed ? "ml-0" : "ml-2"} space-y-1`}>
                  {practiceItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                            } gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          aria-current={active ? "page" : undefined}
                          title={item.label}
                        >
                          <span aria-hidden>{item.icon}</span>
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              {/* Settings */}
              <li className="mt-1">
                <Link
                  href={hrefFor("settings")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center ${collapsed ? "justify-center" : "justify-start"
                    } gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive("settings")
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  aria-current={isActive("settings") ? "page" : undefined}
                  title="Settings"
                >
                  <span aria-hidden>⚙️</span>
                  {!collapsed && <span>Settings</span>}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Content */}
      <main className="flex-1 p-3 md:p-6">{children}</main>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={null}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
