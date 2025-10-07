import mysql from 'mysql2/promise';  // Mudança: import em vez de require

async function conectar() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT
    });
    return connection;
}

async function desconectar(connection) {
    await connection.end();
}

// Mudança: export em vez de module.exports
export { conectar, desconectar };
