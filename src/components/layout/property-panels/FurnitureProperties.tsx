import { Trash2, Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import type { FurnitureInstance } from '@/models'
import { PropertyRow, PropertySection } from './PropertyComponents'

export function FurnitureProperties({ furniture }: { furniture: FurnitureInstance }) {
  const { moveFurniture, rotateFurniture, resizeFurniture, toggleFurnitureLock, removeFurniture } =
    useFloorPlanStore()
  const clearSelection = useEditorStore((state) => state.clearSelection)

  const handleDelete = () => {
    removeFurniture(furniture.id)
    clearSelection()
  }

  return (
    <div className="space-y-6">
      <PropertySection title="Position">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">X</label>
            <Input
              type="number"
              value={Math.round(furniture.position.x)}
              onChange={(e) =>
                moveFurniture(furniture.id, {
                  ...furniture.position,
                  x: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Y</label>
            <Input
              type="number"
              value={Math.round(furniture.position.y)}
              onChange={(e) =>
                moveFurniture(furniture.id, {
                  ...furniture.position,
                  y: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
        <PropertyRow label="Rotation">
          <Input
            type="number"
            value={furniture.rotation}
            onChange={(e) =>
              rotateFurniture(furniture.id, Number(e.target.value))
            }
            className="h-8 text-sm"
            min={0}
            max={360}
            step={15}
          />
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Size (cm)">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Width</label>
            <Input
              type="number"
              value={Math.round(furniture.dimensions.width)}
              onChange={(e) =>
                resizeFurniture(furniture.id, {
                  ...furniture.dimensions,
                  width: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Depth</label>
            <Input
              type="number"
              value={Math.round(furniture.dimensions.depth)}
              onChange={(e) =>
                resizeFurniture(furniture.id, {
                  ...furniture.dimensions,
                  depth: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Height</label>
            <Input
              type="number"
              value={Math.round(furniture.dimensions.height)}
              onChange={(e) =>
                resizeFurniture(furniture.id, {
                  ...furniture.dimensions,
                  height: Number(e.target.value),
                })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleFurnitureLock(furniture.id)}
          className="flex-1"
        >
          {furniture.locked ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4 mr-2" />
              Unlocked
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
