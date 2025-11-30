export interface ServerInfo {
  server: string;
  version: string;
  description: string;
  ts: number;
}

export interface HealthInfo {
  status: string;
  db: string;
  cache: string;
  ts: number;
}
