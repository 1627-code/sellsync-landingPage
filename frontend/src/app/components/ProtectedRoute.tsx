import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(false);
  }, []);
  
  const token = localStorage.getItem("sellsync_token");
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!token) {
    window.location.href = "/pages/login.html";
    return null;
  }
  
  return <>{children}</>;
}
