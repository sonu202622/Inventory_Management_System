import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getOrder, cancelOrder } from "../api/orders";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function SkeletonBlock({ className }) {
  return <div className={`animate-shimmer h-4 rounded ${className}`} />;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    document.title = "Inventory Manager | Order Details";
    getOrder(id)
      .then((res) => setOrder(res.data))
      .catch(() => {
        showToast("Order not found", "error");
        navigate("/orders");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  async function handleCancel() {
    try {
      const res = await cancelOrder(order.id);
      setOrder(res.data);
      showToast("Order cancelled and stock restored");
      setShowCancel(false);
    } catch (err) {
      showToast(err.response?.data?.detail || "Cancel failed", "error");
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <SkeletonBlock className="mb-2 h-4 w-24" />
          <SkeletonBlock className="mb-1 h-8 w-72" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <SkeletonBlock className="mb-2 h-3 w-16" />
              <SkeletonBlock className="mb-1 h-5 w-32" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <SkeletonBlock className="mb-4 h-4 w-full" />
          <SkeletonBlock className="mb-3 h-4 w-full" />
          <SkeletonBlock className="mb-3 h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/orders" className="text-sm text-indigo-600 transition-colors hover:text-indigo-800">&larr; Back to Orders</Link>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            Order <span className="font-mono text-indigo-600">{order.id}</span>
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(order.created_at).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        {order.status !== "cancelled" && (
          <button onClick={() => setShowCancel(true)}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:bg-red-700">
            Cancel Order
          </button>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Customer</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{order.customer_name}</p>
          <p className="text-xs text-gray-400">{order.customer_email || ""}</p>
          <p className="text-xs text-gray-400">{order.customer_phone || ""}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] || ""}`}>
            {order.status}
          </span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">${order.total_amount.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Unit Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Quantity</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item, i) => (
              <tr key={i} className={`${i % 2 === 1 ? "bg-gray-50/50" : ""} transition-colors hover:bg-gray-50`}>
                <td className="px-4 py-3 font-medium text-gray-900">{item.product_name}</td>
                <td className="px-4 py-3 text-right text-gray-700">${item.unit_price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">${item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Order Total</td>
              <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">${order.total_amount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ConfirmModal
        open={showCancel}
        title="Cancel Order"
        message="This will cancel the order and restore all product stock quantities. This action cannot be undone."
        onConfirm={handleCancel}
        onCancel={() => setShowCancel(false)}
      />
    </div>
  );
}
