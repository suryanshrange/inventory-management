import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Float, Html, Text } from "@react-three/drei";
import * as THREE from "three";

/* ---------- Single bin (product) ---------- */
function Bin({ position, height, color, product, onHover }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = hovered ? height + 0.3 : height;
    ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, target, delta * 8);
    ref.current.position.y = ref.current.scale.y / 2;
  });

  return (
    <group position={position}>
      <mesh
        ref={ref}
        castShadow receiveShadow
        scale={[0.9, height, 0.9]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(product); }}
        onPointerOut={() => { setHovered(false); onHover(null); }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.4}
          emissive={color}
          emissiveIntensity={hovered ? 0.5 : 0.15}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.6, 0.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.8 : 0.25} />
      </mesh>
    </group>
  );
}

/* ---------- Particle System ---------- */
function ParticleSystem({ events, positions }) {
  const groupRef = useRef();
  const liveRef = useRef([]);
  const lastIdx = useRef(0);

  useEffect(() => {
    if (!groupRef.current) return;
    const fresh = events.slice(lastIdx.current);
    lastIdx.current = events.length;

    for (const e of fresh) {
      const pos = positions[e.product_id];
      if (!pos) continue;
      const isIn = e.action === "stock_in";
      const color = isIn ? "#10B981" : "#06B6D4";
      const count = Math.min(18, Math.max(5, Math.abs(e.quantity_change || 0)));

      for (let i = 0; i < count; i++) {
        const offsetX = (Math.random() - 0.5) * 1.6;
        const offsetZ = (Math.random() - 0.5) * 1.6;
        const high = new THREE.Vector3(pos[0] + offsetX, 5 + Math.random() * 3, pos[2] + offsetZ);
        const low = new THREE.Vector3(pos[0], 2.2, pos[2]);

        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 10, 10),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }),
        );
        groupRef.current.add(mesh);
        liveRef.current.push({
          mesh,
          start: performance.now() + i * 70,
          duration: 1300 + Math.random() * 600,
          from: isIn ? high : low.clone(),
          to: isIn ? low.clone() : new THREE.Vector3(pos[0] + offsetX * 1.6, 6 + Math.random() * 2, pos[2] + offsetZ * 1.6),
        });
      }
    }
  }, [events, positions]);

  useFrame(() => {
    const now = performance.now();
    const keep = [];
    for (const p of liveRef.current) {
      const elapsed = now - p.start;
      if (elapsed < 0) { keep.push(p); continue; }
      const t = elapsed / p.duration;
      if (t >= 1) {
        if (groupRef.current) groupRef.current.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        continue;
      }
      p.mesh.position.lerpVectors(p.from, p.to, t);
      p.mesh.position.y += Math.sin(t * Math.PI) * 0.6; // arc lift
      const fade = Math.sin(t * Math.PI);
      p.mesh.material.opacity = fade;
      p.mesh.scale.setScalar(0.8 + fade * 0.6);
      keep.push(p);
    }
    liveRef.current = keep;
  });

  return <group ref={groupRef} />;
}

/* ---------- Ambient drifting particles for "alive" feel ---------- */
function AmbientParticles({ count = 24 }) {
  const ref = useRef();
  const data = useMemo(() => (
    Array.from({ length: count }, (_, idx) => ({
      key: `amb-${idx}`,
      x: (Math.random() - 0.5) * 14,
      z: (Math.random() - 0.5) * 14,
      baseY: 1 + Math.random() * 4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
    }))
  ), [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.children.forEach((child, i) => {
      const d = data[i];
      child.position.y = d.baseY + Math.sin(t * d.speed + d.phase) * 0.4;
      child.material.opacity = 0.25 + Math.sin(t * d.speed + d.phase) * 0.15;
    });
  });

  return (
    <group ref={ref}>
      {data.map((d) => (
        <mesh key={d.key} position={[d.x, d.baseY, d.z]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshBasicMaterial color="#34D399" transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Stage ---------- */
function Stage({ products, events, onHover }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.08;
  });

  const { items, positions } = useMemo(() => {
    const maxQty = Math.max(1, ...products.map((p) => p.quantity || 1));
    const cols = Math.ceil(Math.sqrt(Math.max(products.length, 1)));
    const items = products.slice(0, 64).map((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * 1.4;
      const z = (row - (cols - 1) / 2) * 1.4;
      const h = Math.max(0.4, ((p.quantity || 0) / maxQty) * 2.6);
      let color = "#10B981";
      if ((p.quantity || 0) === 0) color = "#EF4444";
      else if ((p.quantity || 0) <= (p.reorder_level || 0)) color = "#F59E0B";
      return { id: p.id, position: [x, 0, z], height: h, color, product: p };
    });
    const positions = Object.fromEntries(items.map((it) => [it.id, it.position]));
    return { items, positions };
  }, [products]);

  return (
    <group ref={group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0f1a" metalness={0.6} roughness={0.5} />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[20, 20]}
        cellSize={1.4} cellThickness={0.6}
        cellColor="#1e293b"
        sectionSize={4.2} sectionThickness={1.2}
        sectionColor="#10B981"
        fadeDistance={18} fadeStrength={1}
        infiniteGrid={false}
      />
      {items.map((b) => <Bin key={b.id} {...b} onHover={onHover} />)}
      <AmbientParticles count={24} />
      <ParticleSystem events={events} positions={positions} />
    </group>
  );
}

/* ---------- Empty state ---------- */
function PlaceholderCubes() {
  const cubes = [
    { key: "a", pos: [-1.5, 0, 0] }, { key: "b", pos: [0, 0, 0] }, { key: "c", pos: [1.5, 0, 0] },
    { key: "d", pos: [-0.75, 0, 1.4] }, { key: "e", pos: [0.75, 0, 1.4] }, { key: "f", pos: [0, 0, -1.4] },
  ];
  return (
    <>
      {cubes.map((c, i) => (
        <Float key={c.key} speed={1 + i * 0.2} rotationIntensity={0.4} floatIntensity={1.2}>
          <mesh position={c.pos}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#10B981" metalness={0.4} roughness={0.4}
              emissive="#10B981" emissiveIntensity={0.2} transparent opacity={0.85}
            />
          </mesh>
        </Float>
      ))}
      <Text position={[0, 2.4, 0]} fontSize={0.36} color="#10B981" anchorX="center">
        Stock your warehouse to see it here
      </Text>
    </>
  );
}

/* ---------- Main ---------- */
export default function WarehouseMap3D({ products = [], events = [] }) {
  const [hovered, setHovered] = useState(null);
  const total = products.length;
  const lowCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorder_level).length;
  const outCount = products.filter((p) => p.quantity === 0).length;
  const recentEvent = events[events.length - 1];

  return (
    <div className="relative h-[460px] rounded-2xl overflow-hidden border border-border bg-slate-950">
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10 pointer-events-none">
        <div className="text-white">
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/90 flex items-center gap-1.5">
            <span className="pulse-dot" /> 3D Warehouse Map · Digital Twin
          </div>
          <div className="font-display text-xl font-bold mt-0.5">Live Operations View</div>
          <div className="text-xs text-white/60 mt-0.5">Drag to rotate · Scroll to zoom · Hover bins for details</div>
        </div>
        <div className="flex gap-2 text-xs">
          <Legend color="#10B981" label="In Stock" />
          <Legend color="#F59E0B" label={`Low (${lowCount})`} />
          <Legend color="#EF4444" label={`Out (${outCount})`} />
        </div>
      </div>

      {hovered && (
        <div className="absolute bottom-4 left-4 z-10 px-4 py-3 rounded-xl glass-dark text-white max-w-xs">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-mono">{hovered.sku}</div>
          <div className="font-display font-semibold mt-0.5">{hovered.name}</div>
          <div className="text-xs text-white/70 mt-1">
            Qty <span className="font-mono text-white">{hovered.quantity}</span> · Reorder <span className="font-mono text-white/80">{hovered.reorder_level}</span>
          </div>
        </div>
      )}

      {/* Recent event ticker */}
      {recentEvent && (
        <div className="absolute top-24 left-4 z-10 px-3 py-2 rounded-lg glass-dark text-white text-xs flex items-center gap-2 animate-pulse">
          <span className={`h-2 w-2 rounded-full ${recentEvent.action === "stock_in" ? "bg-emerald-400" : "bg-cyan-400"} shadow-lg`}
            style={{ boxShadow: `0 0 10px ${recentEvent.action === "stock_in" ? "#10B981" : "#06B6D4"}` }}
          />
          <span className="font-medium">{recentEvent.action === "stock_in" ? "+" : ""}{recentEvent.quantity_change}</span>
          <span className="text-white/70">{recentEvent.product_name}</span>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10 text-xs text-white/70 font-mono">
        {total} SKUs · {Math.min(total, 64)} rendered
      </div>

      <Canvas
        shadows
        camera={{ position: [6, 5, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 12, 30]} />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]} intensity={1.2} castShadow
          shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 4, -5]} intensity={0.6} color="#10B981" />
        <pointLight position={[5, 4, -5]} intensity={0.4} color="#3B82F6" />

        <Suspense fallback={<Html center><div className="text-white text-xs">Loading 3D…</div></Html>}>
          {total > 0 ? (
            <Stage products={products} events={events} onHover={setHovered} />
          ) : (
            <PlaceholderCubes />
          )}
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={5} maxDistance={14}
          minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 50%, rgba(2,6,23,0.6) 100%)"
      }} />
    </div>
  );
}

const Legend = ({ color, label }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md glass-dark text-white pointer-events-auto">
    <span className="h-2 w-2 rounded-sm" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    <span className="text-[11px]">{label}</span>
  </div>
);
