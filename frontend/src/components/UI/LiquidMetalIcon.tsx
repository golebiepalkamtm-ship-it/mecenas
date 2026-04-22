import { useRef, useEffect } from 'react';
import * as THREE from 'three'; // Three.js library
// @ts-expect-error - THREE types may not match perfectly for addons
import { SVGLoader } from 'three/addons/loaders/SVGLoader';
// @ts-expect-error - THREE types may not match perfectly for addons
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment';

interface LiquidMetalIconProps {
  svgContent?: string;
  className?: string;
  size?: number;
  color?: string;
  speed?: number;
  distortion?: number;
  scale?: number;
  roughness?: number;
  metalness?: number;
  iridescence?: number;
  iridescenceThicknessMin?: number;
  iridescenceThicknessMax?: number;
}

// --- GLSL NOISE FUNCTION ---
const simplex3D = `
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
        i = mod(i, 289.0 );
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 1.0/7.0; 
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z *ns.z); 
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );  
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }
`;

export function LiquidMetalIcon({
  svgContent,
  className = "",
  size = 120,
  color = "#eeeeee",
  speed = 0.5,
  distortion = 1.5,
  scale = 0.003,
  roughness = 0.45,
  metalness = 0.6,
  iridescence = 0.9,
  iridescenceThicknessMin = 750,
  iridescenceThicknessMax = 800,
}: LiquidMetalIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  // Default Scale SVG if none provided
  const defaultSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke-width="4" fill="none" stroke="currentColor"/>
        <circle cx="50" cy="50" r="20" stroke-width="2" fill="none" stroke="currentColor" opacity="0.5"/>
        <path d="M50,10 L50,90 M10,50 L90,50" stroke-width="1" stroke="currentColor" opacity="0.3"/>
    </svg>
  `;

  const finalSvg = svgContent || defaultSvg;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 55);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnvironment).texture;

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
    dirLight1.position.set(10, 20, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight2.position.set(-10, -10, 10);
    scene.add(dirLight2);

    // --- MATERIAL SETUP ---
    const dummyTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    dummyTex.needsUpdate = true;

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.8,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      iridescence: 1.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [iridescenceThicknessMin, iridescenceThicknessMax],
      iridescenceThicknessMap: dummyTex,
      dithering: true,
      transmission: 0.0,
      ior: 1.5,
      thickness: 2.0,
    });
    materialRef.current = material;

    material.userData = {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uScale: { value: scale },
      uDistortion: { value: distortion },
      uEdgeProtection: { value: 0.8 },
      uShapeReactivity: { value: 1.2 },
      uShapeMask: { value: dummyTex },
      uShapeBounds: { value: new THREE.Vector4(0, 0, 1, 1) }
    };

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = material.userData.uTime;
      shader.uniforms.uSpeed = material.userData.uSpeed;
      shader.uniforms.uScale = material.userData.uScale;
      shader.uniforms.uDistortion = material.userData.uDistortion;
      shader.uniforms.uEdgeProtection = material.userData.uEdgeProtection;
      shader.uniforms.uShapeReactivity = material.userData.uShapeReactivity;
      shader.uniforms.uShapeMask = material.userData.uShapeMask;
      shader.uniforms.uShapeBounds = material.userData.uShapeBounds;

      shader.vertexShader = `
                varying vec3 vWorldPos;
                varying vec3 vLocalPos;
                varying vec3 vOriginalNormal;
            ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
                #include <worldpos_vertex>
                vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
                vLocalPos = position;
                vOriginalNormal = normal; 
                `
      );

      shader.fragmentShader = `
                uniform float uTime;
                uniform float uSpeed;
                uniform float uScale;
                uniform float uDistortion;
                uniform float uEdgeProtection;
                uniform float uShapeReactivity;
                
                uniform sampler2D uShapeMask;
                uniform vec4 uShapeBounds;
                
                varying vec3 vWorldPos;
                varying vec3 vLocalPos;
                varying vec3 vOriginalNormal;
                
                float vFluidNoise; 
                
                ${simplex3D}
            ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        `
                #include <normal_fragment_begin>

                vec2 shapeUV = (vLocalPos.xy - uShapeBounds.xy) / uShapeBounds.zw;
                
                vec2 texEps = vec2(4.0 / 1024.0);
                float maskC = texture2D(uShapeMask, shapeUV).r;
                float maskR = texture2D(uShapeMask, shapeUV + vec2(texEps.x, 0.0)).r;
                float maskL = texture2D(uShapeMask, shapeUV - vec2(texEps.x, 0.0)).r;
                float maskT = texture2D(uShapeMask, shapeUV + vec2(0.0, texEps.y)).r;
                float maskB = texture2D(uShapeMask, shapeUV - vec2(0.0, texEps.y)).r;
                
                float smoothDist = (maskC + maskR + maskL + maskT + maskB) * 0.2;
                vec2 maskGrad = vec2(maskR - maskL, maskT - maskB) / (2.0 * texEps.x);

                vec3 p = vLocalPos * uScale;
                p.z += smoothDist * uShapeReactivity * 150.0 * uScale;
                
                vec2 contourTangent = vec2(-maskGrad.y, maskGrad.x);
                p.xy += contourTangent * (uTime * uSpeed * 0.5);
                p.y -= uTime * uSpeed * 0.1;
                
                vec3 warp;
                warp.x = snoise(p + vec3(0.0, 0.0, uTime * 0.1));
                warp.y = snoise(p + vec3(114.5, 22.1, uTime * 0.1));
                warp.z = snoise(p + vec3(233.2, 51.5, uTime * 0.1));
                vec3 warpedP = p + warp * 1.5; 
                
                float eps = 0.03; 
                float n0 = snoise(warpedP);
                float nx = snoise(warpedP + vec3(eps, 0.0, 0.0));
                float ny = snoise(warpedP + vec3(0.0, eps, 0.0));
                float nz = snoise(warpedP + vec3(0.0, 0.0, eps));
                
                vFluidNoise = n0 + (smoothDist * uShapeReactivity * 2.0); 
                
                vec3 noiseNormal = normalize(vec3(nx - n0, ny - n0, nz - n0));
                vec3 viewNoiseNormal = normalize((viewMatrix * vec4(noiseNormal, 0.0)).xyz);
                
                float isFlatFace = smoothstep(0.1, 0.9, abs(vOriginalNormal.z));
                float edgeMask = mix(1.0, isFlatFace, uEdgeProtection);

                normal = normalize(normal + viewNoiseNormal * uDistortion * edgeMask);
                `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        /texture2D\(\s*iridescenceThicknessMap\s*,\s*vIridescenceThicknessMapUv\s*\)/g,
        'vec4(vFluidNoise * 0.5 + 0.5)'
      );
    };

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // --- SVG LOADING & MASK GENERATION ---
    const loader = new SVGLoader();
    const svgData = loader.parse(finalSvg);

    const extrudeSettings = {
      depth: 1.5,
      bevelEnabled: true,
      bevelSegments: 12, // Reduced from 64 for GPU performance
      steps: 1,         // Reduced for performance
      bevelSize: 1.5,
      bevelThickness: 1.5
    };

    const allShapes: THREE.Shape[] = [];
    svgData.paths.forEach((path: THREE.ShapePath) => {
      const shapes = SVGLoader.createShapes(path);
      shapes.forEach((shape: THREE.Shape) => {
        allShapes.push(shape);
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
      });
    });

    if (allShapes.length > 0) {
      // Generate Mask
      const bounds = new THREE.Box2();
      allShapes.forEach(shape => {
        shape.getPoints().forEach(pt => bounds.expandByPoint(pt));
      });

      const width = bounds.max.x - bounds.min.x;
      const height = bounds.max.y - bounds.min.y;
      const maxDim = Math.max(width, height);
      const pad = maxDim * 0.25;
      const paddedMinX = bounds.min.x - pad;
      const paddedMinY = bounds.min.y - pad;
      const paddedWidth = width + pad * 2;
      const paddedHeight = height + pad * 2;

      const canvas = document.createElement('canvas');
      canvas.width = 512; // Reduced from 1024 for VRAM efficiency
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scaleX = canvas.width / paddedWidth;
        const scaleY = canvas.height / paddedHeight;
        ctx.save();
        ctx.filter = 'blur(25px)'; // Reduced blur radius
        ctx.fillStyle = 'white';
        ctx.scale(scaleX, scaleY);
        ctx.translate(-paddedMinX, -paddedMinY);
        ctx.beginPath();
        allShapes.forEach(shape => {
          const pts = shape.getPoints(40); // Fewer points for mask generation
          if (pts.length) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          }
          shape.holes.forEach(hole => {
            const hPts = hole.getPoints(40);
            if (hPts.length) {
              ctx.moveTo(hPts[0].x, hPts[0].y);
              for (let i = 1; i < hPts.length; i++) ctx.lineTo(hPts[i].x, hPts[i].y);
            }
          });
        });
        ctx.fill('evenodd');
        ctx.restore();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false;
      material.userData.uShapeMask.value = tex;
      material.userData.uShapeBounds.value.set(paddedMinX, paddedMinY, paddedWidth, paddedHeight);
    }

    // Centering logic
    const box = new THREE.Box3().setFromObject(group);
    const boxSize = box.getSize(new THREE.Vector3());
    const boxMaxDim = Math.max(boxSize.x, boxSize.y, boxSize.z);
    if (boxMaxDim > 0) {
      const scaleVal = 30 / boxMaxDim;
      group.scale.set(scaleVal, -scaleVal, scaleVal);
    }
    group.updateMatrixWorld();
    const scaledBox = new THREE.Box3().setFromObject(group);
    const finalCenter = scaledBox.getCenter(new THREE.Vector3());
    group.position.sub(finalCenter);

    // --- ANIMATION LOOP WITH VISIBILITY CHECK ---
    const startTime = performance.now();
    let frameId: number;
    let isVisible = true;

    // Use IntersectionObserver only if available
    const observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    
    observer.observe(container);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!isVisible) return; // Skip rendering if not visible (saves GPU)

      if (materialRef.current) {
        materialRef.current.userData.uTime.value = (performance.now() - startTime) * 0.001;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      pmremGenerator.dispose();
      material.dispose();
      dummyTex.dispose();
      if (material.userData.uShapeMask.value instanceof THREE.Texture) {
        material.userData.uShapeMask.value.dispose();
      }
    };

  }, [finalSvg, size, color, speed, distortion, scale, roughness, metalness, iridescence, iridescenceThicknessMin, iridescenceThicknessMax]);

  return (
    <div 
      ref={containerRef} 
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
