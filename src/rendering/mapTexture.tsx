// At most two raster canvases; no SVG serialization or rasterization during dragging.
const imageCache = new Map<boolean, Promise<HTMLCanvasElement>>();
export function getMapTexture(
  showGrid: boolean,
  source: SVGSVGElement,
): Promise<HTMLCanvasElement> {
  const cached = imageCache.get(showGrid);
  if (cached) return cached;
  const image = new Promise<HTMLCanvasElement>((resolve, reject) => {
    const markup = new XMLSerializer().serializeToString(source);
    const url = URL.createObjectURL(
      new Blob([markup], { type: "image/svg+xml" }),
    );
    const decoded = new Image();
    decoded.onload = () => {
      try {
        const raster = document.createElement("canvas");
        raster.width = raster.height = 1024;
        const context = raster.getContext("2d");
        if (!context) throw new Error("SVG rasterization is unavailable.");
        context.drawImage(decoded, 0, 0, 1024, 1024);
        resolve(raster);
      } catch (error) {
        imageCache.delete(showGrid);
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    decoded.onerror = () => {
      URL.revokeObjectURL(url);
      imageCache.delete(showGrid);
      reject(new Error("The SVG map texture could not be decoded."));
    };
    decoded.src = url;
  });
  imageCache.set(showGrid, image);
  return image;
}
