import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label && <span>{label}</span>}
      <input
        id={inputId}
        className={`neo-input rounded-none px-3 py-2 text-sm ${className}`}
        {...props}
      />
    </label>
  )
}
