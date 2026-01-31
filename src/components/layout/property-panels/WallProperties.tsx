import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import type { Wall } from '@/models'
import { PropertyRow, PropertySection } from './PropertyComponents'

export function WallProperties({ wall }: { wall: Wall }) {
  const updateWall = useFloorPlanStore((state) => state.updateWall)
  const removeWall = useFloorPlanStore((state) => state.removeWall)
  const clearSelection = useEditorStore((state) => state.clearSelection)

  const length = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) +
      Math.pow(wall.end.y - wall.start.y, 2)
  )

  const handleDelete = () => {
    removeWall(wall.id)
    clearSelection()
  }

  return (
    <div className="space-y-6">
      <PropertySection title="Dimensions">
        <PropertyRow label="Length">
          <Input
            value={`${(length / 100).toFixed(2)} m`}
            disabled
            className="h-8 text-sm bg-muted/30"
          />
        </PropertyRow>
        <PropertyRow label="Thickness">
          <Input
            type="number"
            value={wall.thickness}
            onChange={(e) =>
              updateWall(wall.id, { thickness: Number(e.target.value) })
            }
            className="h-8 text-sm"
          />
        </PropertyRow>
        <PropertyRow label="Height">
          <Input
            type="number"
            value={wall.height}
            onChange={(e) =>
              updateWall(wall.id, { height: Number(e.target.value) })
            }
            className="h-8 text-sm"
          />
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Position">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="font-medium mb-1">Start</div>
            <div>X: {(wall.start.x / 100).toFixed(2)}m</div>
            <div>Y: {(wall.start.y / 100).toFixed(2)}m</div>
          </div>
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="font-medium mb-1">End</div>
            <div>X: {(wall.end.x / 100).toFixed(2)}m</div>
            <div>Y: {(wall.end.y / 100).toFixed(2)}m</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/60">
          Drag the handles in 2D view to adjust
        </p>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Material">
        <div className="flex flex-wrap gap-2">
          {[
            { color: '#FFFFFF', name: 'White' },
            { color: '#F5F0E8', name: 'Cream' },
            { color: '#E8E0D5', name: 'Warm Gray' },
            { color: '#D4C4B0', name: 'Beige' },
          ].map(({ color, name }) => (
            <button
              key={color}
              className="w-10 h-10 rounded-lg border-2 hover:scale-105 transition-all"
              style={{
                backgroundColor: color,
                borderColor:
                  wall.material.colorOverride === color
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--border) / 0.4)',
              }}
              onClick={() =>
                updateWall(wall.id, {
                  material: { materialId: 'color', colorOverride: color },
                })
              }
              title={name}
            />
          ))}
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Wall
      </Button>
    </div>
  )
}
