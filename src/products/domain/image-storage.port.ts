export interface ImageStorage {
  save(file: Buffer, filename: string): Promise<{ id: string; url: string }>;
  delete(url: string): Promise<void>;
}
