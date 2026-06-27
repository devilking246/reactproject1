const { faker } = require('@faker-js/faker');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

async function setup() {
    const db = new sqlite3.Database('./university.db');
    
    // הפיכת כל הפונקציות של sqlite ל-Promises בצורה תקנית
    const dbRun = promisify(db.run.bind(db));
    const dbAll = promisify(db.all.bind(db)); // <-- הוספנו תמיכה מלאה בבקשות SELECT
    const dbClose = promisify(db.close.bind(db));

    // === שלב 0: ניקוי אגרסיבי של טבלאות ישנות ===
    try {
        await dbRun(`DROP TABLE IF EXISTS USER`);
        await dbRun(`DROP TABLE IF EXISTS ENROL`);
        await dbRun(`DROP TABLE IF EXISTS SEMESTER_COURSE`);
        await dbRun(`DROP TABLE IF EXISTS CURRICULUM_COURSE`);
        await dbRun(`DROP TABLE IF EXISTS COURSE`);
        await dbRun(`DROP TABLE IF EXISTS STUDENT`);
        await dbRun(`DROP TABLE IF EXISTS LECTURER`);
        await dbRun(`DROP TABLE IF EXISTS PROGRAM`);
        await dbRun(`DROP TABLE IF EXISTS DEPARTMENT`);
        console.log("🧹 Old tables cleaned up successfully.");
    } catch (e) {
        console.log("No old tables to drop, starting fresh...");
    }

    try {
        console.log("Creating tables...");
        
        // 1. מחלקות
        await dbRun(`CREATE TABLE IF NOT EXISTS DEPARTMENT (
            dept_id INTEGER PRIMARY KEY, 
            name TEXT, 
            head_of_dept TEXT,
            school_head_username TEXT NULL
        )`);

        // 2. תוכניות לימודים אקדמיות
        await dbRun(`CREATE TABLE IF NOT EXISTS PROGRAM (
            program_id TEXT PRIMARY KEY,   
            program_name TEXT,             
            dept_id INTEGER,               
            FOREIGN KEY(dept_id) REFERENCES DEPARTMENT(dept_id)
        )`);

        // 3. בנק קורסים כללי
        await dbRun(`CREATE TABLE IF NOT EXISTS COURSE (
            course_num INTEGER PRIMARY KEY, 
            course_id TEXT UNIQUE,          
            course_name TEXT                
        )`);

        // 4. טבלת קישור: שיבוץ קורסים בתוך תוכניות הלימודים
        await dbRun(`CREATE TABLE IF NOT EXISTS CURRICULUM_COURSE (
            program_id TEXT,
            course_num INTEGER,
            credits REAL,                   
            recommended_year INTEGER,       
            recommended_semester TEXT,      
            course_type TEXT,               
            PRIMARY KEY (program_id, course_num),
            FOREIGN KEY(program_id) REFERENCES PROGRAM(program_id),
            FOREIGN KEY(course_num) REFERENCES COURSE(course_num)
        )`);

        // 5. מרצים
        await dbRun(`CREATE TABLE IF NOT EXISTS LECTURER (
            id_number TEXT PRIMARY KEY, 
            full_name TEXT, 
            dept_id INTEGER,
            FOREIGN KEY(dept_id) REFERENCES DEPARTMENT(dept_id)
        )`);

        // 6. קורסים שמתקיימים בפועל
        await dbRun(`CREATE TABLE IF NOT EXISTS SEMESTER_COURSE (
            semester_course_id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_num INTEGER,
            lecturer_id TEXT,
            year_taught INTEGER,           
            semester TEXT,                 
            exam_date_a TEXT,
            exam_date_b TEXT,
            FOREIGN KEY(course_num) REFERENCES COURSE(course_num),
            FOREIGN KEY(lecturer_id) REFERENCES LECTURER(id_number)
        )`);

        // 7. סטודנטים
        await dbRun(`CREATE TABLE IF NOT EXISTS STUDENT (
            ID TEXT PRIMARY KEY, 
            full_name TEXT, 
            program_id TEXT,               
            start_year INTEGER, 
            start_semester TEXT, 
            academic_status TEXT,
            FOREIGN KEY(program_id) REFERENCES PROGRAM(program_id)
        )`);

        // 8. הרשמה וציונים
        await dbRun(`CREATE TABLE IF NOT EXISTS ENROL (
            student_id TEXT, 
            semester_course_id INTEGER, 
            grade INTEGER, 
            PRIMARY KEY (student_id, semester_course_id),
            FOREIGN KEY(student_id) REFERENCES STUDENT(ID),
            FOREIGN KEY(semester_course_id) REFERENCES SEMESTER_COURSE(semester_course_id)
        )`);

        // 9. משתמשי המערכת והרשאות
        await dbRun(`CREATE TABLE IF NOT EXISTS USER (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT, 
            full_name TEXT,
            role TEXT,                  
            associated_dept_id INTEGER NULL, 
            FOREIGN KEY(associated_dept_id) REFERENCES DEPARTMENT(dept_id)
        )`);

        console.log("Seeding data...");
        await dbRun("BEGIN TRANSACTION");

        const departments = [
            [101, 'הנדסת תוכנה', "פרופ' אברהם כהן", 'school_head_1'],
            [102, 'מדעי המחשב', 'ד"ר מיכל לוי', 'school_head_1'],
            [103, 'הנדסת אלקטרוניקה', "פרופ' משה מזרחי", 'school_head_2'],
            [104, 'הנדסת תעשייה וניהול', 'ד"ר דוד ישראלי', 'school_head_2']
        ];

        for (const dept of departments) {
            await dbRun(`INSERT OR IGNORE INTO DEPARTMENT VALUES (?, ?, ?, ?)`, dept);
        }

        const programs = [
            ['PROG_SOFTWARE', 'תוכנית לימודים בהנדסת תוכנה', 101],
            ['PROG_CS', 'תוכנית לימודים במדעי המחשב', 102],
            ['PROG_ELEC', 'תוכנית לימודים בהנדסת אלקטרוניקה', 103],
            ['PROG_INDUSTRIAL', 'תוכנית לימודים בהנדסת תעשייה וניהול', 104]
        ];
        for (const prog of programs) {
            await dbRun(`INSERT OR IGNORE INTO PROGRAM VALUES (?, ?, ?)`, prog);
        }

        const sampleCourses = [
            [10003, 'SE10003', 'אלגברה לינארית 1'], [10124, 'SE10124', 'מבוא לחדו"א'],
            [10151, 'SE10151', 'מבוא לתכנות'], [10152, 'SE10152', 'מתמטיקה בדידה 1'],
            [10008, 'SE10008', 'אלגוריתמיקה 2'], [10031, 'SE10031', 'מבני נתונים'],
            [10160, 'SE10160', 'מערכות הפעלה'], [10034, 'SE10034', 'רשתות תקשורת מחשבים'],
            [10055, 'SE10055', 'תכנות מונחה עצמים'], [10111, 'SE10111', 'פיתוח אפליקציות ווב'],
            
            [11033, 'CS11033', 'מבוא לתכנות למדעי המחשב'], [11034, 'CS11034', 'מתמטיקה בדידה למדעי המחשב'],
            [10149, 'CS10149', 'למידת מכונה מתיאוריה למעשה'], [10156, 'CS10156', 'נושאים בבינה מלאכותית'],
            [10148, 'CS10148', 'צפנים ומפתחות: יסודות הקריפטוגרפיה'], [10158, 'CS10158', 'עיבוד תמונה ולמידה עמוקה'],
            [10155, 'CS10155', 'פיתוח אינטראקטיבי תלת-ממדי'], [10159, 'CS10159', 'למידת חיזוק בבינה מלאכותית'],
            
            [96004, 'EE96004', 'אלגברה לינארית לאלקטרוניקה'], [40019, 'EE40019', 'מיתוג ומערכות ספרתיות'],
            [40021, 'EE40021', 'מבוא להנדסת חשמל 1'], [40025, 'EE40022', 'שדות אלקטרומגנטיים'],
            [40030, 'EE40030', 'מערכות ליניאריות'], [40048, 'EE40048', 'עיבוד ספרתי של תמונות'],
            [40110, 'EE40110', 'ראייה ממוחשבת'], [40120, 'EE40120', 'לייזרים ואופטיקה מודרנית'],
            [40122, 'EE40122', 'יסודות אופטיקה ביו-רפואית'], [40050, 'EE40050', 'מיקרו-מעבדים ומערכות משובצות'],
            
            [30015, 'IS30015', 'יסודות התכנות לתעשייה וניהול'], [30039, 'IS30039', 'כלים מתמטיים לניהול'],
            [30077, 'IS30077', 'תכנות בסביבת אינטרנט'], [30095, 'IS30095', 'חקר ביצועים 1'],
            [31026, 'IS31026', 'שיווק ופרסום באינטרנט'], [30553, 'IS30553', 'סמינר מחלקתי תעשייה וניהול'],
            [30997, 'IS30997', 'סיור מחלקתי'], [30012, 'IS30012', 'מבוא לכלכלה הנדסית'],
            [30044, 'IS30044', 'ניהול השקעות ומימון'], [30088, 'IS30088', 'ניהול מערכות ייצור ומלאי']
        ];
        for (const course of sampleCourses) {
            await dbRun(`INSERT OR IGNORE INTO COURSE VALUES (?, ?, ?)`, course);
        }

        for (let i = 0; i < sampleCourses.length; i++) {
            let progId = 'PROG_SOFTWARE';
            if (i >= 10 && i < 18) progId = 'PROG_CS';
            if (i >= 18 && i < 28) progId = 'PROG_ELEC';
            if (i >= 28) progId = 'PROG_INDUSTRIAL';

            const courseNum = sampleCourses[i][0];
            const credits = faker.helpers.arrayElement([3.0, 3.5, 4.0, 5.5]);
            const year = faker.helpers.arrayElement([1, 2, 3, 4]);
            const sem = faker.helpers.arrayElement(['A', 'B']);
            const type = faker.helpers.arrayElement(['חובה', 'בחירה']);

            await dbRun(`INSERT OR IGNORE INTO CURRICULUM_COURSE VALUES (?, ?, ?, ?, ?, ?)`,
                [progId, courseNum, credits, year, sem, type]
            );
        }

        const lecturerIds = [];
        const deptIds = [101, 102, 103, 104];
        for (let i = 0; i < 12; i++) {
            const id = faker.string.numeric(9);
            lecturerIds.push(id);
            const lecturerName = faker.person.fullName(); 
            await dbRun(`INSERT OR IGNORE INTO LECTURER VALUES (?, ?, ?)`, 
                [id, lecturerName, faker.helpers.arrayElement(deptIds)]
            );
        }

        // יצירת 150 סטודנטים
        const studentIds = [];
        const programIds = ['PROG_SOFTWARE', 'PROG_CS', 'PROG_ELEC', 'PROG_INDUSTRIAL'];
        
        for (let i = 0; i < 150; i++) { 
            const id = faker.string.numeric(9);
            studentIds.push(id);
            const fullName = faker.person.fullName();
            const assignedProgram = faker.helpers.arrayElement(programIds);
            const startYear = faker.helpers.arrayElement([2021, 2022, 2023, 2024]);
            
            await dbRun(`INSERT OR IGNORE INTO STUDENT VALUES (?, ?, ?, ?, ?, ?)`, 
                [id, fullName, assignedProgram, startYear, 'A', 'Active']
            );
        }

        const semA_StartA = '2026-06-22', semA_EndA = '2026-07-15';
        const semA_StartB = '2026-07-20', semA_EndB = '2026-08-15';
        const semB_StartA = '2026-10-20', semB_EndA = '2026-11-12';
        const semB_StartB = '2026-11-18', semB_EndB = '2026-12-15';

        for (let i = 0; i < sampleCourses.length; i++) {
            const courseNum = sampleCourses[i][0];
            const semester = faker.helpers.arrayElement(['A', 'B']);
            let dateA = semester === 'A' ? semA_StartA : semB_StartA;
            let dateB = semester === 'A' ? semA_StartB : semB_StartB;

            await dbRun(`INSERT INTO SEMESTER_COURSE (course_num, lecturer_id, year_taught, semester, exam_date_a, exam_date_b) VALUES (?, ?, ?, ?, ?, ?)`,
                [courseNum, faker.helpers.arrayElement(lecturerIds), 2026, semester, dateA, dateB]
            );
        }

        // 8. רישום סטודנטים לקורסים השייכים לתוכנית שלהם בלבד - מתוקן עם dbAll
        console.log("Enrolling students into courses based on their program...");
        const students = await dbAll(`SELECT ID, program_id FROM STUDENT`);

        for (const student of students) {
            const availableCourses = await dbAll(`
                SELECT semester_course_id 
                FROM SEMESTER_COURSE AS SC
                JOIN CURRICULUM_COURSE AS CC ON SC.course_num = CC.course_num
                WHERE CC.program_id = ?
            `, [student.program_id]);

            if (!availableCourses || availableCourses.length === 0) continue;

            const numberOfCourses = faker.number.int({ min: 5, max: 7 });
            const shuffled = faker.helpers.shuffle(availableCourses);
            const selectedCourses = shuffled.slice(0, Math.min(numberOfCourses, availableCourses.length));

            for (const course of selectedCourses) {
                const grade = faker.number.int({ min: 40, max: 100 });
                await dbRun(`INSERT OR IGNORE INTO ENROL (student_id, semester_course_id, grade) VALUES (?, ?, ?)`,
                    [student.ID, course.semester_course_id, grade]
                );
            }
        }

        const defaultPassword = '123456';
        
        await dbRun(`INSERT INTO USER (username, password_hash, email, full_name, role, associated_dept_id) VALUES (?, ?, ?, ?, ?, ?)`,
            ['admin_user', defaultPassword, 'admin@univ.ac.il', "דניאל מנהל המערכת", 'ADMIN', null]
        );
        await dbRun(`INSERT INTO USER (username, password_hash, email, full_name, role, associated_dept_id) VALUES (?, ?, ?, ?, ?, ?)`,
            ['president_admin', defaultPassword, 'president@univ.ac.il', "פרופ' תמר רז נחום", 'PRESIDENT', null]
        );

        const academicTitles = ["ד\"ר", "פרופ'"];
        
        const schoolHead1Name = `${faker.helpers.arrayElement(academicTitles)} ${faker.person.fullName()}`;
        await dbRun(`INSERT INTO USER (username, password_hash, email, full_name, role, associated_dept_id) VALUES (?, ?, ?, ?, ?, ?)`,
            ['school_head_1', defaultPassword, 'school_head_1@univ.ac.il', schoolHead1Name, 'SCHOOL_HEAD', null]
        );

        const schoolHead2Name = `${faker.helpers.arrayElement(academicTitles)} ${faker.person.fullName()}`;
        await dbRun(`INSERT INTO USER (username, password_hash, email, full_name, role, associated_dept_id) VALUES (?, ?, ?, ?, ?, ?)`,
            ['school_head_2', defaultPassword, 'school_head_2@univ.ac.il', schoolHead2Name, 'SCHOOL_HEAD', null]
        );
        
        for (const dept of departments) {
            const deptId = dept[0];     
            const deptHeadName = dept[2]; 

            await dbRun(`INSERT INTO USER (username, password_hash, email, full_name, role, associated_dept_id) VALUES (?, ?, ?, ?, ?, ?)`,
                [`dept_head_${deptId}`, defaultPassword, `dept_head_${deptId}@univ.ac.il`, deptHeadName, 'DEPT_HEAD', deptId]
            );
        }
        console.log("🎓 Injecting custom student: דניאל פוליטי...");
        
        const danielId = '208286096'; // תעודת זהות קבועה עבורך
        
        // א. הכנסת הסטודנט למסלול הנדסת תוכנה (PROG_SOFTWARE)
        await dbRun(`INSERT INTO STUDENT (ID, full_name, program_id, start_year, start_semester, academic_status) 
            VALUES (?, ?, ?, ?, ?, ?)`, 
            [danielId, 'דניאל פוליטי', 'PROG_SOFTWARE', 2019, 'A', 'Active']
        );

        // ב. שליפת כל המופעים הסמסטריאליים שנוצרו בסקריפט עבור קורסי הנדסת תוכנה
        const softwareSemesterCourses = await dbAll(`
            SELECT semester_course_id 
            FROM SEMESTER_COURSE AS SC
            JOIN CURRICULUM_COURSE AS CC ON SC.course_num = CC.course_num
            WHERE CC.program_id = 'PROG_SOFTWARE'
        `);

        // ג. רישום של דניאל לכל אחד ואחד מהם עם ציון 100 עגול!
        for (const course of softwareSemesterCourses) {
            await dbRun(`INSERT OR IGNORE INTO ENROL (student_id, semester_course_id, grade) VALUES (?, ?, ?)`,
                [danielId, course.semester_course_id, 100]
            );
        }

        await dbRun("COMMIT");
        console.log("🔥 Success! Data and users with strict school scopes successfully saved.");

    } catch (err) {
        await dbRun("ROLLBACK");
        console.error("🚨 Transaction failed, rolled back changes. Error:", err);
    }
}

setup();