"use client";

import { useEffect, useRef, useState } from "react";

type Player = { id: string; name: string; score: number };
type Answer = { id: string; playerId: string; name: string; text: string; question: number };
type Matchup = { id: string; prompt: string; playerIds: string[] };
type Announcer = { name: string; icon: string; line: string };
type Phase = "home" | "lobby" | "countdown" | "prompt" | "vote-intro" | "vote" | "reveal" | "scores" | "final";
type GameState = { phase: Phase; room: string; players: Player[]; round: number; prompts: string[]; promptHistory: string[]; matchups: Matchup[]; assignments: Record<string, number[]>; questionCount: 1 | 2; activeQuestion: number; answers: Answer[]; votes: Record<string, string>; lastPoints: Record<string, number>; announcer?: Announcer; deadline?: number };
type PeerConnection = { peer: string; open: boolean; send: (data: unknown) => void; on: (event: string, cb: (data?: any) => void) => void; close: () => void };
type PeerInstance = { id: string; on: (event: string, cb: (data?: any) => void) => void; connect: (id: string) => PeerConnection; destroy: () => void };

declare global { interface Window { Peer: new (id?: string, options?: Record<string, unknown>) => PeerInstance } }

const ONE_ANSWER_PROMPTS = [
  "Noah’s funniest announcement on the ark: ____.",
  "A silly name for a Christian coffee shop: ____.",
  "The unofficial 11th commandment: Thou shalt not ____.",
  "The animal Noah had to remind to use an inside voice: ____.",
  "A surprising instrument to add to the worship band: ____.",
  "A youth pastor’s secret superpower: ____.",
  "The snack most likely to appear at every church event: ____.",
  "A new name for the book of Acts: ____.",
  "What David packed for his big day with Goliath: ____.",
  "The most surprising dish at the church potluck: ____.",
  "The first game played on Noah’s ark: ____.",
  "A new flavor of Sunday school snack: ____.",
  "The most useful miracle at cleanup time: ____.",
  "The disciples’ group-chat name: ____.",
  "On the eighth day, everyone took time for ____.",
  "A church sign that would make everyone smile: ____.",
  "The name of Moses’ wilderness travel agency: ____.",
  "The one thing Jonah did not pack for his trip: ____.",
  "The camel's favorite road-trip snack: ____.",
  "A surprising thing to hear from a talking donkey: ____.",
  "The name of Daniel's lion-taming podcast: ____.",
  "The first item sold at the manna food truck: ____.",
  "A terrible name for a boat built by Noah: ____.",
  "The reason the wise men stopped for directions: ____.",
  "Something you should never bring to a church potluck: ____.",
  "The title of David's newest shepherding song: ____.",
  "What Zacchaeus shouted from the tree: ____.",
  "The most competitive Sunday school game: ____.",
  "A rejected name for the Garden of Eden: ____.",
  "The disciples knew it was going to be a long day when ____.",
  "The best way to make forty years in the wilderness fly by: ____.",
  "A Bible character's unlikely hidden talent: ____.",
  "The sign outside the ark's animal cafeteria: ____.",
  "A new holiday celebrating church volunteers: ____.",
  "The youth group's most mysterious lost-and-found item: ____.",
  "A phrase that would make a choir director nervous: ____.",
  "The name of the fastest camel in Jerusalem: ____.",
  "The strangest thing to find in a shepherd's lunchbox: ____.",
  "What the lions wrote in Daniel's yearbook: ____.",
  "A new event for the Bible-times Olympics: ____.",
  "The worst possible sound during silent prayer: ____.",
  "The church bake-sale item nobody can resist: ____.",
  "What Noah said when the rain finally stopped: ____.",
  "The title of Paul's travel memoir: ____.",
  "A slogan for Bethlehem's tourism office: ____.",
  "The most dramatic way to announce snack time: ____.",
  "A tiny miracle that would improve every Monday: ____.",
  "The name of a Bible-themed amusement park ride: ____.",
  "What the sheep do when the shepherd takes a day off: ____.",
  "An unusual prize for memorizing a Bible verse: ____.",
  "The secret ingredient in a legendary church casserole: ____.",
  "A suspicious message in the disciples' group chat: ____.",
  "The first thing to sell out at the ark gift shop: ____.",
  "A funny excuse for being late to worship practice: ____.",
  "The name of a wilderness weather forecast: ____.",
  "What Goliath should have put on his résumé: ____.",
  "The unofficial mascot of the church nursery: ____.",
];

const PROMPT_TEMPLATES = [
  "The worst slogan for {topic}: ____.", "A rejected mascot for {topic}: ____.",
  "The secret password at {topic}: ____.", "The strangest rule at {topic}: ____.",
  "The funniest thing overheard at {topic}: ____.", "A snack nobody expected at {topic}: ____.",
  "The official dance move of {topic}: ____.", "A suspicious announcement at {topic}: ____.",
  "The least helpful invention for {topic}: ____.", "A terrible souvenir from {topic}: ____.",
  "The one thing guaranteed to cause giggles at {topic}: ____.", "A surprising new job at {topic}: ____.",
  "The title of a reality show about {topic}: ____.", "A warning label for {topic}: ____.",
  "The newest attraction at {topic}: ____.", "A nickname that {topic} definitely did not request: ____.",
  "The most dramatic entrance at {topic}: ____.", "A rejected theme song for {topic}: ____.",
  "The oddest item in the lost-and-found at {topic}: ____.", "The headline after a wild day at {topic}: ____.",
  "The unofficial uniform at {topic}: ____.", "A sign that would confuse everyone at {topic}: ____.",
  "The worst possible weather forecast for {topic}: ____.", "A new holiday inspired by {topic}: ____.",
  "The souvenir T-shirt from {topic} says: ____.", "A tiny problem that became a huge deal at {topic}: ____.",
  "The most unexpected sound at {topic}: ____.", "A silly reason to arrive late to {topic}: ____.",
  "The best name for a food truck parked at {topic}: ____.", "A brand-new competition held at {topic}: ____.",
  "The thing everyone pretends not to notice at {topic}: ____.", "A five-star review of {topic} would say: ____."
];

const PROMPT_TOPICS = [
  "Noah's ark", "the church potluck", "the youth room", "Sunday school", "the Garden of Eden", "the wilderness campout", "Bethlehem", "Jericho", "the disciples' group chat", "Daniel's lion den", "David's sheep pasture", "Jonah's boat ride", "the manna food truck", "the church nursery", "worship-band rehearsal", "the ark gift shop", "a Bible-times Olympics", "the wise men's road trip", "Zacchaeus's treehouse", "the camel parking lot", "the choir loft", "the fellowship hall", "the church bake sale", "a shepherd convention", "the Red Sea beach day", "the promised-land welcome center", "the church picnic", "a Bible-character talent show", "the Sunday-morning coffee line", "the volunteer appreciation dinner", "a biblical petting zoo", "the greatest church game night ever"
];

const PROMPT_LIBRARY = [
  ...ONE_ANSWER_PROMPTS,
  ...PROMPT_TEMPLATES.flatMap(template => PROMPT_TOPICS.map(topic => template.replace("{topic}", topic))),
];

const BIBLE_ANNOUNCERS: Announcer[] = [
  { name: "Noah", icon: "🛶", line: "Two by two, pick the answer that floats your boat!" },
  { name: "Esther", icon: "👑", line: "The choices have arrived. Choose with courage!" },
  { name: "David", icon: "🎵", line: "Tune up your thumbs and choose the funniest one!" },
  { name: "Miriam", icon: "🥁", line: "Drumroll, please—your votes decide this one!" },
  { name: "Daniel", icon: "🦁", line: "Be brave. The funniest answers are waiting!" },
  { name: "Ruth", icon: "🌾", line: "Gather up the giggles and choose your favorite!" },
  { name: "Deborah", icon: "🌴", line: "The answers are ready. Let wisdom—and laughter—win!" },
  { name: "Peter", icon: "🐟", line: "Cast your vote for the catch of the round!" },
];

const FINAL_LASH_PROMPTS = [
  "WORD LASH: Write a funny sentence containing the word 'manna'.",
  "WORD LASH: Write a funny sentence containing the word 'camel'.",
  "WORD LASH: Write a funny sentence containing the word 'hallelujah'.",
  "WORD LASH: Write a funny sentence containing the word 'shepherd'.",
  "WORD LASH: Write a funny sentence containing the word 'potluck'.",
  "ACRO LASH: What could A.R.K. stand for?",
  "ACRO LASH: What could B.I.B.L.E. stand for?",
  "ACRO LASH: What could P.R.A.Y. stand for?",
  "ACRO LASH: What could C.H.O.I.R. stand for?",
  "ACRO LASH: What could F.I.S.H. stand for?",
  "COMIC LASH: Noah looks over the side of the ark and says: ____.",
  "COMIC LASH: David reaches into his bag and says to Goliath: ____.",
  "COMIC LASH: Jonah wakes up inside the fish and announces: ____.",
  "COMIC LASH: Moses sees the long wilderness road and says: ____.",
  "COMIC LASH: Daniel enters the lions' den and whispers: ____."
];

const SAFETY_QUIPS = ["I was counting the camels.", "Ask me after the potluck.", "Manna made me do it.", "A very confused sheep.", "Insert joyful noise here.", "My answer is still wandering in the wilderness."];

const COLORS = ["#ff6b5e", "#f3b43f", "#55c7a6", "#6f86ff", "#d36bec", "#ff8d4d"];
const BIBLE_BADGES = ["🛶", "🐑", "🐟", "🕊️", "🌈", "⭐", "🪨", "🏺"];
const GAME_VERSION = "2026.08.13.14";
const clean = (value: string, max = 80) => value.replace(/[<>]/g, "").trim().slice(0, max);
const makeRoom = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const peerId = (room: string) => `amen-party-${room.toLowerCase()}`;

function normalizeState(raw: any): GameState {
  const players: Player[] = Array.isArray(raw?.players) ? raw.players : [];
  const prompts: string[] = Array.isArray(raw?.prompts) ? raw.prompts.filter(Boolean) : [];
  const questionCount: 1 | 2 = raw?.questionCount === 1 ? 1 : 2;
  const fallbackIndexes = prompts.map((_, index) => index).slice(0, questionCount);
  return {
    phase: raw?.phase || "home", room: raw?.room || "", players, round: Number(raw?.round) || 0,
    prompts, promptHistory: Array.isArray(raw?.promptHistory) ? raw.promptHistory.slice(-25) : prompts.slice(-25),
    matchups: Array.isArray(raw?.matchups) ? raw.matchups : prompts.map((prompt, index) => ({ id: `legacy-${index}`, prompt, playerIds: players.map(p => p.id) })),
    assignments: raw?.assignments && typeof raw.assignments === "object" ? raw.assignments : Object.fromEntries(players.map(p => [p.id, fallbackIndexes])),
    questionCount, activeQuestion: Number(raw?.activeQuestion) || 0,
    answers: Array.isArray(raw?.answers) ? raw.answers : [], votes: raw?.votes && typeof raw.votes === "object" ? raw.votes : {}, lastPoints: raw?.lastPoints && typeof raw.lastPoints === "object" ? raw.lastPoints : {}, deadline: raw?.deadline,
  };
}

function loadPeer(): Promise<void> {
  if (typeof window !== "undefined" && window.Peer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-peerjs]');
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js";
    script.dataset.peerjs = "true";
    script.onload = () => resolve(); script.onerror = () => reject(new Error("Could not load multiplayer service"));
    document.head.appendChild(script);
  });
}

export default function Home() {
  const [mode, setMode] = useState<"host" | "player" | null>(null);
  const [screen, setScreen] = useState<"landing" | "join">("landing");
  const [roomInput, setRoomInput] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [answers, setAnswers] = useState(["", ""]);
  const [submitted, setSubmitted] = useState(false);
  const [voted, setVoted] = useState(false);
  const [state, setState] = useState<GameState>({ phase: "home", room: "", players: [], round: 0, prompts: [], promptHistory: [], matchups: [], assignments: {}, questionCount: 2, activeQuestion: 0, answers: [], votes: {}, lastPoints: {} });
  const peerRef = useRef<PeerInstance | null>(null);
  const connections = useRef<Map<string, PeerConnection>>(new Map());
  const stateRef = useRef(state);
  const playerId = useRef(crypto.randomUUID());
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { if (state.phase === "prompt") { setAnswers(["", ""]); setSubmitted(false); setStatus(""); } }, [state.phase, state.round]);
  useEffect(() => {
    if (mode !== "host" || state.phase !== "countdown" || !state.deadline) return;
    const timer = window.setTimeout(() => broadcast({ ...stateRef.current, phase: "prompt", deadline: Date.now() + (stateRef.current.round === 3 ? 45000 : 60000) }), Math.max(0, state.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [mode, state.phase, state.deadline]);
  useEffect(() => {
    if (mode !== "host" || state.phase !== "prompt" || !state.deadline) return;
    const timer = window.setTimeout(() => beginVote(stateRef.current), Math.max(0, state.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [mode, state.phase, state.deadline]);
  useEffect(() => {
    if (mode !== "host" || state.phase !== "vote-intro" || !state.deadline) return;
    const timer = window.setTimeout(() => broadcast({ ...stateRef.current, phase: "vote", deadline: Date.now() + 20000 }), Math.max(0, state.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [mode, state.phase, state.deadline]);
  useEffect(() => {
    if (mode !== "host" || state.phase !== "vote" || !state.deadline) return;
    const timer = window.setTimeout(() => reveal(stateRef.current), Math.max(0, state.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [mode, state.phase, state.deadline]);
  useEffect(() => {
    if (mode !== "host" || state.phase !== "reveal" || !state.deadline) return;
    const timer = window.setTimeout(() => nextRound(), Math.max(0, state.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [mode, state.phase, state.deadline]);
  useEffect(() => {
    if (mode !== "host" || state.phase !== "scores" || !state.deadline) return;
    const timer = window.setTimeout(() => continueAfterScores(), Math.max(0, state.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [mode, state.phase, state.deadline]);
  useEffect(() => () => peerRef.current?.destroy(), []);

  const broadcast = (next: GameState) => {
    stateRef.current = next;
    setState(next);
    connections.current.forEach(c => c.open && c.send({ type: "state", state: next }));
  };

  async function hostGame() {
    setStatus("Opening a room…");
    try {
      await loadPeer();
      const room = makeRoom();
      const peer = new window.Peer(peerId(room)); peerRef.current = peer;
      peer.on("open", () => {
        setMode("host"); setStatus("");
        const lobby: GameState = { phase: "lobby", room, players: [], round: 0, prompts: [], promptHistory: [], matchups: [], assignments: {}, questionCount: 2, activeQuestion: 0, answers: [], votes: {}, lastPoints: {} };
        stateRef.current = lobby;
        setState(lobby);
      });
      peer.on("connection", (conn: PeerConnection) => {
        conn.on("open", () => conn.send({ type: "state", state: stateRef.current }));
        conn.on("data", (raw: any) => handleHostMessage(conn, raw));
        conn.on("close", () => connections.current.forEach((saved, key) => { if (saved === conn) connections.current.delete(key); }));
      });
      peer.on("error", () => setStatus("That room could not open. Please try again."));
    } catch { setStatus("Multiplayer could not start. Check your connection and try again."); }
  }

  function handleHostMessage(conn: PeerConnection, msg: any) {
    const current = stateRef.current;
    if (msg.type === "join") {
      const playerName = clean(msg.name, 18);
      if (!playerName) return;
      const exists = current.players.some(p => p.id === msg.playerId);
      if (!exists && current.players.length >= 10) { conn.send({ type: "join-error", message: "This room already has 10 players." }); return; }
      const next = { ...current, players: exists ? current.players : [...current.players, { id: msg.playerId, name: playerName, score: 0 }] };
      connections.current.set(msg.playerId, conn); broadcast(next); return;
    }
    if (msg.type === "answer" && current.phase === "prompt" && !current.answers.some(a => a.playerId === msg.playerId)) {
      const p = current.players.find(x => x.id === msg.playerId); if (!p) return;
      const assigned = current.assignments[p.id] || [];
      const texts = (Array.isArray(msg.texts) ? msg.texts : []).slice(0, assigned.length).map((text: unknown) => clean(String(text || ""), 100)).filter(Boolean);
      if (!assigned.length || texts.length !== assigned.length) { conn.send({ type: "answer-error", message: `Please answer ${assigned.length === 1 ? "the question" : "both questions"}.` }); return; }
      const received = texts.map((text: string, index: number) => ({ id: `${p.id}-${current.round}-${assigned[index]}`, playerId: p.id, name: p.name, text, question: assigned[index] }));
      const next = { ...current, answers: [...current.answers, ...received] };
      broadcast(next);
      conn.send({ type: "answer-accepted", round: current.round });
      const assignedPlayers = next.players.filter(player => next.assignments[player.id]?.length).length;
      if (new Set(next.answers.map(a => a.playerId)).size === assignedPlayers && assignedPlayers > 1) setTimeout(() => beginVote(next), 500);
      return;
    }
    const matchup = current.matchups[current.activeQuestion];
    const chosenAnswer = current.answers.find(a => a.id === msg.choice && a.question === current.activeQuestion);
    if (msg.type === "vote" && current.phase === "vote" && chosenAnswer) {
      if (current.round === 3) {
        const finalists = current.players.filter(p => current.assignments[p.id]?.length);
        if (!current.assignments[msg.playerId]?.length) return;
        const medalCount = finalists.length <= 4 ? 2 : 3;
        const rank = Number(msg.rank);
        const voterPrefix = `${msg.playerId}:${current.round}:${current.activeQuestion}:`;
        if (!Number.isInteger(rank) || rank < 0 || rank >= medalCount || chosenAnswer.playerId === msg.playerId) return;
        if (Object.entries(current.votes).some(([key, answer]) => key.startsWith(voterPrefix) && answer === msg.choice)) return;
        const key = `${voterPrefix}${rank}`;
        if (current.votes[key]) return;
        const next = { ...current, votes: { ...current.votes, [key]: msg.choice } }; broadcast(next);
        const expected = finalists.length * medalCount;
        if (Object.keys(next.votes).length >= expected) setTimeout(() => reveal(next), 350);
        return;
      }
      const outsideVoters = current.players.filter(p => !matchup?.playerIds.includes(p.id));
      if (matchup?.playerIds.includes(msg.playerId)) return;
      const key = `${msg.playerId}:${current.round}:${current.activeQuestion}`;
      if (current.votes[key]) return;
      const next = { ...current, votes: { ...current.votes, [key]: msg.choice } }; broadcast(next);
      if (Object.keys(next.votes).length >= outsideVoters.length) setTimeout(() => reveal(next), 350);
    }
  }

  async function joinGame() {
    const room = clean(roomInput.toUpperCase(), 6); const playerName = clean(name, 18);
    if (room.length !== 6 || !playerName) { setStatus("Enter the 6-letter room code and your name."); return; }
    setStatus("Joining the room…");
    try {
      peerRef.current?.destroy(); connections.current.clear();
      await loadPeer();
      const peer = new window.Peer(); peerRef.current = peer;
      peer.on("open", () => {
        const conn = peer.connect(peerId(room));
        conn.on("open", () => { connections.current.set("host", conn); conn.send({ type: "join", playerId: playerId.current, name: playerName, version: GAME_VERSION }); setMode("player"); setStatus(""); });
        conn.on("data", (msg: any) => {
          if (msg.type === "state") { const safe = normalizeState(msg.state); stateRef.current = safe; setState(safe); setSubmitted(safe.answers.some((a: Answer) => a.playerId === playerId.current)); setVoted(Boolean(safe.votes[`${playerId.current}:${safe.round}:${safe.activeQuestion}`])); setStatus(""); }
          if (msg.type === "answer-accepted") { setSubmitted(true); setStatus(""); }
          if (msg.type === "answer-error") { setSubmitted(false); setStatus(msg.message); }
          if (msg.type === "join-error") { setMode(null); setScreen("join"); setStatus(msg.message); }
        });
        conn.on("close", () => setStatus("The host ended the room."));
        setTimeout(() => { if (!conn.open) setStatus("Room not found. Check the code and try again."); }, 7000);
      });
      peer.on("error", () => { if (peerRef.current !== peer) return; setMode(null); setScreen("join"); setStatus("Room not found. Check the code and try again."); peer.destroy(); });
    } catch { setStatus("Could not connect. Check your internet and try again."); }
  }

  function startRound(source = stateRef.current) {
    if (source.players.length < 3) { setStatus("Invite at least 3 players to start."); return; }
    setStatus("");
    const nextRoundNumber = source.round + 1;
    if (nextRoundNumber === 3) {
      const prompt = FINAL_LASH_PROMPTS[Math.floor(Math.random() * FINAL_LASH_PROMPTS.length)];
      const assignments = Object.fromEntries(source.players.map(p => [p.id, [0]]));
      const matchups = [{ id: "final-lash", prompt, playerIds: source.players.map(p => p.id) }];
      broadcast({ ...source, phase: "countdown", round: 3, prompts: [prompt], promptHistory: [...source.promptHistory, prompt].slice(-25), matchups, assignments, questionCount: 1, activeQuestion: 0, answers: [], votes: {}, lastPoints: {}, announcer: undefined, deadline: Date.now() + 10000 });
      return;
    }
    const questionCount: 1 | 2 = 2;
    const shuffled = [...source.players];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const matchups: Matchup[] = [];
    const recent = new Set((source.promptHistory || []).slice(-25));
    const roundPrompts = new Set<string>();
    const assignments: Record<string, number[]> = Object.fromEntries(source.players.map(p => [p.id, []]));
    shuffled.forEach((player, index) => {
      const opponent = shuffled[(index + 1) % shuffled.length];
      const available = PROMPT_LIBRARY.filter(prompt => !recent.has(prompt) && !roundPrompts.has(prompt));
      const prompt = available[Math.floor(Math.random() * available.length)];
      roundPrompts.add(prompt);
      matchups.push({ id: `${source.round + 1}-${index}`, prompt, playerIds: [player.id, opponent.id] });
      assignments[player.id].push(index);
      assignments[opponent.id].push(index);
    });
    const prompts = matchups.map(m => m.prompt);
    broadcast({ ...source, phase: "countdown", round: nextRoundNumber, prompts, promptHistory: [...(source.promptHistory || []), ...prompts].slice(-25), matchups, assignments, questionCount, activeQuestion: 0, answers: [], votes: {}, lastPoints: {}, announcer: undefined, deadline: Date.now() + 10000 });
  }
  function beginVote(source = stateRef.current) {
    if (source.phase !== "prompt") return;
    const answers = [...source.answers];
    source.matchups.forEach((matchup, question) => matchup.playerIds.forEach((id, index) => {
      if (!answers.some(a => a.playerId === id && a.question === question)) {
        const player = source.players.find(p => p.id === id);
        if (player) answers.push({ id: `${id}-${source.round}-${question}-safety`, playerId: id, name: player.name, text: SAFETY_QUIPS[(question + index + source.round) % SAFETY_QUIPS.length], question });
      }
    }));
    const announcer = BIBLE_ANNOUNCERS[Math.floor(Math.random() * BIBLE_ANNOUNCERS.length)];
    broadcast({ ...source, answers, phase: "vote-intro", activeQuestion: 0, votes: {}, lastPoints: {}, announcer, deadline: Date.now() + 4000 });
  }
  function reveal(source = stateRef.current) {
    const lastPoints: Record<string, number> = {};
    if (source.round === 3) {
      const finalistCount = source.players.filter(p => source.assignments[p.id]?.length).length;
      const weights = finalistCount <= 4 ? [1000, 500] : [1000, 750, 500];
      Object.entries(source.votes).forEach(([key, answerId]) => { const rank = Number(key.split(":").pop()); lastPoints[answerId] = (lastPoints[answerId] || 0) + (weights[rank] || 0); });
    } else {
      const counts: Record<string, number> = {}; Object.values(source.votes).forEach(id => counts[id] = (counts[id] || 0) + 1);
      const contenders = source.answers.filter(a => a.question === source.activeQuestion);
      const totalVotes = contenders.reduce((sum, a) => sum + (counts[a.id] || 0), 0);
      const topVotes = Math.max(0, ...contenders.map(a => counts[a.id] || 0));
      const multiplier = source.round === 2 ? 2 : 1;
      contenders.forEach(a => {
        const votePoints = totalVotes ? Math.round((counts[a.id] || 0) / totalVotes * 1000) * multiplier : 0;
        const won = topVotes > 0 && (counts[a.id] || 0) === topVotes;
        const unanimous = totalVotes > 0 && (counts[a.id] || 0) === totalVotes;
        lastPoints[a.id] = votePoints + (won ? (unanimous ? 250 : 100) * multiplier : 0);
      });
    }
    const players = source.players.map(p => ({ ...p, score: p.score + source.answers.filter(a => a.playerId === p.id && a.question === source.activeQuestion).reduce((sum, a) => sum + (lastPoints[a.id] || 0), 0) }));
    broadcast({ ...source, phase: "reveal", players, lastPoints, deadline: Date.now() + (source.round === 3 ? 7000 : 5000) });
  }
  function nextRound() {
    const current = stateRef.current;
    if (current.activeQuestion < current.matchups.length - 1) { broadcast({ ...current, phase: "vote", activeQuestion: current.activeQuestion + 1, votes: {}, deadline: Date.now() + 20000 }); return; }
    broadcast({ ...current, phase: "scores", deadline: Date.now() + 7000 });
  }
  function continueAfterScores() {
    const current = stateRef.current;
    current.round >= 3 ? broadcast({ ...current, phase: "final" }) : startRound(current);
  }
  function submitAnswer() { const conn = connections.current.get("host"); const count = state.assignments[playerId.current]?.length || 0; const required = answers.slice(0, count); if (!conn?.open || !count || required.some(a => !a.trim())) { setStatus(`Please answer ${count === 1 ? "the question" : "both questions"}.`); return; } setStatus("Sending answers…"); conn.send({ type: "answer", playerId: playerId.current, texts: required }); }
  function submitVote(choice: string, rank?: number) { const conn = connections.current.get("host"); if (!conn?.open || (voted && state.round !== 3)) return; conn.send({ type: "vote", playerId: playerId.current, choice, rank }); if (state.round !== 3) setVoted(true); }

  const sortedPlayers = [...state.players].sort((a,b) => b.score - a.score);
  if (mode === "host") return <HostView state={state} players={sortedPlayers} status={status} onStart={() => startRound()} onVote={beginVote} onNext={nextRound} onContinue={continueAfterScores} />;
  if (mode === "player") return <PlayerView state={state} me={playerId.current} answers={answers} setAnswers={setAnswers} submitted={submitted} voted={voted} onAnswer={submitAnswer} onVote={submitVote} status={status} />;

  return <main className="landing">
    <nav><div className="brand"><span className="spark">✦</span> GOOD WORD</div><div className="tag">A party game for good people</div></nav>
    <section className="hero">
      <div className="eyebrow">CHURCH NIGHT JUST GOT FUNNIER</div>
      <h1>Say something<br/><em>worth repeating.</em></h1>
      <p className="lede">A hilarious, wholesome battle of wit for youth groups, small groups, and anyone who knows the potluck is the real main event.</p>
      {screen === "landing" ? <div className="actions"><button className="primary" onClick={hostGame}>HOST A GAME <span>→</span></button><button className="secondary" onClick={() => setScreen("join")}>JOIN A ROOM</button></div> :
      <div className="joinCard"><label>ROOM CODE<input autoFocus value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,6))} placeholder="ABC123" /></label><label>YOUR NAME<input value={name} onChange={e => setName(e.target.value.slice(0,18))} placeholder="Esther" onKeyDown={e => e.key === "Enter" && joinGame()} /></label><button className="primary" onClick={joinGame}>LET’S GO <span>→</span></button><button className="back" onClick={() => setScreen("landing")}>← Back</button></div>}
      {status && <p className="status" role="alert">{status}</p>}
    </section>
    <div className="promptCard"><span>TONIGHT’S PROMPT</span><p>“The disciples’ group chat was definitely called…”</p><div className="fakeAnswer">Bread &amp; Besties <b>+300</b></div></div>
    <footer><span>3 rounds · 3–10 players · all ages</span><span>Made for laughs, built with grace.</span></footer>
  </main>;
}

function HostView({ state, players, status, onStart, onVote, onNext, onContinue }: { state: GameState; players: Player[]; status: string; onStart: () => void; onVote: () => void; onNext: () => void; onContinue: () => void }) {
  const activeMatchup = state.matchups[state.activeQuestion];
  const outsideVoters = state.players.filter(p => !activeMatchup?.playerIds.includes(p.id));
  const finalistCount = state.players.filter(p => state.assignments[p.id]?.length).length;
  const expectedVotes = state.round === 3 ? finalistCount * (finalistCount <= 4 ? 2 : 3) : outsideVoters.length;
  return <main className="game host"><header className="gameHeader"><div className="brand"><span className="spark">✦</span> GOOD WORD</div><div className="roomPill">JOIN AT THIS SITE · CODE <b>{state.room}</b></div></header>
    {state.phase === "lobby" && <section className="center"><div className="eyebrow">THE FLOCK IS GATHERING</div><h2>Room <em>{state.room}</em></h2><p>Players join with the room code and their name.</p><div className="playerGrid">{players.map((p,i) => <div className="playerChip" key={p.id} style={{"--chip":COLORS[i%COLORS.length]} as React.CSSProperties}><i>{BIBLE_BADGES[i%BIBLE_BADGES.length]}</i>{p.name}</div>)}{players.length === 0 && <div className="waiting">Waiting for the first player…</div>}</div><button className="primary" onClick={onStart}>START GAME <span>→</span></button>{status && <p className="status">{status}</p>}</section>}
    {state.phase === "countdown" && <section className="center bubblyTransition"><div className="bubble b1"/><div className="bubble b2"/><div className="bubble b3"/><div className="eyebrow">ROUND {state.round} IS BUBBLING UP</div><h2>Get ready!</h2><Countdown deadline={state.deadline} /></section>}
    {state.phase === "prompt" && <section className="center round"><div className="eyebrow">{state.round === 3 ? "THE FINAL BLESSING · EVERYONE ANSWERS · 45 SECONDS" : `ROUND ${state.round} OF 3 · TWO QUESTIONS · 60 SECONDS`}</div><Countdown deadline={state.deadline} /><div className="assignmentSplash"><b>{state.round === 3 ? "ALL" : state.matchups.length}</b><span>{state.round === 3 ? "PLAYERS · ONE SHARED CHALLENGE" : "HEAD-TO-HEAD MATCHUPS"}</span><p>{state.round === 3 ? "Every answer will compete in the medal vote." : "Each prompt is shared only with its two contestants."}</p></div><p>{new Set(state.answers.map(a => a.playerId)).size} of {state.players.filter(p => state.assignments[p.id]?.length).length} players answered</p><div className="progress"><i style={{width:`${state.players.length ? new Set(state.answers.map(a => a.playerId)).size/state.players.length*100 : 0}%`}} /></div><button className="secondary light" disabled={new Set(state.answers.map(a => a.playerId)).size < 2} onClick={() => onVote()}>START VOTING</button></section>}
    {state.phase === "vote" && <section className="center round voteStage"><div className="eyebrow">{state.round === 3 ? "THE FINAL BLESSING · AWARD YOUR MEDALS" : `MATCHUP ${state.activeQuestion + 1} OF ${state.matchups.length} · 20 SECONDS TO VOTE`}</div><div className="voteTimer"><Countdown deadline={state.deadline} /></div><h2>{state.prompts[state.activeQuestion]}</h2><div className={`answerGrid ${state.round === 3 ? "finalAnswers" : ""}`}>{state.answers.filter(a=>a.question===state.activeQuestion).map(a => <div className="answerCard bounceIn" key={a.id}>{a.text}</div>)}</div><p>{Object.keys(state.votes).length} of {expectedVotes} {state.round === 3 ? "medals" : "eligible votes"} are in</p><div className="autoReveal">RESULTS REVEAL AUTOMATICALLY</div></section>}
    {state.phase === "reveal" && <section className="center round revealStage"><Confetti /><div className="winnerBurst">{state.round === 3 ? "FINAL BLESSINGS!" : isUnanimous(state) ? "PERFECT PRAISE!" : "HOLY MOLY!"}</div><div className="eyebrow">{state.round === 3 ? "THE MEDALS ARE IN" : `MATCHUP ${state.activeQuestion + 1} OF ${state.matchups.length} · THE GOOD WORD GOES TO…`}</div><h2>{state.prompts[state.activeQuestion]}</h2><div className={`answerGrid ${state.round === 3 ? "finalAnswers" : ""}`}>{[...state.answers].filter(a=>a.question===state.activeQuestion).sort((a,b) => (state.lastPoints[b.id] || 0)-(state.lastPoints[a.id] || 0)).map((a,i) => <div className={`answerCard result ${i===0 ? "winner" : ""}`} key={a.id}><p>{a.text}</p><span>{BIBLE_BADGES[state.players.findIndex(p=>p.id===a.playerId)%BIBLE_BADGES.length]} {a.name}</span>{state.round < 3 && <small>{votePercent(state,a.id)}% of the vote</small>}<b>+<AnimatedNumber value={state.lastPoints[a.id] || 0} /> pts</b></div>)}</div><div className="autoReveal">{state.activeQuestion < state.matchups.length - 1 ? "NEXT MATCHUP IS COMING UP…" : "ROUND SCORES ARE COMING UP…"}</div></section>}
    {state.phase === "scores" && <section className="center standings"><div className="eyebrow">ROUND {state.round} OF 3 COMPLETE</div><h2>Here’s where<br/><em>everybody stands.</em></h2><div className="leaderboard animatedBoard">{players.map((p,i) => <div key={p.id} style={{animationDelay:`${i*.12}s`}}><span>{BIBLE_BADGES[state.players.findIndex(x=>x.id===p.id)%BIBLE_BADGES.length]} {i+1}</span><b>{p.name}</b><strong><AnimatedNumber value={p.score} delay={i*120} /></strong></div>)}</div><div className="autoReveal">{state.round >= 3 ? "GRAND WINNER COMING UP…" : `ROUND ${state.round+1} IS COMING UP…`}</div></section>}
    {state.phase === "final" && <section className="center finalWinner"><Confetti /><div className="crown">♛</div><div className="eyebrow">THE GRAND WINNER</div><h2><em>{players[0]?.name || "Everybody"}</em></h2><p>{players[0]?.score || 0} glorious points</p><div className="leaderboard">{players.map((p,i) => <div key={p.id}><span>{i+1}</span><b>{p.name}</b><strong>{p.score}</strong></div>)}</div><button className="primary" onClick={() => location.reload()}>PLAY AGAIN <span>↻</span></button></section>}
    {state.phase === "vote-intro" && <VoteIntro announcer={state.announcer} />}
  </main>;
}

function PlayerView({ state, me, answers, setAnswers, submitted, voted, onAnswer, onVote, status }: { state: GameState; me: string; answers: string[]; setAnswers: (s:string[])=>void; submitted:boolean; voted:boolean; onAnswer:()=>void; onVote:(id:string,rank?:number)=>void; status:string }) {
  const myName = state.players.find(p => p.id === me)?.name || "Player";
  const assigned = state.assignments?.[me] || [];
  const activeMatchup = state.matchups?.[state.activeQuestion];
  const hasOutsideVoters = state.players.some(p => !activeMatchup?.playerIds.includes(p.id));
  const sittingOut = hasOutsideVoters && activeMatchup?.playerIds.includes(me);
  return <main className="phone"><header><div className="brand"><span className="spark">✦</span> GOOD WORD</div><span>{myName}</span></header>
    {state.phase === "lobby" && <section><div className="bigIcon">✓</div><h2>You’re in!</h2><p>Look up at the host screen. The game will begin soon.</p><div className="miniPlayers">{state.players.map((p,i) => <span key={p.id}>{BIBLE_BADGES[i%BIBLE_BADGES.length]} {p.name}</span>)}</div></section>}
    {state.phase === "countdown" && <section className="bubblyTransition"><div className="bubble b1"/><div className="bubble b2"/><div className="bubble b3"/><div className="eyebrow">ROUND {state.round}</div><h2>Get ready!</h2><Countdown deadline={state.deadline} /></section>}
    {state.phase === "prompt" && <section><div className="eyebrow">ROUND {state.round} · {assigned.length === 1 ? "ONE QUESTION" : assigned.length === 2 ? "ANSWER BOTH" : "JOINED MID-ROUND"}</div><Countdown deadline={state.deadline} />{!assigned.length ? <><div className="bigIcon">👀</div><h3>You’re in!</h3><p>Vote this round. Your questions begin next round.</p></> : submitted ? <><div className="bigIcon">✦</div><h3>{assigned.length === 1 ? "Answer sent!" : "Both answers sent!"}</h3><p>Now prepare to defend your comedy honor.</p></> : <>{assigned.map((matchupIndex,i)=><div className="phonePrompt" key={matchupIndex}><span>YOUR QUESTION {i+1}</span><h3>{state.matchups[matchupIndex]?.prompt}</h3><textarea autoFocus={i===0} maxLength={100} value={answers[i]} onChange={e => { const next=[...answers]; next[i]=e.target.value; setAnswers(next); }} placeholder="Type something funny…"/><div className="count">{answers[i].length}/100</div></div>)}<button className="primary" disabled={answers.slice(0,assigned.length).some(a=>!a.trim())} onClick={onAnswer}>SEND {assigned.length === 1 ? "ANSWER" : "BOTH"} <span>→</span></button></>}</section>}
    {state.phase === "vote" && state.round === 3 && <FinalMedalVote state={state} me={me} onVote={onVote} />}
    {state.phase === "vote" && state.round !== 3 && <section className="phoneVote"><div className="voteNow">{sittingOut ? "YOUR MATCHUP!" : "VOTE NOW!"}</div><div className="eyebrow">MATCHUP {state.activeQuestion + 1} OF {state.matchups.length} · 20 SECONDS</div><div className="voteTimer"><Countdown deadline={state.deadline} /></div><h2>{state.prompts[state.activeQuestion]}</h2>{sittingOut ? <><div className="bigIcon">⚔</div><h3>You’re in this matchup</h3><p>Sit this vote out and watch the host screen.</p></> : voted ? <><div className="bigIcon">✓</div><h3>Vote locked!</h3><p>Watch the host screen for the winner.</p></> : <div className="voteList">{state.answers.filter(a=>a.question===state.activeQuestion).map(a => <button key={a.id} onClick={()=>onVote(a.id)}>{a.text}</button>)}</div>}</section>}
    {(state.phase === "reveal" || state.phase === "scores" || state.phase === "final") && <section><div className="bigIcon">✦</div><h2>{state.phase === "final" ? "Amen to that!" : state.phase === "scores" ? "Score check!" : "Results are in"}</h2><p>Look up at the host screen.</p><div className="myScore">YOUR SCORE <b>{state.players.find(p=>p.id===me)?.score || 0}</b></div></section>}
    {status && <p className="status">{status}</p>}
    {state.phase === "vote-intro" && <VoteIntro announcer={state.announcer} compact />}
  </main>;
}

function VoteIntro({ announcer, compact = false }: { announcer?: Announcer; compact?: boolean }) {
  const character = announcer || BIBLE_ANNOUNCERS[0];
  return <section className={`center voteIntro ${compact ? "compact" : ""}`}>
    <div className="voteBubble vb1"/><div className="voteBubble vb2"/><div className="voteStar">★</div>
    <div className="announcerCharacter" aria-label={`${character.name} announces voting`}><div className="characterHalo"/><div className="characterFace">{character.icon}</div><b>{character.name}</b></div>
    <div className="speechBubble"><span>IT'S TIME TO</span><h2>VOTE!</h2><p>{character.line}</p></div>
  </section>;
}

function FinalMedalVote({ state, me, onVote }: { state: GameState; me: string; onVote: (id: string, rank?: number) => void }) {
  const finalistCount = state.players.filter(p => state.assignments[p.id]?.length).length;
  const medalNames = finalistCount <= 4 ? ["🥇 GOLD", "🥈 SILVER"] : ["🥇 GOLD", "🥈 SILVER", "🥉 BRONZE"];
  const prefix = `${me}:${state.round}:${state.activeQuestion}:`;
  const myVotes = Object.entries(state.votes).filter(([key]) => key.startsWith(prefix));
  const rank = myVotes.length;
  const picked = new Set(myVotes.map(([,answer]) => answer));
  const choices = state.answers.filter(a => a.question === state.activeQuestion && a.playerId !== me && !picked.has(a.id));
  if (!state.assignments[me]?.length) return <section><div className="bigIcon">👀</div><h2>Final round in progress</h2><p>You joined after it began. Watch the host screen for the winner.</p></section>;
  return <section className="phoneVote finalMedalVote"><div className="voteNow">FINAL BLESSING!</div><div className="eyebrow">20 SECONDS · AWARD YOUR MEDALS</div><div className="voteTimer"><Countdown deadline={state.deadline} /></div><h2>{state.prompts[0]}</h2>{rank >= medalNames.length ? <><div className="bigIcon">✓</div><h3>Medals locked!</h3><p>Look up for the grand reveal.</p></> : <><div className="medalPrompt">Choose your {medalNames[rank]}</div><div className="voteList medalList">{choices.map(a => <button key={a.id} onClick={() => onVote(a.id, rank)}>{a.text}</button>)}</div></>}</section>;
}

function votePercent(state: GameState, answerId: string) {
  const answers = state.answers.filter(a => a.question === state.activeQuestion);
  const total = Object.values(state.votes).filter(id => answers.some(a => a.id === id)).length;
  return total ? Math.round(Object.values(state.votes).filter(id => id === answerId).length / total * 100) : 0;
}

function isUnanimous(state: GameState) {
  if (state.round === 3) return false;
  const answers = state.answers.filter(a => a.question === state.activeQuestion);
  const total = Object.values(state.votes).filter(id => answers.some(a => a.id === id)).length;
  return total > 0 && answers.some(a => Object.values(state.votes).filter(id => id === a.id).length === total);
}

function Countdown({ deadline }: { deadline?: number }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil(((deadline || Date.now()) - Date.now()) / 1000)));
  useEffect(() => { const tick = () => setSeconds(Math.max(0, Math.ceil(((deadline || Date.now()) - Date.now()) / 1000))); tick(); const timer = window.setInterval(tick, 250); return () => window.clearInterval(timer); }, [deadline]);
  return <div className={`timer ${seconds <= 5 ? "urgent" : ""}`} aria-live="polite">{seconds}</div>;
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    let frame = 0;
    const startTimer = window.setTimeout(() => {
      const started = performance.now();
      const run = (now: number) => {
        const progress = Math.min(1, (now - started) / 900);
        setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(run);
      };
      frame = requestAnimationFrame(run);
    }, delay);
    return () => { window.clearTimeout(startTimer); cancelAnimationFrame(frame); };
  }, [value, delay]);
  return <span className="rollingPoints">{shown.toLocaleString()}</span>;
}

function Confetti() {
  return <div className="confetti" aria-hidden="true">{Array.from({length:28},(_,i)=><i key={i} style={{"--x":`${(i*37)%100}%`,"--delay":`${(i%7)*.08}s`,"--color":COLORS[i%COLORS.length]} as React.CSSProperties} />)}</div>;
}
