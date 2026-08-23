"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useAdaptiveNodeCount(): number {
  const [count, setCount] = useState(60);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCount(w < 480 ? 24 : w < 768 ? 36 : w < 1200 ? 50 : 68);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return count;
}

/* ------------------------------------------------------------------ */
/* Typed line geometry helper                                          */
/* ------------------------------------------------------------------ */

function buildLineSegments(
  positions: Float32Array,
  colors: Float32Array,
  nodes: THREE.Vector3[],
  LINK_DIST: number,
  redIndices: Set<number>
): void {
  let ptr = 0;
  let cPtr = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = nodes[i].distanceTo(nodes[j]);
      if (dist < LINK_DIST) {
        const isRed = redIndices.has(i) || redIndices.has(j);
        const alpha = 1 - dist / LINK_DIST;

        positions[ptr++] = nodes[i].x;
        positions[ptr++] = nodes[i].y;
        positions[ptr++] = nodes[i].z;
        positions[ptr++] = nodes[j].x;
        positions[ptr++] = nodes[j].y;
        positions[ptr++] = nodes[j].z;

        if (isRed) {
          // Red thread: accent-primary #e0212f
          colors[cPtr++] = 0.878;
          colors[cPtr++] = 0.129;
          colors[cPtr++] = 0.184;
          colors[cPtr++] = 0.878;
          colors[cPtr++] = 0.129;
          colors[cPtr++] = 0.184;
        } else {
          // Blue thread: accent-secondary #3b6ff5 at low opacity via color
          colors[cPtr++] = 0.145 * alpha;
          colors[cPtr++] = 0.322 * alpha;
          colors[cPtr++] = 0.812 * alpha;
          colors[cPtr++] = 0.145 * alpha;
          colors[cPtr++] = 0.322 * alpha;
          colors[cPtr++] = 0.812 * alpha;
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Scene inner component (must be inside Canvas)                       */
/* ------------------------------------------------------------------ */

interface SceneProps {
  nodeCount: number;
  reducedMotion: boolean;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}

const LINK_DIST = 3.2;
const MAX_PAIRS = 6000; // upper bound on line segments

function WebScene({ nodeCount, reducedMotion, mouseRef }: SceneProps) {
  const { size, camera } = useThree();

  // Seed positions
  const basePositions = useMemo<THREE.Vector3[]>(() => {
    const arr: THREE.Vector3[] = [];
    const rng = (s: number) => {
      // deterministic pseudo-random
      let x = Math.sin(s * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };
    for (let i = 0; i < nodeCount; i++) {
      arr.push(
        new THREE.Vector3(
          (rng(i * 3) - 0.5) * 18,
          (rng(i * 3 + 1) - 0.5) * 10,
          (rng(i * 3 + 2) - 0.5) * 6
        )
      );
    }
    return arr;
  }, [nodeCount]);

  // ~15% of nodes designated as "red/active"
  const redIndices = useMemo<Set<number>>(() => {
    const set = new Set<number>();
    for (let i = 0; i < nodeCount; i++) {
      if (Math.sin(i * 7.31) > 0.7) set.add(i);
    }
    return set;
  }, [nodeCount]);

  // Live positions (copies of base, mutated each frame)
  const livePositions = useMemo(
    () => basePositions.map((v) => v.clone()),
    [basePositions]
  );

  // Node mesh refs
  const nodesRef = useRef<THREE.InstancedMesh>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);

  // Build geometry buffers (max pairs)
  const linePositions = useMemo(
    () => new Float32Array(MAX_PAIRS * 2 * 3),
    []
  );
  const lineColors = useMemo(
    () => new Float32Array(MAX_PAIRS * 2 * 3),
    []
  );

  // Dummy for instanced mesh
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Red node material refs for pulse animation
  const redPulseRef = useRef(0);

  // Init instanced mesh colors
  const nodeColors = useMemo(() => {
    const arr = new Float32Array(nodeCount * 3);
    for (let i = 0; i < nodeCount; i++) {
      if (redIndices.has(i)) {
        arr[i * 3] = 0.878; arr[i * 3 + 1] = 0.129; arr[i * 3 + 2] = 0.184;
      } else {
        arr[i * 3] = 0.145; arr[i * 3 + 1] = 0.322; arr[i * 3 + 2] = 0.812;
      }
    }
    return arr;
  }, [nodeCount, redIndices]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;

    const t = clock.getElapsedTime();
    redPulseRef.current = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.8));

    // Unproject mouse to world space at z=0
    const mouse3D = new THREE.Vector3(
      mouseRef.current.x,
      mouseRef.current.y,
      0.5
    ).unproject(camera);

    // Update live positions: drift + cursor attraction
    for (let i = 0; i < nodeCount; i++) {
      const base = basePositions[i];
      const seed = i * 0.07;
      const driftX = Math.sin(t * 0.18 + seed * 11.3) * 0.4;
      const driftY = Math.cos(t * 0.14 + seed * 7.6) * 0.3;

      // Cursor pull: nodes within 2.5 world units are attracted slightly
      const dx = mouse3D.x - (base.x + driftX);
      const dy = mouse3D.y - (base.y + driftY);
      const distToMouse = Math.sqrt(dx * dx + dy * dy);
      const pull = distToMouse < 2.5 ? 0.06 * (1 - distToMouse / 2.5) : 0;

      livePositions[i].set(
        base.x + driftX + dx * pull,
        base.y + driftY + dy * pull,
        base.z + Math.sin(t * 0.1 + seed * 5.2) * 0.2
      );

      dummy.position.copy(livePositions[i]);
      const isRed = redIndices.has(i);
      const scale = isRed ? 0.06 + 0.02 * redPulseRef.current : 0.045;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      nodesRef.current.setMatrixAt(i, dummy.matrix);
    }
    nodesRef.current.instanceMatrix.needsUpdate = true;

    // Rebuild line geometry
    linePositions.fill(0);
    lineColors.fill(0);
    buildLineSegments(linePositions, lineColors, livePositions, LINK_DIST, redIndices);

    const geo = linesRef.current.geometry;
    (geo.attributes.position as THREE.BufferAttribute).array = linePositions;
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).array = lineColors;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  // Static snapshot for reduced-motion
  const staticLines = useMemo(() => {
    const pos = new Float32Array(MAX_PAIRS * 2 * 3);
    const col = new Float32Array(MAX_PAIRS * 2 * 3);
    buildLineSegments(pos, col, basePositions, LINK_DIST, redIndices);
    return { pos, col };
  }, [basePositions, redIndices]);

  const initPos = reducedMotion ? staticLines.pos : linePositions;
  const initCol = reducedMotion ? staticLines.col : lineColors;

  return (
    <>
      {/* Nodes */}
      <instancedMesh ref={nodesRef} args={[undefined, undefined, nodeCount]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial vertexColors />
      </instancedMesh>

      {/* Threads */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[initPos, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[initCol, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors linewidth={1} transparent opacity={0.65} />
      </lineSegments>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Public component                                                     */
/* ------------------------------------------------------------------ */

export const ParticleWebCanvas: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const nodeCount = useAdaptiveNodeCount();
  const mouseRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Normalise to [-1, 1]
    mouseRef.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -((e.clientY / window.innerHeight) * 2 - 1),
    };
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <WebScene
          nodeCount={nodeCount}
          reducedMotion={reducedMotion}
          mouseRef={mouseRef}
        />
      </Canvas>
    </div>
  );
};
