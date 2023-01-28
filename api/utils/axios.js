import axios from 'axios';
import * as dotenv from 'dotenv'
dotenv.config();

const api = axios.create({
  baseURL: `http://localhost:${process.env.PORT}`
})
export default api
