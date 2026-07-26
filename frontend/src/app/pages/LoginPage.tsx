import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../state/store";

export function LoginPage() {
  const navigate = useNavigate();
  const { loginUser, setStores, setCurrentStore } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse login response:", e, "Status:", res.status, "Body:", text);
        setError("Login failed. Server returned invalid response.");
        setLoading(false);
        return;
      }

      if (data.success) {
        console.log("Login success, clearing localStorage");
        localStorage.clear();

        console.log("Setting token and user");
        localStorage.setItem("sellsync_token", data.token);

        // Fetch full user data including assignedStoreIds
        let assignedStores: string[] = [];
        try {
          const meRes = await fetch(`${API_URL}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${data.token}` }
          });
          if (meRes.ok) {
            const meData = JSON.parse(await meRes.text());
            if (meData.success && meData.data) {
              assignedStores = meData.data.storeId ? [meData.data.storeId] : [];
            }
          }
        } catch (e) {
          console.error("Failed to fetch user details:", e);
        }

        const userData = {
          ...data.data,
          assignedStoreIds: assignedStores
        };
        localStorage.setItem("sellsync_user", JSON.stringify(userData));
        loginUser(userData);

        console.log("Fetching stores");
        // Try to get stores - for MANAGER use /stores, for CASHIER use /my-store
        const storesEndpoint = data.data.role === "CASHIER" ? "/api/stores/my-store" : "/api/stores";
        const storesRes = await fetch(`${API_URL}${storesEndpoint}`, {
          headers: { "Authorization": `Bearer ${data.token}` }
        });

        if (!storesRes.ok) {
          console.error("Stores fetch failed:", storesRes.status, await storesRes.text());
        }

        let hasStores = false;
        if (storesRes.ok) {
          const storesData = JSON.parse(await storesRes.text());
          console.log("Stores response:", storesData);
          if (storesData.success) {
            const stores = storesData.data?.stores || (storesData.data ? [storesData.data] : []) ;
            if (stores.length > 0) {
              hasStores = true;
              const normalizedStores = stores.map((s: any) => ({
                id: s.id,
                name: s.name,
                code: s.name.substring(0, 3).toUpperCase(),
                address: s.location ? s.location.split(",")[0] : "",
                city: s.location ? s.location.split(",")[1]?.trim() || "N/A" : "N/A",
                state: s.location ? s.location.split(",")[2]?.trim() || "N/A" : "N/A",
                zip: s.location ? s.location.split(" ")[-1]?.trim() || "" : "",
                phone: s.phone || "",
                email: s.email || "",
                status: s.isActive ? "Active" : "Inactive"
              }));
              console.log("Setting stores:", normalizedStores);
              setStores(normalizedStores);
              setCurrentStore(normalizedStores[0].id);
            }
          }
        }

        if (!hasStores) {
          console.log("No stores, redirecting to settings");
          navigate("/settings?createStore=true");
        } else {
          console.log("Has stores, redirecting to dashboard");
          navigate("/dashboard");
        }
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-96">
        <h1 className="text-3xl font-bold mb-2 text-center text-gray-800">SellSync</h1>
        <p className="text-gray-500 text-center mb-6">Sign in to your dashboard</p>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
