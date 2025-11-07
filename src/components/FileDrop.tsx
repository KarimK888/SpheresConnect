"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getBackend } from "@/lib/backend";
import { useI18n } from "@/context/i18n";

interface FileDropProps {
  onUploaded: (fileUrl: string) => void;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const FileDrop = ({ onUploaded }: FileDropProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { t } = useI18n();
  const backend = useMemo(() => getBackend(), []);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const extension = file.name.split(".").pop() ?? "dat";
        const { uploadUrl, fileUrl } = await backend.uploads.createSignedUrl({
          mimeType: file.type || "application/octet-stream",
          extension
        });
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream"
          },
          body: file
        });
        if (!response.ok) {
          throw new Error("upload_failed");
        }
        onUploaded(fileUrl);
      } catch {
        const dataUrl = await readFileAsDataUrl(file);
        onUploaded(dataUrl);
      } finally {
        setUploading(false);
      }
    },
    [backend, onUploaded]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      void uploadFile(files[0]);
    },
    [uploadFile]
  );

  return (
    <motion.label
      whileHover={{ scale: 1.01 }}
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-sm transition-colors ${
        dragActive ? "border-accent bg-accent/10" : "border-border bg-border/20"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input type="file" className="hidden" onChange={(event) => handleFiles(event.target.files)} disabled={uploading} />
      <p>{uploading ? t("filedrop_uploading") : t("filedrop_prompt")}</p>
      <Button variant="outline" type="button" disabled={uploading}>
        {t("filedrop_browse")}
      </Button>
    </motion.label>
  );
};
