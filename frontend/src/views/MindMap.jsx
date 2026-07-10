import { useMemo, useRef, useState } from 'react'
import { Network, Plus, Trash2, FolderPlus, Pencil } from 'lucide-react'
import { View, Card, Button, Input, Chip, Modal, Field, IconButton } from '../components/ui'
import Mascot from '../components/Mascot'
import { useStoredState, MINDMAPS_KEY, logActivity } from '../lib/store'

const NODE_COLORS = [
  { id: 'clay', bg: 'rgb(var(--c-clay-wash))', border: 'rgb(var(--c-clay))', text: 'rgb(var(--c-clay-deep))' },
  { id: 'sky', bg: 'rgb(var(--c-sky-wash))', border: 'rgb(var(--c-sky))', text: 'rgb(var(--c-sky))' },
  { id: 'moss', bg: 'rgb(var(--c-moss-wash))', border: 'rgb(var(--c-moss))', text: 'rgb(var(--c-moss))' },
  { id: 'gold', bg: 'rgb(var(--c-gold-wash))', border: 'rgb(var(--c-gold))', text: 'rgb(var(--c-gold))' },
  { id: 'berry', bg: 'rgb(var(--c-berry-wash))', border: 'rgb(var(--c-berry))', text: 'rgb(var(--c-berry))' },
]

const colorOf = (id) => NODE_COLORS.find((c) => c.id === id) || NODE_COLORS[0]

function freshMap(name) {
  return {
    id: `map-${Date.now()}`,
    name,
    nodes: [{ id: 1, label: name, x: 50, y: 50, parentId: null, color: 'clay' }],
  }
}

export default function MindMap() {
  const [maps, setMaps] = useStoredState(MINDMAPS_KEY, [freshMap('My first map')])
  const [activeMapId, setActiveMapId] = useState(maps[0]?.id)
  const [selectedId, setSelectedId] = useState(null)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('sky')
  const [renaming, setRenaming] = useState(null)
  const [renameText, setRenameText] = useState('')
  const [creatingMap, setCreatingMap] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  const map = maps.find((m) => m.id === activeMapId) || maps[0]
  const nodes = map?.nodes || []
  const selected = nodes.find((n) => n.id === selectedId) || nodes.find((n) => n.parentId === null)

  const updateMap = (updater) => {
    setMaps((prev) => prev.map((m) => (m.id === map.id ? updater(m) : m)))
  }

  const addNode = (e) => {
    e.preventDefault()
    if (!label.trim() || !map) return
    const parent = selected || nodes[0]
    const siblings = nodes.filter((n) => n.parentId === parent.id).length
    const angle = (siblings * 62 + (parent.parentId === null ? 0 : 25)) * (Math.PI / 180)
    const radius = parent.parentId === null ? 26 : 17
    const x = Math.min(94, Math.max(6, parent.x + Math.cos(angle) * radius))
    const y = Math.min(92, Math.max(8, parent.y + Math.sin(angle) * radius))
    const node = { id: Date.now(), label: label.trim(), x, y, parentId: parent.id, color }
    updateMap((m) => ({ ...m, nodes: [...m.nodes, node] }))
    setSelectedId(node.id)
    setLabel('')
    logActivity('mindmap', `Added "${node.label}" to ${map.name}`)
  }

  const deleteNode = (id) => {
    const doomed = new Set([id])
    let grew = true
    while (grew) {
      grew = false
      for (const node of nodes) {
        if (node.parentId !== null && doomed.has(node.parentId) && !doomed.has(node.id)) {
          doomed.add(node.id)
          grew = true
        }
      }
    }
    updateMap((m) => ({ ...m, nodes: m.nodes.filter((n) => !doomed.has(n.id)) }))
    setSelectedId(null)
  }

  const onPointerDown = (e, node) => {
    e.preventDefault()
    setSelectedId(node.id)
    const rect = canvasRef.current.getBoundingClientRect()
    dragRef.current = { id: node.id, rect, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    drag.moved = true
    const x = Math.min(96, Math.max(4, ((e.clientX - drag.rect.left) / drag.rect.width) * 100))
    const y = Math.min(94, Math.max(6, ((e.clientY - drag.rect.top) / drag.rect.height) * 100))
    updateMap((m) => ({
      ...m,
      nodes: m.nodes.map((n) => (n.id === drag.id ? { ...n, x, y } : n)),
    }))
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const links = useMemo(
    () =>
      nodes
        .filter((n) => n.parentId !== null)
        .map((n) => ({ child: n, parent: nodes.find((p) => p.id === n.parentId) }))
        .filter((l) => l.parent),
    [nodes],
  )

  return (
    <View
      icon={Network}
      eyebrow="Visual thinking"
      title="Mind Maps"
      description="Click a bubble to select it, then every idea you add branches off that bubble. Drag anything anywhere."
      wide
      actions={
        <>
          <Mascot pose="think" size={4} />
          <Button variant="ghost" onClick={() => setCreatingMap(true)}>
            <FolderPlus className="h-4 w-4" /> New map
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {maps.map((m) => (
          <Chip key={m.id} active={m.id === map?.id} onClick={() => { setActiveMapId(m.id); setSelectedId(null) }}>
            {m.name}
          </Chip>
        ))}
        {maps.length > 1 && map && (
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              if (window.confirm(`Delete the map "${map.name}"?`)) {
                const remaining = maps.filter((m) => m.id !== map.id)
                setMaps(remaining)
                setActiveMapId(remaining[0]?.id)
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete map
          </Button>
        )}
      </div>

      <Card className="p-4">
        <form onSubmit={addNode} className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-56 flex-1 items-center gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={selected ? `Add an idea under "${selected.label}"` : 'Add an idea'}
              aria-label="New idea label"
            />
          </div>
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Bubble colour">
            {NODE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                aria-label={`${c.id} bubble`}
                onClick={() => setColor(c.id)}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c.id ? 'scale-110' : ''}`}
                style={{ background: c.bg, borderColor: color === c.id ? c.border : 'transparent' }}
              />
            ))}
          </div>
          <Button type="submit" disabled={!label.trim()}>
            <Plus className="h-4 w-4" /> Add branch
          </Button>
        </form>
        {selected && (
          <p className="mt-2 text-xs text-faint">
            Attaching to <span className="font-semibold text-ink">{selected.label}</span>. Click another bubble to change the parent.
          </p>
        )}
      </Card>

      <div
        ref={canvasRef}
        className="relative h-[540px] overflow-hidden rounded-card border border-line bg-raised shadow-card"
        style={{
          backgroundImage: 'radial-gradient(rgb(var(--c-line)) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {links.map(({ child, parent }) => {
            const midX = (child.x + parent.x) / 2
            return (
              <path
                key={`link-${child.id}`}
                d={`M ${parent.x} ${parent.y} C ${midX} ${parent.y}, ${midX} ${child.y}, ${child.x} ${child.y}`}
                fill="none"
                stroke={colorOf(child.color).border}
                strokeOpacity="0.6"
                strokeWidth="0.7"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        {nodes.map((node) => {
          const palette = colorOf(node.color)
          const isRoot = node.parentId === null
          const isSelected = selected?.id === node.id
          return (
            <button
              key={node.id}
              type="button"
              onPointerDown={(e) => onPointerDown(e, node)}
              onDoubleClick={() => {
                setRenaming(node.id)
                setRenameText(node.label)
              }}
              className={`map-node absolute max-w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 px-3.5 text-center text-sm font-medium shadow-card ${
                isRoot ? 'py-3 font-display text-base' : 'py-2'
              } ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                background: palette.bg,
                borderColor: palette.border,
                color: palette.text,
              }}
              aria-pressed={isSelected}
              aria-label={`${node.label}. ${isSelected ? 'Selected.' : 'Click to select.'} Double click to rename.`}
            >
              {node.label}
            </button>
          )
        })}

        {selected && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-line bg-raised/95 px-3 py-2 shadow-lift backdrop-blur-sm animate-pop-in">
            <span className="max-w-40 truncate text-xs font-medium text-soft">{selected.label}</span>
            <IconButton
              label="Rename bubble"
              className="h-7 w-7"
              onClick={() => {
                setRenaming(selected.id)
                setRenameText(selected.label)
              }}
            >
              <Pencil className="h-3 w-3" />
            </IconButton>
            {selected.parentId !== null && (
              <IconButton
                label="Delete bubble and its branches"
                className="h-7 w-7 hover:text-[rgb(148,30,30)]"
                onClick={() => deleteNode(selected.id)}
              >
                <Trash2 className="h-3 w-3" />
              </IconButton>
            )}
          </div>
        )}
      </div>

      <Modal open={renaming !== null} onClose={() => setRenaming(null)} title="Rename bubble">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!renameText.trim()) return
            updateMap((m) => ({
              ...m,
              nodes: m.nodes.map((n) => (n.id === renaming ? { ...n, label: renameText.trim() } : n)),
            }))
            setRenaming(null)
          }}
          className="space-y-4"
        >
          <Input value={renameText} onChange={(e) => setRenameText(e.target.value)} />
          <Button type="submit">Save</Button>
        </form>
      </Modal>

      <Modal open={creatingMap} onClose={() => setCreatingMap(false)} title="New mind map">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newMapName.trim()) return
            const created = freshMap(newMapName.trim())
            setMaps((prev) => [...prev, created])
            setActiveMapId(created.id)
            setSelectedId(null)
            setNewMapName('')
            setCreatingMap(false)
          }}
          className="space-y-4"
        >
          <Field label="Central idea">
            <Input value={newMapName} onChange={(e) => setNewMapName(e.target.value)} placeholder="e.g. The French Revolution" />
          </Field>
          <Button type="submit" disabled={!newMapName.trim()}>
            <FolderPlus className="h-4 w-4" /> Create map
          </Button>
        </form>
      </Modal>
    </View>
  )
}
