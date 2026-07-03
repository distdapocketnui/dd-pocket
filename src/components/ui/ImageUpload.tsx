"use client";

import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, Loader2, Upload } from "lucide-react";
import { compressImage } from "@/lib/image";
import { uploadToGoogleDrive } from "@/lib/google-drive";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadedImage {
  /** URL final setelah upload ke Google Drive */
  url: string;
  /** Data URL sementara untuk preview */
  preview: string;
  /** Status upload */
  uploading: boolean;
  /** Nama file asli untuk referensi */
  name: string;
}

interface Props {
  /** URL gambar existing (dari database) untuk mode edit */
  existingUrls?: string[];
  /** Dipanggil dengan array URL final setelah semua upload selesai */
  onImagesChange: (urls: string[]) => void;
}

export default function ImageUpload({ existingUrls = [], onImagesChange }: Props) {
  const [images, setImages] = useState<UploadedImage[]>(
    existingUrls.map((url) => ({
      url,
      preview: url,
      uploading: false,
      name: "",
    })),
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_FILES - images.filter((img) => img.url).length;

  const handleFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files || remaining <= 0) return;

    const filesArray = Array.from(files).slice(0, remaining);

    // Filter validasi
    const validFiles = filesArray.filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    const newImages: UploadedImage[] = [];
    const urls: string[] = [];

    for (const file of validFiles) {
      const preview = URL.createObjectURL(file);
      const previewObj: UploadedImage = {
        url: "",
        preview,
        uploading: true,
        name: file.name,
      };
      newImages.push(previewObj);

      // Render dulu supaya lihat preview
      setImages((prev) => [...prev, previewObj]);

      try {
        const compressed = await compressImage(file);
        const ts = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const url = await uploadToGoogleDrive(compressed, `${ts}-${safeName}`);

        urls.push(url);

        // Update status jadi selesai
        setImages((prev) =>
          prev.map((img) =>
            img.preview === preview ? { ...img, url, uploading: false } : img,
          ),
        );
      } catch (err: any) {
        // Upload failed — remove from list
        setImages((prev) => prev.filter((img) => img.preview !== preview));
        URL.revokeObjectURL(preview);
      }
    }

    setUploading(false);

    // Collect all final URLs
    setImages((prev) => {
      const allUrls = prev.map((img) => img.url).filter(Boolean);
      onImagesChange(allUrls);
      return prev;
    });
  }, [remaining, onImagesChange]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.preview && !removed?.url) {
        URL.revokeObjectURL(removed.preview);
      }
      const updated = prev.filter((_, i) => i !== index);
      onImagesChange(updated.map((img) => img.url).filter(Boolean));
      return updated;
    });
  }, [onImagesChange]);

  return (
    <div className="space-y-3">
      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={img.preview}
                alt={`Gambar ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Uploading overlay */}
              {img.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-white" />
                </div>
              )}
              {/* Hapus button */}
              {!img.uploading && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); removeImage(i); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {/* Placeholder untuk upload tambahan */}
          {remaining > 0 && !uploading && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
              <ImagePlus size={18} className="text-gray-400" />
              <span className="text-[10px] text-gray-400">{remaining}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>
          )}
        </div>
      )}

      {/* Trigger awal jika belum ada gambar */}
      {images.length === 0 && (
        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 bg-gray-50 hover:bg-blue-50 transition-colors">
          <Upload size={24} className="text-gray-400 mb-2" />
          <span className="text-sm text-gray-500 font-medium">
            Klik untuk upload (max {MAX_FILES} gambar)
          </span>
          <span className="text-xs text-gray-400 mt-1">
            Format: JPG/PNG, max 5MB/file
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </label>
      )}

      {/* Loading overlay */}
      {uploading && (
        <p className="text-xs text-blue-600 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" />
          Mengupload gambar...
        </p>
      )}
    </div>
  );
}
