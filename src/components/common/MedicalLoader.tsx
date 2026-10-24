import React from 'react';
import { LottiePlayer } from './LottiePlayer';
import { LottieAssets } from '../../assets/lottie';
import { Loader2 } from 'lucide-react';

export interface MedicalLoaderProps {
  /** Optional loading message displayed beneath or beside spinner */
  label?: string;
  /** Size in pixels (default: 48) */
  size?: number;
  /** Layout orientation: 'vertical' (stacked) or 'horizontal' (inline) */
  layout?: 'vertical' | 'horizontal';
  /** Additional CSS classes */
  className?: string;
}

export const MedicalLoader: React.FC<MedicalLoaderProps> = ({
  label = 'Loading medical records...',
  size = 48,
  layout = 'vertical',
  className = '',
}) => {
  return (
    <div 
      role="status" 
      aria-live="polite"
      className={`flex items-center justify-center ${
        layout === 'vertical' ? 'flex-col gap-3 py-6' : 'flex-row gap-2.5 py-2'
      } text-[#193247] ${className}`}
    >
      <LottiePlayer
        animationData={LottieAssets.medicalSpinner}
        width={size}
        height={size}
        ariaLabel={label}
        loop={true}
        autoplay={true}
        fallback={
          <Loader2 
            className="text-[#168C8C] animate-spin" 
            style={{ width: size * 0.7, height: size * 0.7 }} 
          />
        }
      />
      {label && (
        <span className="text-xs font-semibold text-[#647785] tracking-tight">
          {label}
        </span>
      )}
    </div>
  );
};
