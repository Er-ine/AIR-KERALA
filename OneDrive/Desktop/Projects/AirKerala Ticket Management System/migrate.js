require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
        multipleStatements: true
    });

    console.log('Connected. Running schema...');
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    const cleanSchema = schema
        .split('\n')
        .filter(line => !line.trim().toUpperCase().startsWith('CREATE DATABASE') && !line.trim().toUpperCase().startsWith('USE '))
        .join('\n');

    const statements = cleanSchema.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const stmt of statements) {
        try {
            await connection.query(stmt);
            console.log('OK:', stmt.split('\n')[0]);
        } catch (err) {
            if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('Skipped (already exists):', stmt.split('\n')[0]);
            } else {
                throw err;
            }
        }
    }
    console.log('Schema step done.');

    console.log('Fixing PASSENGER_ID to auto-increment...');
    try {
        await connection.query('ALTER TABLE PASSENGER MODIFY PASSENGER_ID INT AUTO_INCREMENT');
        console.log('PASSENGER_ID is now auto-increment');
    } catch (err) {
        console.log('Alter skipped or failed:', err.message);
    }

    console.log('Loading sample data...');
    const rawData = fs.readFileSync('./sample_data.sql', 'utf8');

    const cleanData = rawData
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

    const dataStatements = cleanData.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const stmt of dataStatements) {
        try {
            await connection.query(stmt);
            console.log('Inserted:', stmt.split('\n')[0].substring(0, 50));
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                console.log('Skipped (duplicate):', stmt.split('\n')[0].substring(0, 50));
            } else {
                throw err;
            }
        }
    }
    console.log('Sample data step done.');

    await connection.end();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
});
