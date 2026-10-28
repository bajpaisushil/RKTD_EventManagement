import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, width: number, height: number, draw: (context: CanvasRenderingContext2D) => void, repeat = true): THREE.Texture {
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  cache.set(key, texture);
  return texture;
}

export function glowTexture(): THREE.Texture {
  return canvasTexture(
    "glow",
    64,
    64,
    (context) => {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.18, "rgba(255,255,255,0.85)");
      gradient.addColorStop(0.45, "rgba(255,255,255,0.22)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    },
    false,
  );
}

export function carvedMarbleTexture(): THREE.Texture {
  return canvasTexture("carved-marble", 256, 256, (context) => {
    context.fillStyle = "#f7f3ec";
    context.fillRect(0, 0, 256, 256);
    context.strokeStyle = "rgba(140, 118, 84, 0.28)";
    context.lineWidth = 2;
    context.strokeRect(10, 10, 236, 236);
    context.strokeRect(22, 22, 212, 212);
    context.lineWidth = 1.5;
    for (let petal = 0; petal < 8; petal++) {
      const angle = (petal / 8) * Math.PI * 2;
      context.beginPath();
      context.ellipse(128 + Math.cos(angle) * 34, 128 + Math.sin(angle) * 34, 26, 12, angle, 0, Math.PI * 2);
      context.stroke();
    }
    context.beginPath();
    context.arc(128, 128, 14, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(128, 128, 78, 0, Math.PI * 2);
    context.stroke();
    for (const [x, y] of [
      [22, 22],
      [234, 22],
      [22, 234],
      [234, 234],
    ]) {
      context.beginPath();
      context.arc(x, y, 9, 0, Math.PI * 2);
      context.stroke();
    }
  });
}

export function shikharaTexture(): THREE.Texture {
  const texture = canvasTexture("shikhara", 128, 128, (context) => {
    context.fillStyle = "#f8f5ef";
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = "rgba(120, 100, 70, 0.4)";
    context.lineWidth = 3;
    for (let y = 0; y <= 128; y += 32) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(128, y);
      context.stroke();
    }
    context.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      for (let x = row % 2 === 0 ? 0 : 32; x <= 128; x += 64) {
        context.beginPath();
        context.moveTo(x, row * 32);
        context.lineTo(x, row * 32 + 32);
        context.stroke();
      }
    }
    context.fillStyle = "rgba(201, 155, 36, 0.55)";
    for (let row = 0; row < 4; row++) {
      context.beginPath();
      context.arc(row % 2 === 0 ? 32 : 0, row * 32 + 16, 4, 0, Math.PI * 2);
      context.fill();
    }
  });
  texture.repeat.set(8, 7);
  return texture;
}

export function stripeTexture(color: string): THREE.Texture {
  return canvasTexture(`stripes-${color}`, 64, 64, (context) => {
    context.fillStyle = "#fbf3e2";
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = color;
    for (let x = 0; x < 64; x += 16) context.fillRect(x, 0, 8, 64);
  });
}

export function signTexture(text: string, background: string, width = 512, height = 128): THREE.Texture {
  return canvasTexture(
    `sign-${text}-${background}`,
    width,
    height,
    (context) => {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "#d1ac3e";
      context.lineWidth = 8;
      context.strokeRect(10, 10, width - 20, height - 20);
      context.fillStyle = "#f5d77a";
      context.font = `600 ${Math.round(height * 0.46)}px Georgia, "Times New Roman", serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, width / 2, height / 2 + 4);
    },
    false,
  );
}

export function skyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color("#070718") },
      middle: { value: new THREE.Color("#22184a") },
      horizon: { value: new THREE.Color("#7a3f5c") },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 middle;
      uniform vec3 horizon;
      varying vec3 vDirection;
      void main() {
        float height = vDirection.y;
        vec3 color = mix(horizon, middle, smoothstep(-0.02, 0.22, height));
        color = mix(color, top, smoothstep(0.22, 0.75, height));
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
