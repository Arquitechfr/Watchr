import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { InstallPrompt } from "../InstallPrompt";
import { ToastContainer } from "../ui/Toast";
import { useAdminNotificationPolling } from "../../hooks/useAdminNotificationPolling";

function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useAdminNotificationPolling();

  return (
    <div className="min-h-screen bg-background">
      <TopBar onMenuClick={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="md:ml-60 min-h-screen pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
        <div className="mx-auto max-w-[1400px] p-4 md:p-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <InstallPrompt />
      <ToastContainer />
    </div>
  );
}
