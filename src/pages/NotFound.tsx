import { useNavigate, useLocation } from "react-router-dom"

export default function NotFound() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        {/* Driving School Car & L-Plate Visual */}
        <div className="relative mb-6">
          {/* Main Round Badge with Driving Car */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-container flex items-center justify-center shadow-inner border border-outline-variant/30">
            <span className="material-symbols-outlined text-primary text-[52px] sm:text-[60px]">
              directions_car
            </span>
          </div>

          {/* Iconic Driving School Red "L" (Learner) Badge */}
          <div
            className="absolute -top-2 -right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border-2 border-red-500 shadow-md flex items-center justify-center"
            title="Learner Driver Board"
          >
            <span className="text-red-600 font-black text-[20px] sm:text-[22px] leading-none tracking-tight">
              L
            </span>
          </div>

          {/* Detour / Hazard Road Warning Icon */}
          <div
            className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-amber-400 text-amber-950 shadow-md flex items-center justify-center border-2 border-white"
            title="Detour Warning"
          >
            <span className="material-symbols-outlined text-[18px]">wrong_location</span>
          </div>
        </div>

        {/* 404 Milestone Road Sign */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[12px] font-semibold tracking-wide uppercase mb-3">
          <span className="material-symbols-outlined text-[16px]">alt_route</span>
          <span>Route 404 &bull; Wrong Turn</span>
        </div>

        {/* Headline */}
        <h1 className="text-[24px] sm:text-[28px] font-bold text-on-surface tracking-tight mb-2">
          Whoops! Took a Wrong Turn
        </h1>

        {/* Teaching-car thematic description */}
        <p className="text-[14px] sm:text-[15px] text-on-surface-variant leading-relaxed max-w-sm mb-6">
          Dual controls engaged! Your driving instructor hit the co-driver brake before you veered off the map.{" "}
          <span className="font-medium text-on-surface">"{location.pathname}"</span> is not on our training route.
        </p>

        {/* Instructor Advice Card */}
        <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/20 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-container">
            <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
            <span className="text-[12px] font-bold text-on-surface uppercase tracking-wider">
              Instructor Logbook Advice
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-[13px] text-on-surface-variant">
            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[15px]">traffic</span>
              </span>
              <span>
                <strong className="text-on-surface font-semibold">Dead-end road:</strong> The destination you entered does not exist or may have moved.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[15px]">settings_suggest</span>
              </span>
              <span>
                <strong className="text-on-surface font-semibold">Dual control safety:</strong> Your data and student records are completely safe and untouched.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[15px]">u_turn_left</span>
              </span>
              <span>
                <strong className="text-on-surface font-semibold">U-Turn permitted:</strong> Tap below to steer safely back to your main dashboard.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 h-11 rounded-xl bg-primary text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">navigation</span>
            <span>Back to Safe Route</span>
          </button>

          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate("/")
              }
            }}
            className="h-11 px-5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">undo</span>
            <span>Reverse</span>
          </button>
        </div>

        {/* Subtle footer caption */}
        <p className="text-[11px] text-outline mt-6 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">sports_motorsports</span>
          <span>DriveManager &bull; Driving School Operations</span>
        </p>
      </div>
    </div>
  )
}
