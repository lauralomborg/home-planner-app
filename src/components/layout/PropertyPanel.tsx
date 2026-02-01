import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorStore, useFloorPlanStore } from '@/stores'

// Import extracted components
import {
  WallProperties,
  RoomProperties,
  FurnitureProperties,
  DoorProperties,
  WindowProperties,
  MultipleSelection,
  NoSelection,
  FurnitureCatalog,
} from './property-panels'

export function PropertyPanel() {
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const activeTool = useEditorStore((state) => state.activeTool)
  const floorPlan = useFloorPlanStore((state) => state.floorPlan)

  const selectedWalls = floorPlan.walls.filter((w) => selectedIds.includes(w.id))
  const selectedRooms = floorPlan.rooms.filter((r) => selectedIds.includes(r.id))
  const selectedFurniture = floorPlan.furniture.filter((f) =>
    selectedIds.includes(f.id)
  )
  const selectedDoors = floorPlan.doors.filter((d) => selectedIds.includes(d.id))
  const selectedWindows = floorPlan.windows.filter((w) => selectedIds.includes(w.id))

  const totalSelected =
    selectedWalls.length + selectedRooms.length + selectedFurniture.length +
    selectedDoors.length + selectedWindows.length

  // Show furniture catalog when furniture tool is active and nothing selected
  const showFurnitureCatalog = activeTool === 'furniture' && totalSelected === 0

  // Determine what type is selected for the header
  const getSelectionType = () => {
    if (showFurnitureCatalog) return 'Furniture Catalog'
    if (selectedWalls.length === 1) return 'Wall'
    if (selectedRooms.length === 1) return 'Room'
    if (selectedFurniture.length === 1) return 'Furniture'
    if (selectedDoors.length === 1) return 'Door'
    if (selectedWindows.length === 1) return 'Window'
    return 'Properties'
  }

  return (
    <aside className="w-72 border-l border-border/50 bg-card/50 flex flex-col">
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
        <h2 className="font-medium text-sm">{getSelectionType()}</h2>
        {totalSelected > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => useEditorStore.getState().clearSelection()}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {showFurnitureCatalog ? (
          <FurnitureCatalog />
        ) : (
          <>
            {totalSelected === 0 && <NoSelection />}

            {totalSelected === 1 && (
              <>
                {selectedWalls.length === 1 && (
                  <WallProperties wall={selectedWalls[0]} />
                )}
                {selectedRooms.length === 1 && (
                  <RoomProperties room={selectedRooms[0]} />
                )}
                {selectedFurniture.length === 1 && (
                  <FurnitureProperties furniture={selectedFurniture[0]} />
                )}
                {selectedDoors.length === 1 && (
                  <DoorProperties door={selectedDoors[0]} />
                )}
                {selectedWindows.length === 1 && (
                  <WindowProperties window={selectedWindows[0]} />
                )}
              </>
            )}

            {totalSelected > 1 && <MultipleSelection count={totalSelected} />}
          </>
        )}
      </ScrollArea>
    </aside>
  )
}
