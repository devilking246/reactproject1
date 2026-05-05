import { useState } from "react";
// 2. הגדרת המפתח (בשלב הפיתוח זה כאן, בהפקה זה יהיה ב-env)
const SearchBox = () => {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const [dbData, setDbData] = useState([])
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setResult("");     // מנקה את ה-SQL הישן
        setDbData([]);     // מנקה את התוצאות הישנות מהקונסול/טבלה
        setLoading(true);

        const API_KEY = "AIzaSyC3GbaCohWpSH6bODTHQ6uBPKvJOV7yocc";

        // זה ה-URL המדויק לפי המודל שמצאת ברשימה:
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;                
            const systemPrompt = `You are a SQL Expert. Schema: 
                                DATABASE SCHEMA:
                                1. DEPARTMENT (dept_id PK [int], name, head_of_dept)
                                2. PROGRAM (program_id PK [string], program_name, dept_id FK [int])
                                3. STUDENT (ID PK [string], full_name, program_id FK [string], start_year, start_semester, academic_status)
                                4. LECTURER (id_number PK [string], full_name, dept_id FK [int])
                                5. COURSE (course_num PK [int], course_id, course_name, dept_id FK [int], lecturer_id FK [string], year_taught, semester)
                                6. ENROL (student_id FK [string], course_num FK [int], grade [int])
                                Convert this to SQL: "${query}". 
                                Return ONLY the SQL code, no markdown.`;
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
                console.log("✅ נתונים התקבלו מה-SQLite:");
                // console.table מציגה את המערך כטבלה יפה בקונסול
                console.table(data)
                setDbData(data); // שמירת התוצאות (השורות) ב-State
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

            <button onClick={handleShowTables} className="tables-button">
                הצג את כל הטבלאות
            </button>

            {result && <div className="search-result">{result}</div>}
        </div>
    );
};

export default SearchBox;