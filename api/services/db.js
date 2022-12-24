import mysql from 'mysql2';
import * as dotenv from 'dotenv';
dotenv.config();
const conn = mysql.createConnection({
 host: "127.0.0.1",
 port: 3306,
 user: "ethDBUser",
 password: process.env.DB_PASSWORD,
 database: process.env.DB_NAME,
 multipleStatements: true
});

conn.connect((err, res) => {
    if (err) console.log(err);
    return;
});

export default conn;