import { extname, join } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export async function uploadFile(file: Express.Multer.File): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const folderPath = 'uploads/' + year.toString() + '/' + month;

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Generate hash for the file content to check uniqueness
  const fileHash = crypto.createHash('md5').update(file.buffer).digest('hex');
  const ext = extname(file.originalname);

  // Check if a file with the same hash already exists
  const existingFiles = fs.readdirSync(folderPath);
  for (const existingFile of existingFiles) {
    const existingFilePath = folderPath + '/' + existingFile;

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
  const filePath = `${folderPath}/${fileName}`;

  fs.writeFileSync(filePath, file.buffer);

  return filePath;
}

// file.helper.ts
// Method to remove file from server.
export async function deleteFileFromServer(fileUrl: string): Promise<void> {
  if (!fileUrl) {
    console.warn('deleteFileFromServer: fileUrl is empty, skipping deletion.');
    return;
  }

  const normalizedUrl = fileUrl.replace(/^\/+/, ''); // remove leading slash
  const fullPath = path.resolve(process.cwd(), normalizedUrl);
  const uploadsBasePath = path.resolve(process.cwd(), 'uploads');

  if (!fullPath.startsWith(uploadsBasePath)) {
    console.error('Attempted to delete outside uploads directory:', fullPath);
    return;
  }

  console.log(
    `Attempting to delete file: ${fullPath} and Base Path: ${uploadsBasePath}`,
  );
  try {
    await fs.promises.access(fullPath, fs.constants.F_OK); // check if exists
    await fs.promises.unlink(fullPath);
    console.log(`File deleted: ${fullPath}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`File not found: ${fileUrl}`);
    } else {
      console.error(`Error deleting file: ${fileUrl}`, error.message);
    }
  }
}
