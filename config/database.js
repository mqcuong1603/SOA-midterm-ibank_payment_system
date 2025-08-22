import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function for getting a connection
export const getConnection = async () => {
  return await pool.getConnection();
};

// Helper function for executing queries
export const execute = async (query, params) => {
  return await pool.execute(query, params);
};

export default pool;
