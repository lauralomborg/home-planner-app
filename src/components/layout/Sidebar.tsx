import {
  MousePointer2,
  PenLine,
  Square,
  Sofa,
  LayoutGrid,
  DoorOpen,
  Lamp,
  Ruler,
  Hand,
  Trash2,
  Grid3X3,
  Magnet,
  Armchair,
  Table,
  Archive,
  Bed,
  Flower,
  Refrigerator,
  Bath,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorStore, useActiveTool, useFloorPlanStore } from '@/stores'
import type { EditorTool, FurnitureCategory } from '@/models'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  getFurnitureByCategory,
  CATEGORY_LABELS,
} from '@/services/catalog'

interface ToolButtonProps {
  tool: EditorTool
  icon: React.ReactNode
  label: string
  shortcut?: string
}

function ToolButton({ tool, icon, label, shortcut }: ToolButtonProps) {
  const activeTool = useActiveTool()
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const isActive = activeTool === tool

  return (
    <button
      onClick={() => setActiveTool(tool)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
        'hover:bg-secondary/60',
        isActive
          ? 'bg-primary/15 text-primary font-medium ring-1 ring-primary/30'
          : 'text-muted-foreground hover:text-foreground'
      )}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      <span className={cn('w-5 h-5', isActive && 'text-primary')}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
          {shortcut}
        </span>
      )}
    </button>
  )
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
  shortcut,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  shortcut?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
        'hover:bg-secondary/60',
        active
          ? 'bg-secondary/80 text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span className="w-5 h-5">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
          {shortcut}
        </span>
      )}
    </button>
  )
}

// Wall materials catalog
const WALL_MATERIALS = {
  paints: [
    { id: 'white', name: 'Pure White', color: '#FFFFFF' },
    { id: 'warm-white', name: 'Warm White', color: '#FAF8F5' },
    { id: 'cream', name: 'Cream', color: '#F5F0E8' },
    { id: 'ivory', name: 'Ivory', color: '#FFFFF0' },
    { id: 'linen', name: 'Linen', color: '#FAF0E6' },
    { id: 'antique-white', name: 'Antique White', color: '#FAEBD7' },
    { id: 'beige', name: 'Beige', color: '#E8DCC8' },
    { id: 'sand', name: 'Sand', color: '#D4C4B0' },
    { id: 'taupe', name: 'Taupe', color: '#B8A089' },
    { id: 'greige', name: 'Greige', color: '#C4BCB0' },
    { id: 'light-gray', name: 'Light Gray', color: '#E5E5E5' },
    { id: 'warm-gray', name: 'Warm Gray', color: '#D9D4CD' },
    { id: 'cool-gray', name: 'Cool Gray', color: '#C8C8C8' },
    { id: 'charcoal', name: 'Charcoal', color: '#5C5650' },
    { id: 'sage', name: 'Sage', color: '#B8C5B4' },
    { id: 'olive', name: 'Olive', color: '#8B8B6E' },
    { id: 'dusty-blue', name: 'Dusty Blue', color: '#B0C4DE' },
    { id: 'slate-blue', name: 'Slate Blue', color: '#6A8EAE' },
    { id: 'blush', name: 'Blush', color: '#E8D0D0' },
    { id: 'terracotta', name: 'Terracotta', color: '#C4A484' },
  ],
  finishes: [
    { id: 'limewash-white', name: 'Limewash White', color: '#F8F6F2', texture: 'limewash' },
    { id: 'limewash-cream', name: 'Limewash Cream', color: '#EDE8DC', texture: 'limewash' },
    { id: 'limewash-gray', name: 'Limewash Gray', color: '#D5D0C8', texture: 'limewash' },
    { id: 'limewash-blush', name: 'Limewash Blush', color: '#E8D8D4', texture: 'limewash' },
    { id: 'exposed-brick', name: 'Exposed Brick', color: '#9B4E3C', texture: 'brick' },
    { id: 'whitewashed-brick', name: 'Whitewashed Brick', color: '#E8E0D8', texture: 'brick' },
    { id: 'concrete', name: 'Concrete', color: '#A0A0A0', texture: 'concrete' },
    { id: 'plaster', name: 'Textured Plaster', color: '#E8E4DC', texture: 'plaster' },
  ],
  accent: [
    { id: 'navy', name: 'Navy', color: '#2C3E50' },
    { id: 'forest', name: 'Forest Green', color: '#2D4A3E' },
    { id: 'burgundy', name: 'Burgundy', color: '#6B2D3C' },
    { id: 'mustard', name: 'Mustard', color: '#C4A35A' },
    { id: 'rust', name: 'Rust', color: '#A45A3C' },
    { id: 'black', name: 'Black', color: '#1A1A1A' },
  ],
}

type MaterialCategoryTab = 'paints' | 'finishes' | 'accent'

const FURNITURE_CATEGORIES: FurnitureCategory[] = [
  'seating',
  'tables',
  'beds',
  'storage',
  'lighting',
  'decor',
  'appliances',
  'bathroom',
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

function FurnitureCatalogPanel() {
  const [selectedCategory, setSelectedCategory] = useState<FurnitureCategory>('seating')
  const { setSelectedFurniture, setActiveTool, selectedFurnitureId } = useEditorStore()

  const items = getFurnitureByCategory(selectedCategory)

  const handleSelectFurniture = (catalogItemId: string) => {
    // Set the selected furniture and switch to furniture tool for click-to-place
    setSelectedFurniture(catalogItemId)
    setActiveTool('furniture')
  }

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {FURNITURE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all',
              selectedCategory === cat
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            )}
            title={CATEGORY_LABELS[cat]}
          >
            {CATEGORY_ICON_MAP[cat]}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const isSelected = selectedFurnitureId === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleSelectFurniture(item.id)}
              className={cn(
                "p-3 border rounded-xl hover:bg-secondary/50 transition-all text-center group",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/40 hover:border-border"
              )}
            >
              <div className={cn(
                "w-full aspect-square mb-2 rounded-lg flex items-center justify-center transition-colors",
                isSelected ? "bg-primary/10" : "bg-muted/30 group-hover:bg-muted/50"
              )}>
                {CATEGORY_ICON_MAP[item.category]}
              </div>
              <div className={cn(
                "text-xs truncate",
                isSelected ? "text-primary font-medium" : "text-muted-foreground"
              )} title={item.name}>
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

      {selectedFurnitureId && (
        <p className="text-xs text-primary/80 text-center py-2 mt-2 bg-primary/5 rounded-lg">
          Click on canvas to place
        </p>
      )}
    </div>
  )
}

export function Sidebar() {
  const { showGrid, snapToGrid, toggleGrid, toggleSnapToGrid, selectedIds, clearSelection } =
    useEditorStore()
  const { removeSelected, updateWall, floorPlan } = useFloorPlanStore()
  const [materialCategory, setMaterialCategory] = useState<MaterialCategoryTab>('paints')
  const activeTool = useActiveTool()

  const handleDelete = () => {
    removeSelected(selectedIds)
    clearSelection()
  }

  // Apply material to selected wall
  const applyMaterial = (color: string) => {
    selectedIds.forEach((id) => {
      const wall = floorPlan.walls.find((w) => w.id === id)
      if (wall) {
        updateWall(id, {
          material: { materialId: 'color', colorOverride: color },
        })
      }
    })
  }

  const selectedWalls = floorPlan.walls.filter((w) => selectedIds.includes(w.id))

  return (
    <aside className="w-60 border-r border-border/50 bg-card/50 flex flex-col">
      {/* Tools Section */}
      <div className="p-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3 px-1">
          Tools
        </h3>
        <div className="space-y-1">
          <ToolButton
            tool="select"
            icon={<MousePointer2 className="w-full h-full" />}
            label="Select"
            shortcut="V"
          />
          <ToolButton
            tool="wall"
            icon={<PenLine className="w-full h-full" />}
            label="Draw Wall"
            shortcut="W"
          />
          <ToolButton
            tool="room"
            icon={<Square className="w-full h-full" />}
            label="Room"
            shortcut="R"
          />
          <ToolButton
            tool="furniture"
            icon={<Sofa className="w-full h-full" />}
            label="Furniture"
            shortcut="F"
          />
        </div>

        <div className="my-4" />

        <div className="space-y-1">
          <ToolButton
            tool="window"
            icon={<LayoutGrid className="w-full h-full" />}
            label="Window"
          />
          <ToolButton
            tool="door"
            icon={<DoorOpen className="w-full h-full" />}
            label="Door"
            shortcut="D"
          />
          <ToolButton
            tool="light"
            icon={<Lamp className="w-full h-full" />}
            label="Lighting"
            shortcut="L"
          />
        </div>

        <div className="my-4" />

        <div className="space-y-1">
          <ToolButton
            tool="measure"
            icon={<Ruler className="w-full h-full" />}
            label="Measure"
            shortcut="M"
          />
          <ToolButton
            tool="pan"
            icon={<Hand className="w-full h-full" />}
            label="Pan View"
            shortcut="H"
          />
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* View Options */}
      <div className="p-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3 px-1">
          View
        </h3>
        <div className="space-y-1">
          <ToggleButton
            active={showGrid}
            onClick={toggleGrid}
            icon={<Grid3X3 className="w-full h-full" />}
            label="Show Grid"
            shortcut="G"
          />
          <ToggleButton
            active={snapToGrid}
            onClick={toggleSnapToGrid}
            icon={<Magnet className="w-full h-full" />}
            label="Snap to Grid"
            shortcut="S"
          />
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* Selection Actions */}
      {selectedIds.length > 0 && (
        <>
          <div className="p-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3 px-1">
              Selection
            </h3>
            <p className="text-sm text-muted-foreground mb-3 px-1">
              {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete
              <span className="ml-auto text-[10px] font-medium opacity-60">⌫</span>
            </Button>
          </div>
          <Separator className="bg-border/40" />
        </>
      )}

      {/* Materials/Furniture Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTool === 'furniture' ? (
          /* Furniture Catalog - shown when furniture tool is active */
          <>
            <div className="p-4 pb-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-1 mb-3">
                Furniture Catalog
              </h3>
            </div>
            <ScrollArea className="flex-1 px-4 pb-4">
              <FurnitureCatalogPanel />
            </ScrollArea>
          </>
        ) : (
          /* Wall Materials - shown for other tools */
          <>
            <div className="p-4 pb-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-1 mb-3">
                Wall Materials
              </h3>

              {/* Material Category Tabs */}
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg mb-3">
                {(['paints', 'finishes', 'accent'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMaterialCategory(cat)}
                    className={cn(
                      'flex-1 text-xs py-1.5 rounded-md transition-all capitalize',
                      materialCategory === cat
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="grid grid-cols-4 gap-1.5">
                {WALL_MATERIALS[materialCategory].map((material) => (
                  <button
                    key={material.id}
                    onClick={() => applyMaterial(material.color)}
                    className={cn(
                      'w-full aspect-square rounded-lg border-2 hover:scale-105 transition-all relative group',
                      selectedWalls.some((w) => w.material.colorOverride === material.color)
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border/40 hover:border-border'
                    )}
                    style={{ backgroundColor: material.color }}
                    title={material.name}
                  >
                    {/* Texture indicator */}
                    {'texture' in material && (
                      <div className="absolute inset-0 opacity-30 rounded-lg overflow-hidden">
                        {material.texture === 'limewash' && (
                          <div className="w-full h-full bg-gradient-to-br from-transparent via-white/20 to-transparent" />
                        )}
                        {material.texture === 'brick' && (
                          <div className="w-full h-full"
                            style={{
                              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)',
                            }}
                          />
                        )}
                        {material.texture === 'concrete' && (
                          <div className="w-full h-full bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[length:4px_4px]" />
                        )}
                      </div>
                    )}

                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {material.name}
                    </div>
                  </button>
                ))}
              </div>

              {selectedWalls.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center mt-4">
                  Select a wall to apply materials
                </p>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </aside>
  )
}
