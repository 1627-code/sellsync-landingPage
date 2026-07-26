/**
 * SellSync API Service Layer
 * Connects frontend to backend API
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("sellsync_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "API Error");
  }
  return data;
};

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await handleResponse<{
        success: boolean;
        data: { id: string; name: string; email: string; role: string };
        token: string;
      }>(response);
      if (data.token) {
        localStorage.setItem("sellsync_token", data.token);
        localStorage.setItem("sellsync_user", JSON.stringify(data.data));
      }
      return data;
    },

    signup: async (name: string, email: string, password: string, phone?: string) => {
      const response = await fetch(`${BASE_URL}/api/auth/signUp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      });
      return handleResponse(response);
    },

    getMe: async () => {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    logout: () => {
      localStorage.removeItem("sellsync_token");
      localStorage.removeItem("sellsync_user");
    },
  },

  stores: {
    create: async (data: { name: string; phone: string; email: string; location?: string }) => {
      const response = await fetch(`${BASE_URL}/api/stores/create`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    getAll: async () => {
      const response = await fetch(`${BASE_URL}/api/stores`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    getById: async (id: string) => {
      const response = await fetch(`${BASE_URL}/api/stores/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    update: async (id: string, data: { name?: string; phone?: string; email?: string; location?: string }) => {
      const response = await fetch(`${BASE_URL}/api/stores/update/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
  },

  products: {
    create: async (storeId: string, data: {
      name: string;
      sku: string;
      category: string;
      price: number;
      quantity: number;
      lowThreshold: number;
      barcode?: string;
    }) => {
      const response = await fetch(`${BASE_URL}/api/products/${storeId}/create`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    createMultiple: async (storeId: string, products: Array<{
      name: string;
      sku: string;
      category: string;
      price: number;
      quantity: number;
      lowThreshold: number;
      barcode: string;
    }>) => {
      const response = await fetch(`${BASE_URL}/api/products/${storeId}/createMultiple`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(products),
      });
      return handleResponse(response);
    },

    getAll: async (storeId: string, params?: { search?: string; category?: string; isActive?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.category) query.set("category", params.category);
      if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));

      const response = await fetch(`${BASE_URL}/api/products/${storeId}?${query}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    getById: async (storeId: string, productId: string) => {
      const response = await fetch(`${BASE_URL}/api/products/${storeId}/${productId}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    getByBarcode: async (storeId: string, barcode: string) => {
      const response = await fetch(`${BASE_URL}/api/products/${storeId}/barcode/${barcode}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    update: async (storeId: string, productId: string, data: {
      name?: string;
      sku?: string;
      category?: string;
      price?: number;
      barcode?: string;
    }) => {
      const response = await fetch(`${BASE_URL}/api/products/${storeId}/update/${productId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    deactivate: async (storeId: string, productId: string) => {
      const response = await fetch(`${BASE_URL}/api/products/${storeId}/deactivate/${productId}`, {
        method: "PATCH",
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },

  transactions: {
    create: async (data: {
      paymentMethod: string;
      items: Array<{ productName: string; quantity: number }>;
      discount?: number;
    }) => {
      const response = await fetch(`${BASE_URL}/api/transactions/create`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    getAll: async (storeId: string, page = 1, limit = 10) => {
      const response = await fetch(
        `${BASE_URL}/api/transactions/${storeId}?page=${page}&limit=${limit}`,
        { headers: getHeaders() }
      );
      return handleResponse(response);
    },

    getByCashier: async (storeId: string, cashierId: string) => {
      const response = await fetch(`${BASE_URL}/api/transactions/${storeId}/cashier/${cashierId}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    getById: async (storeId: string, transactionId: string) => {
      const response = await fetch(`${BASE_URL}/api/transactions/${storeId}/${transactionId}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },

    getByDateRange: async (storeId: string, startDate: string, endDate: string) => {
      const response = await fetch(
        `${BASE_URL}/api/transactions/${storeId}/date-range?startDate=${startDate}&endDate=${endDate}`,
        { headers: getHeaders() }
      );
      return handleResponse(response);
    },

    getSummary: async (storeId: string, startDate: string, endDate: string) => {
      const response = await fetch(
        `${BASE_URL}/api/transactions/${storeId}/summary?startDate=${startDate}&endDate=${endDate}`,
        { headers: getHeaders() }
      );
      return handleResponse(response);
    },

    exportPDF: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/transactions/${storeId}/export/pdf`, {
        headers: getHeaders(),
      });
      return response.blob();
    },
  },

  cashiers: {
    create: async (storeId: string, data: { name: string; email: string; password: string; phone?: string }) => {
      const response = await fetch(`${BASE_URL}/api/cashiers/${storeId}/create`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    getAll: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/cashiers/${storeId}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    update: async (storeId: string, cashierId: string, data: { name?: string; email?: string; phone?: string }) => {
      const response = await fetch(`${BASE_URL}/api/cashiers/${storeId}/update/${cashierId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    deactivate: async (storeId: string, cashierId: string) => {
      const response = await fetch(`${BASE_URL}/api/cashiers/${storeId}/deactivate/${cashierId}`, {
        method: "PATCH",
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },

  notifications: {
    getAll: async () => {
      const response = await fetch(`${BASE_URL}/api/notifications`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    markAsRead: async (id: string) => {
      const response = await fetch(`${BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },

  ai: {
    getInsight: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/ai/${storeId}/insight`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },

  analytics: {
    getSalesTrend: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/analytics/${storeId}/sales-trend`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    getTopProducts: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/analytics/${storeId}/top-products`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    getSalesByCategory: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/analytics/${storeId}/sales-by-category`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
    getLowStock: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/analytics/${storeId}/low-stock`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },

  auditLogs: {
    getAll: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/auditLogs/${storeId}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },

  salesGoals: {
    create: async (storeId: string, data: { period: string; targetAmount: number }) => {
      const response = await fetch(`${BASE_URL}/api/salesGoal/${storeId}/create`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
    getAll: async (storeId: string) => {
      const response = await fetch(`${BASE_URL}/api/salesGoal/${storeId}`, {
        headers: getHeaders(),
      });
      return handleResponse(response);
    },
  },
};

export default api;
