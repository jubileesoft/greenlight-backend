import { config } from 'dotenv';

config();

export const MongoDBConfig = {
  url: process.env.MONGODB_CONNECTION_STRING ?? 'that will not work',
  database: process.env.MONGODB_DB ?? 'that will not work',
};
