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
    // 🌟 שלב 1: מחלצים גם את ה-sql וגם את ה-user שנשלח מהקליאנט
    const { sql, user } = req.body; 
    
    if (!user) {
        return res.status(401).json({ error: "משתמש לא מזוהה, הגישה למסד הנתונים נחסמה." });
    }

    let finalSql = sql;

    try {
        // 🌟 שלב 2: אם המשתמש הוא ראש מחלקה, נחליף את מחזיק המקום של ג'מיני בשם המשתמש האמיתי
        if (user.role === 'DEPT_HEAD') {
            finalSql = finalSql.replace(/'CURRENT_DEPT_HEAD_USERNAME'/g, `'${user.username}'`);
        }
        
        // אם תרצה בעתיד להוסיף חוקים ל-SCHOOL_HEAD, תוכל להוסיף אותם כאן בהמשך...

        // 🌟 שלב 3: מריצים את השאילתה המעודכנת (finalSql) על מסד הנתונים
        const results = await db.all(finalSql);
        
        // מחזירים את התוצאות ואת השאילתה המעודכנת כדי שה-ADMIN יוכל לראות אותה בתיבה הכהה
        res.json({ sql: finalSql, results: results });

    } catch (error) {
        // טיפול בשגיאות במידה וה-SQL שנבנה אינו תקין
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