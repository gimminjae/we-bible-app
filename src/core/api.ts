import axios, {AxiosRequestConfig} from 'axios';

const baseURL = process.env.REACT_APP_BO_GW_API_URL;

const instance = axios.create({
  baseURL,

  headers: {
    'Content-Type': 'application/json',
  },
});
// instance.interceptors.request.use(async config => {
//   // help to set cookies when cors
//   config.withCredentials = true
//   return config
// })

const get = async (url: string, params?: any, config?: AxiosRequestConfig) =>
  instance.get(url, {
    params,
    ...config,
    headers: {
      ...config?.headers,
    },
  });

const post = async (url: string, params?: any, config?: AxiosRequestConfig) =>
  instance.post(url, params, {
    ...config,
    headers: {
      ...config?.headers,
    },
  });

const patch = async (url: string, params?: any, config?: AxiosRequestConfig) =>
  instance.patch(url, params, {
    ...config,
    headers: {
      ...config?.headers,
    },
  });

const put = async (url: string, params?: any, config?: AxiosRequestConfig) =>
  instance.put(url, params, {
    ...config,
    headers: {
      ...config?.headers,
    },
  });

const remove = async (url: string, params?: any, config?: AxiosRequestConfig) =>
  instance.delete(url, {
    params,
    ...config,
    headers: {
      ...config?.headers,
    },
  });

export const api = {get, post, patch, put, remove};
