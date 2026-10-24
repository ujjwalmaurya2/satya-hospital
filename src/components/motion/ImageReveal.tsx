import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface ImageRevealProps {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  children?: React.ReactNode;
  hoverScale?: boolean;
}

export const ImageReveal: React.FC<ImageRevealProps> = ({
  src,
  alt,
  aspectRatio,
  className = '',
  imageClassName = '',
  priority = false,
  children,
  hoverScale = true,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          className={`w-full h-full object-cover ${imageClassName}`}
        />
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.65,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={`relative overflow-hidden group ${className}`}
      style={{ aspectRatio }}
    >
      <motion.img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        whileHover={hoverScale ? { scale: 1.03 } : undefined}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`w-full h-full object-cover transition-transform duration-500 ${imageClassName}`}
      />
      {children}
    </motion.div>
  );
};
