import { useState } from "react";
require('dotenv').config();
// 2. הגדרת המפתח (בשלב הפיתוח זה כאן, בהפקה זה יהיה ב-env)
const SearchBox = () => {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const [dbData, setDbData] = useState([])
    const [executedSql, setExecutedSql] = useState("");
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setResult("");     // מנקה את ה-SQL הישן
        setDbData([]);     // מנקה את התוצאות הישנות מהקונסול/טבלה
        setLoading(true);
        const API_KEY = process.env.GEMINI_API_KEY;

        // זה ה-URL המדויק לפי המודל שמצאת ברשימה:
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
            const systemPrompt = `You are a SQL Expert. Your task is to convert natural language queries into accurate SQLite queries based on the database schema below.

            DATABASE SCHEMA:
            1. DEPARTMENT (dept_id PK [int], name [string], head_of_dept [string], school_head_username NULL [string])
                - school_head_username links to USER.username for School Head role-based boundaries.
            2. PROGRAM (program_id PK [string], program_name [string], dept_id FK [int])
            3. COURSE (course_num PK [int], course_id [string], course_name [string])
            4. CURRICULUM_COURSE (program_id PK FK [string], course_num PK FK [int], credits [real], recommended_year [int], recommended_semester [string], course_type [string])
            5. LECTURER (id_number PK [string], full_name [string], dept_id FK [int])
            6. SEMESTER_COURSE (semester_course_id PK AUTOINCREMENT [int], course_num FK [int], lecturer_id FK [string], year_taught [int], semester [string], exam_date_a [string], exam_date_b [string])
            7. STUDENT (ID PK [string], full_name [string], program_id FK [string], start_year [int], start_semester [string], academic_status [string])
            8. ENROL (student_id PK FK [string], semester_course_id PK FK [int], grade [int])
            9. USER (user_id PK AUTOINCREMENT [int], username UNIQUE [string], password_hash [string], full_name [string], role [string], associated_dept_id NULL FK [int])
                - role can be 'PRESIDENT', 'SCHOOL_HEAD', or 'DEPT_HEAD'.
                - associated_dept_id is only filled if role is 'DEPT_HEAD'.

        CRITICAL INSTRUCTIONS:
            - Convert this user request into SQLite code: "${query}".
            - ACADEMIC COMPLETION RULE: A student has finished their academic duties ("סיים חובות") if the count of unique courses they passed (grade >= 55) equals the total count of courses required in their PROGRAM (from CURRICULUM_COURSE).
            - Return ONLY the executable SQL code block. Do NOT include markdown blocks (\`\`\`sql) or explanations.`;;
        
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemPrompt }]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                setResult(`שגיאת API: ${data.error.message}`);
            } else if (data.candidates && data.candidates[0].content) {
                const sqlText = data.candidates[0].content.parts[0].text;
                // ניקוי סימני ה-Markdown
                const cleanSql = data.candidates[0].content.parts[0].text.replace(/```sql|```/g, "").trim();
                setResult(cleanSql);
                await runQueryOnServer(cleanSql);
            } else {
                setResult("התקבלה תשובה ריקה מהמודל.");
            }
        } catch (error) {
            setResult("שגיאת תקשורת עם השרת.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
   const runQueryOnServer = async (sql) => {
        try {
            const response = await fetch('http://localhost:5000/execute-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: sql })
            });
            const data = await response.json();
            
            if (data.error) {
                console.error("Database Error:", data.error);
            } else {
                console.log("✅ השאילתה שבוצעה:", data.sql);
                console.table(data.results);
                
                setExecutedSql(data.sql); // שמירת השאילתה ל-State
                setDbData(data.results);  // שמירת התוצאות ל-State
            }
        } catch (error) {
            console.error("Could not connect to Server:", error);
        }
    };
    const handleShowTables = () => {
        setResult(" כל הטבלאות: \n - Students\n - Courses\n - Grades\n - Professors");
    };

    return (
        <div className="search-container">
            <form onSubmit={handleSearch} className="search-form">
                <input
                    type="text"
                    placeholder="הקלד חיפוש חופשי..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input"
                />
                <button type="submit" className="search-button">חפש</button>
            </form>

            {/* הצגת השאילתה שבוצעה */}
            {executedSql && (
                <div style={{ marginTop: '20px', padding: '10px', background: '#e9ecef', borderRadius: '5px', direction: 'ltr' }}>
                    <strong>השאילתה שבוצעה:</strong>
                    <pre><code>{executedSql}</code></pre>
                </div>
            )}

            {/* הצגת הטבלה של הנתונים מה-DB */}
            {dbData.length > 0 && (
                <div className="results-table" style={{ marginTop: '20px', overflowX: 'auto' }}>
                    <h3>תוצאות:</h3>
                    <table border="1" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr>
                                {Object.keys(dbData[0]).map((key) => (
                                    <th key={key} style={{ padding: '8px', background: '#f2f2f2' }}>{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dbData.map((row, index) => (
                                <tr key={index}>
                                    {Object.values(row).map((val, i) => (
                                        <td key={i} style={{ padding: '8px', border: '1px solid #ddd' }}>{val}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
export default SearchBox;