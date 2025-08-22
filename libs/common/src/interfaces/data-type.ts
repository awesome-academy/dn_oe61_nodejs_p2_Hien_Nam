export interface BaseResponse<T> {
  statusKey: string;
  data?: T;
}
