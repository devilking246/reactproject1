import { useState } from "react";
import Login from "./Login";
import SearchBox from "./SearchBox";

function App() {
    const [user, setUser] = useState(null); // מחזיק את המשתמש המחובר כרגע

    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser); // שומר את המשתמש ומעביר אותו למערכת
    };

    const handleLogout = () => {
        setUser(null); // התנתקות מהמערכת
    };

    return (
        <div className="app-container">
            {!user ? (
                // אם המשתמש לא מחובר - מציגים רק מסך לוגין
                <Login onLoginSuccess={handleLoginSuccess} />
            ) : (
                // אם המשתמש מחובר - נפתחת המערכת עם מנגנון השאילתות
                <div style={{ padding: "20px", direction: "rtl" }}>
                    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", marginBottom: "20px" }}>
                        <div>
                            שלום, <strong>{user.full_name}</strong> ({user.role === 'PRESIDENT' ? "נשיאת המכללה" : user.role === 'SCHOOL_HEAD' ? "ראש בית ספר" : "ראש מחלקה"})
                        </div>
                        <button onClick={handleLogout} style={{ padding: "5px 10px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>
                            התנתק
                        </button>
                    </header>
                    
                    {/* קומפוננטת החיפוש הקיימת שלך */}
                    <SearchBox currentUser={user} /> 
                </div>
            )}
        </div>
    );
}

export default App;