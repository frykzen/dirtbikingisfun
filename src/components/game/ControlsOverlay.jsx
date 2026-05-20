import React, { useState, useEffect } from 'react';

export default function ControlsOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    const handleKey = () => setVisible(false);
    window.addEventListener('keydown', handleKey, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <>
      {visible && (
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-black/60 backdrop-blur-md rounded-xl px-8 py-5 border border-white/10">
            <div className="flex gap-8 items-start">
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-1.5">
                  <Key label="W" />
                  <span className="text-white/30 text-xs self-center">/</span>
                  <Key label="↑" />
                </div>
                <span className="text-white/40 text-[11px] font-body tracking-wide">THROTTLE</span>
              </div>
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-1.5">
                  <Key label="S" />
                  <span className="text-white/30 text-xs self-center">/</span>
                  <Key label="↓" />
                </div>
                <span className="text-white/40 text-[11px] font-body tracking-wide">BRAKE</span>
              </div>
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-1.5">
                  <Key label="A" />
                </div>
                <span className="text-white/40 text-[11px] font-body tracking-wide">WHEELIE</span>
              </div>
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-1.5">
                  <Key label="D" />
                </div>
                <span className="text-white/40 text-[11px] font-body tracking-wide">STOPPIE</span>
              </div>
              <div className="text-center">
                <div className="flex gap-1 justify-center mb-1.5">
                  <Key label="R" />
                </div>
                <span className="text-white/40 text-[11px] font-body tracking-wide">RESPAWN</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Key({ label, wide }) {
  return (
    <span className={`inline-flex items-center justify-center ${wide ? 'px-3' : 'w-8'} h-8 
      bg-white/10 border border-white/20 rounded-md text-white/80 text-xs font-heading font-semibold
      shadow-[0_2px_0_rgba(255,255,255,0.05)]`}>
      {label}
    </span>
  );
}