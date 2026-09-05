
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/dashboard/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load dashboard");
        }

        return response.json();
      })
      .then((data) => {
        setDashboard(data);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="app">
        <div className="error-box">
          <h2>Dashboard unavailable</h2>
          <p>{error}</p>
          <p>Please login first.</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="app">
        <h2>Loading SkillBridgeAI...</h2>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>SkillBridgeAI</h1>
          <p>Your AI-powered career dashboard</p>
        </div>
      </header>

      <main className="dashboard">
        <section className="welcome-card">
          <h2>
            Welcome, {dashboard.user.name} 👋
          </h2>

          <p>{dashboard.profile?.degree || "Student"}</p>
          <p>{dashboard.profile?.college || ""}</p>
        </section>

        <section className="stats">
          <div className="card">
            <h3>Total Skills</h3>
            <strong>{dashboard.skill_count}</strong>
          </div>

          <div className="card">
            <h3>Profile</h3>
            <strong>Complete</strong>
          </div>

          <div className="card">
            <h3>Career</h3>
            <strong>Python Developer</strong>
          </div>
        </section>

        <section className="skills-section">
          <h2>My Skills</h2>

          <div className="skills-grid">
            {dashboard.skills.map((skill) => (
              <div className="skill-card" key={skill.id}>
                <h3>{skill.skill_name}</h3>
                <p>{skill.proficiency}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
