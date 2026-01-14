import * as React from "react"
import { cn } from "../../lib/utils"

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value?: number
  onValueChange?: (value: number) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = 0, onValueChange, onChange, min = 0, max = 1, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value)
      onValueChange?.(newValue)
      onChange?.(e)
    }

    const minN = Number(min)
    const maxN = Number(max)
    const denom = maxN - minN
    const percentage = denom === 0 ? 0 : ((value - minN) / denom) * 100
    // Keep the filled track strictly aligned to the value percent.
    // (No pixel offset: avoids the fill "creeping" past the square thumb near max.)
    const fillWidth = percentage <= 0 ? '0%' : percentage >= 100 ? '100%' : `${percentage}%`

    return (
      <div className="relative w-full h-3 flex items-center">
        {/* Track background */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-secondary/50 rounded-none" />
        {/* Filled track - extends to thumb center */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-foreground/30 rounded-none"
          style={{ width: fillWidth }}
        />
        {/* Slider input */}
        <input
          type="range"
          className={cn(
            "relative w-full h-3 bg-transparent appearance-none cursor-pointer",
            "focus:outline-none",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10",
            "[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:relative [&::-moz-range-thumb]:z-10",
            className
          )}
          ref={ref}
          value={value}
          min={min}
          max={max}
          onChange={handleChange}
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }

