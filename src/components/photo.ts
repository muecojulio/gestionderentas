export async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elige una foto en JPG, PNG o WebP.");
  }
  const bitmap = await createImageBitmap(file);
  const max = 960;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la foto.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let url = canvas.toDataURL("image/jpeg", 0.72);
  if (url.length > 480_000) url = canvas.toDataURL("image/jpeg", 0.5);
  if (url.length > 500_000) throw new Error("Esa foto sigue siendo muy pesada.");
  return url;
}
