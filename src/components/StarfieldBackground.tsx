import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  radius: number
  baseAlpha: number
  twinkleSpeed: number
  twinklePhase: number
  hue: number
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

const STAR_DENSITY = 0.00018 // stars per px^2
const HUE_PALETTE = [240, 260, 280, 200, 220, 320]

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const starsRef = useRef<Star[]>([])
  const shootingRef = useRef<ShootingStar[]>([])
  const lastShootRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedStars(w, h)
    }

    const seedStars = (w: number, h: number) => {
      const count = Math.round(w * h * STAR_DENSITY)
      const stars: Star[] = []
      for (let i = 0; i < count; i++) {
        const z = Math.random()
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          radius: 0.3 + z * 1.4,
          baseAlpha: 0.25 + Math.random() * 0.55,
          twinkleSpeed: 0.4 + Math.random() * 1.6,
          twinklePhase: Math.random() * Math.PI * 2,
          hue: HUE_PALETTE[Math.floor(Math.random() * HUE_PALETTE.length)],
        })
      }
      starsRef.current = stars
    }

    const spawnShootingStar = (w: number, h: number) => {
      const fromLeft = Math.random() < 0.5
      shootingRef.current.push({
        x: fromLeft ? -50 : w + 50,
        y: Math.random() * h * 0.6,
        vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 4),
        vy: 1.5 + Math.random() * 1.5,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      })
    }

    let start = performance.now()
    const render = (now: number) => {
      const t = (now - start) / 1000
      const w = window.innerWidth
      const h = window.innerHeight

      ctx.clearRect(0, 0, w, h)

      // Draw stars
      for (const star of starsRef.current) {
        const twinkle =
          0.55 + 0.45 * Math.sin(t * star.twinkleSpeed + star.twinklePhase)
        const alpha = star.baseAlpha * twinkle
        ctx.beginPath()
        ctx.fillStyle = `hsla(${star.hue}, 100%, 85%, ${alpha})`
        ctx.shadowColor = `hsla(${star.hue}, 100%, 75%, ${alpha * 0.8})`
        ctx.shadowBlur = star.z * 6
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // Shooting stars (occasional)
      if (now - lastShootRef.current > 4500 && Math.random() < 0.02) {
        spawnShootingStar(w, h)
        lastShootRef.current = now
      }

      shootingRef.current = shootingRef.current.filter((s) => s.life < s.maxLife)
      for (const s of shootingRef.current) {
        s.x += s.vx
        s.y += s.vy
        s.life += 1
        const fade = 1 - s.life / s.maxLife
        const tailLen = 80
        const grad = ctx.createLinearGradient(
          s.x,
          s.y,
          s.x - s.vx * (tailLen / Math.hypot(s.vx, s.vy)),
          s.y - s.vy * (tailLen / Math.hypot(s.vx, s.vy)),
        )
        grad.addColorStop(0, `rgba(255, 240, 255, ${0.9 * fade})`)
        grad.addColorStop(1, 'rgba(255, 240, 255, 0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(
          s.x - s.vx * (tailLen / Math.hypot(s.vx, s.vy)),
          s.y - s.vy * (tailLen / Math.hypot(s.vx, s.vy)),
        )
        ctx.stroke()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      <div className="nebula-layer" aria-hidden="true" />
      <canvas ref={canvasRef} className="starfield-canvas" aria-hidden="true" />
      <style>{`
        .starfield-canvas {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 0;
        }
        .nebula-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            radial-gradient(ellipse 60% 50% at 20% 30%, rgba(140, 90, 240, 0.18), transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 75%, rgba(80, 140, 240, 0.18), transparent 65%),
            radial-gradient(ellipse 70% 40% at 50% 100%, rgba(255, 120, 200, 0.10), transparent 70%);
          mix-blend-mode: screen;
          animation: nebula-drift 60s ease-in-out infinite alternate;
        }
        @keyframes nebula-drift {
          0%   { transform: translate3d(0, 0, 0) scale(1); }
          50%  { transform: translate3d(-30px, -20px, 0) scale(1.05); }
          100% { transform: translate3d(20px, -10px, 0) scale(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nebula-layer { animation: none; }
        }
      `}</style>
    </>
  )
}
