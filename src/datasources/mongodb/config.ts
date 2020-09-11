import { config } from 'dotenv';

config();

const MongoDBConfig = {
  url: process.env.MONGODB_URL ?? 'that will not work',
  database: process.env.MONGODB_DB ?? 'that will not work',
};

export { MongoDBConfig };
