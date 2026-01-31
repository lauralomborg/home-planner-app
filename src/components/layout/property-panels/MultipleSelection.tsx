import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditorStore, useFloorPlanStore } from '@/stores'

export function MultipleSelection({ count }: { count: number }) {
  const { removeSelected } = useFloorPlanStore()
  const { selectedIds, clearSelection } = useEditorStore()

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-xl text-center">
        <div className="text-2xl font-medium">{count}</div>
        <div className="text-sm text-muted-foreground">items selected</div>
      </div>
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={clearSelection}
        >
          Clear Selection
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          onClick={() => {
            removeSelected(selectedIds)
            clearSelection()
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete All
        </Button>
      </div>
    </div>
  )
}
