import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float, ContactShadows, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const KLEIN = "#1f2fd6";
const FLARE = "#ff4a1c";
const SUN = "#f9d43a";
const PAPER = "#f4efe4";

/**
 * "Still Life No. 01" — a gallery composition: a matte Klein-blue sphere,
 * an iridescent chrome knot orbiting it, a vermilion half-arch and a sun disc,
 * all on a plinth. Scrolling walks the viewer around the sculpture.
 */
function Sculpture({ progress, reduced }: { progress: React.MutableRefObject<number>; reduced: boolean }) {
  const root = useRef<THREE.Group>(null);
  const knot = useRef<THREE.Mesh>(null);
  const disc = useRef<THREE.Mesh>(null);
  const sphere = useRef<THREE.Mesh>(null);
  const intro = useRef(reduced ? 1 : 0);
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const on = (e: PointerEvent) => { mouse.current.x = e.clientX / window.innerWidth - 0.5; mouse.current.y = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener("pointermove", on);
    return () => window.removeEventListener("pointermove", on);
  }, []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    intro.current = Math.min(1, intro.current + dt * 0.5);
    const e = 1 - Math.pow(1 - intro.current, 4);
    const p = progress.current;
    if (root.current) {
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, -0.5 + (1 - e) * 1.6 + p * 1.8 + mouse.current.x * 0.4, 0.05);
      root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, 0.08 + mouse.current.y * 0.15, 0.05);
      root.current.scale.setScalar(0.7 + e * 0.3);
    }
    if (knot.current && !reduced) {
      knot.current.rotation.x = t * 0.25;
      knot.current.rotation.y = t * 0.35;
      knot.current.position.y = 1.15 + Math.sin(t * 0.8) * 0.08 + p * 0.6;
    }
    if (disc.current && !reduced) disc.current.rotation.z = t * 0.6;
    if (sphere.current) sphere.current.position.x = 0.55 + p * 0.25;
  });
  return (
    <group ref={root} position={[0, -0.55, 0]}>
      {/* plinth */}
      <RoundedBox args={[3.4, 0.5, 1.9]} radius={0.04} position={[0, -0.95, 0]}>
        <meshStandardMaterial color={PAPER} roughness={0.9} />
      </RoundedBox>
      {/* vermilion half-arch */}
      <mesh position={[-0.75, -0.7, -0.1]}>
        <torusGeometry args={[0.85, 0.24, 48, 96, Math.PI]} />
        <meshPhysicalMaterial color={FLARE} roughness={0.35} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      {/* Klein sphere */}
      <mesh ref={sphere} position={[0.55, -0.05, 0.25]}>
        <sphereGeometry args={[0.65, 96, 96]} />
        <meshStandardMaterial color={KLEIN} roughness={0.95} />
      </mesh>
      {/* chrome iridescent knot */}
      <Float speed={reduced ? 0 : 1.2} rotationIntensity={0} floatIntensity={0.3}>
        <mesh ref={knot} position={[-0.2, 1.15, 0]}>
          <torusKnotGeometry args={[0.42, 0.11, 220, 32, 2, 3]} />
          <meshPhysicalMaterial color="#f2f2f6" metalness={1} roughness={0.08} iridescence={1} iridescenceIOR={1.6} iridescenceThicknessRange={[200, 900]} />
        </mesh>
      </Float>
      {/* sun disc on a pin */}
      <mesh position={[1.25, -0.05, -0.55]}>
        <cylinderGeometry args={[0.012, 0.012, 1.3, 8]} />
        <meshStandardMaterial color="#111432" />
      </mesh>
      <mesh ref={disc} position={[1.25, 0.65, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 64]} />
        <meshPhysicalMaterial color={SUN} roughness={0.25} clearcoat={1} />
      </mesh>
    </group>
  );
}

export default function HeroScene({ progress, reduced }: { progress: React.MutableRefObject<number>; reduced: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas frameloop={visible ? "always" : "never"} camera={{ position: [0, 0.4, 6], fov: 38 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} />
        <spotLight position={[-4, 3, 2]} angle={0.5} penumbra={1} intensity={30} color={FLARE} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={2.5} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color={FLARE} />
          <Lightformer form="rect" intensity={2.5} position={[5, 1, 0]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color={KLEIN} />
          <Lightformer form="ring" intensity={2} position={[0, 1, -5]} scale={3} color={SUN} />
        </Environment>
        <Sculpture progress={progress} reduced={reduced} />
        <ContactShadows position={[0, -1.76, 0]} opacity={0.35} scale={8} blur={2.6} far={2} frames={reduced ? 1 : Infinity} />
      </Canvas>
    </div>
  );
}
