const { createConnection } = require('mysql2/promise');

const connection = async () => {
    const connection = await createConnection({
        user: 'RTS',
        host: '110.239.90.35',
        database: 'avr',
        password: 'RTS@0808',
        port: 3308
    });
    return connection;
}

module.exports = connection