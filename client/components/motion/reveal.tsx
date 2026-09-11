"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/*
 * Thin wrappers over framer-motion so pages never hand-write
 * variants. Every one of them checks useReducedMotion and collapses
 * to a plain render, so a visitor who has asked their system to
 * stop animating things gets a static page rather than a faster
 * animated one.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function FadeIn({
  children,
  delay = 0,
  y = 12,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/*
 * Reveals once, when it scrolls into view. `amount: 0.15` fires
 * when a sliver is visible rather than waiting for the whole block,
 * which otherwise makes tall sections feel like they load late.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  y = 20,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const listVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function Stagger({
  children,
  className,
  onScroll = false,
}: {
  children: React.ReactNode;
  className?: string;
  onScroll?: boolean;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={listVariants}
      initial="hidden"
      {...(onScroll
        ? { whileInView: "show", viewport: { once: true, amount: 0.1 } }
        : { animate: "show" })}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
