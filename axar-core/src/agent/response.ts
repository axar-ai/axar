class AxarResponse<T> {
  data: T;
  error: string;

  constructor(data: T, error: string) {
    this.data = data;
    this.error = error;
  }
}
