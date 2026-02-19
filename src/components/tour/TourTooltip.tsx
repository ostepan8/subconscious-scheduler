"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, Rocket, Check } from "lucide-react";

interface TourTooltipProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  isLastStep: boolean;
  /** null = centered on screen, otherwise positioned near target */
  position: { top: number; left: number } | null;
  onNext: () => void;
  onSkip: () => void;
}

export default function TourTooltip({
  title,
  description,
  currentStep,
  totalSteps,
  isLastStep,
  position,
  onNext,
  onSkip,
}: TourTooltipProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => btnRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Centered card for welcome/completion steps
  if (!position) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto max-w-sm w-full mx-4 rounded-2xl border border-edge bg-surface p-8 text-center shadow-2xl shadow-black/50 tour-tooltip-enter">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
            {isLastStep ? (
              <div className="relative">
                <div className="confetti-burst" />
                <Check
                  className="h-8 w-8 text-success onboarding-success-pop"
                  strokeWidth={2}
                />
              </div>
            ) : (
              <Rocket
                className="h-8 w-8 text-brand onboarding-fade-in"
                strokeWidth={1.5}
              />
            )}
          </div>

          <h2 className="text-xl font-bold text-cream">{title}</h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            {description}
          </p>

          {/* Step dots */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-6 bg-brand"
                    : i < currentStep
                      ? "w-1.5 bg-brand/50"
                      : "w-1.5 bg-edge"
                }`}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              ref={btnRef}
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-ink transition-all hover:bg-brand-light hover:scale-105 active:scale-100 cursor-pointer"
            >
              {isLastStep ? "Get started" : "Let\u2019s go"}
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
            {!isLastStep && (
              <button
                onClick={onSkip}
                className="text-xs text-muted hover:text-cream transition-colors cursor-pointer"
              >
                Skip tour
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Positioned tooltip for spotlight steps
  return (
    <div
      className="fixed z-[70] max-w-sm w-80 rounded-xl border border-edge bg-surface p-5 shadow-2xl shadow-black/50 tour-tooltip-enter"
      style={{ top: position.top, left: position.left }}
    >
      <h3 className="text-base font-bold text-cream">{title}</h3>
      <p className="mt-2 text-sm text-muted leading-relaxed">{description}</p>

      {/* Step dots */}
      <div className="mt-4 flex items-center gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep
                ? "w-6 bg-brand"
                : i < currentStep
                  ? "w-1.5 bg-brand/50"
                  : "w-1.5 bg-edge"
            }`}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-xs text-muted hover:text-cream transition-colors cursor-pointer"
        >
          Skip tour
        </button>
        <button
          ref={btnRef}
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-ink transition-all hover:bg-brand-light hover:scale-105 active:scale-100 cursor-pointer"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
