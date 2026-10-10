import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react'

// macOS-style magnifying dock. items: [{ title, icon, active, onClick }]
export default function FloatingDock({ items }) {
  const mouseX = useMotionValue(Infinity)
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="mx-auto flex h-16 items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 pb-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      {items.map((item) => (
        <DockIcon key={item.title} mouseX={mouseX} {...item} />
      ))}
    </motion.div>
  )
}

function DockIcon({ mouseX, title, icon: Icon, active, onClick, dot }) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)

  const distance = useTransform(mouseX, (val) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - b.x - b.width / 2
  })
  const sz = (from, mid) => useSpring(useTransform(distance, [-140, 0, 140], [from, mid, from]),
    { mass: 0.1, stiffness: 150, damping: 12 })

  const width = sz(42, 78)
  const height = sz(42, 78)
  const iconW = sz(20, 36)
  const iconH = sz(20, 36)

  return (
    <button onClick={onClick} className="outline-none">
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`relative flex aspect-square items-center justify-center rounded-full transition-colors ${
          active ? 'bg-white text-black' : 'bg-white/10 text-gray-200 hover:bg-white/15'
        }`}
      >
        <AnimatePresence>
          {hovered && (
            <motion.span
              initial={{ opacity: 0, y: 6, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 2, x: '-50%' }}
              className="absolute -top-8 left-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs text-white"
            >
              {title}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.div style={{ width: iconW, height: iconH }} className="flex items-center justify-center">
          <Icon className="h-3/5 w-3/5" />
        </motion.div>
        {dot && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warn animate-pulse-dot" />}
      </motion.div>
    </button>
  )
}
