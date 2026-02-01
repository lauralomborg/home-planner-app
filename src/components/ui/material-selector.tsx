import { cn } from '@/lib/utils'

interface MaterialOption {
  id: string
  color: string
  name: string
}

interface MaterialSelectorProps {
  options: MaterialOption[]
  selectedColor?: string
  onSelect: (color: string) => void
  className?: string
}

export function MaterialSelector({
  options,
  selectedColor,
  onSelect,
  className,
}: MaterialSelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map(({ id, color, name }) => (
        <button
          key={id}
          className={cn(
            'w-10 h-10 rounded-lg border-2 hover:scale-105 transition-all',
            selectedColor === color
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border/40 hover:border-border'
          )}
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
          title={name}
        />
      ))}
    </div>
  )
}

// Predefined material options
export const FLOOR_MATERIALS: MaterialOption[] = [
  { id: 'light-wood', color: '#D4C4B0', name: 'Light Wood' },
  { id: 'oak', color: '#B8A089', name: 'Oak' },
  { id: 'walnut', color: '#8B7355', name: 'Walnut' },
  { id: 'dark', color: '#5C5650', name: 'Dark' },
]

export const WALL_PAINTS: MaterialOption[] = [
  { id: 'white', color: '#FFFFFF', name: 'Pure White' },
  { id: 'warm-white', color: '#FAF8F5', name: 'Warm White' },
  { id: 'cream', color: '#F5F0E8', name: 'Cream' },
  { id: 'beige', color: '#E8DCC8', name: 'Beige' },
  { id: 'light-gray', color: '#E5E5E5', name: 'Light Gray' },
  { id: 'warm-gray', color: '#D9D4CD', name: 'Warm Gray' },
  { id: 'sage', color: '#B8C5B4', name: 'Sage' },
  { id: 'dusty-blue', color: '#B0C4DE', name: 'Dusty Blue' },
]
