import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useFloorPlanStore } from '@/stores'
import type { RoomConnection } from '@/models'
import { PropertyRow, PropertySection } from './PropertyComponents'
import { Link2, Unlink } from 'lucide-react'

/**
 * Computes the overlap length between two rooms based on their current positions.
 */
function computeOverlapLength(
  connection: RoomConnection,
  room1Bounds: { x: number; y: number; width: number; height: number } | undefined,
  room2Bounds: { x: number; y: number; width: number; height: number } | undefined
): number {
  if (!room1Bounds || !room2Bounds) return 0

  if (connection.axis === 'horizontal') {
    // Top/bottom connection - overlap is along the X axis
    const overlapStart = Math.max(room1Bounds.x, room2Bounds.x)
    const overlapEnd = Math.min(
      room1Bounds.x + room1Bounds.width,
      room2Bounds.x + room2Bounds.width
    )
    return Math.max(0, overlapEnd - overlapStart)
  } else {
    // Left/right connection - overlap is along the Y axis
    const overlapStart = Math.max(room1Bounds.y, room2Bounds.y)
    const overlapEnd = Math.min(
      room1Bounds.y + room1Bounds.height,
      room2Bounds.y + room2Bounds.height
    )
    return Math.max(0, overlapEnd - overlapStart)
  }
}

export function ConnectionProperties({ connection }: { connection: RoomConnection }) {
  const { updateRoomConnection, removeRoomConnection, getRoomById } = useFloorPlanStore()

  const room1 = getRoomById(connection.roomIds[0])
  const room2 = getRoomById(connection.roomIds[1])

  // Compute edge length dynamically from current room positions
  const edgeLength = computeOverlapLength(connection, room1?.bounds, room2?.bounds)

  return (
    <div className="space-y-6">
      <PropertySection title="Connection">
        <PropertyRow label="Type">
          <select
            value={connection.type}
            onChange={(e) =>
              updateRoomConnection(connection.id, {
                type: e.target.value as 'wall' | 'direct',
              })
            }
            className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="wall">With Wall</option>
            <option value="direct">Direct (No Wall)</option>
          </select>
        </PropertyRow>
        <p className="text-xs text-muted-foreground mt-2">
          {connection.type === 'wall'
            ? 'A shared wall separates the rooms. Each room keeps its portion of the wall where they don\'t overlap.'
            : 'The rooms connect directly with no wall between them where they touch.'}
        </p>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Connected Rooms">
        <div className="space-y-2">
          <div className="p-3 bg-muted/30 rounded-lg flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{room1?.name || 'Unknown Room'}</span>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{room2?.name || 'Unknown Room'}</span>
          </div>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <PropertySection title="Shared Edge">
        <div className="p-3 bg-muted/30 rounded-lg text-center">
          <div className="text-lg font-medium">{(edgeLength / 100).toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">meters</div>
        </div>
      </PropertySection>

      <Separator className="bg-border/40" />

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => removeRoomConnection(connection.id)}
      >
        <Unlink className="w-4 h-4 mr-2" />
        Remove Connection
      </Button>
    </div>
  )
}
