import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Gavel, Loader2, MessageSquare, Send, UserRound, WifiOff, XCircle } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp, pick } from './ui.jsx'
import { api } from '../api.js'

// ---------------------------------------------------------------------------
// The four possible truths (shown to the player from the start)
// ---------------------------------------------------------------------------
const TRUTHS = [
  { id: 'ledger', label: 'Stole the ledger', desc: 'The missing account ledger never left the building — this suspect took it.' },
  { id: 'docks', label: 'Was at the docks that night', desc: 'Whatever they claim, they were seen down by the water after midnight.' },
  { id: 'forged', label: 'Forged the signature', desc: 'The harbormaster\'s signature on the cargo manifest is this suspect\'s handiwork.' },
  { id: 'innocent', label: 'Innocent of all three', desc: 'They are hiding something — but none of the three crimes is theirs.' },
]
const TRUTH = Object.fromEntries(TRUTHS.map((t) => [t.id, t]))

// ---------------------------------------------------------------------------
// Offline suspect bank (6 suspects). Guilty suspects lie about their secret;
// each carries two authored statements that contradict each other.
// ---------------------------------------------------------------------------
const SUSPECTS = [
  {
    name: 'Odile Fen', role: 'Counting-house clerk', secret: 'ledger',
    bio: 'Keeps the town\'s accounts. Ink-stained fingers, a new shawl she cannot afford, and a locked desk she guards like a shrine.',
    intro: 'I balance books for a living. If a page is missing, that is arithmetic, not crime. Ask what you must — I have nothing to hide behind.',
    lines: [
      { k: ['ledger', 'book', 'accounts'], t: 'The ledger? It vanished from the strongroom between audits. I reported it myself — why would a thief report her own theft? ...Her own theft, I mean its own absence. Slip of the tongue.' },
      { k: ['alibi', 'night', 'where were', 'midnight'], t: 'I never left the counting-house that night. Not once. I slept on the cot by the safe, same as always. The strongroom door never opened.' },
      { k: ['shawl', 'money', 'gold', 'debt', 'paid'], t: 'The shawl? A gift. From... my aunt. In the capital. She is very generous and very far away, so you cannot ask her.' },
      { k: ['desk', 'lock', 'key'], t: 'My desk is locked because privacy is a virtue. The key stays on my person. No, you may not look inside. What would a clerk keep but pens?' },
      { k: ['strongroom', 'safe', 'strong room'], t: 'Only I hold the strongroom key, which is exactly why I could not have taken it — I would be the first suspect! Surely the guard saw me at my desk all night. Ask him. Do not ask him.' },
      { k: ['witness', 'guard', 'saw', 'someone'], t: 'The night guard dozes after eleven. Everyone knows that. So if he claims he saw me at my desk at midnight, he dreamed it. I was... we were both elsewhere. I mean, asleep.' },
      { k: ['audit', 'missing', 'page'], t: 'Three pages torn out, all from the quarter I reconciled. A coincidence of binding, I am sure. Bindings fail. Books fail. Questions fail.' },
      { k: ['nervous', 'why', 'sweat', 'afraid'], t: 'I am not nervous, I am precise. Precise people fidget. It is documented. Somewhere. In a book I could show you if it were not missing.' },
    ],
    fallback: 'That has no bearing on the accounts. Ask me about the ledger, my alibi, or the strongroom — those are the matters at hand.',
    // Contradictions: "never left / door never opened" vs "the guard dozes... we were both elsewhere";
    // "I reported it myself" vs torn pages from her own quarter.
  },
  {
    name: 'Caspar Rook', role: 'Lamplighter', secret: 'docks',
    bio: 'Lights the street lamps at dusk, sleeps till noon. Smells of salt water, though his round never goes near the harbor.',
    intro: 'Lamps, that\'s my whole world. Wick, flame, glass. I don\'t go where the light isn\'t. Ask away.',
    lines: [
      { k: ['docks', 'harbor', 'water', 'pier'], t: 'The docks? Never touch the place. My round ends at Weaver\'s Lane, miles from the water. The harbor lamps are the port authority\'s job, not mine.' },
      { k: ['alibi', 'night', 'where were', 'midnight'], t: 'Asleep by ten, like every honest lamplighter. My round was done at nine. I saw nothing after nine because my eyes were shut. Firmly shut.' },
      { k: ['salt', 'smell', 'boots', 'wet'], t: 'Salt smell? I... walked past the fish market. At dusk. Before my round. The wind carries things. Smell is not evidence, friend.' },
      { k: ['lamp', 'light', 'round'], t: 'Forty-one lamps, every night, except the harbor ones. I told you. Though I will say the new harbor lamp burns cleaner than ours — not that I have stood under it lately.' },
      { k: ['boat', 'ship', 'smuggl', 'cargo'], t: 'Boats come and go. I wouldn\'t know a smuggler\'s skiff from a fishing boat. Never been aboard either. The tide was low that night, anyway — everyone knows the tide was low.' },
      { k: ['witness', 'saw', 'someone', 'guard'], t: 'Old Maren at the toll gate says she saw a tall man by the water at midnight. I am tall, sure, so is half the town. And Maren\'s eyes are older than the gate.' },
      { k: ['money', 'gold', 'paid', 'debt'], t: 'A lamplighter\'s wage is a lamplighter\'s wage. The coin in my pocket? Saved. Slowly. Over years. Shiny new years, all stacked alike.' },
      { k: ['tide', 'time', 'when'], t: 'The tide was low that night — I said so. Low tide, bare mud, no boat could land. ...High tide would have been worse, of course. If I had been there. Which I was not.' },
    ],
    fallback: 'That\'s outside my round. Lamps, the night, the docks you keep mentioning — ask about those.',
    // Contradictions: "never touch the docks / eyes shut by ten" vs knowing the tide and the harbor lamp's burn;
    // "tide was low, no boat could land" vs "high tide would have been worse".
  },
  {
    name: 'Isolde Vane', role: 'Notary\'s apprentice', secret: 'forged',
    bio: 'Copies documents in a flawless hand. Her master\'s eyesight is failing; hers is perfect, and her imitation of his signature is too.',
    intro: 'I copy, I certify, I keep silent. That is the whole of the notary\'s art. What would you like certified?',
    lines: [
      { k: ['signature', 'sign', 'manifest'], t: 'The harbormaster\'s signature? His hand shakes these days — the manifest stroke is far too steady to be his. Anyone could see that. Anyone with an eye for strokes.' },
      { k: ['forge', 'copy', 'hand', 'imitat'], t: 'I copy documents, yes. Faithfully. A copyist who could forge would be dangerous, would she not? Good thing I cannot. My wrist aches after the third line. Truly.' },
      { k: ['alibi', 'night', 'where were', 'midnight'], t: 'At the scriptorium until the candles drowned. Alone. The master retires early; his eyes, you know. Nobody saw me, which is the same as everybody seeing me, in a manner of speaking.' },
      { k: ['master', 'notary', 'eyes'], t: 'My master\'s sight fails by the month. I guide his hand on important documents. Guide — not replace. The law is very clear about the difference. Very clear.' },
      { k: ['ink', 'paper', 'seal'], t: 'The manifest uses iron-gall ink, same as our scriptorium. So does every office in town. Ink proves proximity, not guilt. Write that down — in your own hand, please.' },
      { k: ['cargo', 'ship', 'docks'], t: 'The cargo manifest freed three crates from customs. Duty unpaid. I am sure the harbormaster had his reasons. He signed it, after all. With a remarkably steady hand.' },
      { k: ['money', 'gold', 'paid', 'debt'], t: 'Apprentices earn little. The silver ink-stand on my desk was a prize — from a penmanship contest. In another town. Which no longer holds contests. Convenient, I agree.' },
      { k: ['witness', 'saw', 'someone'], t: 'The courier swears the manifest was signed in the harbor office at noon. But the harbormaster was at the mill at noon. So either the courier lies, or the signature walked there by itself.' },
    ],
    fallback: 'I certify facts, not fancies. The signature, the manifest, my master\'s hand — those are the documents in question.',
    // Contradictions: "my wrist aches, I cannot forge" vs the too-steady stroke she diagnoses instantly;
    // "guide, not replace" vs the courier's noon signature while the master was at the mill.
  },
  {
    name: 'Bram Halloway', role: 'Night ferryman', secret: 'innocent',
    bio: 'Rows the river ferry after dark. Gruff, evasive about his nights — but his evasions smell of fish, not crime.',
    intro: 'Aye, I was on the river. I\'m always on the river. But I\'ll not say what I do out there, and that\'s final. Ask something else.',
    lines: [
      { k: ['ledger', 'book', 'accounts'], t: 'Never touched a ledger in my life. Can barely read one. Numbers swim like eels. Whoever took your book, it wasn\'t these hands.' },
      { k: ['docks', 'harbor', 'water', 'pier'], t: 'The docks? I keep to the river, not the harbor. Different water entirely. Though... aye, I passed the harbor mouth near midnight. Passing is not landing. I never stepped ashore there.' },
      { k: ['alibi', 'night', 'where were', 'midnight'], t: 'On the ferry, mid-river, where forty souls could have seen me if any were awake. I stopped the boat for an hour near the reeds. For private reasons. Legal ones. Mostly.' },
      { k: ['secret', 'hide', 'reeds', 'private'], t: '...Fine. I feed the giant catfish in the reeds. Since my wife passed. She loved that ugly fish. Tell the town and I\'ll deny it to my grave. That\'s my secret. That\'s all of it.' },
      { k: ['signature', 'sign', 'manifest'], t: 'I sign with an X, same as my da. A forger with an X? You\'d want a steadier hand than mine, friend. Look at these oar-blisters.' },
      { k: ['fish', 'smell', 'boat'], t: 'Catfish pellets and river mud, that\'s the smell on me. Ask the bait shop — I buy a sack every Friday. On credit. It\'s embarrassing is what it is.' },
      { k: ['money', 'gold', 'paid', 'debt'], t: 'I owe the bait shop eleven silver. If I\'d stolen a ledger or forged a manifest, would I be feeding a fish on credit? Would I?' },
      { k: ['witness', 'saw', 'someone'], t: 'The toll-keeper saw my lantern mid-river at midnight, stopped dead near the reeds. She\'ll tell you the same. She thinks I\'m poaching. Let her think it. It\'s better than the truth.' },
    ],
    fallback: 'The river\'s all I know. Ask about the boat, the night, or why I smell of fish — but leave my private business be.',
    // Not guilty: his "contradictions" resolve harmlessly — passing the harbor mouth vs never landing;
    // stopping mid-river vs feeding the catfish. The bio's fish-smell points to the harmless secret.
  },
  {
    name: 'Petra Ossley', role: 'Customs inspector', secret: 'docks',
    bio: 'Inspects cargo by day. Her boots are dry at dawn but her lantern smells of lamp oil, and she knows every tide table by heart.',
    intro: 'I inspect what the sea brings in. Legally. Thoroughly. If something slipped through, it slipped past somebody else. Proceed.',
    lines: [
      { k: ['docks', 'harbor', 'water', 'pier'], t: 'I work the customs house, two streets up from the water. I have no reason to be on the docks after dark. None. The tide tables on my wall are for... scheduling. Daytime scheduling.' },
      { k: ['alibi', 'night', 'where were', 'midnight'], t: 'Home by nine, ledger closed, lamp out. I sleep like a customs officer: lightly, but at home. My housekeeper will confirm it. She sleeps even more lightly. Do not wake her.' },
      { k: ['lantern', 'oil', 'lamp'], t: 'My lantern burns oil, yes. All lanterns burn oil. That I carried it recently proves only that I own a lantern. Next question.' },
      { k: ['cargo', 'crate', 'smuggl', 'manifest'], t: 'Three crates cleared customs on a forged manifest, aye. I flagged it the next morning! Would the guilty flag their own crime? ...I flagged it after someone else might have noticed. Prudence, not guilt.' },
      { k: ['tide', 'boat', 'ship'], t: 'High tide was at 12:40 that night. A shallow skiff could have landed at the old pier then. I know this because every inspector memorizes tides. For daytime scheduling. As I said.' },
      { k: ['signature', 'sign', 'forge'], t: 'The forged signature is good, I\'ll grant that. But I write in block letters — check any inspection form. A forger needs a flowing hand. Mine flows like a brick.' },
      { k: ['witness', 'saw', 'someone'], t: 'The night watch saw a lantern on the old pier at one in the morning. Half the town owns lanterns. And the watch was two streets away, in the dark, seeing things. As watches do.' },
      { k: ['money', 'gold', 'paid', 'debt'], t: 'My wages are public record. The new boots? Saved. The old pier is rocky, so sturdy boots matter — for daytime inspections. On the customs house floor. Which is also rocky. Metaphorically.' },
    ],
    fallback: 'Stick to the matter: the cargo, the night, the tides, or my lantern — those I will answer.',
    // Contradictions: "home by nine, lamp out" vs carrying a freshly-oiled lantern;
    // "no reason to be on the docks after dark" vs pinpointing the 12:40 high tide landing window.
  },
  {
    name: 'Emeric Thorne', role: 'Harbor scribe', secret: 'ledger',
    bio: 'Writes manifests for every captain. Was "reorganizing the archive" the night the ledger vanished, and his archive now has a new lock.',
    intro: 'Words are my cargo. I record, I do not remove. If a book is missing, look to those who cannot read — they are the ones who burn things.',
    lines: [
      { k: ['ledger', 'book', 'accounts'], t: 'The counting-house ledger? I have not touched it since spring. I work in words, not sums. Numbers are for people who cannot be trusted with sentences.' },
      { k: ['alibi', 'night', 'where were', 'midnight'], t: 'Reorganizing the harbor archive until dawn. Alone, alas — the archive is a jealous mistress. I moved every shelf. The dust on my coat will testify.' },
      { k: ['archive', 'lock', 'shelf'], t: 'The archive has a new lock because the old one rusted. The timing is coincidence. A scribe replaces locks the way a poet replaces metaphors — constantly, and without meaning.' },
      { k: ['money', 'gold', 'debt', 'paid'], t: 'Scribes are paid per page, and I wrote four hundred pages last month. The harbor owes me a fortune. I would not steal a ledger — I would invoice for it.' },
      { k: ['signature', 'sign', 'manifest'], t: 'The forged manifest? A crude job. The real harbormaster\'s "H" leans left; the forgery leans right. I noticed at once. I notice everything. It is a curse.' },
      { k: ['docks', 'harbor', 'water', 'pier'], t: 'I was nowhere near the water that night. The archive is inland, windowless, and dry. Though I heard the foghorn at midnight — sound carries inland, everyone knows that.' },
      { k: ['witness', 'saw', 'someone'], t: 'The porter saw me carrying a stack of books toward the archive at dusk. Harbor records! All harbor records. The counting-house ledger is not a harbor record, so it was obviously not among them. Obviously.' },
      { k: ['key', 'desk', 'strongroom'], t: 'I hold no key to the counting-house. But a locked door is a suggestion to a patient man with a thin blade and a quiet evening. ...I mean, to a thief. To some thief. Not me.' },
    ],
    fallback: 'Your question lacks a subject. The ledger, the archive, my night of shelves — choose one and I shall illuminate it.',
    // Contradictions: "windowless archive, nowhere near water" vs hearing the midnight foghorn as if outside;
    // "not touched since spring" vs the porter's dusk books and his unprompted lock-picking musing.
  },
]

function offlineAnswer(suspect, question) {
  const q = question.toLowerCase()
  for (const line of suspect.lines) if (line.k.some((k) => q.includes(k))) return line.t
  return suspect.fallback
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
export default function InterrogationMaster({ level = 1, onFinish }) {
  const budget = [10, 8, 6][level] ?? 8
  const [phase, setPhase] = useState('starting') // starting | asking | reveal
  const [suspect, setSuspect] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [offline, setOffline] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [used, setUsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const [verdict, setVerdict] = useState(null)
  const [error, setError] = useState('')
  const finishedRef = useRef(false)
  const aliveRef = useRef(true)
  const scrollRef = useRef(null)
  useEffect(() => () => { aliveRef.current = false }, [])

  const left = budget - used

  // Start: try the server, fall back to the local bank.
  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const DIFF = ['Easy', 'Medium', 'Hard']
    const r = await api('/ai/interrogate/start', { difficulty: DIFF[level] ?? 'Medium' })
        if (dead) return
        if (!r.suspect?.name) throw new Error('bad start')
        setSuspect(r.suspect)
        setSessionId(r.sessionId)
        setMsgs([{ who: 'suspect', text: r.intro || 'Ask your questions. I have nothing to hide.' }])
        setPhase('asking')
      } catch {
        if (dead) return
        const s = pick(SUSPECTS)
        setSuspect(s)
        setOffline(true)
        setMsgs([{ who: 'suspect', text: s.intro }])
        setPhase('asking')
      }
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs, busy])

  const ask = async () => {
    const q = input.trim()
    if (!q || busy || left <= 0 || phase !== 'asking') return
    setInput('')
    setError('')
    setMsgs((m) => [...m, { who: 'you', text: q }])
    if (offline) {
      setUsed((u) => u + 1)
      setMsgs((m) => [...m, { who: 'suspect', text: offlineAnswer(suspect, q) }])
      return
    }
    setBusy(true)
    try {
      const r = await api('/ai/interrogate/ask', { sessionId, question: q })
      if (!aliveRef.current) return
      setUsed((u) => u + 1)
      setMsgs((m) => [...m, { who: 'suspect', text: r.answer || '…they say nothing.' }])
    } catch (e) {
      if (!aliveRef.current) return
      setError(`${e.message} Your question was not counted — try again.`)
      setMsgs((m) => [...m, { who: 'system', text: 'The connection wavered. That question did not count against your budget.' }])
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  const accuse = async () => {
    if (!selected || busy || phase !== 'asking') return
    setError('')
    if (offline) {
      const correct = selected === suspect.secret
      setVerdict({ correct, truth: TRUTH[suspect.secret].label })
      setPhase('reveal')
      return
    }
    setBusy(true)
    try {
      const r = await api('/ai/interrogate/accuse', { sessionId, guess: TRUTH[selected].label })
      if (!aliveRef.current) return
      setVerdict({ correct: !!r.correct, truth: r.truth || TRUTH[selected].label })
      setPhase('reveal')
    } catch (e) {
      if (!aliveRef.current) return
      setError(`${e.message} The accusation was not filed — try again.`)
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  const finish = () => {
    if (finishedRef.current || !verdict) return
    finishedRef.current = true
    const score = (verdict.correct ? 400 : 0) + left * 25
    onFinish({
      score, rating: clamp(score / (400 + budget * 25), 0, 1), won: verdict.correct,
      summary: verdict.correct
        ? `You broke ${suspect.name} in ${used} questions: ${verdict.truth}.`
        : `${suspect.name} walked free. The truth was: ${verdict.truth}.`,
      stats: [
        { label: 'Questions used', value: `${used}/${budget}` },
        { label: 'Verdict', value: verdict.correct ? 'Correct' : 'Wrong' },
        { label: 'Mode', value: offline ? 'Offline' : 'AI' },
      ],
    })
  }

  if (phase === 'starting') {
    return (
      <Frame>
        <div className="glass rounded-3xl p-8 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-violet-soft" />
          <p className="mt-3 text-sm text-dim">Bringing the suspect to the table…</p>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Stat label="Questions left" value={`${left}/${budget}`} tone={left <= 2 ? 'text-warn' : ''} />
          <Stat label="Case" value="The Harbor Affair" />
        </div>
        {offline && <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-warn"><WifiOff size={12} /> Offline mode</span>}
      </div>

      {/* Suspect dossier */}
      <div className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"><UserRound size={22} className="text-violet-soft" /></div>
          <div>
            <h2 className="font-display text-lg font-bold">{suspect.name} <span className="text-sm font-normal text-dim">· {suspect.role}</span></h2>
            <p className="mt-1 text-xs text-dim">{suspect.bio}</p>
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="mt-4 h-64 space-y-2 overflow-y-auto rounded-2xl bg-white/5 p-3" aria-label="Interrogation transcript" aria-live="polite">
          {msgs.map((m, i) => m.who === 'system' ? (
            <p key={i} className="text-center text-[11px] italic text-warn">{m.text}</p>
          ) : (
            <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.who === 'you' ? 'ml-auto bg-violet/25' : 'bg-white/10'}`}>
              {m.who === 'suspect' && <span className="mr-1 text-xs font-semibold text-cyan">{suspect.name.split(' ')[0]}:</span>}{m.text}
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-xs text-dim"><Loader2 size={13} className="animate-spin" /> {suspect.name} considers the question…</div>}
        </div>

        {phase === 'asking' && (
          <>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask() }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy || left <= 0}
                placeholder={left > 0 ? 'Ask about the night, the ledger, the docks, the signature…' : 'No questions left — make your accusation.'}
                aria-label="Your question"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-panel/70 px-3 py-2.5 text-sm text-ink placeholder:text-dim/60 focus:border-violet/60 focus:outline-none" />
              <Button type="submit" disabled={busy || left <= 0 || !input.trim()} aria-label="Ask question"><Send size={15} /></Button>
            </form>
            {error && <p className="mt-2 text-xs text-warn" role="alert">{error}</p>}
            {left <= 0 && <p className="mt-2 text-xs text-warn">Budget spent. The suspect waits for your accusation.</p>}

            {/* Accusation */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-panel/60 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><Gavel size={15} className="text-violet-soft" /> The four possible truths</p>
              <p className="mt-1 text-[11px] text-dim">The dossier hints at which is real. Contradictions in their answers are your evidence. Accuse whenever you are ready — unused questions earn points.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {TRUTHS.map((t) => (
                  <button key={t.id} onClick={() => setSelected(t.id)} disabled={busy} aria-pressed={selected === t.id}
                    className={`rounded-xl border p-3 text-left text-sm transition-all ${selected === t.id ? 'border-violet bg-violet/20' : 'border-white/10 bg-white/5 hover:border-violet/50'}`}>
                    <b>{t.label}</b>
                    <span className="mt-0.5 block text-[11px] text-dim">{t.desc}</span>
                  </button>
                ))}
              </div>
              <Button className="mt-3" disabled={!selected || busy} onClick={accuse}><Gavel size={15} /> Accuse: {selected ? TRUTH[selected].label : 'choose a truth'}</Button>
            </div>
          </>
        )}

        {phase === 'reveal' && verdict && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className={`mt-4 rounded-2xl border p-4 ${verdict.correct ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10'}`}>
            <p className="flex items-center gap-2 font-semibold">
              {verdict.correct ? <CheckCircle2 size={18} className="text-success" /> : <XCircle size={18} className="text-danger" />}
              {verdict.correct ? 'The suspect breaks. Your accusation holds.' : 'The suspect smiles. Wrong truth.'}
            </p>
            <p className="mt-1 text-sm text-dim">The truth: <b className="text-ink">{verdict.truth}</b>. {verdict.correct ? `+400, plus ${left} unused questions × 25.` : `No conviction points — but ${left} unused questions still earn ${left * 25}.`}</p>
            <Button className="mt-3" onClick={finish}><MessageSquare size={15} /> See results</Button>
          </motion.div>
        )}
      </div>
    </Frame>
  )
}
