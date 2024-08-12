const { Client } = require('pg');

const client = new Client({
    user: 'rts_user',
    host: '10.121.7.9',
    database: 'rts_finnet_biller',
    password: '3V8c2GDPd47wZEk4wGzBrqr3',
    port: 5433
})

client.connect();
// client.connect()
//     .then(() => {
//         console.log('Connected to PostgreSQL database successfully!');
//         // Optionally run a simple query to test the connection
//         return client.query('SELECT NOW()');
//     })
//     .then((res) => {
//         console.log('Current time:', res.rows[0].now);
//     })
//     .catch((err) => {
//         console.error('Error connecting to PostgreSQL database:', err.stack);
//     })
//     .finally(() => {
//         // Close the connection
//         client.end();
//     });

module.exports = client

