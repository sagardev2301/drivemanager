import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toLocalDateString } from '../lib/dateUtils'

interface DatePickerModalProps {
  isOpen: boolean
  selectedDate: string // YYYY-MM-DD
  onSelectDate: (date: string) => void
  onClose: () => void
}

function parseDateParts(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function DatePickerModal({
  isOpen,
  selectedDate,
  onSelectDate,
  onClose,
}: DatePickerModalProps) {
  const initial = parseDateParts(selectedDate || toLocalDateString(new Date()))
  const [viewYear, setViewYear] = useState(initial.year || new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.month ?? new Date().getMonth())
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate)

  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate)
    const parts = parseDateParts(selectedDate)
    if (!isNaN(parts.year) && !isNaN(parts.month)) {
      setViewYear(parts.year)
      setViewMonth(parts.month)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const todayStr = toLocalDateString(new Date())

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function handleSelect(year: number, month: number, day: number) {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onSelectDate(formatted)
    onClose()
  }

  function handleQuickDate(offset: number) {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    onSelectDate(toLocalDateString(d))
    onClose()
  }

  // Calendar grid calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sun
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const prevMonthYear = viewMonth === 0 ? viewYear - 1 : viewYear
  const prevMonthIndex = viewMonth === 0 ? 11 : viewMonth - 1
  const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear
  const nextMonthIndex = viewMonth === 11 ? 0 : viewMonth + 1

  const cells: { year: number; month: number; day: number; isCurrentMonth: boolean }[] = []

  // Leading days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({
      year: prevMonthYear,
      month: prevMonthIndex,
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
    })
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      year: viewYear,
      month: viewMonth,
      day: d,
      isCurrentMonth: true,
    })
  }

  // Trailing days from next month to complete the row
  const remainder = cells.length % 7
  if (remainder > 0) {
    const fillCount = 7 - remainder
    for (let d = 1; d <= fillCount; d++) {
      cells.push({
        year: nextMonthYear,
        month: nextMonthIndex,
        day: d,
        isCurrentMonth: false,
      })
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3 transition-transform animate-in fade-in duration-200"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="flex justify-center pt-1 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-surface-container-high" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-[17px] font-bold text-on-surface">Select Date</h3>
            <p className="text-[12px] text-on-surface-variant">View classes &amp; attendance</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
            aria-label="Close date picker"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Quick Shortcuts */}
        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => handleQuickDate(-1)}
            className="flex-1 py-1.5 px-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-[12px] font-semibold text-center transition-all active:scale-95"
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(0)}
            className="flex-1 py-1.5 px-2 rounded-xl bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed font-semibold text-[12px] text-center transition-all active:scale-95"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleQuickDate(1)}
            className="flex-1 py-1.5 px-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-[12px] font-semibold text-center transition-all active:scale-95"
          >
            Tomorrow
          </button>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center justify-between px-1 pt-1">
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95 transition-all"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          <span className="text-[14px] font-bold text-on-surface">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-95 transition-all"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-[11px] font-semibold text-on-surface-variant py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
            const isSelected = cellDateStr === selectedDate
            const isToday = cellDateStr === todayStr

            let cellClass = 'h-9 w-9 mx-auto flex items-center justify-center rounded-xl text-[13px] font-medium transition-all '
            if (isSelected) {
              cellClass += 'bg-primary text-on-primary font-bold shadow-sm scale-105'
            } else if (isToday) {
              cellClass += 'border-2 border-primary text-primary font-semibold hover:bg-primary-fixed/30 active:scale-95'
            } else if (cell.isCurrentMonth) {
              cellClass += 'text-on-surface hover:bg-surface-container-low active:scale-95'
            } else {
              cellClass += 'text-outline/40 hover:bg-surface-container-lowest'
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(cell.year, cell.month, cell.day)}
                className={cellClass}
              >
                {cell.day}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
