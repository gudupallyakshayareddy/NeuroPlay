// Joins class names, skipping anything falsy. Example: cn('a', isOn && 'b') -> "a b"
export const cn = (...parts) => parts.filter(Boolean).join(' ')
