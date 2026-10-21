/** Minimal file access to the Bakery folder; one implementation per platform (fs.ts / fs.web.ts). */
export interface VaultFS {
  /** Folder name shown to the user. */
  name: string;
  /** Every file below the folder (hidden folders such as .obsidian are skipped). */
  listAll(): Promise<string[][]>;
  readText(path: string[]): Promise<string>;
  readBytes(path: string[]): Promise<Uint8Array>;
  /** Creates missing folders; overwrites when the file exists. */
  writeText(path: string[], text: string): Promise<void>;
  writeBytes(path: string[], bytes: Uint8Array): Promise<void>;
  exists(path: string[]): Promise<boolean>;
  remove(path: string[]): Promise<void>;
}

export type PickMode = 'create' | 'existing';

/** What we remember between sessions, besides the folder itself. */
export type VaultState = {
  /** Last "managed" text we saw/wrote per file (front matter for products, whole text for meta files). */
  managed: Record<string, string>;
  /** Marker of the cover image we last wrote/imported per path (the app-side image_uri). */
  images: Record<string, string>;
  /** Size in bytes of the vault image we last imported, per path. */
  imageSizes: Record<string, number>;
  /** Signature of the app data as of the last sync, to know if the app changed while closed. */
  sig?: string;
  lastSync?: number;
};

export const EMPTY_STATE: VaultState = { managed: {}, images: {}, imageSizes: {} };

export type OpenResult =
  | { status: 'ok'; fs: VaultFS }
  | { status: 'needs-permission'; name: string }
  | { status: 'none' };
