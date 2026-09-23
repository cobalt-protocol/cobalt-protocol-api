export interface ApiResponse<T = any> {
  data: T | null;
  message: string;
  errors: any | null;
}
