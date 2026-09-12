import { createPortal } from 'react-dom'

interface Props {
  onClose: () => void
  onConfirm: () => void
  onCollectPayment: () => void
  confirming: boolean
  studentName: string
  classLabel: string
  timeLabel: string
}

export default function MarkDoneConfirmModal({
  onClose,
  onConfirm,
  onCollectPayment,
  confirming,
  studentName,
  classLabel,
  timeLabel,
}: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[20px] font-semibold text-on-surface">Mark Class Done</h2>
            <p className="text-[13px] text-on-surface-variant mt-0.5">Confirm details before completing</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl mb-6">
          <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-on-surface truncate">{studentName}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{classLabel}{timeLabel ? ` • ${timeLabel}` : ''}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onCollectPayment}
            disabled={confirming}
            className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl text-[14px] font-semibold shadow-sm active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Collect Payment
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="w-full h-11 flex items-center justify-center gap-2 bg-surface-container-high text-on-surface rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {confirming ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">check_circle</span>Confirm</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
