import type { SignedUploadTarget } from "./backend";

export const uploadFileToTarget = async (file: File, target: SignedUploadTarget) => {
  const method = target.method ?? "PUT";
  if (method === "POST") {
    const headers = target.headers ?? {};
    const form = new FormData();
    Object.entries(target.formFields ?? {}).forEach(([key, value]) => {
      form.append(key, value);
    });
    form.append(target.fileField ?? "file", file);
    return fetch(target.uploadUrl, {
      method,
      body: form,
      headers: Object.keys(headers).length ? headers : undefined
    });
  }
  const headers = { ...(target.headers ?? {}) };
  const contentType = file.type || "application/octet-stream";
  if (!headers["Content-Type"]) {
    headers["Content-Type"] = contentType;
  }
  return fetch(target.uploadUrl, {
    method,
    headers,
    body: file
  });
};
