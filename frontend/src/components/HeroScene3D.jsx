/** A pure-CSS animated 3D scene with floating "warehouse crates" and gradient orbs. */
export default function HeroScene3D() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ perspective: "1200px" }}>
      {/* Background orbs */}
      <div className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full"
           style={{ background: "radial-gradient(circle, rgba(16,185,129,0.55), transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute -bottom-32 -right-20 w-[520px] h-[520px] rounded-full"
           style={{ background: "radial-gradient(circle, rgba(52,211,153,0.45), transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute top-1/3 right-1/4 w-[280px] h-[280px] rounded-full drift"
           style={{ background: "radial-gradient(circle, rgba(6,182,212,0.4), transparent 70%)", filter: "blur(60px)" }} />

      {/* Glow ring */}
      <div className="glow-ring" style={{ width: 280, height: 280, top: "30%", left: "20%" }} />

      {/* Grid */}
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* Floating crates (pure CSS 3D) */}
      <div className="floating-shape emerald" style={{ top: "18%", left: "12%", width: 88, height: 88 }} />
      <div className="floating-shape cyan"    style={{ top: "62%", left: "18%", width: 64, height: 64, animationDelay: "-3s" }} />
      <div className="floating-shape violet"  style={{ top: "30%", right: "18%", width: 76, height: 76, animationDelay: "-6s" }} />
      <div className="floating-shape amber"   style={{ top: "70%", right: "12%", width: 96, height: 96, animationDelay: "-9s" }} />
      <div className="floating-shape emerald" style={{ top: "48%", left: "44%", width: 56, height: 56, animationDelay: "-4s" }} />

      {/* Center spinning cube */}
      <div className="absolute top-1/2 left-1/2" style={{ transform: "translate(-50%, -50%)" }}>
        <div className="cube-3d relative" style={{ width: 160, height: 160 }}>
          {[
            { face: "front", transform: "rotateY(0deg) translateZ(80px)" },
            { face: "right", transform: "rotateY(90deg) translateZ(80px)" },
            { face: "back", transform: "rotateY(180deg) translateZ(80px)" },
            { face: "left", transform: "rotateY(-90deg) translateZ(80px)" },
            { face: "top", transform: "rotateX(90deg) translateZ(80px)" },
            { face: "bottom", transform: "rotateX(-90deg) translateZ(80px)" },
          ].map((s, i) => (
            <div
              key={s.face}
              className="absolute inset-0 rounded-xl border border-emerald-400/30"
              style={{
                transform: s.transform,
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.20), rgba(6,182,212,0.10))",
                boxShadow:
                  "inset 0 0 30px rgba(16,185,129,0.25), 0 0 30px rgba(16,185,129,0.15)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div className="absolute inset-2 rounded-md border border-white/10 flex items-center justify-center text-white/40 font-mono text-[10px]">
                SKU-{s.face.toUpperCase().slice(0, 3)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
