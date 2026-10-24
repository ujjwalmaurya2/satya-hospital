import React, { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';

export interface LottiePlayerProps {
  /** Bodymovin JSON animation data object */
  animationData: unknown;
  /** Whether the animation should loop continuously (default: true) */
  loop?: boolean;
  /** Whether the animation should autoplay on mount (default: true) */
  autoplay?: boolean;
  /** Trigger playback on mouse hover / focus instead of continuous autoplay (default: false) */
  triggerOnHover?: boolean;
  /** Pause animation automatically when scrolled offscreen via IntersectionObserver (default: true) */
  triggerOnView?: boolean;
  /** Reserved width (pixels or CSS string, default: 48) */
  width?: number | string;
  /** Reserved height (pixels or CSS string, default: 48) */
  height?: number | string;
  /** Additional CSS class names for the container */
  className?: string;
  /** Semantic accessible label for assistive tech. If omitted, element is marked aria-hidden */
  ariaLabel?: string;
  /** Explicitly toggle aria-hidden (defaults to true if ariaLabel is undefined) */
  ariaHidden?: boolean;
  /** Playback speed multiplier (default: 1) */
  speed?: number;
  /** Static fallback element rendered for users with prefers-reduced-motion or during async load */
  fallback?: React.ReactNode;
  /** Callback fired when a non-looping animation finishes */
  onComplete?: () => void;
}

export const LottiePlayer: React.FC<LottiePlayerProps> = ({
  animationData,
  loop = true,
  autoplay = true,
  triggerOnHover = false,
  triggerOnView = true,
  width = 48,
  height = 48,
  className = '',
  ariaLabel,
  ariaHidden,
  speed = 1,
  fallback,
  onComplete,
}) => {
  // Separate DOM ref strictly for Lottie's imperative SVG insertion to prevent React reconciliation collision
  const lottieMountRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // 1. Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 2. Initialize Lottie Animation asynchronously
  useEffect(() => {
    let isCancelled = false;

    if (!lottieMountRef.current || !animationData || typeof window === 'undefined') {
      return;
    }

    // If user prefers reduced motion and a static fallback is provided, skip heavy animation initialization
    if (prefersReducedMotion && fallback) {
      return;
    }

    async function initLottie() {
      try {
        const lottieModule = await import('lottie-web/build/player/lottie_light');
        const lottie = (lottieModule.default || lottieModule) as any;

        if (isCancelled || !lottieMountRef.current) return;

        // Clean previous instance if exists
        if (animRef.current) {
          try {
            animRef.current.destroy();
          } catch {
            // ignore
          }
          animRef.current = null;
        }

        if (lottieMountRef.current) {
          lottieMountRef.current.innerHTML = '';
        }

        const anim = lottie.loadAnimation({
          container: lottieMountRef.current,
          renderer: 'svg',
          loop: prefersReducedMotion ? false : loop,
          autoplay: prefersReducedMotion ? false : (triggerOnHover ? false : autoplay),
          animationData: animationData as any,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
            hideOnTransparent: true,
          },
        });

        anim.setSpeed(speed);

        if (onComplete) {
          anim.addEventListener('complete', onComplete);
        }

        if (prefersReducedMotion) {
          anim.goToAndStop(loop ? 0 : anim.totalFrames - 1, true);
        }

        if (!isCancelled) {
          animRef.current = anim;
          setIsLoaded(true);
        }
      } catch (err) {
        console.warn('Lottie animation failed to load, falling back to static visual:', err);
      }
    }

    initLottie();

    return () => {
      isCancelled = true;
      if (animRef.current) {
        try {
          animRef.current.destroy();
        } catch {
          // ignore
        }
        animRef.current = null;
      }
      if (lottieMountRef.current) {
        lottieMountRef.current.innerHTML = '';
      }
    };
  }, [animationData, loop, autoplay, triggerOnHover, speed, prefersReducedMotion, fallback, onComplete]);

  // 3. Pause when offscreen (IntersectionObserver)
  useEffect(() => {
    if (!triggerOnView || !lottieMountRef.current || prefersReducedMotion || triggerOnHover) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!animRef.current) return;
          if (entry.isIntersecting) {
            animRef.current.play();
          } else {
            animRef.current.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(lottieMountRef.current);
    return () => observer.disconnect();
  }, [triggerOnView, prefersReducedMotion, triggerOnHover, isLoaded]);

  // 4. Handle Hover triggers
  const handleMouseEnter = () => {
    if (triggerOnHover && animRef.current && !prefersReducedMotion) {
      animRef.current.goToAndPlay(0, true);
    }
  };

  const handleMouseLeave = () => {
    if (triggerOnHover && animRef.current && !prefersReducedMotion) {
      if (loop) {
        animRef.current.pause();
      }
    }
  };

  // Convert dimensions to string
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  // Render static fallback directly if reduced motion is requested and fallback exists
  if (prefersReducedMotion && fallback) {
    return (
      <div 
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: widthStyle, height: heightStyle }}
        role={ariaLabel ? 'img' : undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden ?? (ariaLabel ? false : true)}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden ?? (ariaLabel ? false : true)}
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden ${className}`}
      style={{
        width: widthStyle,
        height: heightStyle,
        minWidth: widthStyle,
        minHeight: heightStyle,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {/* 
        CRITICAL: Dedicated mount element strictly for lottie-web.
        React renders ZERO child virtual nodes inside this element, so React reconciler
        never touches or calls removeChild on lottie's generated SVG nodes.
      */}
      <div
        ref={lottieMountRef}
        className="w-full h-full flex items-center justify-center pointer-events-none"
      />

      {/* Sibling fallback overlay managed exclusively by React */}
      {!isLoaded && fallback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {fallback}
        </div>
      )}
    </div>
  );
};
