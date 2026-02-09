"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Bell, Search, Settings, Building, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/useTheme";
import { useLedger } from "@/contexts/LedgerContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";


type DashboardHeaderData = {
  companyName?: string;
};

const DashboardHeader = () => {
  const currentDate = format(new Date(), "EEEE, MMMM d, yyyy");
  const { theme, toggleTheme } = useTheme();
  const { newTransactionCount, notifications, clearNotifications } = useLedger();

  const [mounted, setMounted] = useState(false);
  const [companyName, setCompanyName] = useState("Company");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as DashboardHeaderData;
        if (data?.companyName) setCompanyName(data.companyName);
      } catch {
        // keep fallback
      }
    };
    run();
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">{companyName}</h1>
            <p className="text-sm text-muted-foreground">{currentDate}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="w-64 pl-10 bg-secondary border-border"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {newTransactionCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
                  {newTransactionCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium leading-none">Notifications</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto py-1"
                  onClick={clearNotifications}
                >
                  Clear
                </Button>
              </div>
              <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No new notifications
                  </p>
                ) : (
                  notifications.map((msg, i) => (
                    <div key={i} className="text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                      {msg}
                    </div>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* This button logic now waits for 'mounted' to be true */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative"
          title={mounted ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : "Loading..."}
        >
          {mounted && (theme === "dark" ? (
            <Sun className="w-5 h-5 text-warning" />
          ) : (
            <Moon className="w-5 h-5" />
          ))}
        </Button>

        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>

        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">JD</span>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
