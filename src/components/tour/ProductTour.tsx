"use client";

import { useState, useEffect, useCallback } from "react";
import { TOUR_STEPS } from "./tourSteps";
import TourOverlay from "./TourOverlay";
import TourTooltip from "./TourTooltip";

interface ProductTourProps {
  onComplete: () => void;
  isChatOpen: boolean;
  toggleChat: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TOOLTIP_GAP = 16;
const VIEWPORT_PADDING = 16;
const TOOLTIP_WIDTH = 320;

function computeTooltipPosition(
  targetRect: Rect,
  padding: number,
  side: "top" | "bottom" | "left" | "right",
): { top: number; left: number } {
  const padded = {
    x: targetRect.x - padding,
    y: targetRect.y - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  };

  let top: number;
  let left: number;

  switch (side) {
    case "bottom":
      top = padded.y + padded.height + TOOLTIP_GAP;
      left = padded.x + padded.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case "top":
      top = padded.y - TOOLTIP_GAP - 200; // estimate tooltip height
      left = padded.x + padded.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case "left":
      top = padded.y + padded.height / 2 - 100;
      left = padded.x - TOOLTIP_GAP - TOOLTIP_WIDTH;
      break;
    case "right":
      top = padded.y + padded.height / 2 - 100;
      left = padded.x + padded.width + TOOLTIP_GAP;
      break;
  }

  // Clamp to viewport
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING),
  );
  top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - 250));

  return { top, left };
}

export default function ProductTour({
  onComplete,
  isChatOpen,
  toggleChat,
}: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [cutout, setCutout] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const step = TOUR_STEPS[currentStep];

  const measureTarget = useCallback(() => {
    if (!step?.targetSelector) {
      setCutout(null);
      setTooltipPos(null);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setCutout(null);
      setTooltipPos(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const newCutout = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    setCutout(newCutout);

    const padding = step.spotlightPadding ?? 8;
    setTooltipPos(computeTooltipPosition(newCutout, padding, step.tooltipSide));
  }, [step]);

  // Measure on step change
  useEffect(() => {
    if (!step) return;

    // Full-overlay steps (welcome/completion) don't need measurement
    if (!step.targetSelector) {
      setCutout(null);
      setTooltipPos(null);
      return;
    }

    // If step requires opening chat, handle the delay
    if (step.beforeShow === "open-chat" && !isChatOpen) {
      setIsTransitioning(true);
      toggleChat();
      const timer = setTimeout(() => {
        measureTarget();
        setIsTransitioning(false);
      }, 400);
      return () => clearTimeout(timer);
    }

    measureTarget();
  }, [currentStep, step, isChatOpen, toggleChat, measureTarget]);

  // Recalculate on resize
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(measureTarget, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, [measureTarget]);

  // Keyboard handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onComplete();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep >= TOUR_STEPS.length - 1) {
      onComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, onComplete]);

  if (!step || isTransitioning) {
    // Show overlay during transitions
    return (
      <div className="fixed inset-0 z-[60]">
        <svg width="100%" height="100%">
          <rect
            width="100%"
            height="100%"
            fill="rgba(16, 24, 32, 0.80)"
          />
        </svg>
      </div>
    );
  }

  return (
    <>
      <TourOverlay
        cutout={cutout}
        padding={step.spotlightPadding ?? 8}
        borderRadius={step.spotlightBorderRadius ?? 10}
        onClick={handleNext}
      />
      <TourTooltip
        title={step.title}
        description={step.description}
        currentStep={currentStep}
        totalSteps={TOUR_STEPS.length}
        isLastStep={currentStep === TOUR_STEPS.length - 1}
        position={tooltipPos}
        onNext={handleNext}
        onSkip={onComplete}
      />
    </>
  );
}
