import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getOrders, createOrder, cancelOrder } from "../api/orders";
import { getCustomers } from "../api/customers";
import { getProducts } from "../api/products";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function ShimmerRow() {
  return (
    <tr>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className={`animate-shimmer h-4 rounded ${i === 0 ? "w-16" : i === 1 ? "w-24" : i === 2 ? "w-8 mx-auto" : i === 3 ? "w-16 ml-auto" : i === 4 ? "w-16 mx-auto" : i === 5 ? "w-12 ml-auto" : "w-24 ml-auto"}`} />
        </td>
      ))}
    </tr>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20">
      <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <p className="text-lg font-medium text-gray-400">No orders yet</p>
      <button onClick={onCreate} className="mt-3 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800">
        Create your first order
      </button>
    </div>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const customerRef = useRef(null);
  const { showToast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getOrders();
      setOrders(res.data);
    } catch {
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    document.title = "Inventory Manager | Orders";
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (modalOpen) setTimeout(() => customerRef.current?.focus(), 50);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [modalOpen]);

  const runningTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  function openModal() {
    getCustomers()
      .then((res) => setCustomers(res.data))
      .catch(() => showToast("Failed to load customers", "error"));
    getProducts()
      .then((res) => setProducts(res.data))
      .catch(() => showToast("Failed to load products", "error"));
    setSelectedCustomer("");
    setSelectedProduct("");
    setItemQty(1);
    setCart([]);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setCart([]);
  }

  function addItemToCart() {
    if (!selectedProduct) return;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    if (itemQty < 1) return;
    if (itemQty > product.quantity_in_stock) {
      showToast(`Only ${product.quantity_in_stock} in stock for ${product.name}`, "error");
      return;
    }
    const existing = cart.findIndex((c) => c.product_id === selectedProduct);
    if (existing > -1) {
      const updated = [...cart];
      updated[existing].qty += itemQty;
      if (updated[existing].qty > product.quantity_in_stock) {
        showToast(`Only ${product.quantity_in_stock} in stock for ${product.name}`, "error");
        return;
      }
      setCart(updated);
    } else {
      setCart([...cart, { product_id: product.id, name: product.name, price: product.price, qty: itemQty, maxStock: product.quantity_in_stock }]);
    }
    setSelectedProduct("");
    setItemQty(1);
  }

  function removeCartItem(index) {
    setCart(cart.filter((_, i) => i !== index));
  }

  async function handleCreateOrder() {
    if (!selectedCustomer) {
      showToast("Please select a customer", "error");
      return;
    }
    if (cart.length === 0) {
      showToast("Add at least one item", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createOrder({
        customer_id: selectedCustomer,
        items: cart.map((c) => ({ product_id: c.product_id, quantity: c.qty })),
      });
      showToast("Order created successfully");
      closeModal();
      fetchOrders();
      navigate(`/orders/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (Array.isArray(msg)) {
        showToast(msg[0]?.msg || "Validation error", "error");
      } else {
        showToast(msg || "Failed to create order", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    try {
      await cancelOrder(cancelTarget);
      showToast("Order cancelled and stock restored");
      setCancelTarget(null);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.detail || "Cancel failed", "error");
    }
  }

  const stockWarning = useMemo(() => {
    if (!selectedProduct || itemQty < 1) return null;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return null;
    const cartQty = cart.filter((c) => c.product_id === selectedProduct).reduce((s, c) => s + c.qty, 0);
    const totalNeeded = cartQty + itemQty;
    if (totalNeeded > product.quantity_in_stock) {
      return { available: product.quantity_in_stock, name: product.name };
    }
    return null;
  }, [selectedProduct, itemQty, products, cart]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="mt-1 text-sm text-gray-500">{orders.length} orders</p>
        </div>
        <button onClick={openModal}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:bg-indigo-700">
          + Create Order
        </button>
      </div>

      {loading ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>{["Order ID", "Customer", "Items", "Total", "Status", "Date", "Actions"].map((h, i) => <th key={i} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => <ShimmerRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState onCreate={openModal} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Order ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Items</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o, i) => (
                <tr key={o.id} className={`${i % 2 === 1 ? "bg-gray-50/50" : ""} transition-colors hover:bg-gray-50`}>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{o.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.customer_name}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{o.items?.length || 0}</td>
                  <td className="px-4 py-3 text-right text-gray-900">${o.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[o.status] || "bg-gray-100 text-gray-700"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/orders/${o.id}`)}
                      className="mr-2 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800">
                      View Details
                    </button>
                    {o.status !== "cancelled" && (
                      <button onClick={() => setCancelTarget(o.id)}
                        className="text-sm font-medium text-red-600 transition-colors hover:text-red-800">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!cancelTarget}
        title="Cancel Order"
        message="This will cancel the order and restore all product stock quantities. This action cannot be undone."
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />

      {modalOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 animate-fade-up" onClick={closeModal} />
          <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={closeModal}>
            <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Order</h3>
                <button onClick={closeModal} className="text-gray-400 transition-colors hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <div className="mb-5">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Customer *</label>
                  <select
                    ref={customerRef}
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select a customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 grid grid-cols-[1fr_5rem_auto] gap-2">
                    <select
                      value={selectedProduct}
                      onChange={(e) => { setSelectedProduct(e.target.value); setItemQty(1); }}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.quantity_in_stock === 0}>
                          {p.name} (${p.price}) — stock: {p.quantity_in_stock}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value, 10) || 1)}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addItemToCart}
                      disabled={!selectedProduct}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  {stockWarning && (
                    <p className="text-xs text-red-600">
                      Stock warning: Only {stockWarning.available} available for {stockWarning.name}
                    </p>
                  )}

                  {cart.length > 0 && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500">
                            <th className="pb-1 font-medium">Item</th>
                            <th className="pb-1 text-right font-medium">Qty</th>
                            <th className="pb-1 text-right font-medium">Price</th>
                            <th className="pb-1 text-right font-medium">Subtotal</th>
                            <th className="w-6 pb-1" />
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((c, i) => (
                            <tr key={i} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                              <td className="py-1 font-medium text-gray-900">{c.name}</td>
                              <td className="py-1 text-right">{c.qty}</td>
                              <td className="py-1 text-right">${c.price}</td>
                              <td className="py-1 text-right font-medium">${(c.price * c.qty).toFixed(2)}</td>
                              <td className="py-1 text-right">
                                <button onClick={() => removeCartItem(i)} className="text-red-500 transition-colors hover:text-red-700">✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-gray-200">
                          <tr className="font-semibold text-gray-900">
                            <td colSpan={3} className="py-2 text-right">Total</td>
                            <td className="py-2 text-right">${runningTotal.toFixed(2)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
                <button type="button" onClick={handleCreateOrder} disabled={submitting}
                  className="flex-1 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? "Creating..." : "Create Order"}
                </button>
                <button type="button" onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
