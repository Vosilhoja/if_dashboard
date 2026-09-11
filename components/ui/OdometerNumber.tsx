'use client';

import React, { useEffect } from 'react';
import { useMotionValue, useTransform, animate, motion } from 'framer-motion';

interface OdometerNumberProps {
  value: number;
  formatFn?: (val: number) => string;
  className?: string;
  duration?: number;
}

export const OdometerNumber: React.FC<OdometerNumberProps> = ({
  value,
  formatFn = (val) => Math.round(val).toLocaleString('ru-RU'),
  className = '',
  duration = 0.4,
}) => {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => formatFn(latest));

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [value, count, duration]);

  return (
    <motion.span className={`tabular-nums font-variant-numeric:tabular-nums inline-block ${className}`}>
      {rounded}
    </motion.span>
  );
};
