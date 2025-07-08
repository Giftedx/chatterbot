import axios, { AxiosResponse } from 'axios';
import { urlToGenerativePart } from '../image-helper';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('image-helper', () => {
  it('converts image url to generative Part', async () => {
    const dummyBuffer = Buffer.from('fake-image');
    mockedAxios.get.mockResolvedValue({ 
      data: dummyBuffer, 
      headers: { 'content-type': 'image/png' } 
    } as Pick<AxiosResponse, 'data' | 'headers'>);

    const part = await urlToGenerativePart('http://example.com/img.png', 'image/png');
    expect(part.inlineData).toBeDefined();
    expect(part.inlineData!.mimeType).toBe('image/png');
    expect(part.inlineData!.data).toBe(dummyBuffer.toString('base64'));
  });
});
