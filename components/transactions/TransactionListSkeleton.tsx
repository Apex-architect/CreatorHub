'use client';

import { motion } from 'framer-motion';

interface TransactionListSkeletonProps {
  rows?: number;
}

export function TransactionListSkeleton({
  rows = 8,
}: TransactionListSkeletonProps) {
  const items = Array.from({ length: rows });

  return (
    <div className="space-y-2">
      {items.map((_, index) => (
        <motion.div
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="h-12 rounded-md bg-muted"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.03,
          }}
        />
      ))}
    </div>
  );
}


