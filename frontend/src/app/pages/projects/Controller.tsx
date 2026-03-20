import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface KnobState {
  x: number;
  y: number;
  value: number;
}

interface FaderState {
  value: number;
}

const Controller: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  const [knobs, setKnobs] = useState<Record<number, KnobState>>({
    1: { x: 0, y: 0, value: 50 },
    2: { x: 0, y: 0, value: 50 },
    3: { x: 0, y: 0, value: 75 },
    4: { x: 0, y: 0, value: 30 },
    5: { x: 0, y: 0, value: 100 },
  });

  const [faders, setFaders] = useState<Record<number, FaderState>>({
    1: { value: 0 },
    2: { value: 25 },
    3: { value: 50 },
    4: { value: 75 },
    5: { value: 100 },
    6: { value: 60 },
    7: { value: 40 },
    8: { value: 80 },
  });

  const [buttons, setButtons] = useState<Record<string, boolean>>({
    record: false,
    play: false,
    loop: false,
    blackout: false,
  });

  const [activeFader, setActiveFader] = useState<number | null>(null);
  const [activeKnob, setActiveKnob] = useState<number | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(240, 120);
    renderer.setClearColor(0x000000, 0);
    canvasRef.current.appendChild(renderer.domElement);

    // Create particle system
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 10;
      positions[i + 1] = (Math.random() - 0.5) * 10;
      positions[i + 2] = (Math.random() - 0.5) * 10;

      colors[i] = Math.random();
      colors[i + 1] = Math.random();
      colors[i + 2] = Math.random();
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    camera.position.z = 5;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    particlesRef.current = particleSystem;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (particlesRef.current) {
        particlesRef.current.rotation.x += 0.001;
        particlesRef.current.rotation.y += 0.002;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      if (rendererRef.current && canvasRef.current) {
        canvasRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Fader drag handlers
  const handleFaderMouseDown = useCallback((faderId: number) => {
    setActiveFader(faderId);
  }, []);

  const handleFaderMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeFader === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const value = Math.max(0, Math.min(100, 100 - (y / height) * 100));

    setFaders(prev => ({
      ...prev,
      [activeFader]: { value },
    }));
  }, [activeFader]);

  const handleFaderMouseUp = useCallback(() => {
    setActiveFader(null);
  }, []);

  // Knob drag handlers
  const handleKnobMouseDown = useCallback((knobId: number, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveKnob(knobId);
  }, []);

  const handleKnobMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeKnob === null) return;

    const deltaY = e.movementY;
    setKnobs(prev => {
      const current = prev[activeKnob];
      const newValue = Math.max(0, Math.min(100, current.value - deltaY));
      const angle = (newValue / 100) * 270 - 135;
      const rad = (angle * Math.PI) / 180;

      return {
        ...prev,
        [activeKnob]: {
          x: Math.cos(rad) * 30,
          y: Math.sin(rad) * 30,
          value: newValue,
        },
      };
    });
  }, [activeKnob]);

  const handleKnobMouseUp = useCallback(() => {
    setActiveKnob(null);
  }, []);

  // Button toggle
  const toggleButton = useCallback((buttonId: string) => {
    setButtons(prev => ({
      ...prev,
      [buttonId]: !prev[buttonId],
    }));
  }, []);

  useEffect(() => {
    if (activeKnob !== null || activeFader !== null) {
      const handleGlobalMouseUp = () => {
        setActiveKnob(null);
        setActiveFader(null);
      };
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [activeKnob, activeFader]);

  return (
    <div
      className="controller-container"
      onMouseMove={activeKnob !== null ? handleKnobMouseMove : undefined}
      style={{
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'auto',
      }}
    >
      <div
        className="controller-panel"
        style={{
          background: 'linear-gradient(145deg, #2a2a3e, #1f1f2e)',
          borderRadius: '24px',
          padding: '30px 40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          width: '100%',
          maxWidth: '1400px',
          minWidth: '1200px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h1 style={{
            color: '#00d4ff',
            fontSize: '24px',
            fontWeight: '700',
            textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
            marginBottom: '4px',
          }}>
            TE-DMX Field Controller
          </h1>
          <p style={{ color: '#8892b0', fontSize: '12px' }}>
            Professional Lighting Control System
          </p>
        </div>

        {/* Main Horizontal Layout */}
        <div style={{
          display: 'flex',
          gap: '30px',
          alignItems: 'stretch',
        }}>
          {/* Left Section: OLED Display + Knobs */}
          <div style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            {/* OLED Display */}
            <div style={{
              background: '#000',
              borderRadius: '12px',
              padding: '15px',
              border: '2px solid #333',
              boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.8)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ color: '#00ff88', fontSize: '12px', fontFamily: 'monospace' }}>
                  Scene: Main Stage
                </div>
                <div style={{ color: '#00d4ff', fontSize: '12px', fontFamily: 'monospace' }}>
                  BPM: 120
                </div>
              </div>
              <div ref={canvasRef} style={{
                width: '240px',
                height: '120px',
                border: '1px solid #222',
              }} />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginTop: '10px',
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(ch => (
                  <div key={ch} style={{
                    color: '#666',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                  }}>
                    CH{ch}: {Math.round(faders[ch]?.value || 0)}%
                  </div>
                ))}
              </div>
            </div>

            {/* Knobs Section */}
            <div>
              <h3 style={{ color: '#8892b0', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Control Knobs
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '15px',
              }}>
                {[
                  { id: 1, label: 'Pan' },
                  { id: 2, label: 'Tilt' },
                  { id: 3, label: 'Dimmer' },
                  { id: 4, label: 'FX Rate' },
                  { id: 5, label: 'Master' },
                ].map(({ id, label }) => (
                  <div key={id} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        margin: '0 auto 8px',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      onMouseDown={(e) => handleKnobMouseDown(id, e)}
                    >
                      <svg width="60" height="60" viewBox="0 0 60 60">
                        <defs>
                          <radialGradient id={`knobGrad${id}`}>
                            <stop offset="0%" stopColor="#3a3a4e" />
                            <stop offset="100%" stopColor="#2a2a3e" />
                          </radialGradient>
                        </defs>
                        <circle cx="30" cy="30" r="26" fill={`url(#knobGrad${id})`} stroke="#1a1a2e" strokeWidth="2" />
                        <circle cx="30" cy="30" r="22" fill="none" stroke="#444" strokeWidth="1" strokeDasharray="2,3" />
                        <line
                          x1="30"
                          y1="30"
                          x2={30 + knobs[id].x * 0.75}
                          y2={30 + knobs[id].y * 0.75}
                          stroke="#00d4ff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <circle cx={30 + knobs[id].x * 0.75} cy={30 + knobs[id].y * 0.75} r="3" fill="#00ff88" />
                      </svg>
                    </div>
                    <div style={{ color: '#8892b0', fontSize: '10px', marginBottom: '3px' }}>{label}</div>
                    <div style={{ color: '#00d4ff', fontSize: '12px', fontWeight: '600' }}>
                      {Math.round(knobs[id].value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Section: Faders */}
          <div style={{
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}>
            <h3 style={{ color: '#8892b0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
              Channel Faders
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '12px',
                flex: '1',
              }}
              onMouseMove={handleFaderMouseMove}
              onMouseUp={handleFaderMouseUp}
              onMouseLeave={handleFaderMouseUp}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(id => (
                <div key={id} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: '#8892b0', fontSize: '10px', marginBottom: '6px' }}>
                    CH {id}
                  </div>
                  <div
                    style={{
                      width: '35px',
                      height: '220px',
                      margin: '0 auto',
                      background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1e 100%)',
                      borderRadius: '18px',
                      position: 'relative',
                      cursor: 'pointer',
                      border: '2px solid #2a2a3e',
                      boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.5)',
                      flex: '1',
                    }}
                    onMouseDown={() => handleFaderMouseDown(id)}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: `${faders[id].value}%`,
                        left: '50%',
                        transform: 'translate(-50%, 50%)',
                        width: '32px',
                        height: '28px',
                        background: 'linear-gradient(145deg, #3a3a4e, #2a2a3e)',
                        borderRadius: '6px',
                        border: '2px solid #00d4ff',
                        boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)',
                        transition: activeFader === id ? 'none' : 'bottom 0.1s ease-out',
                      }}
                    />
                  </div>
                  <div style={{ color: '#00d4ff', fontSize: '11px', marginTop: '6px', fontWeight: '600' }}>
                    {Math.round(faders[id].value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Section: Control Buttons */}
          <div style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            justifyContent: 'center',
          }}>
            <h3 style={{ color: '#8892b0', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
              Controls
            </h3>
            {[
              { id: 'record', label: 'REC', color: '#ff4444' },
              { id: 'play', label: 'PLAY', color: '#00ff88' },
              { id: 'loop', label: 'LOOP', color: '#00d4ff' },
              { id: 'blackout', label: 'BLACKOUT', color: '#ffaa00' },
            ].map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => toggleButton(id)}
                style={{
                  padding: '10px 20px',
                  background: buttons[id] ? color : 'linear-gradient(145deg, #2a2a3e, #1f1f2e)',
                  color: buttons[id] ? '#000' : '#8892b0',
                  border: `2px solid ${buttons[id] ? color : '#3a3a4e'}`,
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: buttons[id] ? `0 0 20px ${color}` : 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  minWidth: '100px',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controller;
