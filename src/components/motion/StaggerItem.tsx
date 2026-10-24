import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';

export interface StaggerItemProps {
  children: React.ReactNode;
  /** Whether the item subtly elevates on pointer hover (default: false) */
  hoverLift?: boolean;
  /** Vertical displacement during entrance (default: 20) */
  distance?: number;
  /** Additional classes */
  className?: string;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  hoverLift = false,
  distance = 20,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.21, 0.47, 0.32, 0.98],
      },
    },
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={hoverLift ? { y: -4, transition: { duration: 0.2, ease: 'easeOut' } } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
};
