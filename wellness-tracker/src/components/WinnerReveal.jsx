import { useEffect, useRef, useState } from 'react'

const CONFETTI_COLORS = ['#1B75BC', '#14588F', '#A6CE39', '#8AB02E', '#BC4B2C', '#F1ECDE']
const SHUFFLE_MS = 2600

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Full-screen confetti burst drawn on a canvas; stops on its own once every piece has fallen off-screen.
function Confetti() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const pieces = Array.from({ length: 220 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 18,
      vy: -Math.random() * 18 - 6,
      size: Math.random() * 8 + 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }))

    let frame
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = 0
      for (const p of pieces) {
        p.vy += 0.35
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.spin
        if (p.y < canvas.height + 20) alive++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (alive) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />
}

// Shuffles through the eligible names, lands on the winner, then celebrates.
export default function WinnerReveal({ challengeLabel, monthLabel, names, winnerName, goalLabel, onClose }) {
  const reduceMotion = prefersReducedMotion()
  const [revealed, setRevealed] = useState(reduceMotion || names.length < 2)
  const [shownName, setShownName] = useState(names[0] || winnerName)

  useEffect(() => {
    if (revealed) return
    let i = 0
    let timer
    const start = Date.now()
    const step = () => {
      const elapsed = Date.now() - start
      if (elapsed >= SHUFFLE_MS) {
        setRevealed(true)
        return
      }
      i = (i + 1) % names.length
      setShownName(names[i])
      // Start fast, slow down as it nears the reveal.
      timer = setTimeout(step, 60 + (elapsed / SHUFFLE_MS) * 220)
    }
    timer = setTimeout(step, 60)
    return () => clearTimeout(timer)
  }, [revealed, names])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay reveal-overlay" role="dialog" aria-modal="true" aria-label={`${challengeLabel} winner`}>
      {revealed && !reduceMotion && <Confetti />}
      <div className="card reveal-card">
        <div className="eyebrow">{monthLabel} · {challengeLabel}</div>
        <p className="reveal-kicker">{revealed ? 'And the winner is…' : 'Drawing a winner…'}</p>
        <div className={`reveal-name${revealed ? ' is-revealed' : ''}`} aria-live="polite">
          {revealed ? winnerName : shownName}
        </div>
        {revealed && goalLabel && <p className="help-text reveal-goal">Goal: {goalLabel}</p>}
        {revealed && (
          <button className="btn btn-gold" onClick={onClose} autoFocus>
            Woohoo! Close
          </button>
        )}
      </div>
    </div>
  )
}
