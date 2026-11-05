/**
 * ConfirmDialog — Simple modal confirmation dialog.
 */
export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "Confirm", confirmClass = "btn-danger" }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 id="dialog-title" className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={confirmClass}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
