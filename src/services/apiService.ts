import axios from 'axios';
import {ScanResponse} from '../types';

const API_URL = 'https://calendar.chrisstirling.com';

export const scanCalendar = async (
  imageUri: string,
  customInstructions?: string,
): Promise<ScanResponse> => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'calendar.jpg',
  } as any);

  // No longer sending calendarType - GPT-4 Vision handles everything automatically
  formData.append('calendarType', 'general_notes');

  if (customInstructions) {
    formData.append('customInstructions', customInstructions);
  }

  const response = await axios.post(`${API_URL}/api/scan`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 180000, // 3 minute timeout for complex images
  });

  return response.data;
};

export const generateICS = async (events: any[]): Promise<Blob> => {
  const response = await axios.post(
    `${API_URL}/api/generate-ics`,
    {events},
    {
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
      timeout: 30000,
    },
  );

  return response.data;
};
