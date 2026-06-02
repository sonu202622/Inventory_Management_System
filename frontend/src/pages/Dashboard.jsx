import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats } from "../api/dashboard";
import { getOrders } from "../api/orders";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const cards = [
  {
    label: "Total Products",
    key: "total_products",
    link: "/products",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    borderColor: "border-indigo-200",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: "Total Customers",
    key: "total_customers",
    link: "/customers",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    borderColor: "border-green-200",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "Total Orders",
    key: "total_orders",
    link: "/orders",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
  },
  {
    label: "Low Stock Items",
    key: "low_stock_count",
    link: "/products",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    borderColor: "border-amber-200",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
];

function Shimmer({ className }) {
  return <div className={`animate-shimmer rounded ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <Shimmer className="mb-3 h-8 w-8 rounded-lg" />
      <Shimmer className="mb-2 h-8 w-20" />
      <Shimmer className="h-4 w-28" />
    </div>
  );
}

function SkeletonTable({ rows = 3, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Shimmer
              key={j}
              className={`h-4 ${j === 0 ? "w-1/3" : j === cols - 1 ? "w-1/6" : "w-1/5"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([getDashboardStats(), getOrders()]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Inventory Manager | Dashboard";
    fetchAll();
  }, [fetchAll]);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">Overview of your inventory system</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:scale-[1.02] hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className={`mr-1.5 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          cards.map((card) => {
            const value = stats ? stats[card.key] ?? 0 : 0;
            return (
              <Link
                key={card.label}
                to={card.link}
                className={`group rounded-xl border-2 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${card.borderColor}`}
              >
                <div className={`mb-4 inline-flex rounded-lg p-2.5 ${card.iconBg} ${card.iconColor}`}>
                  {card.icon}
                </div>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {card.key === "low_stock_count" ? "items need restocking" : card.label}
                </p>
              </Link>
            );
          })
        )}
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Low Stock Alerts</h3>
          <Link to="/products" className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800">
            View All &rarr;
          </Link>
        </div>
        <div className="p-5">
          {loading ? (
            <SkeletonTable rows={3} cols={3} />
          ) : !stats || stats.low_stock_products.length === 0 ? (
            <p className="text-sm text-gray-500">All products well stocked &#10003;</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-2 font-medium text-gray-600">Name</th>
                    <th className="pb-2 font-medium text-gray-600">SKU</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.low_stock_products.map((p, i) => (
                    <tr key={p.id} className={`${i % 2 === 1 ? "bg-gray-50/50" : ""} hover:bg-gray-50`}>
                      <td className="py-2.5 font-medium text-gray-900">{p.name}</td>
                      <td className="py-2.5 text-gray-500">{p.sku}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            p.quantity_in_stock === 0
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.quantity_in_stock === 0 ? "Out of Stock" : p.quantity_in_stock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Recent Orders</h3>
          <Link to="/orders" className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800">
            View All &rarr;
          </Link>
        </div>
        <div className="p-5">
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-2 font-medium text-gray-600">Order ID</th>
                    <th className="pb-2 font-medium text-gray-600">Customer</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Total</th>
                    <th className="pb-2 text-center font-medium text-gray-600">Status</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((o, i) => (
                    <tr key={o.id} className={`${i % 2 === 1 ? "bg-gray-50/50" : ""} hover:bg-gray-50`}>
                      <td className="py-2.5 font-mono text-xs text-indigo-600">{o.id.slice(0, 8)}...</td>
                      <td className="py-2.5 font-medium text-gray-900">{o.customer_name}</td>
                      <td className="py-2.5 text-right text-gray-900">${o.total_amount.toFixed(2)}</td>
                      <td className="py-2.5 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[o.status] || "bg-gray-100 text-gray-700"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
