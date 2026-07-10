import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-60 min-h-screen">
        <div className="mx-auto max-w-[1400px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
