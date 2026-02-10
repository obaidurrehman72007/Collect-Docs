// src/Config/database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import mysql2 from 'mysql2'; 

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000, // TiDB usually uses 4000
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    /* ADD THIS SECTION BELOW */
    dialectOptions: {
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
    },
  }
);

export default sequelize;
