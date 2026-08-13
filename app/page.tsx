"use client";

import { useEffect, useRef, useState } from "react";

type Player = { id: string; name: string; score: number };
type Answer = { id: string; playerId: string; name: string; text: string; question: 0 | 1 };
type Phase = "home" | "lobby" | "prompt" | "vote" | "reveal" | "scores" | "final";
type GameState = { phase: Phase; room: string; players: Player[]; round: number; prompts: string[]; questionCount: 1 | 2; activeQuestion: 0 | 1; answers: Answer[]; votes: Record<string, string>; deadline?: number };
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

const COLORS = ["#ff6b5e", "#f3b43f", "#55c7a6", "#6f86ff", "#d36bec", "#ff8d4d"];
const BIBLE_BADGES = ["🛶", "🐑", "🐟", "🕊️", "🌈", "⭐", "🪨", "🏺"];
const GAME_VERSION = "2026.08.12.8";
const clean = (value: string, max = 80) => value.replace(/[<>]/g, "").trim().slice(0, max);
const makeRoom = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const peerId = (room: string) => `amen-party-${room.toLowerCase()}`;

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
  const [state, setState] = useState<GameState>({ phase: "home", room: "", players: [], round: 0, prompts: [], questionCount: 2, activeQuestion: 0, answers: [], votes: {} });
  const peerRef = useRef<PeerInstance | null>(null);
  const connections = useRef<Map<string, PeerConnection>>(new Map());
  const stateRef = useRef(state);
  const playerId = useRef(crypto.randomUUID());
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { if (state.phase === "prompt") { setAnswers(["", ""]); setSubmitted(false); setStatus(""); } }, [state.round]);
  useEffect(() => {
    if (mode !== "host" || state.phase !== "prompt" || !state.deadline) return;
    const timer = window.setTimeout(() => beginVote(stateRef.current), Math.max(0, state.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [mode, state.phase, state.deadline]);
  useEffect(() => {
    if (mode !== "host" || state.phase !== "vote" || !state.deadline) return;
    const timer = window.setTimeout(() => reveal(stateRef.current), Math.max(0, state.deadline - Date.now()));
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
        const lobby: GameState = { phase: "lobby", room, players: [], round: 0, prompts: [], questionCount: 2, activeQuestion: 0, answers: [], votes: {} };
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
      const next = { ...current, players: exists ? current.players : [...current.players, { id: msg.playerId, name: playerName, score: 0 }] };
      connections.current.set(msg.playerId, conn); broadcast(next); return;
    }
    if (msg.type === "answer" && current.phase === "prompt" && !current.answers.some(a => a.playerId === msg.playerId)) {
      const p = current.players.find(x => x.id === msg.playerId); if (!p) return;
      const texts = (Array.isArray(msg.texts) ? msg.texts : []).slice(0, current.questionCount).map((text: unknown) => clean(String(text || ""), 100)).filter(Boolean);
      if (texts.length !== current.questionCount) { conn.send({ type: "answer-error", message: `Please answer ${current.questionCount === 1 ? "the question" : "both questions"}.` }); return; }
      const received = texts.map((text: string, index: number) => ({ id: `${p.id}-${current.round}-${index}`, playerId: p.id, name: p.name, text, question: index as 0 | 1 }));
      const next = { ...current, answers: [...current.answers, ...received] };
      broadcast(next);
      conn.send({ type: "answer-accepted", round: current.round });
      if (new Set(next.answers.map(a => a.playerId)).size === next.players.length && next.players.length > 1) setTimeout(() => beginVote(next), 500);
      return;
    }
    const mayVoteForChoice = current.answers.some(a => a.id === msg.choice && a.question === current.activeQuestion && (current.players.length === 2 || a.playerId !== msg.playerId));
    if (msg.type === "vote" && current.phase === "vote" && mayVoteForChoice) {
      const key = `${msg.playerId}:${current.round}:${current.activeQuestion}`;
      if ((current.votes as any)[key]) return;
      const next = { ...current, votes: { ...current.votes, [key]: msg.choice } }; broadcast(next);
      if (Object.keys(next.votes).length >= next.players.length) setTimeout(() => reveal(next), 350);
    }
  }

  async function joinGame() {
    const room = clean(roomInput.toUpperCase(), 6); const playerName = clean(name, 18);
    if (room.length !== 6 || !playerName) { setStatus("Enter the 6-letter room code and your name."); return; }
    setStatus("Joining the room…");
    try {
      await loadPeer();
      const peer = new window.Peer(); peerRef.current = peer;
      peer.on("open", () => {
        const conn = peer.connect(peerId(room));
        conn.on("open", () => { connections.current.set("host", conn); conn.send({ type: "join", playerId: playerId.current, name: playerName, version: GAME_VERSION }); setMode("player"); setStatus(""); });
        conn.on("data", (msg: any) => {
          if (msg.type === "state") { setState(msg.state); setSubmitted(msg.state.answers.some((a: Answer) => a.playerId === playerId.current)); setVoted(Boolean(msg.state.votes[`${playerId.current}:${msg.state.round}:${msg.state.activeQuestion}`])); }
          if (msg.type === "answer-accepted") { setSubmitted(true); setStatus(""); }
          if (msg.type === "answer-error") { setSubmitted(false); setStatus(msg.message); }
        });
        conn.on("close", () => setStatus("The host ended the room."));
        setTimeout(() => { if (!conn.open) setStatus("Room not found. Check the code and try again."); }, 7000);
      });
    } catch { setStatus("Could not connect. Check your internet and try again."); }
  }

  function startRound(source = stateRef.current) {
    if (source.players.length < 2) { setStatus("Invite at least 2 players to start."); return; }
    setStatus("");
    const questionCount: 1 | 2 = Math.random() < 0.45 ? 1 : 2;
    const first = (source.round * 11 + Math.floor(Math.random() * ONE_ANSWER_PROMPTS.length)) % ONE_ANSWER_PROMPTS.length;
    let second = (first + 3 + Math.floor(Math.random() * (ONE_ANSWER_PROMPTS.length - 1))) % ONE_ANSWER_PROMPTS.length;
    if (second === first) second = (second + 1) % ONE_ANSWER_PROMPTS.length;
    const prompts = questionCount === 1 ? [ONE_ANSWER_PROMPTS[first]] : [ONE_ANSWER_PROMPTS[first], ONE_ANSWER_PROMPTS[second]];
    broadcast({ ...source, phase: "prompt", round: source.round + 1, prompts, questionCount, activeQuestion: 0, answers: [], votes: {}, deadline: Date.now() + (questionCount === 1 ? 45000 : 60000) });
  }
  function beginVote(source = stateRef.current) {
    if (source.phase !== "prompt") return;
    if (new Set(source.answers.map(a => a.playerId)).size < 2) { broadcast({ ...source, phase: "scores" }); return; }
    broadcast({ ...source, phase: "vote", activeQuestion: 0, votes: {}, deadline: Date.now() + 45000 });
  }
  function reveal(source = stateRef.current) {
    const counts: Record<string, number> = {}; Object.values(source.votes).forEach(id => counts[id] = (counts[id] || 0) + 1);
    const players = source.players.map(p => { const points = source.answers.filter(a => a.playerId === p.id && a.question === source.activeQuestion).reduce((sum, a) => sum + (counts[a.id] || 0) * 100, 0); return { ...p, score: p.score + points }; });
    broadcast({ ...source, phase: "reveal", players });
  }
  function nextRound() {
    const current = stateRef.current;
    if (current.activeQuestion === 0 && current.questionCount === 2) { broadcast({ ...current, phase: "vote", activeQuestion: 1, votes: {}, deadline: Date.now() + 45000 }); return; }
    broadcast({ ...current, phase: "scores" });
  }
  function continueAfterScores() {
    const current = stateRef.current;
    current.round >= 3 ? broadcast({ ...current, phase: "final" }) : startRound(current);
  }
  function submitAnswer() { const conn = connections.current.get("host"); const required = answers.slice(0, state.questionCount); if (!conn?.open || required.some(a => !a.trim())) { setStatus(`Please answer ${state.questionCount === 1 ? "the question" : "both questions"}.`); return; } setStatus("Sending answers…"); conn.send({ type: "answer", playerId: playerId.current, texts: required }); }
  function submitVote(choice: string) { const conn = connections.current.get("host"); if (!conn?.open || voted) return; conn.send({ type: "vote", playerId: playerId.current, choice }); setVoted(true); }

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
    <footer><span>3 rounds · 2–8 players · all ages</span><span>Made for laughs, built with grace.</span></footer>
  </main>;
}

function HostView({ state, players, status, onStart, onVote, onNext, onContinue }: { state: GameState; players: Player[]; status: string; onStart: () => void; onVote: () => void; onNext: () => void; onContinue: () => void }) {
  return <main className="game host"><header className="gameHeader"><div className="brand"><span className="spark">✦</span> GOOD WORD</div><div className="roomPill">JOIN AT THIS SITE · CODE <b>{state.room}</b></div></header>
    {state.phase === "lobby" && <section className="center"><div className="eyebrow">THE FLOCK IS GATHERING</div><h2>Room <em>{state.room}</em></h2><p>Players join with the room code and their name.</p><div className="playerGrid">{players.map((p,i) => <div className="playerChip" key={p.id} style={{"--chip":COLORS[i%COLORS.length]} as React.CSSProperties}><i>{BIBLE_BADGES[i%BIBLE_BADGES.length]}</i>{p.name}</div>)}{players.length === 0 && <div className="waiting">Waiting for the first player…</div>}</div><button className="primary" onClick={onStart}>START GAME <span>→</span></button>{status && <p className="status">{status}</p>}</section>}
    {state.phase === "prompt" && <section className="center round"><div className="eyebrow">ROUND {state.round} OF 3 · {state.questionCount === 1 ? "ONE QUESTION · 45 SECONDS" : "TWO QUESTIONS · 60 SECONDS"}</div><Countdown deadline={state.deadline} /><div className={`promptPair ${state.questionCount === 1 ? "single" : ""}`}>{state.prompts.map((prompt,i)=><div key={prompt}><span>QUESTION {i+1}</span><h3>{prompt}</h3></div>)}</div><p>{new Set(state.answers.map(a => a.playerId)).size} of {state.players.length} players answered</p><div className="progress"><i style={{width:`${state.players.length ? new Set(state.answers.map(a => a.playerId)).size/state.players.length*100 : 0}%`}} /></div><button className="secondary light" disabled={state.answers.length < 2} onClick={() => onVote()}>START VOTING</button></section>}
    {state.phase === "vote" && <section className="center round voteStage"><div className="eyebrow">QUESTION {state.activeQuestion + 1} · VOTE FOR THE FUNNIEST</div><h2>{state.prompts[state.activeQuestion]}</h2><div className="answerGrid">{state.answers.filter(a=>a.question===state.activeQuestion).map(a => <div className="answerCard bounceIn" key={a.id}>{a.text}</div>)}</div><p>{Object.keys(state.votes).length} of {state.players.length} votes are in</p><div className="autoReveal">WINNER REVEALS AUTOMATICALLY</div></section>}
    {state.phase === "reveal" && <section className="center round revealStage"><Confetti /><div className="winnerBurst">HOLY MOLY!</div><div className="eyebrow">THE GOOD WORD GOES TO…</div><h2>{state.prompts[state.activeQuestion]}</h2>{state.answers.filter(a=>a.question===state.activeQuestion).length < 2 ? <p>Not enough answers for this question.</p> : <div className="answerGrid">{[...state.answers].filter(a=>a.question===state.activeQuestion).sort((a,b) => Object.values(state.votes).filter(x=>x===b.id).length-Object.values(state.votes).filter(x=>x===a.id).length).map((a,i) => <div className={`answerCard result ${i===0 ? "winner" : ""}`} key={a.id}><p>{a.text}</p><span>{BIBLE_BADGES[state.players.findIndex(p=>p.id===a.playerId)%BIBLE_BADGES.length]} {a.name}</span><b>+<AnimatedNumber value={Object.values(state.votes).filter(x=>x===a.id).length * 100} /> pts</b></div>)}</div>}<button className="primary" onClick={onNext}>{state.activeQuestion === 0 && state.questionCount === 2 ? "VOTE ON QUESTION 2" : "SHOW ROUND SCORES"} <span>→</span></button></section>}
    {state.phase === "scores" && <section className="center standings"><div className="eyebrow">ROUND {state.round} OF 3 COMPLETE</div><h2>Here’s where<br/><em>everybody stands.</em></h2><div className="leaderboard animatedBoard">{players.map((p,i) => <div key={p.id} style={{animationDelay:`${i*.12}s`}}><span>{BIBLE_BADGES[state.players.findIndex(x=>x.id===p.id)%BIBLE_BADGES.length]} {i+1}</span><b>{p.name}</b><strong><AnimatedNumber value={p.score} delay={i*120} /></strong></div>)}</div><button className="primary" onClick={onContinue}>{state.round >= 3 ? "GRAND TOTALS" : `START ROUND ${state.round+1}`} <span>→</span></button></section>}
    {state.phase === "final" && <section className="center finalWinner"><Confetti /><div className="crown">♛</div><div className="eyebrow">THE GRAND WINNER</div><h2><em>{players[0]?.name || "Everybody"}</em></h2><p>{players[0]?.score || 0} glorious points</p><div className="leaderboard">{players.map((p,i) => <div key={p.id}><span>{i+1}</span><b>{p.name}</b><strong>{p.score}</strong></div>)}</div><button className="primary" onClick={() => location.reload()}>PLAY AGAIN <span>↻</span></button></section>}
  </main>;
}

function PlayerView({ state, me, answers, setAnswers, submitted, voted, onAnswer, onVote, status }: { state: GameState; me: string; answers: string[]; setAnswers: (s:string[])=>void; submitted:boolean; voted:boolean; onAnswer:()=>void; onVote:(id:string)=>void; status:string }) {
  const myName = state.players.find(p => p.id === me)?.name || "Player";
  return <main className="phone"><header><div className="brand"><span className="spark">✦</span> GOOD WORD</div><span>{myName}</span></header>
    {state.phase === "lobby" && <section><div className="bigIcon">✓</div><h2>You’re in!</h2><p>Look up at the host screen. The game will begin soon.</p><div className="miniPlayers">{state.players.map((p,i) => <span key={p.id}>{BIBLE_BADGES[i%BIBLE_BADGES.length]} {p.name}</span>)}</div></section>}
    {state.phase === "prompt" && <section><div className="eyebrow">ROUND {state.round} · {state.questionCount === 1 ? "ONE QUESTION" : "ANSWER BOTH"}</div><Countdown deadline={state.deadline} />{submitted ? <><div className="bigIcon">✦</div><h3>{state.questionCount === 1 ? "Answer sent!" : "Both answers sent!"}</h3><p>Now prepare to defend your comedy honor.</p></> : <>{state.prompts.map((prompt,i)=><div className="phonePrompt" key={i}><span>QUESTION {i+1}</span><h3>{prompt}</h3><textarea autoFocus={i===0} maxLength={100} value={answers[i]} onChange={e => { const next=[...answers]; next[i]=e.target.value; setAnswers(next); }} placeholder="Type something funny…"/><div className="count">{answers[i].length}/100</div></div>)}<button className="primary" disabled={answers.slice(0,state.questionCount).some(a=>!a.trim())} onClick={onAnswer}>SEND {state.questionCount === 1 ? "ANSWER" : "BOTH"} <span>→</span></button></>}</section>}
    {state.phase === "vote" && <section className="phoneVote"><div className="voteNow">VOTE NOW!</div><div className="eyebrow">QUESTION {state.activeQuestion + 1}</div><h2>{state.prompts[state.activeQuestion]}</h2>{voted ? <><div className="bigIcon">✓</div><h3>Vote locked!</h3><p>Watch the host screen for the winner.</p></> : <div className="voteList">{state.answers.filter(a=>a.question===state.activeQuestion).map(a => { const own = a.playerId===me; const disabled = own && state.players.length > 2; return <button disabled={disabled} className={disabled?"ownAnswer":""} key={a.id} onClick={()=>onVote(a.id)}>{a.text}{own&&<small>{disabled?"YOUR ANSWER":"YOUR ANSWER · VOTING ALLOWED WITH 2 PLAYERS"}</small>}</button>; })}</div>}</section>}
    {(state.phase === "reveal" || state.phase === "scores" || state.phase === "final") && <section><div className="bigIcon">✦</div><h2>{state.phase === "final" ? "Amen to that!" : state.phase === "scores" ? "Score check!" : "Results are in"}</h2><p>Look up at the host screen.</p><div className="myScore">YOUR SCORE <b>{state.players.find(p=>p.id===me)?.score || 0}</b></div></section>}
    {status && <p className="status">{status}</p>}
  </main>;
}

function Countdown({ deadline }: { deadline?: number }) {
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.ceil(((deadline || Date.now()) - Date.now()) / 1000)));
  useEffect(() => { const tick = () => setSeconds(Math.max(0, Math.ceil(((deadline || Date.now()) - Date.now()) / 1000))); tick(); const timer = window.setInterval(tick, 250); return () => window.clearInterval(timer); }, [deadline]);
  return <div className={`timer ${seconds <= 10 ? "urgent" : ""}`} aria-live="polite">{seconds}</div>;
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
