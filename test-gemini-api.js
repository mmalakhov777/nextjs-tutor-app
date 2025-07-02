// To test the Gemini API
// npm install @google/genai
// npm install -D @types/node

import {
  GoogleGenAI
} from '@google/genai';
import { writeFile } from 'fs';

function saveBinaryFile(fileName, content) {
  writeFile(fileName, content, (err) => {
    if (err) {
      console.error(`Error writing file ${fileName}:`, err);
      return;
    }
    console.log(`File ${fileName} saved to file system.`);
  });
}

async function main() {
  const ai = new GoogleGenAI({
    apiKey: "AIzaSyDPtJ71_cTsq-WbvWKGOv8UxVpXIfkCR6E",
  });

  console.log('Testing Gemini API...');

  try {
    const response = await ai.models.generateImages({
      model: 'models/imagen-4.0-generate-preview-06-06',
      prompt: `An evocative image of an English afternoon tea table in a period drama setting, specifically reminiscent of the Queen Elizabeth I era. The table is adorned with a newspaper, prominently displaying the headline 'Gemini 2.5 in 2025'. Ensure the scene is rich in historical detail and atmosphere, but devoid of any human presence. Focus on the intricate details of the tea set, the newspaper's texture, and the ambient lighting typical of that period.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    console.log('API Response received:', !!response);

    if (!response?.generatedImages) {
      console.error('No images generated.');
      return;
    }

    if (response.generatedImages.length !== 1) {
      console.error('Number of images generated does not match the requested number.');
    }

    for (let i = 0; i < response.generatedImages.length; i++) {
      if (!response.generatedImages?.[i]?.image?.imageBytes) {
        continue;
      }
      const fileName = `image_${i}.jpeg`;
      const inlineData = response?.generatedImages?.[i]?.image?.imageBytes;
      const buffer = Buffer.from(inlineData || '', 'base64');
      saveBinaryFile(fileName, buffer);
    }
  } catch (error) {
    console.error('Error testing Gemini API:', error);
  }
}

main(); 