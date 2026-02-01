import { useCallback } from 'react'
import { Monitor, Box } from 'lucide-react'
import { useEditorStore, useActiveView } from '@/stores'
import type { ViewMode } from '@/models'
import { cn } from '@/lib/utils'
import { CameraControls3D } from '@/components/editor-3d'
import { FloatingToolbar } from './FloatingToolbar'

interface ViewportContainerProps {
  canvas2D: React.ReactNode
  scene3D: React.ReactNode
}

export function ViewportContainer({ canvas2D, scene3D }: ViewportContainerProps) {
  const activeView = useActiveView()
  const setActiveView = useEditorStore((state) => state.setActiveView)
  const setCameraHeightCommand = useEditorStore((state) => state.setCameraHeightCommand)

  const handleMoveUp = useCallback(() => {
    setCameraHeightCommand('up')
    // Clear after a short delay so it acts as a trigger
    setTimeout(() => setCameraHeightCommand(null), 50)
  }, [setCameraHeightCommand])

  const handleMoveDown = useCallback(() => {
    setCameraHeightCommand('down')
    setTimeout(() => setCameraHeightCommand(null), 50)
  }, [setCameraHeightCommand])

  const viewButtons: { mode: ViewMode; icon: React.ReactNode; label: string }[] =
    [
      { mode: '2d', icon: <Monitor className="w-4 h-4" />, label: '2D' },
      { mode: '3d', icon: <Box className="w-4 h-4" />, label: '3D' },
    ]

  return (
    <div className="flex-1 flex flex-col bg-background/50">
      {/* View Mode Toggle */}
      <div className="h-12 border-b border-border/40 bg-card/30 px-4 flex items-center">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {viewButtons.map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setActiveView(mode)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all',
                activeView === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {icon}
              <span className="hidden sm:inline text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <span className="text-xs text-muted-foreground/60">
          {activeView === '2d' && 'Floor plan view'}
          {activeView === '3d' && '3D walkthrough'}
        </span>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* 2D View */}
        {activeView === '2d' && (
          <div className="relative overflow-hidden flex-1">
            <div className="absolute top-3 left-3 z-10">
              <span className="text-[10px] font-medium bg-background/90 backdrop-blur-sm text-muted-foreground px-2.5 py-1 rounded-md border border-border/30 shadow-sm">
                2D Floor Plan
              </span>
            </div>
            {canvas2D}
            <FloatingToolbar />
          </div>
        )}

        {/* 3D View */}
        {activeView === '3d' && (
          <div className="relative overflow-hidden flex-1">
            <div className="absolute top-3 left-3 z-10">
              <span className="text-[10px] font-medium bg-background/90 backdrop-blur-sm text-muted-foreground px-2.5 py-1 rounded-md border border-border/30 shadow-sm">
                3D View
              </span>
            </div>
            {scene3D}
            {/* Camera mode controls */}
            <CameraControls3D
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          </div>
        )}
      </div>
    </div>
  )
}
