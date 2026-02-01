import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Consistent spacing values
export const PROPERTY_SPACING = {
  sectionGap: 'space-y-6',
  itemGap: 'space-y-3',
  gridGap: 'gap-2',
}

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

interface PropertyInputProps {
  type?: 'text' | 'number'
  value: string | number
  onChange: (value: string) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function PropertyInput({
  type = 'text',
  value,
  onChange,
  min,
  max,
  step,
  className,
}: PropertyInputProps) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      className={cn('h-8 text-sm', className)}
    />
  )
}

interface DeleteButtonProps {
  onClick: () => void
  label?: string
}

export function DeleteButton({ onClick, label = 'Delete' }: DeleteButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
    >
      <Trash2 className="w-4 h-4" />
      {label}
      <span className="ml-auto text-[10px] font-medium opacity-60"></span>
    </Button>
  )
}
