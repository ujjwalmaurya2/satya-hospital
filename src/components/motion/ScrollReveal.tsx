import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface ScrollRevealProps {
  children: React.ReactNode;
  /** Direction from which the element slides in */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance in pixels to travel during reveal (default: 24) */
  distance?: number;
  /** Delay in seconds before reveal starts (default: 0) */
  delay?: number;
  /** Duration in seconds (default: 0.6) */
  duration?: number;
  /** Root margin offset for viewport intersection (default: '-50px') */
  viewportMargin?: string;
  /** Animate only once when entering viewport (default: true) */
  once?: boolean;
  /** Additional container CSS classes */
  className?: string;
  /** HTML tag name (default: 'div') */
  as?: 'div' | 'section' | 'article' | 'header' | 'footer' | 'span';
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  distance = 24,
  delay = 0,
  duration = 0.5,
  viewportMargin = '-50px',
  once = true,
  className = '',
  as = 'div',
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Calculate initial coordinate offsets based on direction
  const getInitialPosition = () => {
    if (shouldReduceMotion || direction === 'none') return { x: 0, y: 0 };
    switch (direction) {
      case 'up':
        return { x: 0, y: distance };
      case 'down':
        return { x: 0, y: -distance };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
      default:
        return { x: 0, y: distance };
    }
  };

  const initialPos = getInitialPosition();

  const MotionComponent = motion[as] as typeof motion.div;

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <MotionComponent
      initial={{ opacity: 0, ...initialPos }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: viewportMargin as any }}
      transition={{
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98], // Refined healthcare editorial cubic bezier
      }}
      className={className}
    >
      {children}
    </MotionComponent>
  );
};
