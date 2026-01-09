/**
 * Converts keyboard key names to their Unicode symbol equivalents
 * for use with the Kbd component to match shadcn standards
 */
export function getKeySymbol(key: string): string {
  const normalizedKey = key.toLowerCase().trim();
  
  switch (normalizedKey) {
    // Modifier keys
    case 'shift':
      return '⇧';
    case 'enter':
    case 'return':
      return '⏎';
    case 'control':
    case 'ctrl':
      return '⌃';
    case 'command':
    case 'cmd':
      return '⌘';
    case 'alt':
    case 'option':
      return '⌥';
    case 'escape':
    case 'esc':
      return '⎋';
    
    // Navigation keys
    case 'tab':
      return '⇥';
    case 'backspace':
      return '⌫';
    case 'delete':
    case 'del':
      return '⌦';
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'left':
      return '←';
    case 'right':
      return '→';
    
    // Space
    case 'space':
    case 'spacebar':
      return '␣';
    
    // Default: return the key as-is (for letters, numbers, etc.)
    default:
      return key;
  }
}

