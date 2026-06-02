import { useEffect } from "react";
import { useToast } from "../context/ToastContext";

export default function Toast() {
  const { toast, dismissToast } = useToast();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, 3000);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  const bg = toast.type === "success" ? "bg-green-600" : "bg-red-600";

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`${bg} flex items-center gap-3 rounded-lg px-5 py-3 text-white shadow-lg`}>
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={dismissToast} className="ml-2 text-white/80 transition-colors hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}
