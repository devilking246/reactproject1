import { useState } from "react";

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "שגיאה בהתחברות למערכת");
            }

            // הצלחה! מעבירים את נתוני המשתמש המחובר לקומפוננטה האב (App.jsx)
            console.log("🔒 התחברות הצליחה:", data);
            onLoginSuccess(data.user); 

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={{ maxWidth: "400px", margin: "100px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px", direction: "rtl" }}>
            <h2>התחברות למערכת Chat-to-Data</h2>
            
            {error && <div className="login-error" style={{ color: "red", marginBottom: "15px" }}>{error}</div>}
            
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>שם משתמש / מייל:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="הקלד שם משתמש..."
                        required
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                    />
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>סיסמה:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="הקלד סיסמה..."
                        required
                        style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ width: "100%", padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
                >
                    {loading ? "מתחבר..." : "התחבר"}
                </button>
            </form>
        </div>
    );
};

export default Login;