/**
 * WebGL Metaball 动画组件
 * 基于 SDF (Signed Distance Field) 和 Smooth Minimum 实现粘稠流体效果
 */
import { useEffect, useRef, useCallback } from "react";

interface MetaballCanvasProps {
  /** 容器类名 */
  className?: string;
  /** 是否暂停动画（用于性能优化） */
  paused?: boolean;
  /** 颜色主题（可选，默认使用蓝紫色调） */
  colors?: [number, number, number][];
}

// 顶点着色器
const VERTEX_SHADER = `#version 300 es
  in vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// 片段着色器：实现 SDF Metaball 渲染
const FRAGMENT_SHADER = `#version 300 es
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec4 u_blobs[4];
  uniform vec3 u_colors[4];
  uniform vec2 u_mouse;

  out vec4 outColor;

  // Smooth Minimum 函数 - 创建粘稠合并效果
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // 计算距离场和混合颜色
  vec4 map(vec2 p) {
    float d = 1000.0;
    vec3 col = vec3(0.0);
    float k = 0.15;
    float totalWeight = 0.0;

    for(int i = 0; i < 4; i++) {
      vec2 center = u_blobs[i].xy;
      float radius = u_blobs[i].z;
      float distToBlob = length(p - center) - radius;
      d = smin(d, distToBlob, k);
      float weight = exp(-distToBlob * 15.0);
      col += u_colors[i] * weight;
      totalWeight += weight;
    }

    if(totalWeight > 0.0) {
      col /= totalWeight;
    }

    return vec4(col, d);
  }

  // 计算法线（用于光照）
  vec3 calcNormal(vec2 p) {
    const vec2 e = vec2(0.005, 0.0);
    float d = map(p).w;
    vec3 n = vec3(
      map(p + e.xy).w - map(p - e.xy).w,
      map(p + e.yx).w - map(p - e.yx).w,
      0.05
    );
    return normalize(n);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;

    vec4 scene = map(p);
    float dist = scene.w;
    vec3 baseColor = scene.rgb;

    float alpha = smoothstep(0.01, -0.01, dist);

    if (alpha < 0.01) {
      // 背景：微妙的径向渐变
      float bgFade = length(p) * 0.3;
      outColor = vec4(vec3(0.04 - bgFade * 0.5), 1.0);
      return;
    }

    // 计算光照
    vec3 n = calcNormal(p);
    vec3 lightPos1 = normalize(vec3(0.5, 0.8, 1.0));
    vec3 lightPos2 = normalize(vec3(-0.8, -0.2, 0.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // 环境光
    vec3 ambient = baseColor * 0.3;

    // 漫反射
    float diff1 = max(dot(n, lightPos1), 0.0);
    float diff2 = max(dot(n, lightPos2), 0.0);
    vec3 diffuse = baseColor * (diff1 * 0.8 + diff2 * 0.3);

    // 高光
    vec3 halfDir1 = normalize(lightPos1 + viewDir);
    float spec1 = pow(max(dot(n, halfDir1), 0.0), 128.0);
    vec3 halfDir2 = normalize(lightPos2 + viewDir);
    float spec2 = pow(max(dot(n, halfDir2), 0.0), 32.0);

    // 边缘光
    float rim = 1.0 - max(dot(n, viewDir), 0.0);
    rim = smoothstep(0.6, 1.0, rim);

    // 合成
    vec3 finalColor = ambient + diffuse;
    finalColor += vec3(1.0) * spec1 * 1.5;
    finalColor += baseColor * spec2 * 0.5;
    finalColor += baseColor * rim * 0.8;

    // 深度阴影
    float depth = smoothstep(-0.2, 0.0, dist);
    finalColor *= mix(0.6, 1.0, depth);

    // 对比度增强
    finalColor = smoothstep(0.0, 1.0, finalColor);

    outColor = vec4(finalColor, alpha);
  }
`;

// 默认颜色（蓝紫色调，与项目主题一致）
const DEFAULT_COLORS: [number, number, number][] = [
  [0.6, 0.4, 1.0],   // 紫色
  [0.3, 0.6, 1.0],   // 蓝色
  [0.5, 0.2, 0.9],   // 深紫
  [0.2, 0.8, 0.9],   // 青色
];

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  color: [number, number, number];
  angleOffset: number;
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("[MetaballCanvas] Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function MetaballCanvas({ className = "", paused = false, colors = DEFAULT_COLORS }: MetaballCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const blobsRef = useRef<Blob[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const lastTimeRef = useRef(0);

  // 初始化 WebGL
  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return false;

    const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      console.warn("[MetaballCanvas] WebGL 2 not supported");
      return false;
    }

    // 创建着色器
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return false;

    // 创建程序
    const program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("[MetaballCanvas] Program link error:", gl.getProgramInfoLog(program));
      return false;
    }

    // 设置顶点缓冲
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    glRef.current = gl;
    programRef.current = program;

    // 初始化 blobs
    const NUM_BLOBS = 4;
    const blobs: Blob[] = [];
    for (let i = 0; i < NUM_BLOBS; i++) {
      const angle = (i / NUM_BLOBS) * Math.PI * 2;
      const dist = 0.2;
      const targetRadius = 0.15 + Math.random() * 0.1;
      blobs.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: 0.01,
        targetRadius,
        color: colors[i] || DEFAULT_COLORS[i],
        angleOffset: Math.random() * Math.PI * 2,
      });
    }
    blobsRef.current = blobs;

    return true;
  }, [colors]);

  // 调整 canvas 尺寸
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const gl = glRef.current;
    if (!canvas || !wrapper || !gl) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }, []);

  // 渲染循环
  const render = useCallback(
    (now: number) => {
      if (paused) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const gl = glRef.current;
      const program = programRef.current;
      const canvas = canvasRef.current;
      const blobs = blobsRef.current;
      if (!gl || !program || !canvas || blobs.length === 0) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const currentTime = now * 0.001;
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // 物理模拟
      const centerAttraction = 0.02;
      const repulsionForce = 0.05;
      const damping = 0.85;

      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];

        // 平滑过渡到目标半径
        b.radius += (b.targetRadius - b.radius) * 0.1;
        b.angleOffset += deltaTime * 0.5;

        // 中心吸引
        const targetX = Math.cos(b.angleOffset + i) * 0.1;
        const targetY = Math.sin(b.angleOffset * 0.8 + i) * 0.1;
        b.vx += (targetX - b.x) * centerAttraction;
        b.vy += (targetY - b.y) * centerAttraction;

        // 斥力
        for (let j = 0; j < blobs.length; j++) {
          if (i === j) continue;
          const b2 = blobs[j];
          const dx = b.x - b2.x;
          const dy = b.y - b2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = b.radius + b2.radius + 0.05;
          if (dist < minDist && dist > 0.001) {
            const force = (minDist - dist) * repulsionForce;
            b.vx += (dx / dist) * force;
            b.vy += (dy / dist) * force;
          }
        }

        // 阻尼和位置更新
        b.vx *= damping;
        b.vy *= damping;
        b.x += b.vx;
        b.y += b.vy;
      }

      // 准备 uniform 数据
      const blobData: number[] = [];
      const colorData: number[] = [];
      for (const b of blobs) {
        blobData.push(b.x, b.y, b.radius, 0.0);
        colorData.push(...b.color);
      }

      // 渲染
      gl.useProgram(program);
      gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, "u_time"), currentTime);
      gl.uniform2f(gl.getUniformLocation(program, "u_mouse"), mouseRef.current.x, mouseRef.current.y);
      gl.uniform4fv(gl.getUniformLocation(program, "u_blobs"), blobData);
      gl.uniform3fv(gl.getUniformLocation(program, "u_colors"), colorData);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationRef.current = requestAnimationFrame(render);
    },
    [paused]
  );

  // 初始化和清理
  useEffect(() => {
    if (!initGL()) return;
    resizeCanvas();

    const handleResize = () => resizeCanvas();
    window.addEventListener("resize", handleResize);

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGL, resizeCanvas, render]);

  // 鼠标交互
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    mouseRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: 1.0 - (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: 0.5, y: 0.5 };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* 扫描线效果 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
        }}
      />
    </div>
  );
}
