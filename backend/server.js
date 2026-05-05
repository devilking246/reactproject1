const express = require('express');
const cors = require('cors');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

let db;

// 1. חיבור למסד הנתונים (ייצור קובץ database.db אם הוא לא קיים)
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
        // חשוב: בשימוש אמיתי כדאי לוודא שהשאילתה מתחילה ב-SELECT למניעת מחיקות
        const results = await db.all(sql);
        res.json(results);
    } catch (error) {
        res.status(400).json({ error: "שגיאה בהרצת השאילתה: " + error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));