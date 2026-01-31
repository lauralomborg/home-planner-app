import type { ReactNode } from 'react'

export function PropertyRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-muted-foreground whitespace-nowrap">
        {label}
      </label>
      <div className="flex-1 max-w-[140px]">{children}</div>
    </div>
  )
}

export function PropertySection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
