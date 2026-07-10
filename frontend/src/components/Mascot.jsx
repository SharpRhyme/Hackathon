import { useAccessibility } from '../context/AccessibilityContext'

// Pixel mascot with per-view poses.
// wave  — greeting (home)
// cheer — both arms up, bouncing (progress)
// chill — sunglasses vibe, slow sway (arcade / break room)
// read  — holding a book (bookshelf)
// think — hand on chin, blinking (AI views)
export default function Mascot({ pose = 'wave', size = 7, className = '' }) {
  const { settings } = useAccessibility()
  const mascot = settings.mascot || {}

  return (
    <div
      className={`pixel-mascot pose-${pose} ${className}`}
      style={{
        '--px': `${size}px`,
        '--mascot-skin': mascot.skin || '#FFDABC',
        '--mascot-skin-shadow': '#EBB29A',
        '--mascot-hair': mascot.hair || '#343A54',
        '--mascot-shirt': mascot.shirt || 'rgb(var(--c-clay))',
        '--mascot-shirt-shadow': 'rgb(var(--c-clay-deep))',
        '--mascot-scarf': mascot.scarf || 'rgb(var(--c-gold))',
      }}
      aria-hidden="true"
    >
      <span className="pixel-mascot__shadow" />
      <span className="pixel-mascot__hair hair-left" />
      <span className="pixel-mascot__hair hair-right" />
      <span className="pixel-mascot__head" />
      <span className="pixel-mascot__eye eye-left" />
      <span className="pixel-mascot__eye eye-right" />
      <span className="pixel-mascot__blush blush-left" />
      <span className="pixel-mascot__blush blush-right" />
      <span className="pixel-mascot__mouth" />
      <span className="pixel-mascot__body" />
      <span className="pixel-mascot__scarf scarf-left" />
      <span className="pixel-mascot__scarf scarf-right" />
      <span className="pixel-mascot__arm arm-left" />
      {/* arm + hand move as one unit so the hand never detaches */}
      <span className="pixel-mascot__armgroup">
        <span className="pixel-mascot__arm arm-right" />
        <span className="pixel-mascot__hand" />
      </span>
      {pose === 'read' && <span className="pixel-mascot__book" />}
      {pose === 'type' && <span className="pixel-mascot__keyboard" />}
      {pose === 'think' && <span className="pixel-mascot__bubble" />}
      {pose === 'scout' && <span className="pixel-mascot__lens" />}
      <span className="pixel-mascot__leg leg-left" />
      <span className="pixel-mascot__leg leg-right" />
      <span className="pixel-mascot__spark spark-one" />
      <span className="pixel-mascot__spark spark-two" />
    </div>
  )
}
