import { useState, useEffect, useRef, useCallback } from "react";

import {
signInWithGoogle as signIn,
logOut,
onAuth,
saveData,
loadData
} from "./firebase";

const uid = () => Math.random().toString(36).slice(2, 9);

const pad = (n) => String(n).padStart(2, "0");

function fmtTimer(s) {
s = Math.max(0, Math.floor(s));

const h = Math.floor(s / 3600);
const m = Math.floor((s % 3600) / 60);
const sec = s % 60;

return h > 0
? `${pad(h)}:${pad(m)}:${pad(sec)}`
: `${pad(m)}:${pad(sec)}`;
}

function fmtHuman(s) {
s = Math.floor(s || 0);

if (!s) return "—";

const h = Math.floor(s / 3600);
const m = Math.floor((s % 3600) / 60);

return h > 0
? `${h}h ${m}m`
: m > 0
? `${m}m`
: `${s}s`;
}

const COLORS = [
"#3B82F6",
"#10B981",
"#F59E0B",
"#EF4444",
"#8B5CF6",
"#EC4899",
"#06B6D4",
"#84CC16",
"#F97316",
"#6366F1"
];
