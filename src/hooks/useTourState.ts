"use client";

import { useState, useEffect, useCallback } from "react";

const TOUR_STORAGE_KEY = "subconscious:tour-completed";

export function useTourState() {
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    setShouldShowTour(completed !== "true");
    setIsReady(true);
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setShouldShowTour(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setShouldShowTour(true);
  }, []);

  return { shouldShowTour, isReady, completeTour, resetTour };
}
