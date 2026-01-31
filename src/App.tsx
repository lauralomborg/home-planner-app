import { useEffect, useState } from 'react'
import { Header, Sidebar, PropertyPanel, ViewportContainer } from '@/components/layout'
import { Canvas2D } from '@/components/editor-2d/Canvas2D'
import { Scene3D } from '@/components/editor-3d/Scene3D'
import { useProjectStore, useActiveView, useFloorPlanStore } from '@/stores'
import { useKeyboardShortcuts } from '@/hooks/useUndo'

function App() {
  const { currentProject, createProject, restoreProjectMetadataOnly, _updateProjectList } = useProjectStore()
  const activeView = useActiveView()
  const [isHydrated, setIsHydrated] = useState(false)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  // Wait for store hydration before initializing
  useEffect(() => {
    // Check if both stores have finished hydrating from localStorage
    const unsubProject = useProjectStore.persist.onFinishHydration(() => {
      const unsubFloorPlan = useFloorPlanStore.persist.onFinishHydration(() => {
        setIsHydrated(true)
      })
      // If floor plan store already hydrated, call immediately
      if (useFloorPlanStore.persist.hasHydrated()) {
        setIsHydrated(true)
        unsubFloorPlan()
      }
    })
    // If project store already hydrated, check floor plan store
    if (useProjectStore.persist.hasHydrated()) {
      if (useFloorPlanStore.persist.hasHydrated()) {
        setIsHydrated(true)
      } else {
        const unsubFloorPlan = useFloorPlanStore.persist.onFinishHydration(() => {
          setIsHydrated(true)
        })
        return () => unsubFloorPlan()
      }
      unsubProject()
    }
    return () => unsubProject()
  }, [])

  // Initialize project only after hydration
  useEffect(() => {
    if (!isHydrated) return

    _updateProjectList()

    // Get the persisted currentProjectId from the project store
    const persistedProjectId = useProjectStore.getState().currentProjectId

    if (persistedProjectId && !currentProject) {
      // Restore project metadata only - floor plan already hydrated from its own store
      const restored = restoreProjectMetadataOnly(persistedProjectId)
      if (!restored) {
        // Project data was deleted, create a new one
        createProject('My First Home')
      }
    } else if (!currentProject) {
      createProject('My First Home')
    }
  }, [isHydrated])

  // Hide panels in 3D mode for immersive experience
  const showPanels = activeView === '2d'

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {showPanels && <Sidebar />}
        <ViewportContainer
          canvas2D={<Canvas2D />}
          scene3D={<Scene3D />}
        />
        {showPanels && <PropertyPanel />}
      </div>
    </div>
  )
}

export default App
