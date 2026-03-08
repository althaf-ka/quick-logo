export interface GenerateImageMessage {
  imageId: string;
  projectId: string;
  userId: string;
  prompt: string;
  isEdit?: boolean;
  config: {
    model: string;
    imageCount: number;
    style?: string;
    colorPalette?: string;
    customColors?: string[];
    negativePrompt?: string;
    background?: "transparent" | "white" | "custom";
    customBgColor?: string;
    referenceImageUrl?: string;
    referenceStrength?: number;
    magicPrompt?: boolean;
  };
}
