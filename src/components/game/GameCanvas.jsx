import React, { useRef, useEffect, useCallback } from 'react';
import InputManager       from './InputManager';
import Camera             from './Camera';
import Terrain            from './Terrain';
import Bike               from './Bike';
import ParticleSystem     from './Particles';
import PropsManager       from './Props';
import Renderer           from './Renderer';
import TrackEditor        from './TrackEditor';
import MultiplayerManager from './MultiplayerManager';

const PX_PER_M = 30;

const CHASSIS_SPRITES = [
  'Bike_Chassis_1','Bike_Chassis_2','Bike_Chassis_3','Bike_Chassis_4',
  'Bike_Chassis_5','Bike_Chassis_6','Bike_Chassis_7','Bike_Chassis_8',
];

const GameCanvas = function GameCanvas({ mapName, mpConfig, inputRef, chassisIdx, username }) {
  const canvasRef = useRef(null);
  const gameRef   = useRef(null);
  const animRef   = useRef(null);
  const isMobileRef = useRef(
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );

  const initGame = useCallback((canvas) => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx    = canvas.getContext('2d', { alpha: false });
    const input  = new InputManager();
    input.init();

    const camera  = new Camera(canvas.width, canvas.height);
    const terrain = new Terrain(mapName || 'enduro');
    const spawnY  = terrain.getHeightAt(300) - 2.5 * PX_PER_M;
    const bike    = new Bike(300, spawnY);
    const particles = new ParticleSystem();
    const props   = new PropsManager(terrain);

    const chassisName = CHASSIS_SPRITES[(chassisIdx || 0) % CHASSIS_SPRITES.length];
    const renderer = new Renderer(ctx, camera, chassisName);
    const editor   = new TrackEditor(terrain);

    camera.x = bike.x;
    camera.y = bike.y;

    if (inputRef) inputRef.current = input;

    // Multiplayer
    let mp = null;
    if (mpConfig && mpConfig.mode !== 'solo') {
      mp = new MultiplayerManager();
      mp.onStatus   = mpConfig.onStatus || (() => {});
      mp.chassisName = CHASSIS_SPRITES[(chassisIdx || 0) % CHASSIS_SPRITES.length];
      if (mpConfig.mode === 'host') {
        mp.terrainSeed = terrain.seed;
        mp.host(mpConfig.username, mpConfig.onMyId);
      } else if (mpConfig.mode === 'join') {
        mp.onSeedReceived = (seed) => {
          // Rebuild terrain with host's seed so worlds match
          terrain.seed = seed;
          terrain.chunks.clear();
          terrain.obstacles = [];
          terrain.ramps     = [];
          terrain.scenery   = [];
          terrain.ruts      = [];
          terrain._ensureChunks(0, 6);
          const sy = terrain.getHeightAt(300) - 2.5 * PX_PER_M;
          bike.reset(300, sy);
        };
        mp.join(mpConfig.joinId, mpConfig.username, mpConfig.onMyId);
      }
    }

    const game = {
      input, camera, terrain, bike, particles, props, renderer, editor, mp,
      ctx, canvas,
      lastTime:  performance.now(),
      fpsFrames: 0,
      fpsAccum:  0,
      fps:       60,
      running:   true,
      bikeColor: '#ffffff',
      username:  username  || 'Rider',
    };

    gameRef.current = game;
    return game;
  }, [mapName, chassisIdx, username, mpConfig]);

  const loop = useCallback((game) => {
    if (!game.running) return;

    const now = performance.now();
    const dt  = Math.min((now - game.lastTime) / 1000, 0.05);
    game.lastTime = now;

    game.fpsFrames++;
    game.fpsAccum += dt;
    if (game.fpsAccum >= 1) {
      game.fps       = Math.round(game.fpsFrames / game.fpsAccum);
      game.fpsFrames = 0;
      game.fpsAccum  = 0;
    }

    game.terrain.update(game.bike.x);
    game.bike.update(dt, game.input, game.terrain, game.particles, game.camera);
    game.props.update(dt, game.bike);
    game.props.checkRamp(game.bike);
    game.particles.update(dt);
    game.camera.follow(game.bike, dt);

    if (game.mp) game.mp.sendState(game.bike, dt);

    const { canvas, renderer, bike, terrain, props: p, particles: ps, camera } = game;
    const w = canvas.width, h = canvas.height;

    renderer.clear(w, h);
    renderer.drawSky(w, h);
    renderer.drawParallaxBG(w, h);
    renderer.drawTerrain(terrain);
    renderer.drawProps(p);
    renderer.drawBike(bike, game.bikeColor, game.username);
    ps.draw(game.ctx, camera);

    // Remote bikes
    if (game.mp) {
      for (const rb of game.mp.getRemoteBikes()) {
        renderer.drawBike(rb, '#ffffff', rb.username || '?');
      }
    }

    renderer.drawHUD(bike, w, h, game.fps, false, isMobileRef.current);

    animRef.current = requestAnimationFrame(() => loop(game));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = initGame(canvas);
    const onResize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      game.camera.resize(canvas.width, canvas.height);
    };
    window.addEventListener('resize', onResize);
    animRef.current = requestAnimationFrame(() => loop(game));
    return () => {
      game.running = false;
      game.input.destroy();
      if (game.mp) game.mp.destroy();
      window.removeEventListener('resize', onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [initGame, loop]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      style={{ cursor: 'none', touchAction: 'none' }}
    />
  );
};

export default GameCanvas;
