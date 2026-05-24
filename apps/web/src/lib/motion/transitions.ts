export const springTransitions = {
  default: {
    type: "spring",
    stiffness: 260,
    damping: 25,
  },
  gentle: {
    type: "spring",
    stiffness: 180,
    damping: 20,
  },
  stiff: {
    type: "spring",
    stiffness: 350,
    damping: 30,
  },
  smoothLayout: {
    type: "spring",
    stiffness: 220,
    damping: 26,
  },
};

export const linearTransitions = {
  fast: {
    duration: 0.15,
    ease: "linear",
  },
  standard: {
    duration: 0.25,
    ease: "easeInOut",
  },
  slow: {
    duration: 0.5,
    ease: "easeInOut",
  },
};
