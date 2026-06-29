import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-yellow hover:bg-yellow-dark text-black',
  secondary: 'bg-beige-dark hover:bg-beige text-black',
  danger: 'bg-red-400 hover:bg-red-500 text-black',
  ghost: 'bg-white hover:bg-beige-dark text-black neo-shadow-sm',
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`neo-btn px-4 py-2 text-sm ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
