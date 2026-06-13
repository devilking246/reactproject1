const express = require('express');
const cors = require('cors');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json()); 

let db;

// 1. חיבור למסד הנתונים
(async () => {
    db = await open({
        filename: path.join(__dirname, 'university.db'),
        driver: sqlite3.Database
    });
    console.log('Connected to SQLite database.');
})();

// 2. נקודת קצה להרצת השאילתות שה-AI מייצר
app.post('/execute-sql', async (req, res) => {
    const { sql } = req.body;
    
    try {
        const results = await db.all(sql);
        res.json(results);
    } catch (error) {
        res.status(400).json({ error: "שגיאה בהרצת השאילתה: " + error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "נא למלא שם משתמש וסיסמה" });
    }

    try {
        const sql = `SELECT user_id, username, full_name, role, associated_dept_id, password_hash FROM USER WHERE username = ?`;
        const user = await db.get(sql, [username]);

        if (!user) {
            return res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
        }

        if (user.password_hash !== password) {
            return res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
        }

        delete user.password_hash;

        res.json({
            message: "התחברות בוצעה בהצלחה",
            user: user
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "שגיאת שרת פנימית בתהליך ההתחברות" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));