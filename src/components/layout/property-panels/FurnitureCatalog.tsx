import { useState } from 'react'
import {
  Armchair,
  Table,
  Archive,
  Bed,
  Lamp,
  Flower,
  Refrigerator,
  Bath,
  Sun,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/stores'
import type { FurnitureCategory } from '@/models'
import { getFurnitureByCategory, CATEGORY_LABELS } from '@/services/catalog'
import { cn } from '@/lib/utils'

const FURNITURE_CATEGORIES: FurnitureCategory[] = [
  'seating',
  'tables',
  'beds',
  'storage',
  'lighting',
  'decor',
  'appliances',
  'bathroom',
  'outdoor',
]

const CATEGORY_ICON_MAP: Record<FurnitureCategory, React.ReactNode> = {
  seating: <Armchair className="w-4 h-4" />,
  tables: <Table className="w-4 h-4" />,
  storage: <Archive className="w-4 h-4" />,
  beds: <Bed className="w-4 h-4" />,
  lighting: <Lamp className="w-4 h-4" />,
  decor: <Flower className="w-4 h-4" />,
  appliances: <Refrigerator className="w-4 h-4" />,
  bathroom: <Bath className="w-4 h-4" />,
  outdoor: <Sun className="w-4 h-4" />,
}

export function FurnitureCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<FurnitureCategory>('seating')
  const { setSelectedFurniture, selectedFurnitureId } = useEditorStore()

  const items = getFurnitureByCategory(selectedCategory)

  const handleSelectFurniture = (catalogItemId: string) => {
    setSelectedFurniture(catalogItemId)
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div>
        <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
          Categories
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {FURNITURE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all',
                selectedCategory === cat
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              )}
              title={CATEGORY_LABELS[cat]}
            >
              {CATEGORY_ICON_MAP[cat]}
              <span className="hidden sm:inline">{CATEGORY_LABELS[cat]}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* Furniture items grid */}
      <div>
        <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
          {CATEGORY_LABELS[selectedCategory]}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const isSelected = selectedFurnitureId === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleSelectFurniture(item.id)}
                className={cn(
                  'p-3 border rounded-xl hover:bg-secondary/50 transition-all text-center group',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border/40 hover:border-border'
                )}
              >
                <div
                  className={cn(
                    'w-full aspect-square mb-2 rounded-lg flex items-center justify-center transition-colors',
                    isSelected ? 'bg-primary/10' : 'bg-muted/30 group-hover:bg-muted/50'
                  )}
                >
                  {CATEGORY_ICON_MAP[item.category]}
                </div>
                <div
                  className={cn(
                    'text-xs truncate',
                    isSelected ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}
                  title={item.name}
                >
                  {item.name}
                </div>
                <div className="text-[10px] text-muted-foreground/50">
                  {item.defaultDimensions.width}x{item.defaultDimensions.depth}cm
                </div>
              </button>
            )
          })}
        </div>

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground/60 text-center py-4">
            No items in this category
          </p>
        )}
      </div>

      {/* Placement hint */}
      {selectedFurnitureId && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-xs text-primary/80 text-center">
            Click on the 2D canvas to place furniture
          </p>
        </div>
      )}
    </div>
  )
}
