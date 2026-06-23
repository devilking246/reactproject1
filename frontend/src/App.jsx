import { useState } from "react";
import Login from "./Login";
import SearchBox from "./SearchBox";
import "./App.css"; // 🌟 ייבוא ה-CSS המעוצב

function App() {
    const [user, setUser] = useState(null);

    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser);
    };

    const handleLogout = () => {
        setUser(null);
    };

    if (!user) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="app-container">
            <div className="main-dashboard">
                <header className="main-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <img 
                            src="/AzrieliJerus.svg.png" 
                            alt="לוגו עזריאלי" 
                            className="login-logo"
                            style={{ height: "55px", marginBottom: 0 }} 
                        />
                        <div style={{ fontSize: "18px", fontWeight: "600" }}>
                            שלום, {user.full_name} 
                            <span className="user-badge">
                            {user.role === 'ADMIN' ? "מנהל מערכת" :
                            user.role === 'PRESIDENT' ? "נשיאת המכללה" : 
                            user.role === 'SCHOOL_HEAD' ? "ראש בית ספר" : 
                            user.role === 'DEPT_HEAD' ? "ראש מחלקה" : "משתמש מערכת"}
                        </span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-danger">
                        התנתק מהמערכת
                    </button>
                </header>
                
                {/* תיבת החיפוש והתוצאות */}
                <SearchBox currentUser={user} /> 
            </div>
        </div>
    );
}

export default App;