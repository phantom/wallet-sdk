import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the auth callback and redirect back to the main app
    const handleCallback = () => {
      // You can add custom callback handling logic here
      console.log("Auth callback received");
      
      // Redirect back to the main app after a short delay
      setTimeout(() => {
        navigate("/");
      }, 1000);
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      flexDirection: "column",
      gap: "1rem"
    }}>
      <h1>Processing Authentication...</h1>
      <p>You will be redirected shortly.</p>
      <div style={{
        width: "40px",
        height: "40px",
        border: "4px solid #f3f3f3",
        borderTop: "4px solid #5865f2",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}