import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AuthGuard } from "./components/AuthGuard";

const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Users = lazy(() => import("./pages/Users").then((m) => ({ default: m.Users })));
const UserDetail = lazy(() => import("./pages/UserDetail").then((m) => ({ default: m.UserDetail })));
const Comments = lazy(() => import("./pages/Comments").then((m) => ({ default: m.Comments })));
const Reports = lazy(() => import("./pages/Reports").then((m) => ({ default: m.Reports })));
const NewsSources = lazy(() => import("./pages/NewsSources").then((m) => ({ default: m.NewsSources })));
const Shows = lazy(() => import("./pages/Shows").then((m) => ({ default: m.Shows })));
const Notifications = lazy(() => import("./pages/Notifications").then((m) => ({ default: m.Notifications })));
const EmailLogs = lazy(() => import("./pages/EmailLogs").then((m) => ({ default: m.EmailLogs })));
const RemoteConfig = lazy(() => import("./pages/RemoteConfig").then((m) => ({ default: m.RemoteConfig })));
const ImportJobs = lazy(() => import("./pages/ImportJobs").then((m) => ({ default: m.ImportJobs })));
const AI = lazy(() => import("./pages/AI").then((m) => ({ default: m.AI })));
const ContactMessages = lazy(() => import("./pages/ContactMessages").then((m) => ({ default: m.ContactMessages })));
const AdminFeed = lazy(() => import("./pages/AdminFeed").then((m) => ({ default: m.AdminFeed })));

function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <AuthGuard>
                <AdminLayout />
              </AuthGuard>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="/comments" element={<Comments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/news-sources" element={<NewsSources />} />
            <Route path="/shows" element={<Shows />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/email" element={<EmailLogs />} />
            <Route path="/config" element={<RemoteConfig />} />
            <Route path="/imports" element={<ImportJobs />} />
            <Route path="/ai" element={<AI />} />
            <Route path="/contact" element={<ContactMessages />} />
            <Route path="/admin-feed" element={<AdminFeed />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
