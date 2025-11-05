interface AutoTagInput {
  fileUrl?: string;
  caption?: string;
}

export const autoTagFlow = async ({ fileUrl, caption }: AutoTagInput) => {
  const keywords = [] as string[];
  if (caption) {
    caption
      .split(/\W+/)
      .map((word) => word.toLowerCase())
      .filter((word) => word.length > 3)
      .slice(0, 5)
      .forEach((word) => {
        if (!keywords.includes(word)) keywords.push(word);
      });
  }
  if (fileUrl) {
    const hint = fileUrl.split("/").pop()?.split(".")[0];
    if (hint) keywords.push(hint.toLowerCase());
  }
  return { tags: keywords.length ? keywords : ["creative", "spheraconnect"] };
};
