import type { Variants } from "motion/react";

export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

export const containerStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const itemRevealUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 25,
    },
  },
};

export const itemRevealLeft: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 25,
    },
  },
};

export const activeFocusVariant: Variants = {
  inactive: { scale: 1, opacity: 1, filter: "blur(0px)" },
  focused: { scale: 1.02, opacity: 1, filter: "blur(0px)" },
  dimmed: { scale: 0.98, opacity: 0.3, filter: "blur(2px)" },
};

export const promptBarSlide: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 28,
    },
  },
  exit: {
    y: 100,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};

// --- New variants for the brand kit redesign ---

export const sidebarContentSwap: Variants = {
  hidden: { opacity: 0, x: 12, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    x: -12,
    filter: "blur(4px)",
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const stepReveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 28,
    },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
};

export const pulseGlow: Variants = {
  idle: {
    boxShadow: "0 0 0px rgba(var(--primary), 0)",
  },
  active: {
    boxShadow: [
      "0 0 15px rgba(var(--primary), 0.15)",
      "0 0 30px rgba(var(--primary), 0.25)",
      "0 0 15px rgba(var(--primary), 0.15)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
