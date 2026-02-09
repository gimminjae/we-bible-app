export default {
  makeSearchParam(data: Record<string, unknown>): string {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const str = params.toString();
    return str ? `?${str}` : '';
  },
};
