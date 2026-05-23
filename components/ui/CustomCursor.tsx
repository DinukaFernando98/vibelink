'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
  const [visible,  setVisible]  = useState(false);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);

  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);

  // Ring follows with spring physics
  const rx = useSpring(mx, { stiffness: 180, damping: 22, mass: 0.4 });
  const ry = useSpring(my, { stiffness: 180, damping: 22, mass: 0.4 });

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const move  = (e: MouseEvent) => { mx.set(e.clientX); my.set(e.clientY); setVisible(true); };
    const leave = () => setVisible(false);
    const enter = () => setVisible(true);
    const down  = () => setClicking(true);
    const up    = () => setClicking(false);
    const over  = (e: MouseEvent) => {
      setHovering(
        !!(e.target as HTMLElement).closest('a, button, [role="button"], input, textarea, select, label, [data-cursor-hover]')
      );
    };

    document.addEventListener('mousemove',  move);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);
    document.addEventListener('mousedown',  down);
    document.addEventListener('mouseup',    up);
    document.addEventListener('mouseover',  over);
    document.documentElement.style.cursor = 'none';

    return () => {
      document.removeEventListener('mousemove',  move);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
      document.removeEventListener('mousedown',  down);
      document.removeEventListener('mouseup',    up);
      document.removeEventListener('mouseover',  over);
      document.documentElement.style.cursor = '';
    };
  }, [mx, my]);

  return (
    <>
      {/* Dot — instant */}
      <motion.div
        className="fixed z-[9999] top-0 left-0 pointer-events-none mix-blend-difference rounded-full w-2.5 h-2.5 bg-white"
        style={{ x: mx, y: my, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: visible ? 1 : 0, scale: clicking ? 0.4 : hovering ? 0 : 1 }}
        transition={{ duration: 0.08 }}
      />

      {/* Ring — spring lag, border only, no fill */}
      <motion.div
        className="fixed z-[9998] top-0 left-0 pointer-events-none rounded-full w-9 h-9 border-2 border-violet-500/70"
        style={{ x: rx, y: ry, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: visible ? 1 : 0, scale: clicking ? 0.75 : hovering ? 1.8 : 1 }}
        transition={{ duration: 0.18 }}
      />
    </>
  );
}
