/**
 * ColorMapper.js - Color palette management for LEGO pair visualization
 *
 * Provides vibrant color assignments for LEGO pairs with gradient backgrounds
 * and automatic color cycling for visual clarity.
 */

// Vibrant color palette (8 colors cycling)
export const LEGO_COLORS = [
  {
    id: 1,
    name: 'blue',
    primary: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    gradient: 'from-blue-500/20 to-blue-600/30',
    border: 'border-blue-500',
    text: 'text-blue-100',
    hover: 'hover:bg-blue-900/50'
  },
  {
    id: 2,
    name: 'green',
    primary: '#10B981',
    light: '#34D399',
    dark: '#059669',
    gradient: 'from-green-500/20 to-green-600/30',
    border: 'border-green-500',
    text: 'text-green-100',
    hover: 'hover:bg-green-900/50'
  },
  {
    id: 3,
    name: 'purple',
    primary: '#8B5CF6',
    light: '#A78BFA',
    dark: '#7C3AED',
    gradient: 'from-purple-500/20 to-purple-600/30',
    border: 'border-purple-500',
    text: 'text-purple-100',
    hover: 'hover:bg-purple-900/50'
  },
  {
    id: 4,
    name: 'orange',
    primary: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    gradient: 'from-orange-500/20 to-orange-600/30',
    border: 'border-orange-500',
    text: 'text-orange-100',
    hover: 'hover:bg-orange-900/50'
  },
  {
    id: 5,
    name: 'pink',
    primary: '#EC4899',
    light: '#F472B6',
    dark: '#DB2777',
    gradient: 'from-pink-500/20 to-pink-600/30',
    border: 'border-pink-500',
    text: 'text-pink-100',
    hover: 'hover:bg-pink-900/50'
  },
  {
    id: 6,
    name: 'teal',
    primary: '#14B8A6',
    light: '#2DD4BF',
    dark: '#0D9488',
    gradient: 'from-teal-500/20 to-teal-600/30',
    border: 'border-teal-500',
    text: 'text-teal-100',
    hover: 'hover:bg-teal-900/50'
  },
  {
    id: 7,
    name: 'yellow',
    primary: '#EAB308',
    light: '#FACC15',
    dark: '#CA8A04',
    gradient: 'from-yellow-500/20 to-yellow-600/30',
    border: 'border-yellow-500',
    text: 'text-yellow-100',
    hover: 'hover:bg-yellow-900/50'
  },
  {
    id: 8,
    name: 'cyan',
    primary: '#06B6D4',
    light: '#22D3EE',
    dark: '#0891B2',
    gradient: 'from-cyan-500/20 to-cyan-600/30',
    border: 'border-cyan-500',
    text: 'text-cyan-100',
    hover: 'hover:bg-cyan-900/50'
  }
]

/**
 * Get a color from the palette by index (cycles through palette)
 * @param {number} index - The index of the LEGO pair
 * @returns {object} Color object with primary, light, dark, gradient, border, text, hover
 */
export function getColorForIndex(index) {
  return LEGO_COLORS[index % LEGO_COLORS.length]
}

/**
 * Assign colors to an array of LEGO pairs
 * @param {Array} legoPairs - Array of LEGO pair objects
 * @returns {Array} LEGO pairs with color assignments
 */
export function assignColors(legoPairs) {
  if (!Array.isArray(legoPairs)) return []

  return legoPairs.map((pair, index) => ({
    ...pair,
    color: getColorForIndex(index)
  }))
}

/**
 * Get all color classes for a given index (for use in templates)
 * @param {number} index - The index of the LEGO pair
 * @returns {object} Object with all color classes
 */
export function getColorClasses(index) {
  const color = getColorForIndex(index)
  return {
    gradient: `bg-gradient-to-br ${color.gradient}`,
    border: color.border,
    borderClass: `border-2 ${color.border}`,
    text: color.text,
    hover: color.hover,
    containerClass: `bg-gradient-to-br ${color.gradient} border-2 ${color.border} ${color.hover}`,
    primary: color.primary
  }
}

/**
 * Generate CSS custom properties for colors (for dynamic styling)
 * @returns {string} CSS custom properties string
 */
export function generateColorCSS() {
  return LEGO_COLORS.map((color, index) => `
    --lego-color-${index + 1}: ${color.primary};
    --lego-color-${index + 1}-light: ${color.light};
    --lego-color-${index + 1}-dark: ${color.dark};
  `).join('\n')
}

/**
 * Get divider styles for active/inactive states
 */
export const DIVIDER_STYLES = {
  active: 'w-0.5 h-8 bg-purple-500 cursor-pointer transition-all',
  inactive: 'w-0.5 h-8 bg-transparent hover:bg-purple-400/30 cursor-pointer transition-all',
  hover: 'hover:bg-purple-400/50'
}

export default {
  LEGO_COLORS,
  getColorForIndex,
  assignColors,
  getColorClasses,
  generateColorCSS,
  DIVIDER_STYLES
}
