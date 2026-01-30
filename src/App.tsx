import { useEffect } from 'react'
import { Header, Sidebar, PropertyPanel, ViewportContainer } from '@/components/layout'
import { Canvas2D } from '@/components/editor-2d/Canvas2D'
import { Scene3D } from '@/components/editor-3d/Scene3D'
import { useProjectStore } from '@/stores'
import { useKeyboardShortcuts } from '@/hooks/useUndo'

function App() {
  const { currentProject, createProject, _updateProjectList } = useProjectStore()

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  // Initialize project on mount
  useEffect(() => {
    _updateProjectList()
    if (!currentProject) {
      createProject('My First Home')
    }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <ViewportContainer
          canvas2D={<Canvas2D />}
          scene3D={<Scene3D />}
        />
        <PropertyPanel />
      </div>
    </div>
  )
}

export default App
