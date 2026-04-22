import React, { useId } from 'react'

const PALETTE_COLORS = {
  red:      { body: '#D94F3D', shadow: '#A83228', highlight: '#F07060', cheek: '#F09080' },
  blue:     { body: '#3D7BC4', shadow: '#2A5A9A', highlight: '#6098D8', cheek: '#90B8E8' },
  green:    { body: '#4A9E6B', shadow: '#2E7A4E', highlight: '#6EC48A', cheek: '#98D4AA' },
  orange:   { body: '#E8873A', shadow: '#B86020', highlight: '#F4A860', cheek: '#F4C080' },
  lavender: { body: '#9B72C4', shadow: '#7050A0', highlight: '#BC9AE0', cheek: '#D0B8F0' },
  yellow:   { body: '#D4AC35', shadow: '#A88018', highlight: '#ECC850', cheek: '#F4DC80' },
  pink:     { body: '#E87CA0', shadow: '#C05878', highlight: '#F4A0BC', cheek: '#F8C0D0' },
  mint:     { body: '#4ABCAA', shadow: '#2E9888', highlight: '#70D4C4', cheek: '#A0E4D8' },
}

const EXPRESSIONS = {
  happy: {
    leftEye:  { rx: 5, ry: 5.5, closed: false },
    rightEye: { rx: 5, ry: 5.5, closed: false },
    pupilDy: 0,
    mouth: 'M -10 2 Q 0 12 10 2',
    eyebrowL: 'M -18 -38 Q -12 -42 -6 -38',
    eyebrowR: 'M 6 -38 Q 12 -42 18 -38',
    blush: true,
  },
  surprised: {
    leftEye:  { rx: 6, ry: 7, closed: false },
    rightEye: { rx: 6, ry: 7, closed: false },
    pupilDy: 0,
    mouth: 'M -8 4 Q 0 14 8 4',
    eyebrowL: 'M -18 -42 Q -12 -47 -6 -42',
    eyebrowR: 'M 6 -42 Q 12 -47 18 -42',
    blush: false,
  },
  focused: {
    leftEye:  { rx: 5, ry: 3.5, closed: false },
    rightEye: { rx: 5, ry: 3.5, closed: false },
    pupilDy: 1,
    mouth: 'M -8 4 Q 0 8 8 4',
    eyebrowL: 'M -20 -38 Q -12 -45 -4 -40',
    eyebrowR: 'M 4 -40 Q 12 -45 20 -38',
    blush: false,
  },
  neutral: {
    leftEye:  { rx: 5, ry: 5, closed: false },
    rightEye: { rx: 5, ry: 5, closed: false },
    pupilDy: 0,
    mouth: 'M -8 4 Q 0 9 8 4',
    eyebrowL: 'M -18 -38 Q -12 -41 -6 -38',
    eyebrowR: 'M 6 -38 Q 12 -41 18 -38',
    blush: false,
  },
}

function Hat({ color }) {
  return (
    <g>
      {/* brim */}
      <ellipse cx="0" cy="-72" rx="32" ry="7" fill={color.shadow} />
      {/* crown */}
      <rect x="-20" y="-106" width="40" height="38" rx="5" fill={color.body} />
      {/* hat band */}
      <rect x="-22" y="-79" width="44" height="9" rx="3" fill={color.shadow} />
      {/* highlight strip on crown */}
      <rect x="-8" y="-103" width="6" height="28" rx="3" fill={color.highlight} opacity="0.4" />
    </g>
  )
}

function Glasses() {
  return (
    <g fill="none" stroke="#3D2B1F" strokeWidth="2.5">
      {/* left lens */}
      <ellipse cx="-13" cy="-30" rx="10" ry="8" fill="rgba(180,220,255,0.35)" />
      {/* right lens */}
      <ellipse cx="13" cy="-30" rx="10" ry="8" fill="rgba(180,220,255,0.35)" />
      {/* bridge */}
      <line x1="-3" y1="-30" x2="3" y2="-30" />
      {/* arms */}
      <line x1="-23" y1="-30" x2="-34" y2="-26" />
      <line x1="23" y1="-30" x2="34" y2="-26" />
    </g>
  )
}

function Scarf({ color }) {
  return (
    <g>
      {/* main wrap */}
      <rect x="-30" y="16" width="60" height="18" rx="6" fill={color.body} />
      {/* stripe */}
      <rect x="-30" y="20" width="60" height="5" rx="0" fill={color.highlight} opacity="0.5" />
      {/* knot */}
      <ellipse cx="10" cy="28" rx="12" ry="9" fill={color.shadow} />
      <ellipse cx="10" cy="28" rx="7" ry="6" fill={color.body} />
      {/* tail */}
      <path d="M 4 34 Q 6 50 2 58" stroke={color.body} strokeWidth="8" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Headband({ color }) {
  return (
    <g>
      <path
        d="M -34 -52 Q 0 -68 34 -52"
        fill="none"
        stroke={color.body}
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* bow on top */}
      <ellipse cx="-10" cy="-64" rx="9" ry="6" fill={color.highlight} transform="rotate(-20,-10,-64)" />
      <ellipse cx="10" cy="-64" rx="9" ry="6" fill={color.highlight} transform="rotate(20,10,-64)" />
      <circle cx="0" cy="-64" r="5" fill={color.body} />
    </g>
  )
}

function Bow({ color }) {
  return (
    <g transform="translate(22, -62)">
      <ellipse cx="-10" cy="0" rx="11" ry="7" fill={color.body} transform="rotate(-15,-10,0)" />
      <ellipse cx="10" cy="0" rx="11" ry="7" fill={color.body} transform="rotate(15,10,0)" />
      <circle cx="0" cy="0" r="6" fill={color.highlight} />
      <circle cx="0" cy="0" r="3" fill={color.shadow} />
    </g>
  )
}

function Bandana({ color }) {
  return (
    <g>
      {/* top headband part */}
      <path
        d="M -34 -46 Q 0 -58 34 -46"
        fill="none"
        stroke={color.body}
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* polka dots */}
      <circle cx="-14" cy="-53" r="2.5" fill={color.highlight} opacity="0.7" />
      <circle cx="0" cy="-57" r="2.5" fill={color.highlight} opacity="0.7" />
      <circle cx="14" cy="-53" r="2.5" fill={color.highlight} opacity="0.7" />
      {/* knot/tail on side */}
      <path d="M 34 -46 Q 44 -38 40 -28" stroke={color.shadow} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M 34 -46 Q 46 -50 44 -38" stroke={color.body} strokeWidth="6" fill="none" strokeLinecap="round" />
    </g>
  )
}

function renderAccessory(accessory, color) {
  switch (accessory) {
    case 'hat':      return <Hat color={color} />
    case 'glasses':  return <Glasses />
    case 'scarf':    return <Scarf color={color} />
    case 'headband': return <Headband color={color} />
    case 'bow':      return <Bow color={color} />
    case 'bandana':  return <Bandana color={color} />
    default:         return null
  }
}

export default function Character({
  color = 'blue',
  accessory = 'none',
  expression = 'happy',
  size = 120,
  animation = 'idle', // 'idle' | 'squash' | 'none'
  className = '',
}) {
  const uid = useId().replace(/:/g, '')
  const colors = PALETTE_COLORS[color] || PALETTE_COLORS.blue
  const expr = EXPRESSIONS[expression] || EXPRESSIONS.happy

  const animClass =
    animation === 'idle'   ? 'animate-bob' :
    animation === 'squash' ? 'animate-squash' : ''

  return (
    <svg
      viewBox="-60 -120 120 160"
      width={size}
      height={size * (160 / 120)}
      className={`${animClass} ${className}`}
      style={{ overflow: 'visible' }}
      aria-label={`Character with ${color} color`}
    >
      <defs>
        {/* Paper layer shadow filter */}
        <filter id={`shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="rgba(61,43,31,0.25)" />
        </filter>
        <filter id={`inner-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(61,43,31,0.2)" />
        </filter>
        {/* Radial gradient for body */}
        <radialGradient id={`body-grad-${uid}`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={colors.highlight} />
          <stop offset="60%" stopColor={colors.body} />
          <stop offset="100%" stopColor={colors.shadow} />
        </radialGradient>
        {/* Clip for body */}
        <clipPath id={`body-clip-${uid}`}>
          <ellipse cx="0" cy="0" rx="46" ry="50" />
        </clipPath>
      </defs>

      {/* ── Legs (behind body) ── */}
      <g filter={`url(#shadow-${uid})`}>
        {/* left leg */}
        <rect x="-26" y="38" width="20" height="26" rx="10" fill={colors.body} />
        <rect x="-24" y="38" width="8" height="12" rx="0" fill={colors.highlight} opacity="0.35" />
        {/* right leg */}
        <rect x="6" y="38" width="20" height="26" rx="10" fill={colors.body} />
      </g>

      {/* ── Arms ── */}
      <g filter={`url(#shadow-${uid})`}>
        {/* left arm */}
        <ellipse cx="-52" cy="4" rx="12" ry="9" fill={colors.body} transform="rotate(-25,-52,4)" />
        <ellipse cx="-52" cy="4" rx="5" ry="4" fill={colors.highlight} opacity="0.35" transform="rotate(-25,-52,4)" />
        {/* right arm */}
        <ellipse cx="52" cy="4" rx="12" ry="9" fill={colors.body} transform="rotate(25,52,4)" />
      </g>

      {/* ── Main body ── */}
      <ellipse
        cx="0" cy="0"
        rx="46" ry="50"
        fill={`url(#body-grad-${uid})`}
        filter={`url(#shadow-${uid})`}
      />

      {/* Paper texture crease on body */}
      <ellipse
        cx="0" cy="0"
        rx="46" ry="50"
        fill="none"
        stroke={colors.highlight}
        strokeWidth="1.5"
        opacity="0.3"
        clipPath={`url(#body-clip-${uid})`}
        transform="translate(0,-8)"
      />

      {/* ── Face layer ── */}
      <g filter={`url(#inner-${uid})`}>

        {/* Cheeks (blush) */}
        {expr.blush && (
          <>
            <ellipse cx="-22" cy="-8" rx="10" ry="7" fill={colors.cheek} opacity="0.55" />
            <ellipse cx="22" cy="-8" rx="10" ry="7" fill={colors.cheek} opacity="0.55" />
          </>
        )}

        {/* Eyebrows */}
        <path
          d={expr.eyebrowL}
          fill="none"
          stroke={colors.shadow}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d={expr.eyebrowR}
          fill="none"
          stroke={colors.shadow}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Left eye */}
        <g transform="translate(-14,-28)" className="animate-blink" style={{ transformOrigin: '-14px -28px' }}>
          <ellipse cx="0" cy="0" rx={expr.leftEye.rx} ry={expr.leftEye.ry} fill="white" />
          <ellipse cx="1" cy={1 + expr.pupilDy} rx="3.2" ry="3.5" fill={colors.shadow} />
          <circle cx="2.5" cy={-0.5 + expr.pupilDy} r="1.2" fill="white" />
        </g>

        {/* Right eye */}
        <g transform="translate(14,-28)" className="animate-blink" style={{ transformOrigin: '14px -28px' }}>
          <ellipse cx="0" cy="0" rx={expr.rightEye.rx} ry={expr.rightEye.ry} fill="white" />
          <ellipse cx="1" cy={1 + expr.pupilDy} rx="3.2" ry="3.5" fill={colors.shadow} />
          <circle cx="2.5" cy={-0.5 + expr.pupilDy} r="1.2" fill="white" />
        </g>

        {/* Mouth */}
        <path
          d={expr.mouth}
          fill="none"
          stroke={colors.shadow}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

      </g>

      {/* ── Accessory (rendered last = on top) ── */}
      {renderAccessory(accessory, colors)}

    </svg>
  )
}
