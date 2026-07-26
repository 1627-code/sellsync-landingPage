import { Variants } from "framer-motion";

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.65, 0.3, 0.9] } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const hoverLift: Variants = {
  rest: { scale: 1, rotate: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" },
  hover: { scale: 1.02, rotate: -0.25, boxShadow: "0 12px 30px rgba(79,70,229,0.15)", transition: { duration: 0.2 } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
};

export const pulseGlow: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    boxShadow: [
      "0 0 0 rgba(0,0,0,0)",
      "0 0 24px rgba(99,102,241,0.35)",
      "0 0 0 rgba(0,0,0,0)",
    ],
    transition: { repeat: Infinity, duration: 2.4, ease: "easeInOut" },
  },
};
