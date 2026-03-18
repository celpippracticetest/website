"use client";

import { useState, Suspense } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Box } from "@/components/ui/Box";
import { Menu } from "lucide-react";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <Box className="min-h-screen w-full md:flex md:flex-row bg-background">
      {/* Mobile Header */}
      <Box className="flex items-center justify-between p-3 border-b md:hidden bg-background sticky top-0 z-40">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-muted-foreground hover:bg-accent rounded-md"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="text-lg font-semibold">Dashboard</div>
      </Box>

      {/* Sidebar */}
      <AdminSidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Content */}
      <main className="flex-1 p-3 md:p-6 overflow-x-hidden">{children}</main>
    </Box>
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
