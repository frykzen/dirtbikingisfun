import React, { useState, useMemo, useRef, useEffect } from 'react';
import GameCanvas from '../components/game/GameCanvas';
import ControlsOverlay from '../components/game/ControlsOverlay';
import MobileControls from '../components/game/MobileControls';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}


const CHASSIS_SPRITES = [
  'Bike_Chassis_1','Bike_Chassis_2','Bike_Chassis_3','Bike_Chassis_4',
  'Bike_Chassis_5','Bike_Chassis_6','Bike_Chassis_7','Bike_Chassis_8',
];

export default function Game() {
  const [screen, setScreen]     = useState('lobby');
  const [mapName, setMapName]   = useState('enduro');
  const isMobile = useIsMobile();
  const inputRef = useRef(null);

  const [username, setUsername]       = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('db_username') : '') || '');
  const [chassisIdx, setChassisIdx]   = useState(() => parseInt((typeof window !== 'undefined' ? localStorage.getItem('db_chassis') : '0') || '0'));

  const [mpMode, setMpMode]     = useState('solo');
  const [joinId, setJoinId]     = useState('');
  const [mpStatus, setMpStatus] = useState('');
  const [myPeerId, setMyPeerId] = useState('');

  useEffect(() => { localStorage.setItem('db_username', username); }, [username]);
  useEffect(() => { localStorage.setItem('db_chassis', String(chassisIdx)); }, [chassisIdx]);

  const handlePlay = () => {
    if (!username.trim()) { alert('Enter a username first!'); return; }
    if (mpMode === 'join' && !joinId.trim()) { alert('Paste the host Peer ID to join!'); return; }
    setScreen('playing');
  };

  const mpConfig = useMemo(() => ({
    mode:       mpMode,
    joinId:     joinId.trim(),
    username:   username.trim() || 'Rider',
    onStatus:   setMpStatus,
    onMyId:     setMyPeerId,
  }), [joinId, mpMode, username]);

  if (screen === 'playing') {
    return (
      <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ touchAction: 'none' }}>
        <GameCanvas
          mapName={mapName}
          mpConfig={mpConfig}
          inputRef={inputRef}
          chassisIdx={chassisIdx}
          username={username.trim() || 'Rider'}
        />
        {!isMobile && <ControlsOverlay />}
        {isMobile && <MobileControls inputRef={inputRef} />}
        <div className="absolute top-3 right-3 z-30 flex gap-2 items-start">
          {mpMode !== 'solo' && (
            <div className="bg-black/70 border border-white/20 rounded px-3 py-1 text-xs font-mono text-green-400 max-w-[260px]">
              {mpMode === 'host' && myPeerId ? (
                <div>
                  <div className="text-white/40 text-[10px] mb-0.5">YOUR PEER ID (share this)</div>
                  <div className="text-white font-bold break-all select-text">{myPeerId}</div>
                </div>
              ) : (
                <span>{mpStatus || 'Starting multiplayer…'}</span>
              )}
            </div>
          )}

          <button
            onClick={() => setScreen('lobby')}
            className="px-3 py-1 rounded font-bold text-xs tracking-widest border-2 bg-amber-500 border-amber-300 text-black hover:bg-amber-400"
            style={{ minHeight: 36, touchAction: 'none' }}
          >
            MENU
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 w-full max-w-md flex flex-col gap-5 overflow-y-auto max-h-full">

        <div className="text-center">
          <h1 className="text-white font-bold text-3xl tracking-widest">DIRTBIKE</h1>
        </div>

        <div>
          <label className="text-white/60 text-xs tracking-widest uppercase mb-2 block">Username</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username…"
            maxLength={16}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white font-mono text-base focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="text-white/60 text-xs tracking-widest uppercase mb-2 block">Bike Skin</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CHASSIS_SPRITES.map((s, i) => (
              <button
                key={i}
                onClick={() => setChassisIdx(i)}
                className="flex-shrink-0 w-20 h-14 rounded-lg border-2 bg-white/5 overflow-hidden flex items-center justify-center transition-all active:scale-95"
                style={{ borderColor: chassisIdx === i ? '#F59E0B' : 'rgba(255,255,255,0.15)' }}
              >
                <img
                  src={`/sprites/${s}.png`}
                  alt={`skin ${i+1}`}
                  className="max-w-full max-h-full object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-white/60 text-xs tracking-widest uppercase mb-2 block">Map</label>
          <div className="flex gap-2">
            {[['enduro','Enduro'], ['road','Road']].map(([m, label]) => (
              <button key={m} onClick={() => setMapName(m)}
                className="flex-1 py-3 rounded-lg border-2 text-white font-bold text-sm tracking-wide transition-all active:scale-95"
                style={{
                  borderColor: mapName === m ? '#F59E0B' : 'rgba(255,255,255,0.2)',
                  background: mapName === m ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-white/60 text-xs tracking-widest uppercase mb-2 block">Multiplayer</label>
          <div className="flex gap-2 mb-3">
            {[['solo','Solo'],['host','Host'],['join','Join']].map(([m, label]) => (
              <button key={m} onClick={() => { setMpMode(m); setMpStatus(''); }}
                className="flex-1 py-3 rounded-lg border-2 text-white font-bold text-xs tracking-wide transition-all active:scale-95"
                style={{
                  borderColor: mpMode === m ? '#4ADE80' : 'rgba(255,255,255,0.2)',
                  background: mpMode === m ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                }}>
                {label}
              </button>
            ))}
          </div>
          {mpMode === 'host' && (
            <p className="text-white/50 text-xs">Host a session — your Peer ID appears in-game. Share it with friends.</p>
          )}
          {mpMode === 'join' && (
            <div>
              <label className="text-white/60 text-xs mb-1 block">Host's Peer ID</label>
              <input value={joinId} onChange={e => setJoinId(e.target.value)}
                placeholder="Paste host ID here…"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-green-400" />
              <p className="text-white/40 text-xs mt-1">Host shares their ID after clicking RIDE</p>
            </div>
          )}
        </div>

        <button onClick={handlePlay}
          className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xl tracking-widest transition-all active:scale-95">
          RIDE
        </button>
      </div>
    </div>
  );
}

