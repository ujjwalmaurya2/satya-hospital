import React from 'react';
import { Link } from 'react-router-dom';
import { LottiePlayer } from './LottiePlayer';
import { LottieAssets } from '../../assets/lottie';
import { FileQuestion } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  /** Main heading */
  title: string;
  /** Explanatory description */
  description: string;
  /** Optional action button text */
  actionLabel?: string;
  /** Internal router link if action is navigational */
  actionLink?: string;
  /** Click handler if action is functional */
  onAction?: () => void;
  /** Icon/animation size in pixels (default: 88) */
  iconSize?: number;
  /** Additional container classes */
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
  iconSize = 88,
  className = '',
}) => {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center space-y-3.5 bg-[#FCFDFB] rounded-2xl border border-[#E5ECEF] my-4 ${className}`}>
      <div className="p-2 rounded-2xl bg-white border border-[#E5ECEF] shadow-2xs">
        <LottiePlayer
          animationData={LottieAssets.medicalEmptyState}
          width={iconSize}
          height={iconSize}
          loop={true}
          autoplay={true}
          ariaLabel={title}
          fallback={<FileQuestion className="w-12 h-12 text-[#3DA9DF]/60" />}
        />
      </div>

      <div className="max-w-md space-y-1">
        <h4 className="text-sm font-bold text-[#193247] tracking-tight">{title}</h4>
        <p className="text-xs text-[#647785] leading-relaxed">{description}</p>
      </div>

      {actionLabel && (
        <div className="pt-1.5">
          {actionLink ? (
            <Link to={actionLink}>
              <Button variant="primary" size="sm" className="font-bold">
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button variant="primary" size="sm" onClick={onAction} className="font-bold">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
