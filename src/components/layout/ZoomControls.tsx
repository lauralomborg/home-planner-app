import { useState, useRef, useEffect, useCallback } from 'react'
import { Minus, Plus, Maximize2 } from 'lucide-react'
import {
  useEditorStore,
  ZOOM_PRESETS,
  getNextZoomLevel,
  getPrevZoomLevel,
} from '@/stores/useEditorStore'
import { useFloorPlanStore } from '@/stores/useFloorPlanStore'

function ChevronDownIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

interface ZoomControlsProps {
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export function ZoomControls({ containerRef }: ZoomControlsProps) {
  const zoom2D = useEditorStore((state) => state.zoom2D)
  const setZoom2D = useEditorStore((state) => state.setZoom2D)
  const setPan2D = useEditorStore((state) => state.setPan2D)
  const floorPlan = useFloorPlanStore((state) => state.floorPlan)

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleZoomIn = useCallback(() => {
    setZoom2D(getNextZoomLevel(zoom2D))
  }, [zoom2D, setZoom2D])

  const handleZoomOut = useCallback(() => {
    setZoom2D(getPrevZoomLevel(zoom2D))
  }, [zoom2D, setZoom2D])

  const handlePresetSelect = useCallback(
    (preset: number) => {
      setZoom2D(preset)
      setIsDropdownOpen(false)
    },
    [setZoom2D]
  )

  const handleFitToContent = useCallback(() => {
    // Calculate bounding box of all content
    const rooms = floorPlan.rooms
    const furniture = floorPlan.furniture

    if (rooms.length === 0 && furniture.length === 0) {
      // Nothing to fit, reset to default
      setZoom2D(1)
      setPan2D({ x: 0, y: 0 })
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    // Include rooms in bounding box
    for (const room of rooms) {
      minX = Math.min(minX, room.bounds.x)
      minY = Math.min(minY, room.bounds.y)
      maxX = Math.max(maxX, room.bounds.x + room.bounds.width)
      maxY = Math.max(maxY, room.bounds.y + room.bounds.height)
    }

    // Include furniture in bounding box
    for (const f of furniture) {
      const halfWidth = f.dimensions.width / 2
      const halfDepth = f.dimensions.depth / 2
      minX = Math.min(minX, f.position.x - halfWidth)
      minY = Math.min(minY, f.position.y - halfDepth)
      maxX = Math.max(maxX, f.position.x + halfWidth)
      maxY = Math.max(maxY, f.position.y + halfDepth)
    }

    // If we still have no valid bounds, reset to default
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      setZoom2D(1)
      setPan2D({ x: 0, y: 0 })
      return
    }

    // Get viewport dimensions
    const viewportWidth = containerRef?.current?.clientWidth ?? window.innerWidth
    const viewportHeight = containerRef?.current?.clientHeight ?? window.innerHeight

    // Calculate content dimensions with 10% padding
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const padding = 0.1

    // Calculate zoom to fit with padding
    const zoomX = (viewportWidth * (1 - padding * 2)) / contentWidth
    const zoomY = (viewportHeight * (1 - padding * 2)) / contentHeight
    const newZoom = Math.min(zoomX, zoomY, 4) // Cap at 400%
    const clampedZoom = Math.max(0.02, newZoom) // Min 2%

    // Calculate center of content
    const contentCenterX = (minX + maxX) / 2
    const contentCenterY = (minY + maxY) / 2

    // Calculate pan to center content in viewport
    const newPanX = viewportWidth / 2 - contentCenterX * clampedZoom
    const newPanY = viewportHeight / 2 - contentCenterY * clampedZoom

    setZoom2D(clampedZoom)
    setPan2D({ x: newPanX, y: newPanY })
  }, [floorPlan.rooms, floorPlan.furniture, setZoom2D, setPan2D, containerRef])

  // Format zoom percentage for display
  const zoomPercentage = Math.round(zoom2D * 100)

  return (
    <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md border border-border/50 rounded-xl shadow-lg p-1">
      {/* Zoom out button */}
      <button
        onClick={handleZoomOut}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-all"
        title="Zoom out"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Zoom percentage dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium text-foreground/90 hover:bg-muted transition-all min-w-[60px] justify-center"
          title="Select zoom level"
        >
          <span>{zoomPercentage}%</span>
          <ChevronDownIcon />
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[80px] z-50">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetSelect(preset)}
                className={`w-full px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors ${
                  Math.abs(zoom2D - preset) < 0.01
                    ? 'text-emerald-600 font-medium'
                    : 'text-foreground/80'
                }`}
              >
                {Math.round(preset * 100)}%
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom in button */}
      <button
        onClick={handleZoomIn}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-all"
        title="Zoom in"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Fit to content button */}
      <button
        onClick={handleFitToContent}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-all"
        title="Fit to content"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  )
}
