import * as THREE from "three";
import type { MarkStyle } from "./types";

const PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-0.27, -0.27], [0.27, 0.27]],
  3: [[-0.3, -0.3], [0, 0], [0.3, 0.3]],
  4: [[-0.27, -0.27], [0.27, -0.27], [-0.27, 0.27], [0.27, 0.27]],
  5: [[-0.3, -0.3], [0.3, -0.3], [0, 0], [-0.3, 0.3], [0.3, 0.3]],
  6: [[-0.3, -0.34], [-0.3, 0], [-0.3, 0.34], [0.3, -0.34], [0.3, 0], [0.3, 0.34]],
  7: [[-0.3, -0.34], [-0.3, 0], [-0.3, 0.34], [0, 0], [0.3, -0.34], [0.3, 0], [0.3, 0.34]],
  8: [[-0.3, -0.34], [-0.3, 0], [-0.3, 0.34], [0, -0.18], [0, 0.18], [0.3, -0.34], [0.3, 0], [0.3, 0.34]],
  9: [[-0.3, -0.34], [-0.3, 0], [-0.3, 0.34], [0, -0.34], [0, 0], [0, 0.34], [0.3, -0.34], [0.3, 0], [0.3, 0.34]],
};

export function pipLayout(value: string): Array<[number, number]> {
  const count = Number.parseInt(value, 10);
  return PIP_LAYOUTS[count] || [];
}

export function createMarkTexture(
  value: string,
  style: MarkStyle,
  graphicData: string,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 384;
  const context = canvas.getContext("2d")!;
  const ink = "#171915";

  const drawText = () => {
    context.clearRect(0, 0, 384, 384);
    context.fillStyle = ink;
    context.shadowColor = "rgba(255,255,255,.42)";
    context.shadowBlur = 3;
    context.shadowOffsetY = 4;
    const length = value.length;
    const size = length > 2 ? 150 : length === 2 ? 190 : 230;
    context.font = `800 ${size}px Arial, Helvetica, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(value, 192, 200);
  };

  if (style === "pips" && pipLayout(value).length) {
    context.clearRect(0, 0, 384, 384);
    context.fillStyle = ink;
    pipLayout(value).forEach(([x, y]) => {
      context.beginPath();
      context.arc(192 + x * 270, 192 + y * 270, 30, 0, Math.PI * 2);
      context.fill();
    });
  } else if (style === "graphic" && graphicData) {
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, 384, 384);
      context.save();
      context.filter = "grayscale(1) contrast(8)";
      context.drawImage(image, 54, 54, 276, 276);
      context.globalCompositeOperation = "source-in";
      context.fillStyle = ink;
      context.fillRect(0, 0, 384, 384);
      context.restore();
      texture.needsUpdate = true;
    };
    image.src = graphicData;
  } else {
    drawText();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
