'use client';

import {
  ReactNode,
  useState,
  useRef,
  useEffect,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const show = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setOpen(true);
    }, 200);
  };

  const hide = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setOpen(false);
  };

  return (
    <span className="relative inline-flex">
      <span
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open && (
        <motion.span
          role="tooltip"
          initial={
            prefersReducedMotion
              ? false
              : { opacity: 0, y: 4 }
          }
          animate={
            prefersReducedMotion
              ? undefined
              : { opacity: 1, y: 0 }
          }
          exit={
            prefersReducedMotion
              ? undefined
              : { opacity: 0, y: 4 }
          }
          transition={{ duration: 0.12 }}
          className="pointer-events-none absolute left-1/2 top-full z-40 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-soft sm:text-xs"
        >
          {label}
        </motion.span>
      )}
    </span>
  );
}


