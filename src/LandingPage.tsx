import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

function VortexParticles() {
  const ref = useRef<THREE.Points>(null);

  // Generate particles in a vortex pattern
  const [positions, colors] = useMemo(() => {
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color1 = new THREE.Color('#38bdf8'); // light blue
    const color2 = new THREE.Color('#a855f7'); // purple

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 5 + 0.5;
      const theta = Math.random() * 2 * Math.PI;
      // Spiral effect: height is inversely proportional to radius and angle
      const y = (Math.random() - 0.5) * 8 * (1 / (radius + 0.1));
      
      positions[i3] = radius * Math.cos(theta);
      positions[i3 + 1] = y;
      positions[i3 + 2] = radius * Math.sin(theta);

      // Color gradient based on distance from center
      const mixedColor = color1.clone().lerp(color2, radius / 5);
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }
    return [positions, colors];
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.2;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <Points ref={ref} positions={positions} colors={colors} stride={3}>
      <PointMaterial
        transparent
        vertexColors
        size={0.03}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

import { InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

export default function LandingPage({ 
  onLaunch, 
  initialAPI,
  isDetecting,
  isConnecting,
  handleConnect,
  isConnected
}: { 
  onLaunch: () => void,
  initialAPI: InitialAPI | null,
  isDetecting: boolean,
  isConnecting: boolean,
  handleConnect: () => Promise<void>,
  isConnected: boolean
}) {
  const onLaunchClick = async () => {
    if (isConnected) {
      onLaunch();
    } else if (initialAPI) {
      await handleConnect();
      // App.tsx handles the state update and next re-render will check isConnected
      // But we can just call onLaunch immediately if walletState gets updated in App.tsx
      // App.tsx will naturally re-render. Let's let the user click again or we can wait.
      // Wait, handleConnect doesn't return a boolean, let's just trigger it.
    }
  };

  // Auto-launch once connected
  useEffect(() => {
    if (isConnected) {
      onLaunch();
    }
  }, [isConnected, onLaunch]);


  const isLace = initialAPI && (
    String(initialAPI.name || "").toLowerCase().includes("lace") ||
    (typeof window !== "undefined" && window.midnight?.["mnLace"] === initialAPI)
  );

  let buttonText = "LAUNCH APP";
  if (isDetecting) buttonText = "DETECTING LACE WALLET...";
  else if (!initialAPI) buttonText = "NO WALLET FOUND";
  else if (isConnecting) buttonText = "AUTHORIZING IN LACE...";
  else if (isLace) buttonText = "AUTHORIZE LACE & LAUNCH";
  else if (initialAPI) buttonText = "CONNECT & LAUNCH";
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#020617', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
          <VortexParticles />
        </Canvas>
      </div>
      
      <div style={{
        position: 'absolute', 
        top: '50%', left: '50%', 
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
        >
          <h1 style={{
            fontSize: '5rem',
            fontWeight: 800,
            background: 'linear-gradient(to right, #38bdf8, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            textShadow: '0 0 40px rgba(168, 85, 247, 0.3)'
          }}>
            UMBRA
          </h1>
          <p style={{
            color: '#cbd5e1',
            fontSize: '1.25rem',
            letterSpacing: '0.1em',
            margin: '1rem 0 3rem 0'
          }}>
            Confidential Dark Pool AMM on Midnight
          </p>
          
          <motion.button
            whileHover={{ scale: (isDetecting || !initialAPI || isConnecting) ? 1 : 1.05, boxShadow: (isDetecting || !initialAPI || isConnecting) ? 'none' : '0 0 20px rgba(168, 85, 247, 0.5)' }}
            whileTap={{ scale: (isDetecting || !initialAPI || isConnecting) ? 1 : 0.95 }}
            onClick={onLaunchClick}
            disabled={isDetecting || !initialAPI || isConnecting}
            style={{
              pointerEvents: 'auto',
              background: (isDetecting || !initialAPI || isConnecting) ? '#334155' : 'linear-gradient(90deg, #38bdf8 0%, #a855f7 100%)',
              border: 'none',
              padding: '1rem 3rem',
              borderRadius: '9999px',
              color: (isDetecting || !initialAPI || isConnecting) ? '#94a3b8' : 'white',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: (isDetecting || !initialAPI || isConnecting) ? 'not-allowed' : 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.3s ease'
            }}
          >
            {buttonText}
          </motion.button>
          
          {!isDetecting && !initialAPI && (
            <div style={{ marginTop: '1.5rem', color: '#ef4444', fontSize: '0.9rem' }}>
              ⚠️ Midnight Wallet Extension (Midnight Lace recommended) is required. Please enable it and refresh.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
