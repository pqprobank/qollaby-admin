"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Megaphone,
  FolderTree,
  MapPin,
  UserPlus,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/active-users", label: "Active Users", icon: UserPlus },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/ads", label: "Ads", icon: Megaphone },
  { href: "/conversions", label: "Conversions", icon: TrendingUp },
  { href: "/appeals", label: "Appeals", icon: MessageSquare },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/locations", label: "Locations", icon: MapPin },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, loading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/login");
    }
  }, [admin, loading, router]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setSidebarCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 bg-card/95 backdrop-blur-xl">
        <div className="h-full px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-foreground">Qollaby Admin</h1>
              <p className="text-xs text-muted-foreground">Control Center</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">
                {admin.profile.firstName} {admin.profile.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{admin.user.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-secondary/50 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Fixed Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 z-40
          hidden md:flex flex-col
          border-r border-border/50 bg-sidebar/95 backdrop-blur-xl
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? "w-16" : "w-64"}
        `}
      >
        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 rounded-lg text-sm font-medium transition-all cursor-pointer
                  ${sidebarCollapsed ? "px-3 py-2.5 justify-center" : "px-3 py-2.5"}
                  ${
                    active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }
                `}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Floating toggle button on sidebar edge */}
        <button
          onClick={toggleSidebar}
          className={`
            absolute top-1/2 -translate-y-1/2 -right-3
            w-6 h-6 rounded-full
            bg-card border border-border/50
            flex items-center justify-center
            text-muted-foreground hover:text-foreground
            hover:bg-secondary
            shadow-md
            transition-all duration-200
            z-50
            cursor-pointer
          `}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      {/* Main content area */}
      <main
        className={`
          pt-16 min-h-screen
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? "md:pl-16" : "md:pl-64"}
        `}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
