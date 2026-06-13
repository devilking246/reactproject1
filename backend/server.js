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
        // מחזירים אובייקט שמכיל גם את השאילתה שבוצעה וגם את התוצאות
        res.json({ sql: sql, results: results });
    } catch (error) {
        res.status(400).json({ error: "שגיאה בהרצת השאילתה: " + error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username: loginInput, password } = req.body; // הקלט מהטופס יכול להיות או מייל או יוזרניים

    if (!loginInput || !password) {
        return res.status(400).json({ error: "נא למלא שם משתמש/אימייל וסיסמה" });
    }

    try {
        // שאילתה הגמישה: מחפשת התאמה בשדה username או בשדה email
        const sql = `SELECT user_id, username, email, full_name, role, associated_dept_id, password_hash 
                     FROM USER 
                     WHERE username = ? OR email = ?`;
        
        // אנו שולחים את loginInput פעמיים - פעם עבור ה-username ופעם עבור ה-email
        const user = await db.get(sql, [loginInput, loginInput]);

        // בדיקה 1: האם נמצא משתמש כלשהו?
        if (!user) {
            return res.status(401).json({ error: "פרטי התחברות שגויים" });
        }

        // בדיקה 2: האם הסיסמה תואמת?
        if (user.password_hash !== password) {
            return res.status(401).json({ error: "פרטי התחברות שגויים" });
        }

        // מחיקת הסיסמה מהאובייקט מטעמי אבטחה
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