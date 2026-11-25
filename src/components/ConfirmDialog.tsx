import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Bevestigingsvenster op basis van het native <dialog>-element (focus en Esc gratis). */
export function ConfirmDialog({ open, title, children, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // Klik op de achtergrond sluit het venster.
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="dialog-body">
        <h2 id="dialog-title">{title}</h2>
        <div className="dialog-content">{children}</div>
        <div className="btn-row dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} autoFocus>
            Annuleren
          </button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
