import { useState } from "react";

// 2. הגדרת המפתח (בשלב הפיתוח זה כאן, בהפקה זה יהיה ב-env)
const SearchBox = ({ currentUser }) => {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const [dbData, setDbData] = useState([])
    const [executedSql, setExecutedSql] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;

        setResult("");    
        setDbData([]); 
        setExecutedSql("");
        setErrorMessage("");    
        setLoading(true);

        const API_KEY = "AIzaSyDhzSHSLh3YCk2BATDTPVDJqRODBqs83Oc";

        // זה ה-URL המדויק לפי המודל שמצאת ברשימה:
        // החלף את ה-URL לזה:
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;            const systemPrompt = `You are a SQL Expert. Your task is to convert natural language queries into accurate SQLite queries based on the database schema below.

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
            - COURSES REMAINING RULE (קורסים שנותרו להשלים): To find which courses a student has LEFT to complete, you must find all 'course_num' assigned to the student's program in CURRICULUM_COURSE, and EXCEPT (or use NOT IN) the 'course_num' from SEMESTER_COURSE joined with ENROL where the student_id matches and grade >= 55.
            - To count HOW MANY courses are left, count the rows resulting from the logic above grouped by the student.
            - Return ONLY the executable SQL code block. Do NOT include markdown blocks (\`\`\`sql) or explanations.
            - When asked about students in a specific department, ALWAYS join the STUDENT table with the PROGRAM table, and filter by PROGRAM.dept_id or DEPARTMENT.dept_name.
            - NEVER invent filters for 'lecturer_id' or 'course_num' unless the user explicitly mentions a lecturer or a specific course in their question.`

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
            // 🌟 בדיקה האם הגענו למגבלת בקשות (שגיאה 429)
            if (response.status === 429) {
                setErrorMessage("השירות עמוס כעת (שגיאה 429). אנא המתן דקה ונסה שוב.");
                setLoading(false);
                return;
            }
            const data = await response.json();
            
            if (data.error) {
            // טיפול בשגיאות פנימיות של ה-API
            if (data.error.code === 429) {
                setErrorMessage("השירות אינו זמין כעת עקב עומס בקשות. אנא נסה שוב בעוד רגע.");
            } else {
                setErrorMessage(`שגיאת API: ${data.error.message}`);
            }
        } else if (data.candidates && data.candidates[0].content) {
            const cleanSql = data.candidates[0].content.parts[0].text.replace(/```sql|```/g, "").trim();
            setResult(cleanSql);
            await runQueryOnServer(cleanSql); // שליחה לשרת הלוקאלי
        } else {
            setErrorMessage("התקבלה תשובה ריקה מהמודל. נסה לנסח את השאלה אחרת.");
        }
    } catch (error) {
        setErrorMessage("שגיאת תקשורת עם שרת ה-AI. ודא שיש לך חיבור לאינטרנט.");
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
                body: JSON.stringify({ 
                    sql: sql,
                    user: currentUser
                })
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


return (
    <div className="search-component">
        <form onSubmit={handleSearch} className="search-wrapper">
            <input
                type="text"
                placeholder="מלל חופשי "
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-field"
                disabled={loading}
            />
            <button type="submit" className="btn-search" disabled={loading}>
                {loading ? "מנתח..." : "שאל את מסד הנתונים"}
            </button>
        </form>

        {/* הודעות שגיאה */}
        {errorMessage && (
            <div className="alert-box">
                <strong>שגיאה במערכת:</strong> {errorMessage}
            </div>
        )}

        {/* תצוגת מנהל מערכת ADMIN - תיבת קוד SQL כהה ומקצועית */}
        {currentUser && currentUser.role === 'ADMIN' && executedSql && (
            <div className="admin-sql-box">
                <div style={{ color: '#61afef', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'sans-serif', direction: 'rtl', textAlign: 'right' }}>
                    🔧 תצוגת מנהל מערכת - שאילתת SQLite שיוצרה:
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}><code>{executedSql}</code></pre>
            </div>
        )}

        {/* טבלת תוצאות */}
        {dbData.length > 0 ? (
            <div style={{ marginTop: '25px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: '700' }}>תוצאות השאילתה מהמסד:</h3>
                <div className="table-container">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                {Object.keys(dbData[0]).map((key) => (
                                    <th key={key}>{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dbData.map((row, index) => (
                                <tr key={index}>
                                    {Object.values(row).map((val, i) => (
                                        <td key={i}>
                                            {val !== null && val !== undefined ? val.toString() : "-"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            !loading && executedSql && !errorMessage && (
                <p style={{ marginTop: '20px', color: '#6c757d', fontStyle: 'italic' }}>
                    השאילתה רצה בהצלחה, אך לא נמצאו רשומות תואמות.
                </p>
            )
        )}
    </div>
);
}
export default SearchBox;