const { faker } = require('@faker-js/faker');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

async function setup() {
    const db = new sqlite3.Database('./university.db');
    
    // הפיכת הפונקציות של sqlite ל-Promises כדי שנוכל לחכות להן
    const dbRun = promisify(db.run.bind(db));
    const dbClose = promisify(db.close.bind(db));

    try {
        console.log("Creating tables...");
        
        await dbRun(`CREATE TABLE IF NOT EXISTS DEPARTMENT (dept_id INTEGER PRIMARY KEY, name TEXT, head_of_dept TEXT)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS PROGRAM (program_id TEXT PRIMARY KEY, program_name TEXT, dept_id INTEGER)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS STUDENT (ID TEXT PRIMARY KEY, full_name TEXT, program_id TEXT, start_year INTEGER, start_semester TEXT, academic_status TEXT)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS LECTURER (id_number TEXT PRIMARY KEY, full_name TEXT, dept_id INTEGER)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS COURSE (course_num INTEGER PRIMARY KEY, course_id TEXT, course_name TEXT, dept_id INTEGER, lecturer_id TEXT, year_taught INTEGER, semester TEXT)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS ENROL (student_id TEXT, course_num INTEGER, grade INTEGER, PRIMARY KEY (student_id, course_num))`);

        console.log("Seeding data...");

        // התחלת Transaction לביצועים מהירים ומניעת איבוד נתונים
        await dbRun("BEGIN TRANSACTION");

        // 1. מחלקות
        const deptIds = [101, 102, 103, 104];
        for (const id of deptIds) {
            await dbRun(`INSERT OR IGNORE INTO DEPARTMENT VALUES (?, ?, ?)`, [id, faker.commerce.department(), faker.person.fullName()]);
        }

        // 2. תוכניות לימוד
        const programIds = ['PROG-CS', 'PROG-ENG', 'PROG-BIO'];
        for (const [index, id] of programIds.entries()) {
            await dbRun(`INSERT OR IGNORE INTO PROGRAM VALUES (?, ?, ?)`, [id, faker.commerce.productName(), deptIds[index % deptIds.length]]);
        }

        // 3. מרצים
        const lecturerIds = [];
        for (let i = 0; i < 15; i++) {
            const id = faker.string.numeric(9);
            lecturerIds.push(id);
            await dbRun(`INSERT OR IGNORE INTO LECTURER VALUES (?, ?, ?)`, [id, faker.person.fullName(), faker.helpers.arrayElement(deptIds)]);
        }

        // 4. סטודנטים
        const studentIds = [];
        for (let i = 0; i < 50; i++) {
            const id = faker.string.numeric(9);
            studentIds.push(id);
            await dbRun(`INSERT OR IGNORE INTO STUDENT VALUES (?, ?, ?, ?, ?, ?)`, [id, faker.person.fullName(), faker.helpers.arrayElement(programIds), 2024, 'A', 'Active']);
        }

        // 5. קורסים
        const courseNums = [];
        for (let i = 0; i < 20; i++) {
            const cNum = 2000 + i;
            courseNums.push(cNum);
            await dbRun(`INSERT OR IGNORE INTO COURSE VALUES (?, ?, ?, ?, ?, ?, ?)`, [cNum, 'CS'+cNum, faker.company.catchPhrase(), faker.helpers.arrayElement(deptIds), faker.helpers.arrayElement(lecturerIds), 2026, 'A']);
        }

        // 6. הרשמה
        for (const sId of studentIds) {
            const myCourses = faker.helpers.arrayElements(courseNums, { min: 2, max: 4 });
            for (const cNum of myCourses) {
                await dbRun(`INSERT OR IGNORE INTO ENROL VALUES (?, ?, ?)`, [sId, cNum, faker.number.int({ min: 40, max: 100 })]);
            }
        }

        await dbRun("COMMIT");
        console.log("Success! Data is saved in university.db");

    } catch (err) {
        await dbRun("ROLLBACK");
        console.error("Error:", err);
    } finally {
        await dbClose();
    }
}

setup();