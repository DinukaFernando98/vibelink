'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'vibelink',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  supportBigNumbers:  true,
  bigNumberStrings:   false,
  typeCast(field, next) {
    // Return BIGINT as JS number (timestamps)
    if (field.type === 'LONGLONG') return Number(field.string());
    // Return TINYINT(1) as boolean-compatible number
    if (field.type === 'TINY' && field.length === 1) return Number(field.string());
    return next();
  },
});

const db = {
  /** Single row or null */
  async get(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] ?? null;
  },

  /** All rows */
  async all(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /** INSERT / UPDATE / DELETE — returns mysql OkPacket */
  async run(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return result;
  },

  pool,
};

module.exports = db;
