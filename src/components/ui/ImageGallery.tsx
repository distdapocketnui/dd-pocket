"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

interface Props {
  /** Array URL gambar */
  images: string[];
}

export default function ImageGallery({ images }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const validImages = images.filter(Boolean);

  if (validImages.length === 0) return null;

  // Tampilkan thumbnail pertama
  const first = validImages[0];
  const remaining = validImages.length - 1;

  return (
    <>
      <div className="flex items-start gap-1.5">
        <div className="relative group">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(0); }}
            className="block"
          >
            <img
              src={first}
              alt="Gambar"
              className="w-14 h-14 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition-opacity"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'><rect width='24' height='24' rx='4'/><text x='12' y='16' text-anchor='middle' font-size='14' fill='%23999'>?</text></svg>";
              }}
            />
          </button>
          {remaining > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(0); }}
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md hover:bg-blue-600 transition-colors"
            >
              +{remaining}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
          >
            <X size={20} />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/70 text-sm font-medium">
            {lightboxIdx + 1} / {validImages.length}
          </div>

          {/* Previous */}
          {validImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((prev) =>
                  prev === 0 ? validImages.length - 1 : prev! - 1,
                );
              }}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Image */}
          <img
            src={validImages[lightboxIdx]}
            alt={`Gambar ${lightboxIdx + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {validImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((prev) =>
                  prev === validImages.length - 1 ? 0 : prev! + 1,
                );
              }}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
