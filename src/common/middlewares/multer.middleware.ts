import { extname, join } from 'path';
import fs from 'fs';
import crypto from 'crypto';

export async function uploadFile(file: Express.Multer.File): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const folderPath = join('uploads', year.toString(), month);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Generate hash for the file content to check uniqueness
  const fileHash = crypto.createHash('md5').update(file.buffer).digest('hex');
  const ext = extname(file.originalname);

  // Check if a file with the same hash already exists
  const existingFiles = fs.readdirSync(folderPath);
  for (const existingFile of existingFiles) {
    const existingFilePath = join(folderPath, existingFile);

    // Compare hash of existing files with the new file
    const existingFileBuffer = fs.readFileSync(existingFilePath);
    const existingFileHash = crypto
      .createHash('md5')
      .update(existingFileBuffer)
      .digest('hex');

    if (existingFileHash === fileHash) {
      return existingFilePath; // Return the existing file path
    }
  }

  // If the file doesn't exist, upload it
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const fileName = `${uniqueName}${ext}`;
  const filePath = join(folderPath, fileName);

  fs.writeFileSync(filePath, file.buffer);
  return filePath;
}
