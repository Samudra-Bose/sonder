import { useContext } from "react";
import { AuthContext, type AuthContextType } from "./AuthContext.js";

/**
 * Access the active authentication context.
 * Guarantees session state, user context, CSRF token, and auth mutation methods.
 * Throws if called outside an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
