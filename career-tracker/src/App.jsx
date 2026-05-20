import { useState, useEffect } from "react";

import {
  signInWithGoogle as signIn,
  logOut,
  onAuth,
  saveData,
  loadData
} from "./firebase";

const DEFAULT_DATA = {
  goals: []
};

export default function App() {

  const [user, setUser] = useState(null);
  const [data, setData] = useState(DEFAULT_DATA);
  const [text, setText] = useState("");
  const [sync, setSync] = useState("idle");

  useEffect(() => {
    const unsub = onAuth(async (u) => {
      setUser(u);
      if (!u) return;

      try {
        const d = await loadData(u.uid);
        if (d) {
          setData(d);
        }
      } catch (e) {
        console.error(e);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const t = setTimeout(async () => {
      try {
        setSync("saving");
        await saveData(
          user.uid,
          JSON.parse(JSON.stringify(data))
        );
        setSync("saved");
      } catch (e) {
        console.error(e);
        setSync("error");
      }
    }, 500);

    return () => clearTimeout(t);
  }, [data, user]);

  function addGoal() {
    if (!text.trim()) return;

    setData(prev => ({
      ...prev,
      goals: [
        ...prev.goals,
        {
          id: Date.now(),
          title: text
        }
      ]
    }));

    setText("");
  }

  if (!user) {
    return (
      <div
        style={{
          padding: 40,
          fontFamily: "sans-serif"
        }}
      >
        <h1>Career Tracker</h1>
        <button onClick={signIn}>
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "sans-serif"
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20
        }}
      >
        <button onClick={logOut}>
          Logout
        </button>
        <div>
          Sync: {sync}
        </div>
      </div>

      <h2>Goals</h2>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New Goal"
        />
        <button onClick={addGoal}>
          Add
        </button>
      </div>

      {data.goals.map(goal => (
        <div
          key={goal.id}
          style={{
            padding: 10,
            marginBottom: 10,
            border: "1px solid #ccc"
          }}
        >
          {goal.title}
        </div>
      ))}
    </div>
  );
}
