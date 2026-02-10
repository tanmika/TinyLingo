/**
 * Platform adapter interface.
 * Each supported AI tool platform implements this interface.
 */
export interface PlatformAdapter {
  /** Platform display name */
  name: string;

  /** Check if the platform tool is installed on this machine */
  detect(): boolean;

  /** Check if TinyLingo hook is already registered in this platform */
  isInstalled(): boolean;

  /** Register TinyLingo hook and inject instructions */
  install(scriptPath: string): void;

  /** Remove TinyLingo hook and injected instructions */
  uninstall(): void;
}
