import React from 'react';
import { OBJECT_TYPES } from './TrackEditor';

export default function TrackEditorPanel({ editor, onClose }) {
  if (!editor) return null;

  const types = Object.entries(OBJECT_TYPES);

  return (
    <div className="absolute left-0 top-0 bottom-0 w-52 z-20 flex flex-col"
      style={{ background: 'rgba(8,6,4,0.92)', borderRight: '1px solid rgba(180,130,50,0.25)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <div className="font-heading font-bold text-sm text-amber-400 tracking-widest mb-0.5">TRACK EDITOR</div>
        <div className="text-[10px] text-white/30 font-body">Build your motocross park</div>
      </div>

      {/* Object palette */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="text-[10px] text-white/30 font-body uppercase tracking-widest mb-2">Place Objects</div>
        {types.map(([key, def]) => (
          <button
            key={key}
            onClick={() => { editor.curType = key; }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left transition-all ${
              editor.curType === key
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                : 'bg-white/4 border border-white/8 text-white/60 hover:bg-white/8 hover:text-white/80'
            }`}
          >
            <span className="font-mono text-base w-6 text-center" style={{ color: def.color }}>{def.icon}</span>
            <span className="font-body text-xs font-semibold">{def.label}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="px-3 py-3 border-t border-white/5 space-y-2">
        <div className="text-[10px] text-white/30 font-body uppercase tracking-widest mb-2">Controls</div>

        {/* Rotation */}
        <div className="flex items-center gap-2">
          <button onClick={() => editor.rotateSelected(-15)}
            className="flex-1 py-1.5 text-xs font-body bg-white/5 border border-white/10 rounded text-white/60 hover:bg-white/10 hover:text-white transition-all">
            ← Q  -15°
          </button>
          <button onClick={() => editor.rotateSelected(15)}
            className="flex-1 py-1.5 text-xs font-body bg-white/5 border border-white/10 rounded text-white/60 hover:bg-white/10 hover:text-white transition-all">
            E →  +15°
          </button>
        </div>

        <button onClick={() => editor.deleteHovered()}
          className="w-full py-1.5 text-xs font-body bg-red-900/20 border border-red-800/30 rounded text-red-400 hover:bg-red-900/40 transition-all">
          Delete Hovered (Del)
        </button>

        <button onClick={() => { editor.clear(); }}
          className="w-full py-1.5 text-xs font-body bg-white/4 border border-white/8 rounded text-white/40 hover:bg-white/8 hover:text-red-400 transition-all">
          Clear All
        </button>

        <button onClick={onClose}
          className="w-full py-2 text-xs font-heading font-bold bg-amber-600/20 border border-amber-500/40 rounded text-amber-300 hover:bg-amber-600/35 transition-all tracking-widest">
          ▶  RIDE (Esc)
        </button>
      </div>

      {/* Hint */}
      <div className="px-3 pb-3">
        <div className="text-[9px] text-white/20 font-body leading-relaxed">
          Click terrain to place • Drag to reposition • Saved automatically
        </div>
      </div>
    </div>
  );
}