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
    // 🌟 שינוי כאן: הוספת סגנון שגורם לקונטיינר לתפוס 100% רוחב ללא שוליים חונקים
    <div className="app-container" style={{ width: "100vw", maxWidth: "100%", padding: "0 20px", boxSizing: "border-box" }}>
        {!user ? (
            // אם המשתמש לא מחובר - מציגים רק מסך לוגין
            <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
            // אם המשתמש מחובר - נפתחת המערכת עם מנגנון השאילתות
            <div style={{ padding: "20px", direction: "rtl", width: "100%" }}>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eee", paddingBottom: "10px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <img 
                            src="/AzrieliJerus.svg.png" 
                            alt="לוגו עזריאלי" 
                            style={{ height: "60px", objectFit: "contain" }} 
                        />
                        <div style={{ fontSize: "16px" }}>
                            שלום, <strong>{user.full_name}</strong> ({
                                user.role === 'ADMIN' ? "מנהל מערכת" :
                                user.role === 'PRESIDENT' ? "נשיאת המכללה" : 
                                user.role === 'SCHOOL_HEAD' ? "ראש בית ספר" : 
                                "ראש מחלקה"
                            })
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{ padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                        התנתק
                    </button>
                </header>
                
                {/* קומפוננטת החיפוש תתפרס עכשיו על כל הרוחב הזמין */}
                <SearchBox currentUser={user} /> 
            </div>
        )}
    </div>
);
}

export default App;