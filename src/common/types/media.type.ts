type UploadedFile = {
  url: string;
  name: string;
  type: 'headshot' | 'image' | 'video' | 'event_headshot';
};

export { UploadedFile };
