import { useState } from "react";

const SearchBox = ({ currentUser }) => {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState(false);
    const [dbData, setDbData] = useState([]);
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

        const userRole = currentUser?.role;
        const userDeptId = currentUser?.associated_dept_id;
        const username = currentUser?.username;

        let securityEnforcementInstruction = "";
        
        if (userRole === "DEPT_HEAD") {
            securityEnforcementInstruction = `
            - SECURITY ENFORCEMENT: The logged-in user is a DEPT_HEAD for department ID: ${userDeptId}. 
            You MUST absolutely restrict ALL generated SQL queries to only fetch data belonging to department ID ${userDeptId}.
            - You must append an explicit filter (e.g., AND PROGRAM.dept_id = ${userDeptId} or WHERE LECTURER.dept_id = ${userDeptId}) to ensure no data from other departments is leaked.
            - If the user explicitly asks about another department or a department name that does not match department ID ${userDeptId}, you MUST ignore their requested department filter and enforce department ID ${userDeptId} instead.`;
        } 
        else if (userRole === "SCHOOL_HEAD") {
            securityEnforcementInstruction = `
            - SECURITY ENFORCEMENT: The logged-in user is a SCHOOL_HEAD with username: '${username}'.
            - You MUST absolutely restrict ALL generated SQL queries to only fetch data from departments managed by this School Head.
            - To enforce this, you MUST join or filter any query involving departments, programs, students, or lecturers with a condition restricting 'dept_id' to only those where DEPARTMENT.school_head_username = '${username}'.
            - Example constraint to include: dept_id IN (SELECT dept_id FROM DEPARTMENT WHERE school_head_username = '${username}').
            - If the user asks about a department outside their school, you MUST override their request and strictly limit the data to their managed departments only.`;
        } 
        else {
            securityEnforcementInstruction = `- SECURITY CONTEXT: The user is an admin/president (PRESIDENT) and has global read permissions across all departments.`;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;            
        
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
        
        MULTILINGUAL & TEXT MATCHING RULES:
            - IMPORTANT: The data inside the database (course_name, name, program_name, full_name, academic_status) is stored in HEBREW.
            - If the user asks their question in English, you MUST mentally translate the requested concepts, names, statuses, or departments into their correct Hebrew equivalent before generating the SQL filter.
            - For ALL string-based columns (names, titles, statuses), ALWAYS use the SQL 'LIKE' operator with '%' wildcards (e.g., WHERE course_name LIKE '%תכנות%' or WHERE academic_status LIKE '%מושהה%') to ensure flexible matching and prevent 0 results due to minor translation or phrasing differences.
            - If you are uncertain of the exact Hebrew translation, use an OR clause to check both possibilities: (column LIKE '%English_Term%' OR column LIKE '%Hebrew_Equivalent%').
    
        CRITICAL INSTRUCTIONS:
            - Convert this user request into SQLite code: "${query}".${securityEnforcementInstruction}
            - SECURITY RULE: NEVER include 'password', 'password_hash', or 'salt' columns in your SELECT statements under any circumstances.
            - ACADEMIC COMPLETION RULE: A student has finished their academic duties ("סיים חובות") if the count of unique courses they passed (grade >= 55) equals the total count of courses required in their PROGRAM (from CURRICULUM_COURSE).
            - COURSES REMAINING RULE (קורסים שנותרו להשלים): To find which courses a student has LEFT to complete, you must find all 'course_num' assigned to the student's program in CURRICULUM_COURSE, and EXCEPT (or use NOT IN) the 'course_num' from SEMESTER_COURSE joined with ENROL where the student_id matches and grade >= 55.
            - To count HOW MANY courses are left, count the rows resulting from the logic above grouped by the student.
            - Return ONLY the executable SQL code block. Do NOT include markdown blocks (\`\`\`sql) or explanations.
            - When asked about students in a specific department, ALWAYS join the STUDENT table with the PROGRAM table, and filter by PROGRAM.dept_id or DEPARTMENT.dept_name.
            - NEVER invent filters for 'lecturer_id' or 'course_num' unless the user explicitly mentions a lecturer or a specific course in their question.`;

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
            
            if (response.status === 429) {
                setErrorMessage("השירות עמוס כעת (שגיאה 429). אנא המתן דקה ונסה שוב.");
                setLoading(false);
                return;
            }
            const data = await response.json();
            
            if (data.error) {
                if (data.error.code === 429) {
                    setErrorMessage("השירות אינו זמין כעת עקב עומס בקשות. אנא נסה שוב בעוד רגע.");
                } else {
                    setErrorMessage(`שגיאת API: ${data.error.message}`);
                }
            } else if (data.candidates && data.candidates[0].content) {
                const cleanSql = data.candidates[0].content.parts[0].text.replace(/```sql|```/g, "").trim();
                setResult(cleanSql);
                await runQueryOnServer(cleanSql); 
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
                setExecutedSql(data.sql); 
                setDbData(data.results);  
            }
        } catch (error) {
            console.error("Could not connect to Server:", error);
        }
    }; 

    return (
        <div className="search-component" style={{ direction: "rtl", textAlign: "right", width: "100%" }}>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", width: "50vw", direction: "rtl", marginBottom: "25px" }}>
                <input
                    type="text"
                    placeholder="שאל את מסד הנתונים במלל חופשי..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        flex: 1,
                        padding: "14px 20px",
                        fontSize: "16px",
                        direction: "rtl",
                        textAlign: "right",
                        unicodeBidi: "plaintext",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                        whiteSpace: "nowrap",        
                        overflowX: "auto",          
                        boxSizing: "border-box"
                    }}
                    disabled={loading}
                />
                <button type="submit" className="btn-search" disabled={loading} style={{ whiteSpace: "nowrap" }}>
                    {loading ? "מנתח..." : "שאל את ה-DB"}
                </button>
            </form>

            {errorMessage && (
                <div className="alert-box">
                    <strong>שגיאה במערכת:</strong> {errorMessage}
                </div>
            )}

            {currentUser && currentUser.role === 'ADMIN' && executedSql && (
                <div className="admin-sql-box">
                    <div style={{ color: '#61afef', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'sans-serif', direction: 'rtl', textAlign: 'right' }}>
                        🔧 תצוגת מנהל מערכת - שאילתת SQLite שיוצרה:
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}><code>{executedSql}</code></pre>
                </div>
            )}

            {dbData.length > 0 ? (
                <div style={{ marginTop: '25px', width: "100%" }}>
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
}; 

export default SearchBox;