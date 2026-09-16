import type { SVGProps } from 'react'

// Inline SVG icon set for the booking portal. Drawn on one 24px grid at a
// single 1.75 stroke so the portal never depends on the Material Symbols web
// font — which flashes raw ligature text ("directions_car") while it loads.

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number
}

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
}

export function IconCar({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="M5.4 12.6 7 8.5A2.5 2.5 0 0 1 9.33 6.9h5.34A2.5 2.5 0 0 1 17 8.5l1.6 4.1" />
      <rect x="2.8" y="12.6" width="18.4" height="5.2" rx="1.8" />
      <circle cx="7.6" cy="17.8" r="1.7" />
      <circle cx="16.4" cy="17.8" r="1.7" />
      <path d="M5.4 15.2h2M16.6 15.2h2" />
    </svg>
  )
}

export function IconSearch({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.2 20.2-3.5-3.5" />
    </svg>
  )
}

export function IconCalendar({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  )
}

export function IconClock({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  )
}

export function IconUser({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6" />
    </svg>
  )
}

export function IconStar({ size = 20, filled = false, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <svg
      {...svgProps(size)}
      fill={filled ? 'currentColor' : 'none'}
      strokeWidth={filled ? 0 : 1.75}
      {...rest}
    >
      <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z" />
    </svg>
  )
}

export function IconChevronRight({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  )
}

export function IconArrowLeft({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="M19 12H5M11 5.5 4.5 12l6.5 6.5" />
    </svg>
  )
}

export function IconArrowRight({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="M5 12h14M13 5.5 19.5 12 13 18.5" />
    </svg>
  )
}

export function IconCheck({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  )
}

export function IconClose({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function IconPhone({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="M8.2 4.5H5.6A1.6 1.6 0 0 0 4 6.2c0 7.6 6.2 13.8 13.8 13.8a1.6 1.6 0 0 0 1.7-1.6v-2.6l-4-1.4-1.8 2.2a12.4 12.4 0 0 1-5.3-5.3l2.2-1.8z" />
    </svg>
  )
}

export function IconTicket({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="M3.5 9.2V7.3a1.8 1.8 0 0 1 1.8-1.8h13.4a1.8 1.8 0 0 1 1.8 1.8v1.9a2.8 2.8 0 0 0 0 5.6v1.9a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8v-1.9a2.8 2.8 0 0 0 0-5.6Z" />
      <path d="M14 9v6" />
    </svg>
  )
}

export function IconLogout({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="M14.5 4.5h3.2a1.8 1.8 0 0 1 1.8 1.8v11.4a1.8 1.8 0 0 1-1.8 1.8h-3.2" />
      <path d="M10 8.5 13.5 12 10 15.5M13 12H4.5" />
    </svg>
  )
}

export function IconLogin({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="M9.5 4.5H6.3a1.8 1.8 0 0 0-1.8 1.8v11.4a1.8 1.8 0 0 0 1.8 1.8h3.2" />
      <path d="M15 8.5 18.5 12 15 15.5M18 12H9.5" />
    </svg>
  )
}

export function IconAlert({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.6M12 15.9v.1" />
    </svg>
  )
}

export function IconMapPin({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...svgProps(size)} {...rest}>
      <path d="M19 10.4c0 4.9-7 10.1-7 10.1s-7-5.2-7-10.1a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </svg>
  )
}
