"use client";

import { ReactLenis } from "lenis/react";
import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function SmoothScroll() {
  const [smoothScrollEnabled, setSmoothScrollEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => setSmoothScrollEnabled(!mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  if (!smoothScrollEnabled) {
    return null;
  }

  return (
    <ReactLenis
      root
      options={{
        anchors: { offset: -72 },
        autoRaf: true,
        smoothWheel: true,
        stopInertiaOnNavigate: true,
      }}
    />
  );
}
