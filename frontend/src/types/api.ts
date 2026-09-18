export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    totalRecords?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
  errors?: unknown;
}

export interface HealthData {
  status: 'UP' | 'DOWN';
  timestamp: string;
  uptime: number;
  environment: string;
  database: 'connected' | 'connecting' | 'disconnected' | 'error';
}
