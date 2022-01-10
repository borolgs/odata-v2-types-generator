import dotenv from 'dotenv';
dotenv.config();

export const config = {
  from_path: process.env.FROM_PATH,
  to_path: process.env.TO_PATH,
  username: process.env.USERNAME ?? null,
  password: process.env.PASSWORD ?? null,
};
