interface VoiceToTextInput {
  fileUrl: string;
}

export const voiceToTextFlow = async ({ fileUrl }: VoiceToTextInput) => {
  return {
    transcript: `Transcript placeholder for ${fileUrl}`,
    lang: "en"
  };
};
