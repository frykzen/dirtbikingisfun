import React, { useEffect, useRef, useCallback } from 'react';

/**
 * MobileControls
 * Injects virtual inputs into an InputManager instance via touch events.
 *
 * Layout (landscape):
 *   Left half  → joystick-style d-pad  (throttle / brake / lean)
 *   Right half → action buttons        (slowMo / respawn)
 *
 * We set synthetic keys directly on input.keys so the existing
 * InputManager getters (throttle, brake, leanBack, leanForward, etc.)
 * keep working without modification.
 */
export default function MobileControls({ inputRef, crashed }) {
  const joystickRef   = useRef(null);
  const joystickTouch = useRef(null); // { id, startX, startY }
  const joystickPos   = useRef({ x: 0, y: 0 }); // -1 … 1

  // ── helpers ────────────────────────────────────────────────────────────────
  const setKey = useCallback((code, down) => {
    const input = inputRef?.current;
    if (!input) return;
    if (down && !input.keys[code]) input.justPressed[code] = true;
    input.keys[code] = down;
  }, [inputRef]);

  const clearMovement = useCallback(() => {
    ['ArrowUp','KeyW','ArrowDown','KeyS','ArrowLeft','KeyA','ArrowRight','KeyD']
      .forEach(k => setKey(k, false));
  }, [setKey]);

  const applyJoystick = useCallback((dx, dy) => {
    const DEAD = 0.18;
    // Horizontal: lean
    setKey('ArrowLeft',  dx < -DEAD);
    setKey('KeyA',       dx < -DEAD);
    setKey('ArrowRight', dx >  DEAD);
    setKey('KeyD',       dx >  DEAD);
    // Vertical: throttle (up) / brake (down)
    setKey('ArrowUp', dy < -DEAD);
    setKey('KeyW',    dy < -DEAD);
    setKey('ArrowDown', dy > DEAD);
    setKey('KeyS',      dy > DEAD);
  }, [setKey]);

  // ── joystick touch handlers ────────────────────────────────────────────────
  const onJoystickStart = useCallback((e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joystickTouch.current = { id: t.identifier, startX: t.clientX, startY: t.clientY };
  }, []);

  const onJoystickMove = useCallback((e) => {
    e.preventDefault();
    if (!joystickTouch.current) return;
    const t = [...e.touches].find(t => t.identifier === joystickTouch.current.id);
    if (!t) return;
    const RADIUS = 55;
    let dx = (t.clientX - joystickTouch.current.startX) / RADIUS;
    let dy = (t.clientY - joystickTouch.current.startY) / RADIUS;
    const mag = Math.sqrt(dx*dx + dy*dy);
    if (mag > 1) { dx /= mag; dy /= mag; }
    joystickPos.current = { x: dx, y: dy };
    applyJoystick(dx, dy);

    // Update knob visual
    const knob = joystickRef.current?.querySelector('.joystick-knob');
    if (knob) {
      knob.style.transform = `translate(${dx*40}px, ${dy*40}px)`;
    }
  }, [applyJoystick]);

  const onJoystickEnd = useCallback((e) => {
    e.preventDefault();
    if (!joystickTouch.current) return;
    const stillActive = [...e.touches].some(t => t.identifier === joystickTouch.current.id);
    if (!stillActive) {
      joystickTouch.current = null;
      joystickPos.current = { x: 0, y: 0 };
      clearMovement();
      const knob = joystickRef.current?.querySelector('.joystick-knob');
      if (knob) knob.style.transform = 'translate(0,0)';
    }
  }, [clearMovement]);

  // ── action button helpers ──────────────────────────────────────────────────
  const makeButtonHandlers = (code) => ({
    onTouchStart: (e) => { e.preventDefault(); setKey(code, true); },
    onTouchEnd:   (e) => { e.preventDefault(); setKey(code, false); },
    onTouchCancel:(e) => { e.preventDefault(); setKey(code, false); },
  });

  // Respawn: just a momentary press
  const handleRespawn = useCallback((e) => {
    e.preventDefault();
    setKey('KeyR', true);
    setTimeout(() => setKey('KeyR', false), 80);
  }, [setKey]);

  // Wheelie mode: toggle on tap
  const handleWheelieTap = useCallback((e) => {
    e.preventDefault();
    const input = inputRef?.current;
    if (input) input.wheelieModeActive = !input.wheelieModeActive;
  }, [inputRef]);

  // ── joystick region listeners (passive:false for preventDefault) ───────────
  useEffect(() => {
    const el = joystickRef.current;
    if (!el) return;
    el.addEventListener('touchstart',  onJoystickStart, { passive: false });
    el.addEventListener('touchmove',   onJoystickMove,  { passive: false });
    el.addEventListener('touchend',    onJoystickEnd,   { passive: false });
    el.addEventListener('touchcancel', onJoystickEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart',  onJoystickStart);
      el.removeEventListener('touchmove',   onJoystickMove);
      el.removeEventListener('touchend',    onJoystickEnd);
      el.removeEventListener('touchcancel', onJoystickEnd);
    };
  }, [onJoystickStart, onJoystickMove, onJoystickEnd]);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={{ touchAction: 'none' }}
    >
      {/* ── LEFT: joystick ────────────────────────────────────────────────── */}
      <div
        ref={joystickRef}
        className="pointer-events-auto absolute"
        style={{
          bottom: 'env(safe-area-inset-bottom, 24px)',
          left:   'env(safe-area-inset-left, 24px)',
          marginBottom: 24,
          marginLeft: 24,
          width:  120,
          height: 120,
          touchAction: 'none',
        }}
      >
        {/* Outer ring */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '2px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(4px)',
        }} />
        {/* Directional arrows for context */}
        {[
          { label:'▲', top:'4px',  left:'50%', transform:'translateX(-50%)' },
          { label:'▼', bottom:'4px',left:'50%', transform:'translateX(-50%)' },
          { label:'◀', left:'4px', top:'50%',  transform:'translateY(-50%)' },
          { label:'▶', right:'4px',top:'50%',  transform:'translateY(-50%)' },
        ].map(a => (
          <span key={a.label} style={{
            position:'absolute', ...a, fontSize:10,
            color:'rgba(255,255,255,0.25)', lineHeight:1, pointerEvents:'none',
          }}>{a.label}</span>
        ))}
        {/* Knob */}
        <div className="joystick-knob" style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: 44, height: 44,
          marginTop: -22, marginLeft: -22,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.35), rgba(255,255,255,0.1))',
          border: '2px solid rgba(255,255,255,0.3)',
          transition: 'transform 0.05s ease',
          pointerEvents: 'none',
        }} />
        {/* Labels */}
        <div style={{
          position:'absolute', top:'-20px', left:'50%', transform:'translateX(-50%)',
          fontSize:9, color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap',
          fontFamily:'Rajdhani, sans-serif', letterSpacing:'0.08em',
        }}>GAS / LEAN</div>
      </div>

      {/* ── RIGHT: action buttons ─────────────────────────────────────────── */}
      <div
        className="pointer-events-auto absolute flex flex-col gap-3 items-end"
        style={{
          bottom: 'env(safe-area-inset-bottom, 24px)',
          right:  'env(safe-area-inset-right, 24px)',
          marginBottom: 24,
          marginRight: 24,
          touchAction: 'none',
        }}
      >
        {/* WHEELIE */}
        <ActionBtn
          label="WHEEL"
          sublabel="IE"
          color="rgba(255,160,50,0.85)"
          bg="rgba(200,100,20,0.18)"
          border="rgba(255,160,50,0.35)"
          onTouchStart={handleWheelieTap}
          onTouchEnd={() => {}}
        />

        {/* RESPAWN */}
        <ActionBtn
          label="R"
          sublabel="SPAWN"
          color="rgba(255,210,60,0.9)"
          bg="rgba(220,160,20,0.18)"
          border="rgba(255,210,60,0.35)"
          onTouchStart={handleRespawn}
          onTouchEnd={() => {}}
          onTouchCancel={() => {}}
          pulse={crashed}
        />
      </div>
    </div>
  );
}

function ActionBtn({ label, sublabel, color, bg, border, onTouchStart, onTouchEnd, onTouchCancel, pulse }) {
  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{
        width: 68, height: 68,
        borderRadius: '50%',
        background: bg,
        border: `2px solid ${border}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        boxShadow: pulse ? `0 0 18px ${color}` : 'none',
        transition: 'box-shadow 0.4s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <span style={{ color, fontSize: 18, fontWeight: 700, fontFamily: '"Barlow Condensed", sans-serif', lineHeight: 1 }}>{label}</span>
      <span style={{ color: color.replace('0.9','0.5').replace('0.85','0.5'), fontSize: 9, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.08em', marginTop: 2 }}>{sublabel}</span>
    </div>
  );
}
