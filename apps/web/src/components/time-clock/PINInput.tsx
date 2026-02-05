/**
 * PINInput Component
 * 4-digit PIN input with auto-focus and auto-submit
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PINInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function PINInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: PINInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(4, ' ').split('').slice(0, 4);

  // Focus first input on mount if autoFocus
  React.useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Auto-submit when all 4 digits are entered
  React.useEffect(() => {
    if (value.length === 4 && onComplete) {
      onComplete(value);
    }
  }, [value, onComplete]);

  const handleChange = (index: number, digit: string) => {
    // Only allow numeric input
    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = digit || ' ';
    const newValue = newDigits.join('').trim();
    
    onChange(newValue);

    // Auto-focus next input if digit was entered
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] || digits[index] === ' ') {
        // If current input is empty, move to previous and clear it
        if (index > 0) {
          const newDigits = [...digits];
          newDigits[index - 1] = ' ';
          onChange(newDigits.join('').trim());
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // Clear current input
        const newDigits = [...digits];
        newDigits[index] = ' ';
        onChange(newDigits.join('').trim());
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter' && value.length === 4 && onComplete) {
      onComplete(value);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only accept 4-digit numeric paste
    if (/^\d{4}$/.test(pastedData)) {
      onChange(pastedData);
      // Focus last input
      inputRefs.current[3]?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <input
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digit === ' ' ? '' : digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            className={cn(
              'w-14 h-16 text-center text-2xl font-bold rounded-xl',
              'bg-zinc-900/50 border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950',
              error
                ? 'border-red-500/50 text-red-400 focus:border-red-500 focus:ring-red-500/50'
                : 'border-zinc-800 text-white focus:border-emerald-500 focus:ring-emerald-500/50',
              disabled && 'opacity-50 cursor-not-allowed',
              digit !== ' ' && !error && 'border-emerald-500/50'
            )}
            aria-label={`PIN digit ${index + 1}`}
          />
        </motion.div>
      ))}
    </div>
  );
}
