interface ColorSwatchProps {
  hex: string
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
  onClick?: () => void
  label?: string
}

const sizes = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
}

export function ColorSwatch({
  hex,
  size = 'md',
  selected,
  onClick,
  label,
}: ColorSwatchProps) {
  const className = `${sizes[size]} neo-border shrink-0 ${
    selected ? 'ring-2 ring-offset-2 ring-black scale-110' : ''
  } ${onClick ? 'cursor-pointer transition-transform active:scale-95' : ''}`

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        style={{ backgroundColor: hex }}
        aria-label={label ?? `Color ${hex}`}
        aria-pressed={selected}
      />
    )
  }

  return (
    <span
      className={`inline-block ${className}`}
      style={{ backgroundColor: hex }}
      title={label ?? hex}
      role="img"
      aria-label={label ?? `Color ${hex}`}
    />
  )
}

