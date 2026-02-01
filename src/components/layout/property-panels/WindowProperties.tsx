import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useEditorStore, useFloorPlanStore } from '@/stores'
import type { WindowInstance, WindowType } from '@/models'
import { PropertyRow, PropertySection } from './PropertyComponents'

const WINDOW_TYPES: { value: WindowType; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'sliding', label: 'Sliding' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'bay', label: 'Bay' },
]

export function WindowProperties({ window }: { window: WindowInstance }) {
  const { updateWindow, removeWindow } = useFloorPlanStore()
  const clearSelection = useEditorStore((state) => state.clearSelection)

  const handleDelete = () => {
    removeWindow(window.id)
    clearSelection()
  }

  return (
    <div className="space-y-6">
      <PropertySection title="Position">
        <PropertyRow label="Along wall">
          <Input
            type="number"
            value={Math.round(window.position)}
            onChange={(e) => updateWindow(window.id, { position: Number(e.target.value) })}
            className="h-8 text-sm"
          />
        </PropertyRow>
        <PropertyRow label="Height from floor">
          <Input
            type="number"
            value={Math.round(window.elevationFromFloor)}
            onChange={(e) =>
              updateWindow(window.id, { elevationFromFloor: Number(e.target.value) })
            }
            className="h-8 text-sm"
            min={0}
            max={200}
          />
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Size (cm)">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Width</label>
            <Input
              type="number"
              value={Math.round(window.width)}
              onChange={(e) =>
                updateWindow(window.id, { width: Number(e.target.value) })
              }
              className="h-8 text-sm"
              min={30}
              max={300}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Height</label>
            <Input
              type="number"
              value={Math.round(window.height)}
              onChange={(e) =>
                updateWindow(window.id, { height: Number(e.target.value) })
              }
              className="h-8 text-sm"
              min={30}
              max={250}
            />
          </div>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Window Settings">
        <PropertyRow label="Type">
          <select
            value={window.type}
            onChange={(e) =>
              updateWindow(window.id, { type: e.target.value as WindowType })
            }
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {WINDOW_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </PropertyRow>
      </PropertySection>

      <Separator className="bg-border/40" />

      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Window
      </Button>
    </div>
  )
}
