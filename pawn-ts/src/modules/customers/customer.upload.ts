import multer from 'multer';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.STORAGE_MAX_FILE_BYTES ?? 5 * 1024 * 1024) },
});
