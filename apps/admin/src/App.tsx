import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AuthGuard } from "./components/AuthGuard";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { UserDetail } from "./pages/UserDetail";
import { Comments } from "./pages/Comments";
import { Reports } from "./pages/Reports";
import { NewsSources } from "./pages/NewsSources";
import { Shows } from "./pages/Shows";
import { Notifications } from "./pages/Notifications";
import { EmailLogs } from "./pages/EmailLogs";
import { RemoteConfig } from "./pages/RemoteConfig";
import { ImportJobs } from "./pages/ImportJobs";

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="/email-logs" element={<EmailLogs />} />
          <Route path="/config" element={<RemoteConfig />} />
          <Route path="/imports" element={<ImportJobs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
