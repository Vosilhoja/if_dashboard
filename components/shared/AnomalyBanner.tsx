'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AnomalyBannerProps {
  hasAnomaly: boolean;
  message?: string;
  linkHref?: string;
  linkLabel?: string;
  threshold?: number;
}

export const AnomalyBanner: React.FC<AnomalyBannerProps> = ({
  hasAnomaly,
  message,
  linkHref = '/dashboard#anomalies',
  linkLabel = 'Смотреть аномалии',
  threshold = 30,
}) => {
  if (hasAnomaly) {
    return (
      <motion.div
        animate={{ opacity: [1, 0.85, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="p-3.5 rounded-[8px] bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[6px] bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-primary">Отклонение в показателях: </span>
            <span className="text-secondary">
              {message || `Обнаружено критическое отклонение от нормы (> ±${threshold}%).`}
            </span>
          </div>
        </div>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Link
            href={linkHref}
            className="self-start sm:self-auto px-3 py-1.5 rounded-[6px] bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors flex items-center gap-1 shrink-0"
          >
            <span>{linkLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="px-3.5 py-2.5 rounded-[8px] bg-surface border border-border flex items-center justify-between text-xs text-secondary">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-primary font-medium">Стабильность метрик:</span>
        <span>Показатели находятся в пределах нормы</span>
      </div>
      <Link
        href={linkHref}
        className="text-xs text-accent hover:underline font-medium hidden sm:inline-block"
      >
        Подробнее
      </Link>
    </div>
  );
};
