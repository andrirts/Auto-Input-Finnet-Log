const { createConnection } = require('mysql2/promise');
require('dotenv').config();

const connection = async () => {
    const connection = await createConnection({
        user: process.env.RTS_DB_USER,
        host: process.env.RTS_DB_HOST,
        database: process.env.RTS_DB_NAME,
        password: process.env.RTS_DB_PASS,
        port: process.env.RTS_DB_PORT
    });
    return connection;
}

module.exports = connection