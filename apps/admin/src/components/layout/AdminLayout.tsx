import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { InstallPrompt } from "../InstallPrompt";
import { ToastContainer } from "../ui/Toast";
import { useAdminNotificationPolling } from "../../hooks/useAdminNotificationPolling";

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useAdminNotificationPolling();

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuClick={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="md:ml-60 min-h-screen pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
        <div className="mx-auto max-w-[1400px] p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <InstallPrompt />
      <ToastContainer />
    </div>
  );
}
