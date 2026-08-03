import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageSpinner } from "./Spinner";

export default function ProtectedRoute({ children, role }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;

  if (!token || !user) {
    return <Navigate to={`/auth?mode=login&next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === "supplier" ? "/supplier" : "/"} replace />;
  }

  if (user && !user.is_onboarded && !location.pathname.startsWith("/onboarding")) {
    return (
      <Navigate
        to={user.role === "supplier" ? "/onboarding/supplier" : "/onboarding"}
        replace
      />
    );
  }

  return children;
}
