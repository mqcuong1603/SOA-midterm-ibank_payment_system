// config/redis.js
import { createClient } from "redis";

const redisClient = createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redisClient.connect();

export default redisClient;
