// WebRTC P2P multiplayer via PeerJS (no server needed — uses free PeerJS cloud signaling)
// Sends bike state 20x/sec. Peers render each other's bikes locally.

import Peer from 'peerjs';

const SEND_RATE = 1 / 60; // 60 Hz state updates — smoother remote players


export default class MultiplayerManager {
  constructor() {
    this.peer       = null;
    this.conn       = null;
    this.myId       = null;
    this.remotePeers = {};
    this.username   = '';
    this.isHost     = false;
    this.connected  = false;
    this.onStatus   = null;
    this.onSeedReceived = null; // guest callback(seed)
    this.terrainSeed    = null; // host sets this before calling host()
    this._sendTimer = 0;
  }

  // ── Init as host ──────────────────────────────────────────────────────────
  host(username, onMyId) {
    this.username  = username;
    this.isHost    = true;
    this._onMyId   = onMyId || null;
    this._createPeer(null);
  }

  join(hostId, username, onMyId) {
    this.username  = username;
    this.isHost    = false;
    this._onMyId   = onMyId || null;
    this._createPeer(hostId);
  }

  _createPeer(connectToId) {
    this._status('Connecting to signaling server…');
    try {
      this.peer = new Peer(undefined, { debug: 1 });
    } catch (e) {
      this._status(`PeerJS init failed: ${e.message || e}`);
      return;
    }

    this.peer.on('open', (id) => {
      this.myId = id;
      if (this._onMyId) this._onMyId(id);
      if (connectToId) {
        this._status(`Got ID ${id} — connecting to host ${connectToId}…`);
        this._connectTo(connectToId);
      } else {
        this._status(`Hosting! Share this ID: ${id}`);
      }
    });

    this.peer.on('connection', (conn) => {
      this._setupConn(conn);
      this._status(`Player connected!`);
      conn.on('open', () => {
        if (this.terrainSeed !== null) {
          try { conn.send({ type: 'seed', seed: this.terrainSeed }); } catch(_) {}
        }
      });
    });

    this.peer.on('error', (err) => {
      this._status(`Error: ${err.message || err.type}`);
    });
  }


  _connectTo(peerId) {
    const conn = this.peer.connect(peerId, { reliable: false, serialization: 'json' });
    this._setupConn(conn);
  }

  _setupConn(conn) {
    const peerId = conn.peer;
    conn.on('open', () => {
      this.connected = true;
      // Store connection — support multiple peers (host stores all)
      if (!this.remotePeers[peerId]) {
        this.remotePeers[peerId] = { state: null, username: '?', color: '#ffffff', lastSeen: 0, conn };
      } else {
        this.remotePeers[peerId].conn = conn;
      }
      this._status('Connected!');
    });

    conn.on('data', (data) => {
      if (!data || !data.type) return;

      if (data.type === 'seed') {
        if (!this.isHost && this.onSeedReceived) this.onSeedReceived(data.seed);
        return;
      }

      if (!this.remotePeers[peerId]) {
        this.remotePeers[peerId] = { state: null, username: '?', lastSeen: 0, conn };
      }
      const remote = this.remotePeers[peerId];
      remote.lastSeen = Date.now();

      if (data.type === 'state') {
        remote.state       = data.bike;
        remote.username    = data.username || '?';
        remote.chassisName = data.chassisName || 'Bike_Chassis_1';
        if (remote.state) remote.state.chassisName = remote.chassisName;
        // Host relays to other guests
        if (this.isHost) {
          for (const [otherId, other] of Object.entries(this.remotePeers)) {
            if (otherId !== peerId && other.conn && other.conn.open) {
              try { other.conn.send({ ...data, type: 'relayed', fromPeer: peerId }); } catch(_) {}
            }
          }
        }
      } else if (data.type === 'relayed') {
        const fromId = data.fromPeer;
        if (!this.remotePeers[fromId]) {
          this.remotePeers[fromId] = { state: null, username: '?', chassisName: 'Bike_Chassis_1', lastSeen: 0, conn: null };
        }
        const r2 = this.remotePeers[fromId];
        r2.state       = data.bike;
        r2.username    = data.username || '?';
        r2.chassisName = data.chassisName || 'Bike_Chassis_1';
        if (r2.state) r2.state.chassisName = r2.chassisName;
        r2.lastSeen    = Date.now();
      }
    });

    conn.on('close', () => {
      this.connected = Object.values(this.remotePeers).some(p => p.conn && p.conn.open);
      delete this.remotePeers[peerId];
      this._status('Peer disconnected');
    });

    conn.on('error', (err) => {
      this._status(`Conn error: ${err}`);
    });
  }

  // ── Send local bike state ─────────────────────────────────────────────────
  sendState(bike, dt) {
    this._sendTimer -= dt;
    if (this._sendTimer > 0) return;
    this._sendTimer = SEND_RATE;

    if (!this.connected) return;

    const msg = {
      type:     'state',
      username: this.username,
      chassisName: this.chassisName || 'Bike_Chassis_1',
      bike: {
        x:         bike.x,
        y:         bike.y,
        vx:        bike.vx,
        vy:        bike.vy,
        angle:     bike.angle,
        angularVel: bike.angularVel,
        fSuspLen:  bike.fSuspLen,
        rSuspLen:  bike.rSuspLen,
        fWheelSpin: bike.fWheelSpin,
        rWheelSpin: bike.rWheelSpin,
        crashed:   bike.crashed,
        wheeling:  bike.wheeling,
        stoppie:   bike.stoppie,
        riderLean: bike.riderLean,
        facingRight: bike.facingRight,
        wheelBase: bike.wheelBase,
        wheelRad:  bike.wheelRad,
      }
    };

    for (const remote of Object.values(this.remotePeers)) {
      if (remote.conn && remote.conn.open) {
        try { remote.conn.send(msg); } catch(_) {}
      }
    }
  }

  // ── Get list of remote bike states for rendering, with smoothing + extrapolation
  getRemoteBikes() {
    const now = Date.now();
    const out = [];
    for (const p of Object.values(this.remotePeers)) {
      if (!p.state || (now - p.lastSeen) >= 3000) continue;
      const s = p.state;
      // Dead-reckoning: extrapolate from the last received snapshot
      const dt = Math.min(0.25, (now - p.lastSeen) / 1000);
      const angle = (s.angle || 0) + (s.angularVel || 0) * dt;
      const target = {
        ...s,
        x: s.x + (s.vx || 0) * dt,
        y: s.y + (s.vy || 0) * dt,
        angle,
      };
      // Smoothly lerp the displayed state toward the extrapolated target
      if (!p.display) {
        p.display = { ...target };
      } else {
        const lerpDt = Math.max(0, (now - (p._lastRenderTime || now)) / 1000);
        // Position lerp: ~6/sec catch-up; angle lerp slightly slower
        const k = 1 - Math.exp(-12 * lerpDt);
        p.display.x     += (target.x - p.display.x) * k;
        p.display.y     += (target.y - p.display.y) * k;
        // Shortest-angle lerp
        let da = target.angle - p.display.angle;
        while (da >  Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        p.display.angle += da * (1 - Math.exp(-10 * lerpDt));
        // Other visual fields snap toward target
        for (const key of ['fSuspLen','rSuspLen','fWheelSpin','rWheelSpin','riderLean']) {
          if (typeof target[key] === 'number') {
            p.display[key] = (p.display[key] || 0) + (target[key] - (p.display[key] || 0)) * k;
          }
        }
        // Booleans / static fields: just copy
        p.display.crashed     = target.crashed;
        p.display.wheeling    = target.wheeling;
        p.display.stoppie     = target.stoppie;
        p.display.facingRight = target.facingRight;
        p.display.wheelBase   = target.wheelBase;
        p.display.wheelRad    = target.wheelRad;
        p.display.chassisName = target.chassisName;
      }
      p._lastRenderTime = now;
      out.push({ ...p.display, username: p.username });
    }
    return out;
  }

  destroy() {
    if (this.peer) { try { this.peer.destroy(); } catch(_) {} }
    this.peer = null;
    this.conn = null;
    this.remotePeers = {};
    this.connected = false;
  }

  _status(msg) {
    console.log('[MP]', msg);
    if (this.onStatus) this.onStatus(msg);
  }
}
