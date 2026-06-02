import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../api/products";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";

const emptyForm = { name: "", sku: "", price: "", quantity_in_stock: "" };

function ShimmerRow() {
  return (
    <tr>
      {[0, 1, 2, 3, 4].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className={`animate-shimmer h-4 rounded ${i === 2 || i === 3 ? "w-16 ml-auto" : i === 4 ? "w-20 ml-auto" : "w-24"}`} />
        </td>
      ))}
    </tr>
  );
}

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Product name is required";
  if (!form.sku.trim()) errors.sku = "SKU is required";
  if (form.price === "" || form.price == null) errors.price = "Price is required";
  else if (Number(form.price) <= 0) errors.price = "Price must be greater than 0";
  if (form.quantity_in_stock === "" || form.quantity_in_stock == null) errors.quantity_in_stock = "Quantity is required";
  else if (!Number.isInteger(Number(form.quantity_in_stock))) errors.quantity_in_stock = "Quantity must be a whole number";
  else if (Number(form.quantity_in_stock) < 0) errors.quantity_in_stock = "Quantity cannot be negative";
  return errors;
}

function EmptyState({ search, onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20">
      <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p className="text-lg font-medium text-gray-400">
        {search ? "No products match your search" : "No products yet"}
      </p>
      {!search && (
        <button onClick={onCreate} className="mt-3 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800">
          Add your first product
        </button>
      )}
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const nameRef = useRef(null);
  const { showToast } = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await getProducts();
      setProducts(res.data);
    } catch {
      showToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    document.title = "Inventory Manager | Products";
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (panelOpen) setTimeout(() => nameRef.current?.focus(), 50);
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") closePanel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [panelOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  function openCreate() {
    setForm(emptyForm);
    setErrors({});
    setEditing(null);
    setPanelOpen(true);
  }

  function openEdit(product) {
    setForm({
      name: product.name,
      sku: product.sku,
      price: String(product.price),
      quantity_in_stock: String(product.quantity_in_stock),
    });
    setErrors({});
    setEditing(product.id);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
  }

  function handleFieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price: parseFloat(form.price),
        quantity_in_stock: parseInt(form.quantity_in_stock, 10),
      };
      if (editing) {
        await updateProduct(editing, payload);
        showToast("Product updated successfully");
      } else {
        await createProduct(payload);
        showToast("Product added successfully");
      }
      closePanel();
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.detail || "Operation failed";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget);
      showToast("Product deleted");
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.detail || "Delete failed", "error");
    }
  }

  function stockBadge(qty) {
    if (qty === 0)
      return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Out of Stock</span>;
    if (qty < 10)
      return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Low Stock</span>;
    return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">{qty}</span>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="mt-1 text-sm text-gray-500">{products.length} products</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:bg-indigo-700"
        >
          + Add Product
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>{[0, 1, 2, 3, 4].map((i) => <th key={i} className="px-4 py-3 text-left font-medium text-gray-600">{["Name", "SKU", "Price", "Stock", "Actions"][i]}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => <ShimmerRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState search={search} onCreate={openCreate} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Price</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Stock</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p, i) => (
                <tr key={p.id} className={`${i % 2 === 1 ? "bg-gray-50/50" : ""} transition-colors hover:bg-gray-50`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-right text-gray-900">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">{stockBadge(p.quantity_in_stock)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="mr-3 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p.id)}
                      className="text-sm font-medium text-red-600 transition-colors hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message="This will also remove the product from any associated order items. Continue?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {panelOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 animate-fade-up" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-xl animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editing ? "Edit Product" : "Add Product"}
              </h3>
              <button onClick={closePanel} className="text-gray-400 transition-colors hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto p-6">
              <div className="flex-1 space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Product Name *</label>
                  <input
                    ref={nameRef}
                    value={form.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none ${
                      errors.name ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-indigo-500"
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">SKU *</label>
                  <input
                    value={form.sku}
                    onChange={(e) => handleFieldChange("sku", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none ${
                      errors.sku ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-indigo-500"
                    }`}
                  />
                  {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.price}
                    onChange={(e) => handleFieldChange("price", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none ${
                      errors.price ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-indigo-500"
                    }`}
                  />
                  {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity_in_stock}
                    onChange={(e) => handleFieldChange("quantity_in_stock", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none ${
                      errors.quantity_in_stock ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-indigo-500"
                    }`}
                  />
                  {errors.quantity_in_stock && <p className="mt-1 text-xs text-red-600">{errors.quantity_in_stock}</p>}
                </div>
              </div>

              <div className="mt-6 flex gap-3 border-t border-gray-200 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editing ? "Update Product" : "Add Product"}
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
