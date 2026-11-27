import { useToasts } from '../state/toastStore';

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      className="pointer-events-none absolute right-3 top-3 z-[500] flex w-72 flex-col gap-2"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={[
            'pointer-events-auto animate-risefade rounded-sm border px-3 py-2 text-left font-pixel text-base shadow-window',
            t.kind === 'error'
              ? 'border-blood-500 bg-crypt-800 text-bone-100'
              : 'border-amethyst-600 bg-crypt-800 text-bone-200',
          ].join(' ')}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
