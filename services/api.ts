import axios from "axios";
import util from "../utils/browser.util"

export const api = {
  post,
  get,
  put,
  remove,
  head,
};
// const baseURL = process.env.REACT_APP_BO_API_URL
const instance = axios.create()
// instance.interceptors.request.use(
//   async (config: any) => {
//     config.withCredentials = true
//   },
//   (error) => {
//     alert("error 발생")
//   }
// )

function post(url: string, data = {}) {
  return instance.post(url, data).then((response) => response.data);
}

function get(url: string, data?: any) {
  return instance
    .get(`${url}${data ? util.makeSearchParam(data) : ""}`)
    .then((response) => response.data);
}

function put(url: string, data = {}) {
  return instance.put(url, data).then((response) => response.data);
}

function remove(url: string, data = {}) {
  return instance
    .delete(`${url}${util.makeSearchParam(data)}`)
    .then((response) => response.data);
}

function head(url: string, data = {}) {
  return instance.head(url, data).then((response) => response.data);
}
