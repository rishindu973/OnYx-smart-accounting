// "use client";

// import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
// import DashboardHeader from "@/components/dashboard/DashboardHeader";
// import { ThemeProvider } from "@/hooks/useTheme";
// import { SidebarProvider } from "@/components/ui/sidebar";
// import { AuthProvider } from "@/contexts/AuthContext";
// import "@/app/globals.css";

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en" className="dark"> 
//       <body className="antialiased bg-navy-deep text-foreground">
//         <ThemeProvider>
//           <AuthProvider>
//             <SidebarProvider> {/* Add SidebarProvider here */}
//               <div className="flex h-screen w-full overflow-hidden">
//                 {/* 1. This renders the actual Sidebar on the left */}
//                 <DashboardSidebar />
                
//                 <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
//                   {/* 2. This renders the Top Header */}
//                   <DashboardHeader />
                  
//                   {/* 3. This renders your main page content (like the dashboard charts) */}
//                   <main className="flex-1 overflow-y-auto p-4 md:p-6">
//                     {children}
//                   </main>
//                 </div>
//               </div>
//             </SidebarProvider>
//           </AuthProvider>
//         </ThemeProvider>
//       </body>
//     </html>
//   );
// }
// "use client";

// import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
// import DashboardHeader from "@/components/dashboard/DashboardHeader";
// import { SidebarProvider } from "@/components/ui/sidebar";

// export default function DashboardLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <SidebarProvider>
//       <div className="flex h-screen w-full bg-background overflow-hidden">
//         {/* 1. Permanent Navigation Sidebar */}
//         <DashboardSidebar />
        
//         <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
//           {/* 2. Top Header with AI status & User profile */}
//           <DashboardHeader />
          
//           {/* 3. Main content area for charts and AI insights */}
//           <main className="flex-1 overflow-y-auto p-4 md:p-6">
//             {children}
//           </main>
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// }
"use client";

import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {/* The Sidebar component provided by your project */}
        <DashboardSidebar />
        
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* The Header component we just fixed above */}
          <DashboardHeader />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}