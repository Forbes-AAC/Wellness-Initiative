// Small reusable avatar component: shows a photo if the person has uploaded
// one, otherwise falls back to their initials on a colored circle.
function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export default function Avatar({ name, url, size = 36 }) {
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(11, size * 0.38),
    fontWeight: 600,
    overflow: 'hidden',
    flexShrink: 0,
    background: '#14588F',
    color: '#F1ECDE',
  }

  if (url) {
    return (
      <div style={style}>
        <img src={url} alt={name || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }

  return <div style={style}>{initialsFor(name)}</div>
}
