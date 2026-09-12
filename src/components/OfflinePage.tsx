export default function OfflinePage() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-canvas px-6">
      {/* Animated signal icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-brand-600 text-[48px]">wifi_off</span>
        </div>
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-2xl border-2 border-brand-600/30 animate-ping" />
      </div>

      {/* Title */}
      <h1 className="text-[22px] font-bold text-slate-900 text-center mb-2">
        No Internet Connection
      </h1>

      {/* Subtitle */}
      <p className="text-[14px] text-slate-500 text-center leading-relaxed max-w-xs mb-8">
        Please check your connection and try again. DriveManager needs internet to sync your data.
      </p>

      {/* Tips */}
      <div className="w-full max-w-xs bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3 mb-8">
        {[
          { icon: 'wifi', text: 'Check your Wi-Fi or mobile data' },
          { icon: 'airplanemode_active', text: 'Make sure Airplane mode is off' },
          { icon: 'signal_cellular_alt', text: 'Move to an area with better signal' },
        ].map(({ icon, text }) => (
          <div key={icon} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-brand-600 text-[18px]">{icon}</span>
            </div>
            <span className="text-[13px] text-slate-500">{text}</span>
          </div>
        ))}
      </div>

      {/* Waiting indicator */}
      <div className="flex items-center gap-2 text-slate-300">
        <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
        <span className="text-[12px] ml-1">Waiting for connection</span>
      </div>
    </div>
  )
}
