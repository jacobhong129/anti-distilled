import { assetMap, publicAsset, resultSmokePath } from "./assets.js";
import { DIMENSION_DETAILS } from "./product-content.js";

const SIZES = {
  portrait: [1080, 1350],
  square: [1080, 1080],
  text: [1200, 900],
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const characters = Array.from(text || "");
  let line = "";
  let lineNumber = 0;
  for (let index = 0; index < characters.length; index += 1) {
    const test = `${line}${characters[index]}`;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line, x, y + lineNumber * lineHeight);
      line = characters[index];
      lineNumber += 1;
      if (lineNumber >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lineNumber < maxLines) context.fillText(line, x, y + lineNumber * lineHeight);
  return y + (lineNumber + 1) * lineHeight;
}

export async function renderShareCard({ result, format, toneLine, showScore, showDimensions }) {
  const [width, height] = SIZES[format] || SIZES.portrait;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const scale = width / 1080;
  const inset = 76 * scale;

  context.fillStyle = "#fbfaf3";
  context.fillRect(0, 0, width, height);
  const gradient = context.createRadialGradient(width * 0.86, height * 0.12, 20, width * 0.86, height * 0.12, width * 0.72);
  gradient.addColorStop(0, "rgba(106,84,200,.09)");
  gradient.addColorStop(0.55, "rgba(225,163,79,.05)");
  gradient.addColorStop(1, "rgba(251,250,243,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const bandAsset = assetMap.resultBands?.[result.band.name];
  const labelAsset = assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable;
  const images = await Promise.allSettled([
    loadImage(publicAsset(assetMap.global.brandFlask)),
    loadImage(publicAsset(resultSmokePath(result.score))),
    bandAsset ? loadImage(publicAsset(bandAsset)) : Promise.reject(),
    labelAsset ? loadImage(publicAsset(labelAsset)) : Promise.reject(),
  ]);
  const [flask, smoke, band, label] = images.map((item) => item.status === "fulfilled" ? item.value : null);

  context.globalAlpha = 0.68;
  if (smoke) context.drawImage(smoke, width * 0.38, -height * 0.04, width * 0.72, height * 0.65);
  context.globalAlpha = 1;

  if (flask) context.drawImage(flask, inset, 56 * scale, 43 * scale, 58 * scale);
  context.fillStyle = "#101816";
  context.font = `700 ${25 * scale}px "Kaiti SC", "Songti SC", serif`;
  context.fillText("抗蒸性测试", inset + 59 * scale, 91 * scale);
  context.fillStyle = "#0b6a4f";
  context.font = `700 ${13 * scale}px -apple-system, sans-serif`;
  context.fillText("含活人量侧影", width - inset - 99 * scale, 90 * scale);
  context.strokeStyle = "rgba(16,24,22,.14)";
  context.beginPath(); context.moveTo(inset, 130 * scale); context.lineTo(width - inset, 130 * scale); context.stroke();

  let cursorY = 258 * scale;
  context.fillStyle = "#07513d";
  if (showScore) {
    context.font = `400 ${170 * scale}px "Kaiti SC", "Songti SC", serif`;
    context.fillText(String(result.score), inset, cursorY);
    const scoreWidth = context.measureText(String(result.score)).width;
    context.font = `400 ${42 * scale}px "Kaiti SC", serif`;
    context.fillText("%", inset + scoreWidth + 15 * scale, cursorY);
  } else {
    context.font = `500 ${36 * scale}px "Kaiti SC", "Songti SC", serif`;
    context.fillText("分数先留给自己", inset, cursorY - 45 * scale);
  }

  cursorY = 365 * scale;
  if (band) context.drawImage(band, inset, cursorY, 128 * scale, 128 * scale);
  context.fillStyle = "#66706b";
  context.font = `700 ${15 * scale}px -apple-system, sans-serif`;
  context.fillText("所处段位", inset + 155 * scale, cursorY + 34 * scale);
  context.fillStyle = "#101816";
  context.font = `500 ${46 * scale}px "Kaiti SC", "Songti SC", serif`;
  context.fillText(result.band.name, inset + 155 * scale, cursorY + 90 * scale);

  cursorY = 560 * scale;
  context.strokeStyle = "#e39183";
  context.lineWidth = 4 * scale;
  context.beginPath(); context.moveTo(inset, cursorY - 28 * scale); context.lineTo(inset, cursorY + 115 * scale); context.stroke();
  context.fillStyle = "#4a3631";
  context.font = `500 ${34 * scale}px "Kaiti SC", "Songti SC", serif`;
  cursorY = drawWrappedText(context, toneLine, inset + 30 * scale, cursorY, width - inset * 2 - 30 * scale, 52 * scale, format === "text" ? 3 : 4);

  if (label && format !== "text") context.drawImage(label, inset, cursorY + 22 * scale, 82 * scale, 82 * scale);
  context.fillStyle = "#101816";
  context.font = `500 ${29 * scale}px "Kaiti SC", "Songti SC", serif`;
  context.fillText(result.labelDetails.name, inset + (format === "text" ? 0 : 103 * scale), cursorY + 73 * scale);

  if (showDimensions && format !== "text") {
    let barY = cursorY + 145 * scale;
    const barWidth = (width - inset * 2 - 135 * scale) / 2;
    result.dimensions.forEach((dimension, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = inset + column * (barWidth + 55 * scale);
      const y = barY + row * 60 * scale;
      context.fillStyle = "#3f4a46";
      context.font = `500 ${19 * scale}px "Kaiti SC", serif`;
      context.fillText(dimension.name, x, y);
      context.fillStyle = "rgba(16,24,22,.1)";
      context.fillRect(x + 55 * scale, y - 11 * scale, barWidth - 80 * scale, 8 * scale);
      context.fillStyle = DIMENSION_DETAILS[dimension.key]?.color || "#0b6a4f";
      context.fillRect(x + 55 * scale, y - 11 * scale, (barWidth - 80 * scale) * dimension.value / 100, 8 * scale);
      context.fillStyle = "#66706b";
      context.font = `400 ${15 * scale}px -apple-system, sans-serif`;
      context.fillText(String(dimension.value), x + barWidth - 18 * scale, y);
    });
  }

  context.strokeStyle = "rgba(16,24,22,.14)";
  context.beginPath(); context.moveTo(inset, height - 98 * scale); context.lineTo(width - inset, height - 98 * scale); context.stroke();
  context.fillStyle = "#66706b";
  context.font = `400 ${15 * scale}px -apple-system, sans-serif`;
  context.fillText("测测你的抗蒸性", inset, height - 53 * scale);
  context.fillStyle = "#0b6a4f";
  context.font = `500 ${18 * scale}px "Kaiti SC", serif`;
  context.textAlign = "right";
  context.fillText("方法能复制，人不只是一套方法", width - inset, height - 53 * scale);
  context.textAlign = "left";

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("无法生成分享卡")), "image/png", 0.95));
}
