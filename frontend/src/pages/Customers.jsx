import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getCustomers, createCustomer, deleteCustomer } from "../api/customers";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";

const emptyForm = { full_name: "", email: "", phone: "" };

function ShimmerRow() {
  return (
    <tr>
      {[0, 1, 2, 3].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className={`animate-shimmer h-4 rounded ${i === 3 ? "w-16 ml-auto" : "w-28"}`} />
        </td>
      ))}
    </tr>
  );
}

function validate(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = "Full name is required";
  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address";
  }
  if (!form.phone.trim()) errors.phone = "Phone is required";
  return errors;
}

function EmptyState({ search, onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20">
      <svg className="mb-4 h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <p className="text-lg font-medium text-gray-400">
        {search ? "No customers match your search" : "No customers yet"}
      </p>
      {!search && (
        <button onClick={onCreate} className="mt-3 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800">
          Add your first customer
        </button>
      )}
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const nameRef = useRef(null);
  const { showToast } = useToast();

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await getCustomers();
      setCustomers(res.data);
    } catch {
      showToast("Failed to load customers", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    document.title = "Inventory Manager | Customers";
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (modalOpen) setTimeout(() => nameRef.current?.focus(), 50);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [modalOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  function openModal() {
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm);
    setErrors({});
  }

  function handleFieldChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const c = { ...prev }; delete c[field]; return c; });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createCustomer({ full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() });
      showToast("Customer added successfully");
      closeModal();
      fetchCustomers();
    } catch (err) {
      showToast(err.response?.data?.detail || "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCustomer(deleteTarget);
      showToast("Customer deleted");
      setDeleteTarget(null);
      fetchCustomers();
    } catch (err) {
      showToast(err.response?.data?.detail || "Delete failed", "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
          <p className="mt-1 text-sm text-gray-500">{customers.length} customers</p>
        </div>
        <button onClick={openModal}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:bg-indigo-700">
          + Add Customer
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>{[0, 1, 2, 3].map((i) => <th key={i} className="px-4 py-3 text-left font-medium text-gray-600">{["Full Name", "Email", "Phone", "Actions"][i]}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => <ShimmerRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState search={search} onCreate={openModal} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Full Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c, i) => (
                <tr key={c.id} className={`${i % 2 === 1 ? "bg-gray-50/50" : ""} transition-colors hover:bg-gray-50`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDeleteTarget(c.id)}
                      className="text-sm font-medium text-red-600 transition-colors hover:text-red-800">
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
        title="Delete Customer"
        message="This will also remove all associated orders. Continue?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {modalOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 animate-fade-up" onClick={closeModal} />
          <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={closeModal}>
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Customer</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    ref={nameRef}
                    value={form.full_name}
                    onChange={(e) => handleFieldChange("full_name", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none ${
                      errors.full_name ? "border-red-400" : "border-gray-300 focus:border-indigo-500"
                    }`}
                  />
                  {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    value={form.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none ${
                      errors.email ? "border-red-400" : "border-gray-300 focus:border-indigo-500"
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone *</label>
                  <input
                    value={form.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none ${
                      errors.phone ? "border-red-400" : "border-gray-300 focus:border-indigo-500"
                    }`}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:scale-[1.02] hover:bg-indigo-700 disabled:opacity-50">
                    {submitting ? "Adding..." : "Add Customer"}
                  </button>
                  <button type="button" onClick={closeModal}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
