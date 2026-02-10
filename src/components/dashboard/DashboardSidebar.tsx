"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Calendar,
  BookOpen,
  LogOut,
  Upload,
  Scan
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: FileText }, // Removed /dashboard/
  { title: "Bank Reconciliation", url: "/bank-reconciliation", icon: Building2 }, // Removed /dashboard/
  { title: "Governance", url: "/governance", icon: Calendar }, // Removed /dashboard/
  { title: "Virtual Ledger", url: "/ledger", icon: BookOpen }, // Removed /dashboard/
];

const DashboardSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    router.push("/");
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="font-bold text-primary-foreground text-lg">O</span>
            </div>
            {!collapsed && (
              <span className="text-xl font-bold tracking-tight">
                On<span className="text-primary">Yx</span>
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.url; // Exact match for active state

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link
                        href={item.url}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                            ? "bg-sidebar-accent text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                          }`}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2">
            {!collapsed && "Quick Actions"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Scan Document */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Scan Document">
                  <Link
                    href="/scan"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full ${pathname === "/scan"
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      }`}
                  >
                    <Scan className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="font-medium">Scan Document</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Upload Files */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Upload Files">
                  <Link
                    href="/upload"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full ${pathname === "/upload"
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      }`}
                  >
                    <Upload className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="font-medium">Upload Files</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Logout">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors w-full"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="font-medium">Logout</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;