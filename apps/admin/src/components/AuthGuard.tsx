import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
