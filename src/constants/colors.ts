// Shared Nordic color palette used across the app
export const NORDIC_COLORS = {
  // Canvas/Background
  canvas: '#FAF9F7',
  ground: '#FAF9F7',

  // Grid
  gridLine: '#E8E4DF',
  gridLineMajor: '#D9D4CD',

  // Walls
  wall: '#5C5650',
  wall3D: '#F5F0E8',
  wallSelected: '#5B8A72',
  wallHover: '#7BA393',
  wallPreview: '#5B8A72',

  // Handles
  handle: '#5B8A72',
  handleFill: '#FFFFFF',

  // Measurements
  measureBg: '#5B8A72',
  measureText: '#FFFFFF',

  // Furniture
  furniture: '#C4A77D',
  furnitureSelected: '#5B8A72',

  // Windows
  window: '#87CEEB',
  windowFrame: '#5C5650',
  windowFrame3D: '#E8E0D5',
  windowGlass: '#87CEEB',

  // Doors
  door: '#8B7355',
  doorFrame: '#5C5650',
  doorFrame3D: '#D4C4B0',
  doorPanel: '#B8A082',
  doorHandle: '#8B7355',

  // Rooms
  roomFloor: '#E8E0D5',
  roomFloor3D: '#E8E0D5',
  roomSelected: '#D5E8DE',
  roomLabel: '#5C5650',

  // Groups
  groupIndicator: '#9B59B6',
  groupEditMode: '#E8DAEF',

  // Wall Joints
  wallJoint: '#5B8A72',
  wallJointHover: '#4A7A62',
  wallJointConnected: '#3D6B54',
}

// 2D Canvas colors
export const COLORS_2D = {
  canvas: NORDIC_COLORS.canvas,
  gridLine: NORDIC_COLORS.gridLine,
  gridLineMajor: NORDIC_COLORS.gridLineMajor,
  wall: NORDIC_COLORS.wall,
  wallSelected: NORDIC_COLORS.wallSelected,
  wallHover: NORDIC_COLORS.wallHover,
  wallPreview: NORDIC_COLORS.wallPreview,
  handle: NORDIC_COLORS.handle,
  handleFill: NORDIC_COLORS.handleFill,
  measureBg: NORDIC_COLORS.measureBg,
  measureText: NORDIC_COLORS.measureText,
  furniture: NORDIC_COLORS.furniture,
  furnitureSelected: NORDIC_COLORS.furnitureSelected,
  window: NORDIC_COLORS.window,
  windowFrame: NORDIC_COLORS.windowFrame,
  door: NORDIC_COLORS.door,
  doorFrame: NORDIC_COLORS.doorFrame,
  roomFloor: NORDIC_COLORS.roomFloor,
  roomSelected: NORDIC_COLORS.roomSelected,
  roomLabel: NORDIC_COLORS.roomLabel,
  wallJoint: NORDIC_COLORS.wallJoint,
  wallJointHover: NORDIC_COLORS.wallJointHover,
  wallJointConnected: NORDIC_COLORS.wallJointConnected,
}

// 3D Scene colors
export const COLORS_3D = {
  wall: NORDIC_COLORS.wall3D,
  wallSelected: NORDIC_COLORS.wallSelected,
  floor: NORDIC_COLORS.roomFloor3D,
  furniture: NORDIC_COLORS.furniture,
  furnitureSelected: NORDIC_COLORS.furnitureSelected,
  ground: NORDIC_COLORS.ground,
  windowFrame: NORDIC_COLORS.windowFrame3D,
  windowGlass: NORDIC_COLORS.windowGlass,
  doorFrame: NORDIC_COLORS.doorFrame3D,
  doorPanel: NORDIC_COLORS.doorPanel,
}

// Group colors
export const GROUP_COLORS = {
  indicator: NORDIC_COLORS.groupIndicator,
  editMode: NORDIC_COLORS.groupEditMode,
}

// Furniture generation colors (for procedural 3D furniture)
export const COLORS_FURNITURE = {
  woodDark: '#8B7355',
  woodMedium: '#A08060',
  woodLight: '#C4A77D',
  metal: '#9A9A9A',
  metalDark: '#707070',
  fabric: '#D4C4B0',
  glass: '#87CEEB',
}
