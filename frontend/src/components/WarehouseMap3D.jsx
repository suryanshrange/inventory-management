import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Float, Html, Text } from "@react-three/drei";
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
      {/* base highlight ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.6, 0.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.8 : 0.25} />
      </mesh>
    </group>
  );
}

/* ---------- Slow-rotating warehouse stage ---------- */
function Stage({ products, onHover }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.08;
  });

  // Arrange products in a grid
  const items = useMemo(() => {
    const maxQty = Math.max(1, ...products.map((p) => p.quantity || 1));
    const cols = Math.ceil(Math.sqrt(Math.max(products.length, 1)));
    return products.slice(0, 64).map((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * 1.4;
      const z = (row - (cols - 1) / 2) * 1.4;
      const h = Math.max(0.4, ((p.quantity || 0) / maxQty) * 2.6);
      let color = "#10B981"; // emerald default
      if ((p.quantity || 0) === 0) color = "#EF4444";
      else if ((p.quantity || 0) <= (p.reorder_level || 0)) color = "#F59E0B";
      return { id: p.id, position: [x, 0, z], height: h, color, product: p };
    });
  }, [products]);

  return (
    <group ref={group}>
      {/* Warehouse floor */}
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
      {items.map((b) => (
        <Bin key={b.id} {...b} onHover={onHover} />
      ))}
    </group>
  );
}

/* ---------- Floating placeholder cubes (empty state) ---------- */
function PlaceholderCubes() {
  return (
    <>
      {[[-1.5, 0, 0], [0, 0, 0], [1.5, 0, 0], [-0.75, 0, 1.4], [0.75, 0, 1.4], [0, 0, -1.4]].map((p, i) => (
        <Float key={i} speed={1 + i * 0.2} rotationIntensity={0.4} floatIntensity={1.2}>
          <mesh position={p}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#10B981"
              metalness={0.4}
              roughness={0.4}
              emissive="#10B981"
              emissiveIntensity={0.2}
              transparent
              opacity={0.85}
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

/* ---------- Main exported component ---------- */
export default function WarehouseMap3D({ products = [] }) {
  const [hovered, setHovered] = useState(null);
  const total = products.length;
  const lowCount = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorder_level).length;
  const outCount = products.filter((p) => p.quantity === 0).length;

  return (
    <div className="relative h-[460px] rounded-2xl overflow-hidden border border-border bg-slate-950">
      {/* Top overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10 pointer-events-none">
        <div className="text-white">
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/90 flex items-center gap-1.5">
            <span className="pulse-dot" /> 3D Warehouse Map
          </div>
          <div className="font-display text-xl font-bold mt-0.5">Digital Twin · Live</div>
          <div className="text-xs text-white/60 mt-0.5">Drag to rotate · Scroll to zoom</div>
        </div>
        <div className="flex gap-2 text-xs">
          <Legend color="#10B981" label="In Stock" />
          <Legend color="#F59E0B" label={`Low (${lowCount})`} />
          <Legend color="#EF4444" label={`Out (${outCount})`} />
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute bottom-4 left-4 z-10 px-4 py-3 rounded-xl glass-dark text-white max-w-xs">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-mono">{hovered.sku}</div>
          <div className="font-display font-semibold mt-0.5">{hovered.name}</div>
          <div className="text-xs text-white/70 mt-1">
            Qty <span className="font-mono text-white">{hovered.quantity}</span> · Reorder <span className="font-mono text-white/80">{hovered.reorder_level}</span>
          </div>
        </div>
      )}

      {/* Stats bottom-right */}
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

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 4, -5]} intensity={0.6} color="#10B981" />
        <pointLight position={[5, 4, -5]} intensity={0.4} color="#3B82F6" />

        <Suspense fallback={<Html center><div className="text-white text-xs">Loading 3D…</div></Html>}>
          {total > 0 ? (
            <Stage products={products} onHover={setHovered} />
          ) : (
            <PlaceholderCubes />
          )}
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={14}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      {/* Vignette overlay */}
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
