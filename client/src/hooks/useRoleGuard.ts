import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export type UserRole = "admin" | "analyst" | "viewer" | "user";

const ROLE_ROUTES: Record<UserRole, string[]> = {
  admin: ["/dashboard", "/dataset", "/upload", "/settings", "/users"],
  analyst: ["/dashboard", "/dataset", "/upload"],
  viewer: ["/dashboard", "/dataset"],
  user: ["/dashboard"],
};

export function useRoleGuard(requiredRole?: UserRole) {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      setLocation("/");
      return;
    }

    if (requiredRole && user?.role !== requiredRole && user?.role !== "admin") {
      setLocation("/dashboard");
      return;
    }
  }, [isAuthenticated, loading, user, requiredRole, setLocation]);

  return { user, isAuthenticated, loading };
}

export function canAccessRoute(userRole: UserRole | undefined, path: string): boolean {
  if (!userRole) return false;
  const allowedRoutes = ROLE_ROUTES[userRole] || [];
  return allowedRoutes.some((route) => path.startsWith(route));
}
