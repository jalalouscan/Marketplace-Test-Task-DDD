import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { ImageStorage } from '../../domain/image-storage.port';

@Injectable()
export class LocalImageStorage implements ImageStorage {
  private uploadDir = path.join(process.cwd(), 'uploads');

  async save(file: Buffer, filename: string) {
    await fs.mkdir(this.uploadDir, { recursive: true });

    const id = randomUUID();
    const ext = path.extname(filename);
    const finalName = `${id}${ext}`;
    const filePath = path.join(this.uploadDir, finalName);

    await fs.writeFile(filePath, file);

    return {
      id,
      url: `/uploads/${finalName}`,
    };
  }

  async delete(url: string) {
    const filename = url.replace('/uploads/', '');
    const filePath = path.join(this.uploadDir, filename);

    try {
      await fs.unlink(filePath);
    } catch {
      // ignore if file doesn't exist
    }
  }
}
