import axios from 'axios';
import { Part } from '@google/generative-ai';

/**
 * Fetches an image from a URL (Discord CDN or elsewhere) and converts it into
 * a Generative Part that Gemini multimodal APIs accept.
 *
 * @param url     Image URL (must be publicly reachable by the backend)
 * @param mimeType Optional mime-type from the Discord attachment (e.g. 'image/png').
 *                 If omitted we try to infer from response headers; defaults to 'image/png'.
 * @returns       Part object suitable to embed in Gemini prompt arrays.
 */
export async function urlToGenerativePart(url: string, mimeType?: string): Promise<Part> {
  try {
    const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    const data = Buffer.from(response.data).toString('base64');

    const type = mimeType || response.headers['content-type'] || 'image/png';

    return {
      inlineData: {
        data,
        mimeType: type,
      },
    } as Part;
  } catch (err) {
    console.error('Failed to fetch/convert image:', err);
    throw new Error('❌ Unable to download or process image');
  }
}
