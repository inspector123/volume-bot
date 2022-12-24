import mysql from 'mysql2';
const conn = mysql.createConnection({
 host: "127.0.0.1",
 port: 3306,
 user: "ethDBUser",
 password: "789789789Aa!",
 database: "ethswaps",
 multipleStatements: true
});

conn.connect((err, res) => {
    if (err) console.log(err);
    return;
});

export default conn;