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
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-drawer p-6 max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[20px] font-semibold text-slate-900">Mark Class Done</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">Confirm details before completing</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-50">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl mb-6">
          <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate">{studentName}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{classLabel}{timeLabel ? ` • ${timeLabel}` : ''}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onCollectPayment}
            disabled={confirming}
            className="w-full h-11 flex items-center justify-center gap-2 bg-brand-600 text-white rounded-xl text-[14px] font-semibold shadow-sm active:scale-[0.98] transition-all disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Collect Payment
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="w-full h-11 flex items-center justify-center gap-2 bg-slate-100 text-slate-900 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-all disabled:opacity-60"
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
