/** A simple modal overlay used by Explorer dialogs (Open with, Properties). */
export function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-sm border border-amethyst-600 bg-crypt-800 p-4 shadow-window"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-crypt-500 bg-crypt-700 px-3 py-1 font-pixel text-base text-bone-200 hover:bg-crypt-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
