// "use client";
// import { format } from "date-fns";
// import { Bell, Search, Settings, Building, Sun, Moon } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useTheme } from "@/hooks/useTheme";

// interface DashboardHeaderProps {
//   companyName?: string;
// }

// const DashboardHeader = ({ companyName = "Acme Corporation" }: DashboardHeaderProps) => {
//   const currentDate = format(new Date(), "EEEE, MMMM d, yyyy");
//   const { theme, toggleTheme } = useTheme();

//   return (
//     <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-40">
//       <div className="flex items-center gap-4">
//         <div className="flex items-center gap-3">
//           <div className="p-2 rounded-lg bg-primary/10">
//             <Building className="w-5 h-5 text-primary" />
//           </div>
//           <div>
//             <h1 className="font-semibold text-lg">{companyName}</h1>
//             <p className="text-sm text-muted-foreground">{currentDate}</p>
//           </div>
//         </div>
//       </div>

//       <div className="flex items-center gap-4">
//         <div className="relative hidden md:block">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//           <Input 
//             placeholder="Search transactions..." 
//             className="w-64 pl-10 bg-secondary border-border"
//           />
//         </div>

//         <Button variant="ghost" size="icon" className="relative">
//           <Bell className="w-5 h-5" />
//           <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
//             3
//           </span>
//         </Button>

//         <Button 
//           variant="ghost" 
//           size="icon" 
//           onClick={toggleTheme}
//           className="relative"
//           title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
//         >
//           {theme === "dark" ? (
//             <Sun className="w-5 h-5 text-warning" />
//           ) : (
//             <Moon className="w-5 h-5" />
//           )}
//         </Button>

//         <Button variant="ghost" size="icon">
//           <Settings className="w-5 h-5" />
//         </Button>

//         <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
//           <span className="text-sm font-medium text-primary">JD</span>
//         </div>
//       </div>
//     </header>
//   );
// };

// export default DashboardHeader;
"use client";
import { useEffect, useState } from "react"; // Added useEffect and useState
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

const DashboardHeader = ({ companyName = "Acme Corporation" }: { companyName?: string }) => {
  const currentDate = format(new Date(), "EEEE, MMMM d, yyyy");
  const { theme, toggleTheme } = useTheme();
  const { newTransactionCount, clearNotifications, notifications } = useLedger();
  const [mounted, setMounted] = useState(false); // New state to prevent mismatch

  // Only run on the client after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
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
            <Button variant="ghost" size="icon" className="relative" onClick={clearNotifications}>
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
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Recent system alerts and transactions.
                </p>
              </div>
              <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-sm text-center text-muted-foreground py-4">
                    No notifications
                  </div>
                ) : (
                  notifications.map((note, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm border-b border-border pb-2 last:border-0">
                      <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
                      <span>{note}</span>
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