import mysql from 'mysql2/promise';  // Mudança: import em vez de require

async function conectar() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'supernova',
        port: 3306
    });
    return connection;
}

async function desconectar(connection) {
    await connection.end();
}

// Mudança: export em vez de module.exports
export { conectar, desconectar };
