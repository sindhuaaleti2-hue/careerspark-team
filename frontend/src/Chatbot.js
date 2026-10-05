import React, { useState, useEffect } from "react";
import axios from "axios";
import { Send, Mic , LogOut } from "lucide-react";
import logo from "./logo.png";

function Chatbot() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [typing, setTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const theme = {
    background: "linear-gradient(135deg,#81689D, #474F7A)",
    primary: "#FFD0EC",
    userBg: "#ffffff",
    botBg: "#ffffff"
  };

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/suggestions")
      .then(res => setSuggestions(res.data.data));
  }, []);

  const handleSignup = async () => {
    if (!username || !password) return alert("Enter username and password");
    try {
      const res = await axios.post("http://127.0.0.1:8000/signup", { username, password });
      alert(res.data.message);
      setShowSignup(false);
      setUsername("");
      setPassword("");
    } catch (err) {
      alert(err.response?.data?.detail || "Signup failed");
    }
  };

  const handleLogin = async () => {
    if (!username || !password) return alert("Enter username and password");
    try {
      const res = await axios.post("http://127.0.0.1:8000/login", { username, password });
      setToken(res.data.access_token);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("username", username);
      alert(res.data.message);
      setShowLogin(false);
      setUsername("");
      setPassword("");
    } catch (err) {
      alert(err.response?.data?.detail || "Login failed");
    }
  };

  const sendMessage = async (msg) => {
    const userMsg = msg || message;
    if (!userMsg) return;

    setChat(prev => [...prev, { type: "user", text: userMsg }]);
    setTyping(true);

    try {
      const res = await axios.get("http://127.0.0.1:8000/ask", {
        params: { query: userMsg, user_id: localStorage.getItem("username") || "default" }
      });
      setChat(prev => [...prev, { type: "bot", text: res.data.response }]);
    } catch {
      setChat(prev => [...prev, { type: "bot", text: "Error: could not reach server." }]);
    }

    setTyping(false);
    setMessage("");
  };

  return (
    <div style={{ background: theme.background, minHeight: "100vh", padding: 20, color: "#1F2544" }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  <img src={logo} alt="logo" style={{ width: "30px", height: "30px" }} />
  <h2>CareerSpark</h2>
</div> 

          {!token ? (
            <div>
              <button onClick={() => setShowLogin(true)} style={{ marginRight: 5, backgroundColor: theme.primary, color: "#474F7A", border: "none", padding: "5px 12px", borderRadius: 5 }}>Login</button>
              <button onClick={() => setShowSignup(true)} style={{ backgroundColor: theme.primary, color: "#474F7A", border: "none", padding: "5px 12px", borderRadius: 5 }}>Signup</button>
            </div>
          ) : (
  <div style={{ position: "relative" }}>
    
    {/* Profile Icon */}
    <div
      onClick={() => setShowDropdown(!showDropdown)}
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        backgroundColor:"#FFD0EC",
        color: "#1F2544",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "18px",
        cursor: "pointer"
      }}
    >
      {localStorage.getItem("username")?.charAt(0).toUpperCase()}
    </div>

    {/* Dropdown */}
    {showDropdown && (
      <div
        style={{
          position: "absolute",
          top: "50px",
          right: 0,
          backgroundColor: "#1F2544",
          color: "#cdc6c6",
          borderRadius: "8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          width: "170px",
          overflow: "hidden",
          zIndex: 200
        }}
      >
        {/* Username */}
        <div style={{ padding: "10px", borderBottom: "1px solid #474F7A ", fontWeight: "bold" }}>
          {localStorage.getItem("username")}
        </div>

        {/* Add Account */}
        <div
          onClick={() => {
            setToken(null);
            setShowDropdown(false);
            setShowLogin(true);
          }}
          style={{ padding: "10px", cursor: "pointer" }}
          onMouseEnter={e => e.target.style.background = "#81689D"}
          onMouseLeave={e => e.target.style.background = "#81689D"}
        >
          ➕ Add Account
        </div>

        {/* Logout */}
        <div
  onClick={() => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setShowDropdown(false);
  }}
  style={{
    padding: "10px",
    cursor: "pointer",
    color: "red",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  }}
  onMouseEnter={e => e.target.style.background = "#81689D"}
  onMouseLeave={e => e.target.style.background = "#81689D"}
>
  <LogOut size={18} />
  Logout
</div>
      </div>
    )}
  </div>
)}
        </div>
        <div style={{ height: 2, backgroundColor: "rgba(255,255,255,0.6)", marginTop: 10 }} />
      </div>

      <div style={{ display: "flex" }}>

        {/* Chat Section */}
        <div style={{ flex: 3, paddingRight: 10 }}>
          <div style={{ height: "60vh", overflowY: "auto", padding: 10 }}>

            {/* ✅ WHITE BUBBLE CHAT */}
            {chat.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: c.type === "user" ? "flex-end" : "flex-start",
                  marginBottom: "10px"
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "10px 14px",
                    borderRadius: "15px",
                    background: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#fff",
                    whiteSpace: "pre-line",
                    borderTopRightRadius: c.type === "user" ? "0px" : "15px",
                    borderTopLeftRadius: c.type === "bot" ? "0px" : "15px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                  }}
                >
                  {c.text}
                </div>
              </div>
            ))}

            {/* Typing */}
            {typing && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  backgroundColor: "#fff",
                  color: "#000",
                  padding: "8px 12px",
                  borderRadius: "15px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}>
                  Typing...
                </div>
              </div>
            )}

          </div>

          {/* Input */}
          <div style={{ display: "flex", marginTop: 10 }}>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ask career question..."
              style={{ flex: 1, padding: 8, borderRadius: 5, border: "none" }}
            />
            <button onClick={() => sendMessage()} style={{ marginLeft: 5, backgroundColor:"#81689D", color: "#FFD0EC", border: "none", padding: "0 12px", borderRadius: 5 }}>
              <Send />
            </button>
            <button onClick={() => {
              const recognition = new window.webkitSpeechRecognition();
              recognition.start();
              recognition.onresult = (e) => {
                sendMessage(e.results[0][0].transcript);
              };
            }} style={{ marginLeft: 5, backgroundColor: "#81689D", color: "#FFD0EC", border: "none", padding: "0 12px", borderRadius: 5 }}>
              <Mic />
            </button>
          </div>
        </div>

        {/* ✅ RECOMMENDATIONS (UNCHANGED) */}
        <div style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)" }}>
          <h3 style={{ textAlign: "center" }}>Recommended Queries:</h3>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              style={{
                padding: "8px",
                borderRadius: 20,
                border: "none",
                backgroundColor: theme.primary,
                color: "#81689D",
                marginBottom: 8,
                width: "100%"
              }}
            >
              {s}
            </button>
          ))}
        </div>

      </div>
{/* ---------------------- */}
      {/* Login Modal */}
      {/* ---------------------- */}
      {showLogin && (
        <div style={{
          position: "absolute",
          top: 80,
          right: 20,
          padding: 15,
          backgroundColor: "#FFD0EC",
          color: "#81689D",
          borderRadius: 8,
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <h4 style={{ margin: 0 }}>Login</h4>
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: 5,
              border: "none",
              outline: "none",
              backgroundColor: "#FFD0EC",
              color: "#81689D",
              transition: "all 0.2s"
            }}
            onFocus={e => e.target.style.boxShadow = "0 0 5px #81689D"}
            onBlur={e => e.target.style.boxShadow = "none"}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: 5,
              border: "none",
              outline: "none",
              backgroundColor: "#FFD0EC",
              color: "#81689D",
              transition: "all 0.2s"
            }}
            onFocus={e => e.target.style.boxShadow = "0 0 5px #81689D"}
            onBlur={e => e.target.style.boxShadow = "none"}
          />
          <div style={{ display: "flex", gap: "5px" }}>
            <button
              onClick={handleLogin}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 5,
                border: "none",
                backgroundColor: "#FFD0EC",
                color: "#81689D",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.target.style.backgroundColor = "#474F7A"; e.target.style.boxShadow = "0 0 8px #fff"; }}
              onMouseLeave={e => { e.target.style.backgroundColor = "#474F7A"; e.target.style.boxShadow = "none"; }}
            >
              Login
            </button>
            <button
              onClick={() => setShowLogin(false)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 5,
                border: "none",
                backgroundColor: "#FFD0EC",
                color: "#81689D",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.target.style.boxShadow = "0 0 8px #81689D"}
              onMouseLeave={e => e.target.style.boxShadow = "none"}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* Signup Modal */}
      {/* ---------------------- */}
      {showSignup && (
        <div style={{
          position: "absolute",
          top: 80,
          right: 20,
          padding: 15,
          backgroundColor: "#FFD0EC",
          color: "#81689D",
          borderRadius: 8,
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <h4 style={{ margin: 0 }}>Signup</h4>
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: 5,
              border: "none",
              outline: "none",
              backgroundColor: "#FFD0EC",
              color: "#81689D",
              transition: "all 0.2s"
            }}
            onFocus={e => e.target.style.boxShadow = "0 0 5px #81689D"}
            onBlur={e => e.target.style.boxShadow = "none"}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: 5,
              border: "none",
              outline: "none",
              backgroundColor: "#FFD0EC",
              color: "#81689D",
              transition: "all 0.2s"
            }}
            onFocus={e => e.target.style.boxShadow = "0 0 5px #81689D"}
            onBlur={e => e.target.style.boxShadow = "none"}
          />
          <div style={{ display: "flex", gap: "5px" }}>
            <button
              onClick={handleSignup}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 5,
                border: "none",
                backgroundColor: "#FFD0EC",
                color: "#81689D",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.target.style.backgroundColor = "#474F7A"; e.target.style.boxShadow = "0 0 8px #fff"; }}
              onMouseLeave={e => { e.target.style.backgroundColor = "#474F7A"; e.target.style.boxShadow = "none"; }}
            >
              Signup
            </button>
            <button
              onClick={() => setShowSignup(false)}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 5,
                border: "none",
                backgroundColor: "#FFD0EC",
                color: "#81689D",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => e.target.style.boxShadow = "0 0 8px #81689D"}
              onMouseLeave={e => e.target.style.boxShadow = "none"}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chatbot;