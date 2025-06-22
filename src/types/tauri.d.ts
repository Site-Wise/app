declare module '@tauri-apps/api/tauri' {
  export function invoke(command: string, args?: Record<string, any>): Promise<any>
}