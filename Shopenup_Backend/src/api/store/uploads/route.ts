import { ShopenupRequest, ShopenupResponse } from "@shopenup/framework";
import { Modules } from "@shopenup/framework/utils";
import Busboy from "busboy";

export async function POST(req: ShopenupRequest, res: ShopenupResponse) {
  try {
    const fileModuleService = req.scope.resolve(Modules.FILE) as any;
    return new Promise<void>((resolve) => {
      const busboy = Busboy({ headers: req.headers as any });
      const uploadedFiles: Array<{ buffer: Buffer; filename: string; mimeType: string }> = [];
      const filePromises: Promise<void>[] = [];

      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks: Buffer[] = [];

        // Create a promise for each file to ensure it's fully processed
        const filePromise = new Promise<void>((fileResolve, fileReject) => {
          file.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          file.on('end', () => {
            try {
              const buffer = Buffer.concat(chunks);
              if (buffer.length === 0) {
                console.warn(`[POST /store/uploads] Empty file received: ${filename}`);
                fileResolve();
                return;
              }
              
              uploadedFiles.push({
                buffer: buffer,
                filename: filename || 'upload',
                mimeType: mimeType || 'application/octet-stream',
              });
              fileResolve();
            } catch (error: any) {
              console.error(`[POST /store/uploads] Error processing file ${filename}:`, error);
              fileReject(error);
            }
          });

          file.on('error', (error: any) => {
            console.error(`[POST /store/uploads] File stream error for ${filename}:`, error);
            fileReject(error);
          });
        });

        filePromises.push(filePromise);
      });

      busboy.on('finish', async () => {
        try {
          // Wait for all files to be fully processed
          await Promise.all(filePromises);

          if (uploadedFiles.length === 0) {
            res.status(400).json({
              title: "Response Error",
              code: "invalid_request_error",
              message: "No files provided",
              type: "invalid_data",
            });
            resolve();
            return;
          }

          // Validate all files have buffers
          const invalidFiles = uploadedFiles.filter(f => !f.buffer || f.buffer.length === 0);
          if (invalidFiles.length > 0) {
            res.status(400).json({
              title: "Response Error",
              code: "invalid_request_error",
              message: `Invalid files detected: ${invalidFiles.map(f => f.filename).join(', ')}`,
              type: "invalid_data",
            });
            resolve();
            return;
          }

          // Format files for the file service
          // The service expects 'content' as binary string or 'buffer' as Buffer
          // Based on seed.ts pattern, we'll use content as binary string
          const filesToUpload = uploadedFiles.map(file => ({
            filename: file.filename,
            mimeType: file.mimeType,
            content: file.buffer.toString('binary'), // Binary string format like seed.ts
            access: 'public' as const, // Make files publicly accessible
          }));

          console.log(`[POST /store/uploads] Uploading ${filesToUpload.length} file(s), first file size: ${uploadedFiles[0]?.buffer.length} bytes`);
          const result = await fileModuleService.createFiles(filesToUpload);

          res.json({
            files: result.map((f: any) => ({
              id: f.id,
              url: f.url,
              key: f.key,
            })),
          });
          resolve();
        } catch (error: any) {
          console.error("[POST /store/uploads] Error:", error);
          res.status(400).json({
            title: "Response Error",
            code: "invalid_request_error",
            message: error?.message || "Failed to upload files",
            type: error?.type || "invalid_data",
          });
          resolve();
        }
      });

      busboy.on('error', (error: any) => {
        console.error("[POST /store/uploads] Busboy error:", error);
        res.status(400).json({
          title: "Response Error",
          code: "invalid_request_error",
          message: error?.message || "Failed to parse form data",
          type: error?.type || "invalid_data",
        });
        resolve();
      });

      const expressReq = (req as any).req || req;
      expressReq.pipe(busboy);
    });
  } catch (error: any) {
    console.error("[POST /store/uploads] Error:", error);
    return res.status(400).json({
      title: "Response Error",
      code: "invalid_request_error",
      message: error?.message || "Failed to upload files",
      type: error?.type || "invalid_data",
    });
  }
}
