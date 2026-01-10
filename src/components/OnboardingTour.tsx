import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/Button';

export interface TourStep {
  target: string; // CSS selector for the target element
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export function OnboardingTour({ steps, isActive, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  const updatePosition = useCallback(() => {
    if (!step) return;

    const target = document.querySelector(step.target);
    if (!target) {
      // If target not found, try next step or complete
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    const rect = target.getBoundingClientRect();
    setTargetRect(rect);

    const padding = 12;
    const tooltipWidth = 300;
    const tooltipHeight = 150;

    let top = 0;
    let left = 0;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

    const placement = step.placement || 'bottom';

    switch (placement) {
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'top';
        break;
      case 'top':
        top = rect.top - tooltipHeight - padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'bottom';
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        arrowPosition = 'right';
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        arrowPosition = 'left';
        break;
    }

    // Keep tooltip within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

    setPosition({ top, left, arrowPosition });
  }, [step, currentStep, steps.length]);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }

    updatePosition();

    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isActive, updatePosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isActive || !step || !position) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with spotlight cutout */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 4}
                  y={targetRect.top - 4}
                  width={targetRect.width + 8}
                  height={targetRect.height + 8}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Spotlight border/glow */}
      {targetRect && (
        <div
          className="absolute border-2 border-emerald-500 rounded-xl pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute w-[300px] bg-stone-100 rounded-2xl shadow-2xl border border-stone-300 p-4 pointer-events-auto"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Progress indicator */}
        <div className="flex gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-emerald-500' : 'bg-stone-300'
              }`}
            />
          ))}
        </div>

        <h3 className="font-display font-semibold text-stone-900 text-lg mb-1">
          {step.title}
        </h3>
        <p className="text-stone-600 text-sm mb-4">
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                Back
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
