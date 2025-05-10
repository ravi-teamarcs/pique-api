type UploadedFile = {
  url: string;
  name: string;
  type: 'headshot' | 'image' | 'video' | 'event_headshot';
};

const mimeTypeMap = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  headshot: ['image/jpeg', 'image/png'], // optional, if you want to distinguish
  event_headshot: ['image/jpeg', 'image/png'], // optional
} as const;

type FileType = keyof typeof mimeTypeMap;
function getFileType(mimetype: string): FileType | null {
  for (const [key, mimeList] of Object.entries(mimeTypeMap) as [
    FileType,
    readonly string[],
  ][]) {
    if (mimeList.includes(mimetype)) {
      return key;
    }
  }
  return null;
}

export { UploadedFile, FileType, mimeTypeMap, getFileType };
