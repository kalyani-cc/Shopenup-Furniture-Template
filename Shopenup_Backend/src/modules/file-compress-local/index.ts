import type { FileTypes } from '@shopenup/framework/types';
import { LocalFileService as BaseLocalFileService } from '@shopenup/file-local';
import type { Readable } from 'stream';
import sharp from 'sharp';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export class LocalFileService extends BaseLocalFileService {
  static override identifier = 'local';

  override async upload(file: FileTypes.ProviderUploadFileDTO) {
    try {
      const isImage = (file.mimeType || '').startsWith('image/');
      if (!isImage) {
        return await super.upload(file);
      }

      const sourceBuffer: Buffer | undefined =
        (file as any).buffer || (file as any).data || (file as any).content ||
        (file as any).stream ? await streamToBuffer((file as any).stream as Readable) : undefined;

      if (!sourceBuffer) {
        // If we cannot materialize a buffer, fallback to default upload
        return await super.upload(file);
      }

      const compressedBuffer = await sharp(sourceBuffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const newName = (file.filename || 'image')
        .replace(/\.(png|jpg|jpeg|gif|tiff?|bmp|webp)$/i, '') + '.webp';

      const compressedFile: FileTypes.ProviderUploadFileDTO = {
        ...file,
        filename: newName,
        mimeType: 'image/webp',
        // Commonly used properties across providers
        // Prefer 'buffer' if supported; keep other fields in case the base class uses them
        buffer: compressedBuffer as any,
        // Cleanup stream if present since we now provide a buffer
        stream: undefined as any,
      } as any;

      return await super.upload(compressedFile);
    } catch (_) {
      // On any error, fallback to default behavior
      return await super.upload(file);
    }
  }
}

export default {
  services: [LocalFileService],
};


