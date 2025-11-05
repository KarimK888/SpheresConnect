"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getBackend } from "@/lib/backend";
import { useI18n } from "@/context/i18n";

interface FileDropProps {
  onUploaded: (fileUrl: string) => void;
}

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
        const { fileUrl } = await backend.uploads.createSignedUrl({
          mimeType: file.type,
          extension
        });
        onUploaded(fileUrl);
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
      <input
        type="file"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={uploading}
      />
      <p>{uploading ? t("filedrop_uploading") : t("filedrop_prompt")}</p>
      <Button variant="outline" type="button" disabled={uploading}>
        {t("filedrop_browse")}
      </Button>
    </motion.label>
  );
};
