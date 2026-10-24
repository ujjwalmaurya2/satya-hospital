import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';

export interface StaggerContainerProps {
  children: React.ReactNode;
  /** Delay in seconds between each sequential child item (default: 0.08) */
  staggerDelay?: number;
  /** Delay in seconds before the first child starts entering (default: 0.05) */
  delayChildren?: number;
  /** Whether the sequence triggers once upon entering viewport (default: true) */
  once?: boolean;
  /** Viewport intersection margin offset (default: '-50px') */
  viewportMargin?: string;
  /** Additional container classes */
  className?: string;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 0.08,
  delayChildren = 0.05,
  once = true,
  viewportMargin = '-50px',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: viewportMargin as any }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
