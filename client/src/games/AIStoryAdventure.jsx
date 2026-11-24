import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, BookOpen, Sun, Feather, Send, Loader2, Sparkles, WifiOff, Bot } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import { Frame, Stat, clamp } from './ui.jsx'
import { api } from '../api.js'

const MAX_TURNS = 15
const RATING_MAX = 725 // 15 turns * 25 + 250 ending + 10 verbs * 10

const THEMES = [
  { id: 'cyberpunk', name: 'Cyberpunk heist', icon: Cpu, blurb: 'Rain, neon, and one impossible vault in the Kessler Arcology.' },
  { id: 'library', name: 'Haunted library', icon: BookOpen, blurb: 'The forbidden wing is awake, and the Whispering Codex must go home.' },
  { id: 'caravan', name: 'Desert caravan', icon: Sun, blurb: 'Lead twelve camels and forty souls across the Ashen Waste to Qarat.' },
]

const VERB_PATTERNS = [
  ['look', /\b(look|examine|inspect|search|scan|study|check|watch)\b/],
  ['take', /\b(take|grab|pick|steal|snatch|collect|pocket|place|put|return)\b/],
  ['open', /\b(open|unlock|pry|unseal|lift|pull|push|break)\b/],
  ['fight', /\b(fight|attack|hit|shoot|strike|punch|blast|stab|swing)\b/],
  ['talk', /\b(talk|ask|speak|say|greet|call|shout|whisper|negotiate|answer|tell)\b/],
  ['go', /\b(go|run|walk|climb|enter|move|head|follow|descend|cross|leave|sneak|ride|march)\b/],
]
const matchVerb = (action) => {
  const s = action.toLowerCase()
  for (const [verb, re] of VERB_PATTERNS) if (re.test(s)) return verb
  return null
}
const firstWord = (action) => (action.toLowerCase().match(/[a-z]+/) || ['act'])[0]

// ── Authored offline story engine: 12 story nodes + 2 endings per theme. ──
const LOCAL_STORIES = {
  cyberpunk: {
    start: 'c1',
    nudge: 'Nyx crackles in your ear: " poetry later, hero. Look, take, open, fight, talk — or go. Pick a verb and mean it."',
    defaults: {
      look: 'You scan the neon wash for cameras and angles. The rain keeps its own secrets.',
      take: 'You pat down your gear: spike, grapnel, one lucky chip. Everything else you will have to earn.',
      open: 'Nothing here yields to a pull. Try a door, a panel, or a lock that matters.',
      fight: 'You shadow-box the rain. Somewhere a drone logs it as suspicious behavior.',
      talk: 'Nyx answers on comms, bored and brilliant: "Save the charm for the vault, hero."',
      go: 'You shift your weight toward the objective. The arcology waits, glittering and patient.',
    },
    finale: { text: 'The job runs out of night. You ride the service lift down with whatever you carry, and the arcology shrinks behind you into a tower of light and lies. Nyx marks the ledger of the night: survived, paid, wiser. The vault will keep its secrets until the next rain.' },
    nodes: {
      c1: {
        text: 'Rain needles the rooftop where you crouch, forty stories above the plaza. Across the gap, the Kessler Arcology burns gold against the storm. Nyx, your fixer, taps a tablet beside you: "The Ledger is on floor eighty-eight. One shard, one night, one very rich man who deserves it."',
        choices: ['Look over the arcology', 'Talk to Nyx about the plan', 'Go down to the plaza'],
        on: {
          look: { text: 'Through the rain you count drone lanes, a service door at plaza level, and one dark window on eighty-eight. The dark window is your way in.' },
          talk: { text: 'Nyx grins. "Service door, maintenance lift, server farm, vault. I spoof the locks, you carry the spike. And hero — the Ledger is a shard, not a book. Don\'t try to read it."' },
          take: { text: 'You inventory the kit: grapnel, intrusion spike, Nyx\'s lucky chip. It will have to be enough.' },
          go: { text: 'You ride the freight cable down into the plaza\'s steam and neon.', next: 'c2' },
        },
      },
      c2: {
        text: 'The plaza is a lake of reflected advertisements. A security drone sweeps the service door every ninety seconds, and the door itself is a slab of brushed steel with a card reader glowing red.',
        choices: ['Open the service door', 'Go for the door between sweeps', 'Look at the drone pattern'],
        on: {
          look: { text: 'Ninety seconds. The drone pauses at the far corner to scan a billboard — as if the billboard might be a person. Twelve-second window.' },
          open: { text: 'You time the sweep, slide Nyx\'s spoof card through the reader, and the door sighs open into a service corridor.', next: 'c3' },
          go: { text: 'You cross the plaza in the drone\'s blind twelve seconds and slip inside, heart hammering.', next: 'c3' },
          talk: { text: 'The drone challenges you in a cheerful voice. You answer with a maintenance code Nyx taught you. It accepts, bored.' },
          fight: { text: 'You consider the drone, then reconsider: ninety seconds of alarm would end the job. Patience is a weapon too.' },
        },
      },
      c3: {
        text: 'The service corridor smells of ozone and floor wax. A janitor bot trundles past with a ring of keycards on its chassis, and a camera grid webs the ceiling in red laser thread.',
        choices: ['Take a keycard from the bot', 'Open the maintenance panel', 'Go through the camera grid'],
        on: {
          look: { text: 'The cameras sweep in figure-eights. The janitor bot\'s route crosses the blind spot every loop. Somebody designed this place to be robbed by someone patient.' },
          take: { text: 'You lift a keycard off the bot as it passes. It chirps, suspects nothing, and waxes on. The card reads LIFT-88.', next: 'c4' },
          open: { text: 'You pry the maintenance panel and crawl through the cable run, emerging at the maintenance lift.', next: 'c4' },
          go: { text: 'You thread the camera grid on the bot\'s shadow and reach the maintenance lift.', next: 'c4' },
          fight: { text: 'You raise a fist at the janitor bot. It raises a mop. Neither of you commits. Nyx laughs in your ear.' },
        },
      },
      c4: {
        text: 'The maintenance lift is a cage of scarred brass with a single card slot. Eighty-eight floors up, the Ledger waits. The slot blinks, patient as a trap.',
        choices: ['Open the lift with the keycard', 'Go up to floor 88', 'Look at the floor buttons'],
        on: {
          look: { text: 'Buttons for every floor, but only 88 glows after the card. Someone has scratched a small gull into the brass — a thief\'s mark, old as the city.' },
          open: { text: 'The card seats, the cage shudders, and the lift begins its long climb into the tower\'s gold.', next: 'c5' },
          go: { text: 'Eighty-eight floors of muzak and nerve. The doors open onto a hum you feel in your teeth.', next: 'c5' },
          talk: { text: 'The intercom crackles: "Maintenance, state your floor." You say eighty-eight in your best bored voice. It believes you.' },
        },
      },
      c5: {
        text: 'Floor eighty-eight is a server farm the size of a cathedral, aisles of black glass humming with other people\'s secrets. A guard patrol crosses the far aisle, boots loud on the tile.',
        choices: ['Go down the aisle behind the patrol', 'Talk your way past the guard', 'Look for the vault antechamber'],
        on: {
          look: { text: 'At the farm\'s heart: a door of unpainted steel, no handle, no sign. The vault antechamber. The patrol loops every four minutes.' },
          go: { text: 'You shadow the patrol\'s timing and slip down the aisle to the steel door.', next: 'c6' },
          talk: { text: '"Audit," you say, flashing the keycard like a badge. The guard, who has never once been audited, waves you through.', next: 'c6' },
          fight: { text: 'You drop the guard with one clean strike and drag him behind a rack. Nyx hisses: "Loud, hero. Four minutes." You move.', next: 'c6' },
          take: { text: 'You pocket a loose data chip from a rack. Probably worthless. Probably.' },
        },
      },
      c6: {
        text: 'The vault antechamber is a bare steel room with a biometric plate and a single pedestal for a hand you do not have. Nyx\'s voice tightens: "That plate reads Kessler himself. I can spoof it once. Once."',
        choices: ['Open the plate with Nyx\'s spoof', 'Take the intrusion spike to the panel', 'Go for the vault door'],
        on: {
          look: { text: 'Behind the plate, fiber-optic veins pulse like a nervous system. Cut the wrong one and the whole tower knows your name.' },
          open: { text: 'Nyx burns her one spoof. The plate drinks it, thinks it is Kessler, and the vault door begins to open.', next: 'c7' },
          take: { text: 'You seat the intrusion spike in the panel\'s seam and let it chew the lock. Seconds stretch. The door gives.', next: 'c7' },
          go: { text: 'You step through as the door unseals, into cold air and the smell of money.', next: 'c7' },
          talk: { text: 'You ask Nyx for a plan B. She says, "There is no B. There is only A, done well."' },
        },
      },
      c7: {
        text: 'The vault is smaller than you imagined: one pedestal, one shard of black glass floating in a magnetic cradle — the Ledger, every dirty secret Kessler owns. Pressure sensors lace the floor like frost.',
        choices: ['Take the Ledger', 'Look at the sensor lattice', 'Open the magnetic cradle'],
        on: {
          look: { text: 'The lattice has a rhythm — a half-second gap as the field resets. A thief could live in that half-second.' },
          take: { text: 'You cross on the reset gap, lift the shard from its cradle, and the vault holds its breath. Nothing screams. Yet.', next: 'c8' },
          open: { text: 'You collapse the cradle\'s field with the spike and catch the shard as it falls. The vault holds its breath.', next: 'c8' },
          go: { text: 'You walk the lattice\'s half-second rhythm to the pedestal and take what you came for.', next: 'c8' },
          fight: { text: 'You glare at the sensors. They do not care. Violence is not a language this room speaks.' },
        },
      },
      c8: {
        text: 'The Ledger is warm in your fist, heavier than glass has any right to be. Then the vault lights shift to red, and a hologram blooms beside the pedestal: Kessler himself, silver-haired, smiling like a man who owns the weather.',
        choices: ['Talk to Kessler', 'Go for the exit', 'Look for the trap'],
        on: {
          look: { text: 'No turrets, no gas — just the hologram and a new weight in the air. He wants a conversation. That is more dangerous than turrets.' },
          talk: { text: '"Thief," Kessler says, delighted. "You have my ledger. Shall we discuss what it is worth to you — and what you are worth to me?"', next: 'c9' },
          go: { text: 'You back toward the door, shard tight in your fist. The hologram glides after you, unhurried.', next: 'c9' },
          fight: { text: 'You swing through the hologram. It flickers, amused. "Violence," Kessler sighs. "The last resort of the unimaginative."' },
        },
      },
      c9: {
        text: '"Join me," Kessler says, "and I will make you rich enough to forget this night. Refuse, and the tower locks down in sixty seconds." The shard in your hand is every crime he ever committed. Nyx whispers: "Your call, hero. It was always your call."',
        choices: ['Talk — refuse the deal', 'Go for the window route', 'Fight your way to the lift'],
        on: {
          talk: { text: '"I don\'t work for men who need ledgers," you say. Kessler\'s smile thins. "Then run," he says, "and be hunted." The lockdown clock starts.', next: 'c10' },
          go: { text: 'You choose the window. Nyx\'s grapnel is already in your hand, and the storm is already waiting.', next: 'c10' },
          fight: { text: 'You put your fist through the hologram projector and sprint for the lift as alarms finally scream.', next: 'c10' },
          take: { text: 'You consider his offer the way you\'d consider a snake: closely, and from a distance.' },
        },
      },
      c10: {
        text: 'Alarms howl through the server farm. The lift is a trap of light and guards; the dark window on eighty-eight is a forty-story gamble with a grapnel and a rain-slick glass face.',
        choices: ['Go out the window', 'Open the window with the spike', 'Fight through to the lift'],
        on: {
          look: { text: 'Below, the plaza\'s steam hides the crew van. The glass face is slick, the wind is real, and the grapnel is rated for exactly this kind of bad idea.' },
          go: { text: 'You fire the grapnel into the window frame, kick the glass out, and step into forty stories of rain.', next: 'c11' },
          open: { text: 'The spike chews the window seal. The storm reaches in and grabs you by the jacket.', next: 'c11' },
          fight: { text: 'You choose the lift and the guards. It goes badly, loudly, and all the way down.', next: 'cend_fight' },
          talk: { text: 'You shout at the alarms. They are not impressed. Nyx shouts louder: "WINDOW, HERO!"' },
        },
      },
      c11: {
        text: 'You rappel down the glass face in the storm\'s teeth, the Ledger burning in your pocket like a stolen star. Above, Kessler\'s drones spill from the dark window; below, the crew van slides into the plaza\'s steam.',
        choices: ['Go down to the van', 'Look for the drone lanes', 'Talk to Nyx'],
        on: {
          look: { text: 'The drones descend in a spread pattern. The van\'s roof hatch is open, Nyx\'s arm waving you down the last ten meters.' },
          go: { text: 'You drop the last ten meters onto the van roof, roll, and fall through the hatch into the crew\'s cheering dark.', next: 'c12' },
          talk: { text: '"Ten meters, hero," Nyx says, arm out the hatch. "Jump and I\'ll catch you. Metaphorically. Mostly."' },
          take: { text: 'You take one last look at the tower, and take nothing else. You already have everything.' },
        },
      },
      c12: {
        text: 'The van tears through the steam as drones rake the plaza behind you. Nyx takes the Ledger with reverent fingers and plugs it into the dash. Every dirty secret Kessler owns blooms across the screen — and starts uploading to every newsroom in the city.',
        choices: ['Go — ride into the dawn', 'Talk to the crew', 'Look at the upload'],
        on: {
          go: { text: 'The van hits the tunnel and the city\'s noise falls away. By dawn, Kessler\'s ledger is everyone\'s ledger.', next: 'cend' },
          talk: { text: '"So," Nyx says, grinning, "rich or famous?" You watch the upload bar and say, "Both. But mostly — even."', next: 'cend' },
          look: { text: 'The upload hits one hundred percent. Somewhere above the storm, a silver-haired man is learning what weather feels like from the inside.', next: 'cend' },
        },
      },
      cend: {
        ending: true,
        text: 'By morning the Ledger is everywhere, and Kessler Arcology is a crime scene with a view. The crew splits the bounty in a diner that smells of coffee and rain, and Nyx slides you a new chip: "Next job, hero. Something impossible." You look at the city you just rearranged, and smile. The rain, for once, feels like applause.',
        choices: [],
      },
      cend_fight: {
        ending: true,
        text: 'The lift ride down is a war you barely survive: two guards, one broken rib, and the Ledger still in your fist when the doors open onto the loading dock. You limp into the steam as sirens converge, and Nyx\'s van finds you by the smell of your own blood. The job is done — ugly, loud, and paid. Kessler will hunt you now. But you have his ledger, and he knows you can read.',
        choices: [],
      },
    },
  },

  library: {
    start: 'h1',
    nudge: 'The library waits, patient as dust. Try a plain verb — look, take, open, fight, talk, or go — and the shelves will answer.',
    defaults: {
      look: 'Candlelight slides over spines and dust. The library is watching you look, and taking notes.',
      take: 'You reach out, and the nearest shelf leans away, coy as a cat. Not that. Not yet.',
      open: 'Nothing here opens for mere hands. Find the thing that wants to be opened.',
      fight: 'You square up to the dark. The dark has read more books than you and is not afraid.',
      talk: 'Your voice dies among the stacks, swallowed by paper. Something, somewhere, turns a page in reply.',
      go: 'You move deeper between the shelves, and the shelves rearrange themselves politely behind you.',
    },
    finale: { text: 'Dawn arrives before the story does. The library exhales you through the vestibule door with the Codex still whispering in your memory, and the night archivist\'s ledger marks one shift survived. Some books you do not finish. Some books finish you, a little, and let you go.' },
    nodes: {
      h1: {
        text: 'The vestibule of the Grand Athenaeum smells of wax and old paper. You are the new night archivist, and on the desk lies your predecessor\'s note, unfinished: "If the forbidden wing wakes, do not read the Codex. Return it to the shelf before dawn, or the library keeps you."',
        choices: ['Look at the note', 'Go into the reading room', 'Open the inner door'],
        on: {
          look: { text: 'The note\'s last line is scratched out, then rewritten in a shakier hand: "The child means well. The child is not alive." The candle gutters.' },
          go: { text: 'You take the candle and push into the reading room, where the dark is thick as velvet.', next: 'h2' },
          open: { text: 'The inner door opens on a breath of cold air that smells of snow and ink. The library knows you are here.', next: 'h2' },
          talk: { text: 'You announce yourself to the empty hall. Somewhere upstairs, a book falls off a shelf in what feels like sarcasm.' },
        },
      },
      h2: {
        text: 'The reading room is rearranging itself. Chairs slide aside; books lift from tables and reshelve themselves in midair. At the far end, a small translucent child in a century-old coat watches you with eyes like lamp smoke.',
        choices: ['Talk to the ghost child', 'Go toward the child', 'Look at the moving books'],
        on: {
          look: { text: 'The books are sorting themselves by fear. You watch a volume of sea shanties flee from a book of drownings. The child giggles, a sound like pages riffling.' },
          talk: { text: '"You\'re the new one," the child says. "The Codex woke up hungry. It\'s in the forbidden wing, and it\'s eating the other books\' endings. I\'ll show you — if you promise to put it back."', next: 'h3' },
          go: { text: 'You approach the child, and the room\'s rearranging pauses, respectful of the meeting.', next: 'h3' },
          take: { text: 'You reach for a floating book. It sidesteps your hand, offended, and reshelves itself higher.' },
          fight: { text: 'You brandish the candle at the ghost. The child yawns. "The last archivist tried shouting. The library ate his voice for a week."' },
        },
      },
      h3: {
        text: 'The child drifts toward the catalogue hall, leaving a trail of frost on the parquet. "The catalogue knows where everything sleeps," it says. "Even the things that pretend to be asleep. Come on — but don\'t let the drawers hear your name."',
        choices: ['Go after the child', 'Look at the frost trail', 'Talk — ask about the Codex'],
        on: {
          go: { text: 'You follow the frost trail into the catalogue hall, where ten thousand drawers breathe in the dark.', next: 'h4' },
          look: { text: 'The frost spells letters as it fades — HUSH, HUSH, HUSH — the library\'s favorite word.' },
          talk: { text: '"The Codex was written by a man who forgot how to stop," the child says. "It whispers endings. True ones. That\'s why it\'s chained. That\'s why it\'s hungry."' },
        },
      },
      h4: {
        text: 'The catalogue hall is a canyon of brass drawers, each labeled in a hand that changes when you blink. One drawer near the floor is open a finger\'s width, and from inside it comes the sound of someone quietly weeping.',
        choices: ['Open the weeping drawer', 'Take the location card', 'Go down the hall'],
        on: {
          look: { text: 'The weeping drawer\'s label reads, in fresh ink: "ENDINGS, STOLEN." The drawer beside it reads: "ARCHIVISTS, KEPT." You decide not to open that one.' },
          open: { text: 'Inside the drawer: a single location card, damp with tears that are not water. It reads FORBIDDEN WING — LECTERN OF THE FIRST READER.', next: 'h5' },
          take: { text: 'You lift the card. The weeping stops, grateful, and the drawer slides shut like a tired eye.', next: 'h5' },
          go: { text: 'You walk the canyon of drawers, and every label turns to watch you pass. The card\'s direction pulls you to the wing stairs.', next: 'h5' },
          talk: { text: 'You whisper your name, testing the warning. Every drawer in the hall turns its label toward you at once. You take it back. You do not say it again.' },
        },
      },
      h5: {
        text: 'The stairs to the forbidden wing spiral up into a cold that has nothing to do with temperature. At the top, a gate of black iron chains blocks the way, and the chains are warm, like something with a pulse.',
        choices: ['Open the chained gate', 'Go up to the gate', 'Look at the chains'],
        on: {
          look: { text: 'The chains are not locked. They are holding the gate shut the way arms hold a sleeper — the wing is being kept in, not kept out.' },
          open: { text: 'You lift the chains one by one. They sigh, loosen, and let the gate swing inward on a breath of ink and snow.', next: 'h6' },
          go: { text: 'You climb to the gate and slip through the loosened chains into the forbidden wing.', next: 'h6' },
          talk: { text: 'You ask the chains what they guard. They answer in a voice like a closing book: "Everything worth reading. Everything worth becoming."' },
          fight: { text: 'You wrench the chains apart with both hands. They shriek — a sound of tearing paper — and the whole library hears it.', next: 'h6' },
        },
      },
      h6: {
        text: 'The forbidden wing is a cathedral of shelves that lean inward like conspirators. Every book here is chained, and every chain hums a different note. Together they make a chord that you feel in your fillings.',
        choices: ['Go deeper into the wing', 'Look at the chained books', 'Talk to the whispering shelves'],
        on: {
          look: { text: 'The chords resolve toward a lectern at the wing\'s heart, where a single book lies open, breathing. The Whispering Codex. Its pages turn themselves, hungry.' },
          go: { text: 'You walk the leaning aisle toward the lectern, and the chains\' chord rises to meet you.', next: 'h7' },
          talk: { text: 'The shelves whisper endings — your endings, a hundred versions, each one true somewhere. You keep walking. You do not listen.', next: 'h7' },
          take: { text: 'You reach for a chained book. Every chain in the wing snaps taut at once, and you reconsider, slowly.' },
        },
      },
      h7: {
        text: 'The Whispering Codex lies on the lectern of the First Reader, its pages turning in a wind that does not exist. As you approach, it stops on a page that shows your own hand, holding this very book, and the ink is still wet.',
        choices: ['Take the Codex', 'Open it to the last page', 'Look at the wet ink'],
        on: {
          look: { text: 'The wet ink writes as you watch: "The archivist hesitates." You decide, firmly, to disappoint the book.' },
          take: { text: 'You close the Codex on its own sentence and lift it. The wing\'s chord breaks into a thousand furious whispers. The lights begin to die.', next: 'h8' },
          open: { text: 'You flip to the last page. It is blank except for one line: "Thank you for carrying me home." The book snaps shut in your hands, startled into hope.', next: 'h8' },
          talk: { text: '"I\'m not reading you," you tell it. The pages shiver. No one has ever refused the Codex before. It does not know what to do with refusal.' },
          fight: { text: 'You slap the book shut with both palms. It bites your thumb — a paper cut that spells a word you will not repeat — and goes quiet, sulking.' },
        },
      },
      h8: {
        text: 'The Codex is closed in your arms, warm as a sleeping animal, and the library is furious. Lamps die aisle by aisle. The shelves begin to walk, closing ranks behind you, and the child\'s voice comes thin from far away: "The shelf! The empty shelf by the door!"',
        choices: ['Go for the door', 'Look for the empty shelf', 'Talk to the Codex'],
        on: {
          go: { text: 'You run the gauntlet of walking shelves, the Codex clutched to your chest, as the dark closes in behind your heels.', next: 'h9' },
          look: { text: 'There — by the wing door, a gap in the shelves exactly one book wide, lined with lead and salt. The Codex\'s bed. The library\'s one forgiveness.' },
          talk: { text: '"Home," you tell the Codex. "I\'m taking you home." Its warmth steadies. The whispers around you falter, confused by tenderness.', next: 'h9' },
          fight: { text: 'You shoulder a walking shelf aside. It screams in a hundred voices, and the others lean in. Fighting the library is fighting the tide.' },
        },
      },
      h9: {
        text: 'You burst out of the forbidden wing into the catalogue hall, and the hall is a maze now — drawers opening and shutting like jaws. The ghost child flickers at the far end, pointing, and behind you the wing\'s dark is learning to walk.',
        choices: ['Go where the child points', 'Talk to the child', 'Fight the pursuing dark'],
        on: {
          go: { text: 'You follow the child\'s pointing through the snapping maze, and the drawers part for the ghost like old friends.', next: 'h10' },
          talk: { text: '"Left, then the long aisle, then DOWN," the child calls. "And archivist — the shelf wants it spine-out. It\'s proud. Books are proud."', next: 'h10' },
          fight: { text: 'You turn and swing the candle at the walking dark. It drinks the flame, grows taller, and you run. Some things are not fought. Some things are outrun.', next: 'h10' },
          look: { text: 'The child\'s frost trail is the only honest thing in the maze. You trust it with your feet and your life.' },
        },
      },
      h10: {
        text: 'The long aisle stretches toward the vestibule, and the empty shelf waits by the door — lead-lined, salt-ringed, exactly one book wide. The Codex squirms in your arms, whispering one last true ending, the one where you keep it.',
        choices: ['Go to the shelf', 'Open the Codex one last time', 'Talk — refuse the ending'],
        on: {
          go: { text: 'You carry the Codex the last ten meters as dawn grays the high windows, and the library holds its breath.', next: 'h11' },
          open: { text: 'You crack the cover. The page shows you keeping the book, growing old and brilliant and alone, every ending true and none of them yours. You close it. "No."', next: 'h11' },
          talk: { text: '"I don\'t want your ending," you say. "I want my morning." The Codex goes still, the way the hungry go still when someone finally feeds them something better than food.', next: 'h11' },
          take: { text: 'You adjust your grip, spine-out, the way the child said. The book settles, mollified. Books are proud.' },
        },
      },
      h11: {
        text: 'You slide the Whispering Codex into its shelf, spine-out, and the lead and salt take it like a sigh. Every lamp in the library relights at once. The shelves settle. The ghost child, by the door, is already fading into the dawn light, smiling.',
        choices: ['Go — finish the shift', 'Talk to the child', 'Look at the sleeping library'],
        on: {
          go: { text: 'You walk out through the vestibule as the morning shift arrives, and the library lets you go — this time, and every time after.', next: 'h12' },
          talk: { text: '"Same time tomorrow?" the child asks, half gone. You say yes. The last of the ghost laughs like pages riffling, and is sunlight.', next: 'hend' },
          look: { text: 'The library sleeps in the gray dawn, ten thousand books dreaming their chained dreams. On the desk, your predecessor\'s note has a new last line, in your own hand: "The child means well."', next: 'hend' },
        },
      },
      h12: {
        text: 'The morning shift finds you asleep at the vestibule desk, the candle burned to a coin of wax, the ledger signed in a steady hand. Outside, the city wakes. Inside, the library keeps its endings — all of them, even yours, which for once is not written down.',
        choices: ['Go home into the morning', 'Look back at the shelves', 'Talk — promise to return'],
        on: {
          go: { text: 'You step into the morning, and the door closes behind you with a sound like a book being loved shut.', next: 'hend' },
          look: { text: 'One shelf by the door holds a single lead-lined gap, warm as a kept promise. You nod to it. It nods back, in the way of furniture.', next: 'hend' },
          talk: { text: '"Tonight," you tell the library. And the library, which has heard every promise ever made, believes this one.', next: 'hend' },
        },
      },
      hend: {
        ending: true,
        text: 'You keep the night shift for years, and the library keeps you — kindly, the way it keeps its books. The Codex whispers from its lead-lined shelf, and sometimes you listen, and sometimes you don\'t, and both are allowed. The ghost child teaches you the catalogue\'s real names. And every dawn, the library lets you go, which is the only ending it ever truly respects.',
        choices: [],
      },
      hend_fight: {
        ending: true,
        text: 'You fight the library, and the library — which has eaten louder things than you — lets you win just enough to leave. You stagger into dawn with the Codex still under your coat and its whispers still in your teeth. It is never quite quiet again. You kept the book, and the book kept a piece of you, and some nights you cannot tell which of you is reading the other. The shift ledger marks you: survived, changed, not returned.',
        choices: [],
      },
    },
  },

  caravan: {
    start: 'd1',
    nudge: 'The Waste does not answer riddles. Speak plainly — look, take, open, fight, talk, or go — and the road will decide.',
    defaults: {
      look: 'Heat shimmer and starlight. The Waste shows you exactly what it wants you to see, and no more.',
      take: 'You check the loads: water, salt, rope, one brass astrolabe. Everything else is sand pretending to be something.',
      open: 'You loosen a waterskin and ration a mouthful. The Waste approves of discipline, briefly.',
      fight: 'You scowl at the horizon. The horizon has outlasted better scowls than yours.',
      talk: 'You speak to the camels, who are wiser than the maps and twice as stubborn. One of them almost agrees.',
      go: 'You press on, and the dunes rearrange themselves behind you like a story being retold.',
    },
    finale: { text: 'The Waste grants you a dawn and a direction. You ride out of the deep sand with the caravan thinner, wiser, and alive, and the well-city\'s smoke appears on the horizon like a rumor keeping its promise. The road did not break you. The road, which breaks everything, makes an exception you will spend years deserving.' },
    nodes: {
      d1: {
        text: 'Dusk on the Ashen Waste. Twelve camels, forty souls, and you — the new caravan guide, holding a map your predecessor drew in his own blood, they say, though it is only rust-colored ink. The well-city of Qarat lies nine days east. The stars are coming out wrong.',
        choices: ['Look at the map', 'Talk to the caravan master', 'Go — break camp'],
        on: {
          look: { text: 'The map marks one reliable thing: the Old Road, buried somewhere under the dunes, with milestones that point to Qarat even when the stars lie. Find the milestones.' },
          talk: { text: 'The caravan master, Odai, grips your shoulder. "Forty souls, guide. My daughter is on the third camel. Bring us to Qarat and I will name my next camel after you. Fail, and the Waste names you."', next: 'd2' },
          go: { text: 'You break camp in the blue dusk and lead the caravan into the cooling sand, bells tolling softly.', next: 'd2' },
          take: { text: 'You take the map, the astrolabe, and the first watch. The weight of forty lives settles onto your shoulders like a familiar coat.' },
        },
      },
      d2: {
        text: 'The night march is silent but for bells and breath. Overhead, the constellations drift — not with the season, but against it, as if the sky is being rewritten. The camels feel it first: they turn their heads west, all at once, and will not look east.',
        choices: ['Go east regardless', 'Look at the wrong stars', 'Talk to the camels'],
        on: {
          look: { text: 'The Hunter\'s Belt has gained a fourth star. It pulses, slow as a heartbeat. Old caravan lore: when the sky lies, trust the stone. Find the Old Road.' },
          go: { text: 'You hold the astrolabe\'s honest needle east and lead the caravan on. The camels follow you, trusting your voice over their own eyes.', next: 'd3' },
          talk: { text: 'You croon the old marching song to the lead camel. She flicks an ear, unimpressed by the sky, and walks. Wisdom, you decide, is mostly rhythm.', next: 'd3' },
          take: { text: 'You take a bearing off the one star that has not moved — the Anchor, low in the east — and write it on your wrist in charcoal.' },
        },
      },
      d3: {
        text: 'On the second night, the horizon stands up. A wall of sand a thousand feet high rolls toward the caravan, lit from inside by dry lightning. There is no outrunning it. There is only shelter, or the long dark inside the storm.',
        choices: ['Go — push into the storm', 'Open the shelter tarps', 'Look for a hollow'],
        on: {
          look: { text: 'To the left, a dune hollow where the storm\'s edge will thin. To the right, open sand and the storm\'s full throat. You choose the hollow, and shout the order.' },
          go: { text: 'You drive the caravan into the storm\'s edge, tarps lashed over the camels, and the world becomes noise and grit.', next: 'd4' },
          open: { text: 'You unroll the tarps and stake them into the hollow\'s lee. The storm arrives like a collapsing building, and the tarps hold — mostly.', next: 'd4' },
          talk: { text: 'You shout the storm-song, the one guides sing so the caravan can find each other in the dark. Forty voices answer. The storm hates it.' },
        },
      },
      d4: {
        text: 'The storm howls for six hours and dies at dawn, leaving the dunes rearranged like a shuffled deck. Half-buried beside your shelter, scoured clean by the wind, stands a stone milestone — Old Road, older than any kingdom, its carved arrow pointing east.',
        choices: ['Take a bearing from the milestone', 'Open the buried road', 'Go — follow the arrow'],
        on: {
          look: { text: 'The milestone\'s base is carved with water-marks: a well every twenty miles, the Old Road\'s promise. The next well is two days east. The road is real.' },
          take: { text: 'You copy the milestone\'s bearing onto your wrist beside the Anchor star, and the caravan cheers — a small, hoarse, beautiful sound.', next: 'd5' },
          open: { text: 'You dig the milestone free and find the Old Road\'s paving stones beneath, laid by hands that died a thousand years ago and still keep their promises.', next: 'd5' },
          go: { text: 'You lead the caravan along the buried road\'s line, milestone to milestone, east into the honest morning.', next: 'd5' },
        },
      },
      d5: {
        text: 'The Old Road runs straight as a vow through the dunes, milestone after milestone, each one a kept promise. By the second noon, the well at the twenty-mile mark appears — and beside it, a rope across the road, and men with sun-blackened faces watching you from the shade.',
        choices: ['Go to the toll rope', 'Talk — hail the watchers', 'Look at the ambush'],
        on: {
          look: { text: 'Six men, two more in the well-house, one old rifle. They watch the camels, not you. Bandits who count water before blood — professionals, which is worse and better.' },
          go: { text: 'You walk to the rope alone, hands open, the caravan halted behind you. The watchers rise, unhurried.', next: 'd6' },
          talk: { text: '"Toll," calls the shade, in the old caravan tongue. "Water or silver. The road is ours." You answer in the same tongue, which buys you a pause. Respect is a currency here.', next: 'd6' },
          fight: { text: 'You count six rifles and forty lives and unclench your fist. The Waste teaches arithmetic fast.' },
        },
      },
      d6: {
        text: 'The bandit chief is a woman with a scar like a dry riverbed, named Sefra. "The well is ours," she says, "but the road is everyone\'s. One skin of water per camel, or one story per soul — told true. The Waste hears lies, guide, and it tells us."',
        choices: ['Talk — offer a true story', 'Take out the water skins', 'Go — pay and pass'],
        on: {
          talk: { text: 'You tell the story of the wrong stars and the milestone in the storm, true in every bone. Sefra listens with her head tilted, and the Waste does not whisper. "Pass," she says. "And guide — the riders east of here are not mine. Be ready."', next: 'd7' },
          take: { text: 'You pay twelve skins, one per camel, and Sefra\'s men drink with the discipline of the very thirsty. She marks your caravan with a chalk sign: PAID. The Waste\'s own passport.', next: 'd7' },
          go: { text: 'You pay the toll in water and walk the caravan under the rope. Sefra watches you go with something like regret, or respect.', next: 'd7' },
          fight: { text: 'Sefra\'s rifle is already leveled, lazy as a snake. "Arithmetic, guide," she says. You lower your hands. The Waste teaches fast.' },
        },
      },
      d7: {
        text: 'East of the well, the road climbs into a field of black glass — an old fire\'s leavings, sharp as regret. The camels pick their way, and the heat comes off the glass in waves that show you cities that are not there.',
        choices: ['Go — cross the glass field', 'Look at the mirage cities', 'Talk to Odai'],
        on: {
          look: { text: 'The mirage shows Qarat\'s gates, close enough to touch, and a caravan entering them — your caravan, but the camels are white and the riders are bones. You look away. The Waste shows you what you fear, dressed as what you want.' },
          go: { text: 'You lead the caravan across the glass on the old paving stones, eyes on the road, and the false cities dissolve behind you.', next: 'd8' },
          talk: { text: 'Odai rides beside you. "My grandmother crossed this field blind," he says. "Said the Waste can\'t lie to what won\'t look." You keep your eyes on the stones, and it works.', next: 'd8' },
          take: { text: 'You take a shard of the black glass for the caravan\'s children — a toy, a talisman, a piece of the road that tried to eat you.' },
        },
      },
      d8: {
        text: 'Beyond the glass, the dunes turn red as dried blood, and the wind carries a sound that might be bells or might be voices. On the horizon, riders — twelve, maybe more, moving parallel to the caravan, patient as arithmetic.',
        choices: ['Go — hold the course', 'Talk — send a scout to parley', 'Fight — prepare the caravan'],
        on: {
          look: { text: 'The riders carry no bandit chalk, no water skins — but their camels are white, and they ride in a formation the old maps call PILGRIM. Sefra\'s warning echoes: not mine. Perhaps not enemies.' },
          go: { text: 'You hold the course east, the caravan tight, and the riders shadow you for an hour before one breaks off toward you, hands open.', next: 'd9' },
          talk: { text: 'You send Odai\'s fastest rider with a water skin and the old greeting. The riders accept the skin. The Waste\'s laws are older than its wars.', next: 'd9' },
          fight: { text: 'You form the caravan into a square, ropes and rifles ready — and the riders stop, laugh, and send forward a child with a bowl of salt. Pilgrims. You lower the rifle, ashamed and alive.', next: 'd9' },
        },
      },
      d9: {
        text: 'The riders are pilgrims of the Anchor Star, bound for Qarat\'s well-temple, and their leader — a grandmother with eyes like cooled glass — offers you the road\'s oldest bargain: share water, share the night, share the watch. The Waste is kinder in company.',
        choices: ['Talk — accept the bargain', 'Go — camp together', 'Look at the pilgrim camp'],
        on: {
          talk: { text: '"Shared water is doubled water," the grandmother says, pouring your skin into theirs and theirs into yours. The caravan drinks, and the night feels shorter already.', next: 'd10' },
          go: { text: 'You camp the two caravans in one ring, bells and prayers mingling, and the wrong stars overhead seem a little less wrong for the company.', next: 'd10' },
          look: { text: 'The pilgrims\' camels are white because they are old — older than any camel should be. The grandmother catches you looking. "The Anchor keeps what serves it," she says. "Serve the road, guide."' },
          take: { text: 'You take the grandmother\'s blessing — a thumbprint of salt on your forehead — and the caravan\'s children copy it, giggling, forty small salt marks against the dark.' },
        },
      },
      d10: {
        text: 'Three days east with the pilgrims, and the dunes begin to flatten into gravel plain. Then, on the final morning, the horizon smudges green — not mirage-green, not glass-green, but the honest green of palms. Qarat. And between you and the gates, one last dune, tall as a decision.',
        choices: ['Go — climb the last dune', 'Look at the green horizon', 'Talk to the caravan'],
        on: {
          look: { text: 'Palms, walls, smoke, the flash of the well-temple\'s brass dome. Odai\'s daughter is standing on her camel, pointing, and forty souls are making a sound you will hear in your sleep for years.' },
          go: { text: 'You lead the caravan up the last dune, sand to the knees, and the city rises to meet you with every step.', next: 'd11' },
          talk: { text: '"Nine days," you tell the caravan, "and the Waste only took our doubt." Odai laughs, and the pilgrims\' grandmother nods, and the camels — who knew all along — quicken their pace.', next: 'd11' },
        },
      },
      d11: {
        text: 'From the dune\'s crest, Qarat spreads below: the well-temple, the caravan gates, the long shade of the palms. The gatekeeper\'s banner snaps in the wind — a brass astrolabe on green, the guide\'s own sign. The road ends here. The story does not.',
        choices: ['Go down to the gates', 'Talk — call the caravan to follow', 'Look back at the Waste'],
        on: {
          go: { text: 'You lead the caravan down the dune\'s far face, bells ringing like a festival, and the gates of Qarat grow from a painting into a place.', next: 'd12' },
          talk: { text: '"Qarat!" you shout, the guide\'s old cry, and forty voices take it up, and the gatekeeper\'s banner answers in the wind. The Waste, behind you, says nothing. It has nothing left to say.', next: 'd12' },
          look: { text: 'The Waste stretches west, beautiful and murderous, nine days of your life written in sand. You bow to it, the way guides do. It does not bow back. It does not need to.' },
        },
      },
      d12: {
        text: 'The gatekeeper of Qarat is an old woman with a brass astrolabe around her neck and your predecessor\'s eyes — or perhaps just the road\'s eyes, which all guides eventually earn. "Toll of the gate," she says. "One true story of the crossing. The well hears lies, guide."',
        choices: ['Talk — tell the crossing', 'Go — enter Qarat', 'Open the gates'],
        on: {
          talk: { text: 'You tell it true: the wrong stars, the storm, the milestone, Sefra\'s toll, the glass cities, the pilgrims, the green horizon. The gatekeeper listens, and the well does not whisper. "Pass, guide," she says. "And welcome home."', next: 'dend' },
          go: { text: 'You lead the caravan under the gates as the well-temple\'s bells ring noon, and Qarat takes you in the way cities take in stories — completely, and forever.', next: 'dend' },
          open: { text: 'The gates swing wide, and the shade of the palms falls over forty faces like a benediction. Odai\'s daughter is already running for the well.', next: 'dend' },
          take: { text: 'You take the gatekeeper\'s hand, the old guide\'s grip, and she presses something into your palm: a brass key to the guide-house. "The road keeps its own," she says. "You are its own now."' },
        },
      },
      dend: {
        ending: true,
        text: 'Qarat names you Guide of the Eastern Crossing before the week is out. Odai names his next camel after you, as promised, and the pilgrims\' grandmother sends salt from the well-temple every solstice. You lead the crossing forty more times, and the Waste never once shows you the wrong stars again — or perhaps it does, and you have learned to read the stone. Either way, the road keeps its own. And you, guide, are kept.',
        choices: [],
      },
      dend_fight: {
        ending: true,
        text: 'You fight the Waste\'s last toll, and the Waste — which has buried armies — lets you through with a price. The caravan reaches Qarat\'s gates thinner, louder, and alive, but three camels are gone and Odai does not meet your eyes at the well. The gatekeeper hears your story and marks it: PAID IN BLOOD, NOT WATER. You guide again, and well, and for years the crossing is safe — but the Waste remembers the arithmetic, and some dunes, when you pass them, whisper your name like a debt.',
        choices: [],
      },
    },
  },
}

// Wire the violent early endings: fight at the crisis node of each theme.
LOCAL_STORIES.cyberpunk.nodes.c10.on.fight.next = 'cend_fight'
LOCAL_STORIES.library.nodes.h9.on.fight.next = 'h10' // fighting the dark is survivable; the true violent end is below
LOCAL_STORIES.library.nodes.h8.on.fight = { text: 'You turn and swing the candle at the walking dark. It drinks the flame and grows taller, and the shelves close ranks. You run — but the dark has your scent now, and the library will not let you leave unchanged.', next: 'hend_fight' }
LOCAL_STORIES.caravan.nodes.d8.on.fight.next = 'dend_fight'

export default function AIStoryAdventure({ level = 1, onFinish }) {
  const [themeId, setThemeId] = useState(null)
  const [entries, setEntries] = useState([])
  const [choices, setChoices] = useState([])
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const [source, setSource] = useState(null)
  const [turns, setTurns] = useState(0)
  const [verbCount, setVerbCount] = useState(0)
  const [ending, setEnding] = useState(false)
  const [input, setInput] = useState('')
  const historyRef = useRef([])
  const nodeRef = useRef(null)
  const turnsRef = useRef(0)
  const verbsRef = useRef(new Set())
  const offlineRef = useRef(false)
  const themeRef = useRef(null)
  const mountedRef = useRef(true)
  const finishedRef = useRef(false)
  const logRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [entries, busy])

  const theme = THEMES.find((t) => t.id === themeId)
  const momentum = turns * 25 + (ending ? 250 : 0) + Math.min(verbsRef.current.size, 10) * 10

  const pushDm = (text, nextChoices, isEnding, turnNo) => {
    if (!mountedRef.current) return
    historyRef.current.push({ role: 'dm', text })
    setEntries((e) => [...e, { role: 'dm', text }])
    setBusy(false)
    if (isEnding) {
      setEnding(true)
      setChoices([])
      return
    }
    setChoices(nextChoices || [])
    if (turnNo >= MAX_TURNS) forceConclude()
  }

  const localRespond = (action, turnNo) => {
    const story = LOCAL_STORIES[themeRef.current]
    if (!nodeRef.current) nodeRef.current = story.start
    const node = story.nodes[nodeRef.current]
    const verb = matchVerb(action)
    let text
    let next = null
    if (verb && node.on && node.on[verb]) {
      text = node.on[verb].text
      next = node.on[verb].next || null
    } else if (verb) {
      text = story.defaults[verb]
    } else {
      text = story.nudge
    }
    if (next) {
      nodeRef.current = next
      const nn = story.nodes[next]
      if (nn.ending) {
        pushDm(text + '\n\n' + nn.text, [], true, turnNo)
        return
      }
      pushDm(text, nn.choices, false, turnNo)
    } else {
      pushDm(text, node.choices, false, turnNo)
    }
  }

  const localFinale = () => {
    const story = LOCAL_STORIES[themeRef.current]
    pushDm(story.finale.text, [], true, turnsRef.current)
  }

  const forceConclude = async () => {
    setBusy(true)
    setChoices([])
    if (offlineRef.current) { localFinale(); return }
    try {
      const res = await api('/ai/story', {
        theme: themeRef.current ? THEMES.find((t) => t.id === themeRef.current).name : '',
        history: historyRef.current.slice(-12),
        action: '(conclude the story now)',
      })
      if (!mountedRef.current) return
      setSource(res.source)
      pushDm(res.text, [], true, turnsRef.current)
    } catch {
      if (!mountedRef.current) return
      offlineRef.current = true
      setOffline(true)
      localFinale()
    }
  }

  const begin = async (id) => {
    if (busy || themeId) return
    setThemeId(id)
    themeRef.current = id
    nodeRef.current = LOCAL_STORIES[id].start
    setBusy(true)
    try {
      const res = await api('/ai/story', { theme: THEMES.find((t) => t.id === id).name, history: [], action: 'Begin the adventure.' })
      if (!mountedRef.current) return
      setSource(res.source)
      pushDm(res.text, res.choices, !!res.ending, 0)
    } catch {
      if (!mountedRef.current) return
      offlineRef.current = true
      setOffline(true)
      const n = LOCAL_STORIES[id].nodes[LOCAL_STORIES[id].start]
      pushDm(n.text, n.choices, false, 0)
    }
  }

  const send = async (raw) => {
    const action = (raw || '').trim()
    if (!action || busy || ending || !themeId) return
    const t = turnsRef.current + 1
    turnsRef.current = t
    setTurns(t)
    verbsRef.current.add(firstWord(action))
    setVerbCount(verbsRef.current.size)
    setInput('')
    const hist = historyRef.current.slice(-12)
    historyRef.current.push({ role: 'player', text: action })
    setEntries((e) => [...e, { role: 'player', text: action }])
    setBusy(true)
    setChoices([])
    if (offlineRef.current) { localRespond(action, t); return }
    try {
      const res = await api('/ai/story', { theme: theme.name, history: hist, action })
      if (!mountedRef.current) return
      setSource(res.source)
      pushDm(res.text, res.choices, !!res.ending, t)
    } catch {
      if (!mountedRef.current) return
      offlineRef.current = true
      setOffline(true)
      localRespond(action, t)
    }
  }

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    const score = turns * 25 + (ending ? 250 : 0) + Math.min(verbsRef.current.size, 10) * 10
    onFinish({
      score,
      rating: clamp(score / RATING_MAX, 0, 1),
      won: ending,
      summary: `${theme.name}: ${turns} turns, ${verbsRef.current.size} distinct action verbs, story ${ending ? 'concluded' : 'unfinished'}.`,
      stats: [
        { label: 'Turns', value: `${turns}/${MAX_TURNS}` },
        { label: 'Distinct verbs', value: verbsRef.current.size },
        { label: 'Storyteller', value: offline ? 'Offline' : source === 'gemini' ? 'Gemini' : 'Server' },
        { label: 'Ending', value: ending ? 'Reached' : '—' },
      ],
    })
  }

  // ── Theme setup (part of the play phase) ──
  if (!themeId) {
    return (
      <Frame>
        <div className="glass rounded-3xl p-5 sm:p-8">
          <div className="flex items-center gap-2">
            <Feather size={20} className="text-violet-soft" />
            <h2 className="font-display text-lg font-bold">Choose your tale</h2>
          </div>
          <p className="mt-1 text-sm text-dim">The dungeon master writes your story live. Type any action, or follow the suggested choices. Reach an ending within {MAX_TURNS} turns.</p>
          <div className="mt-5 grid gap-3">
            {THEMES.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => begin(t.id)} className="glass glass-hover rounded-2xl p-4 text-left">
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet/20"><Icon size={22} className="text-violet-soft" /></span>
                    <span>
                      <span className="block font-display font-bold text-ink">{t.name}</span>
                      <span className="mt-0.5 block text-xs text-dim">{t.blurb}</span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Frame>
    )
  }

  const sourceChip = offline
    ? { label: 'Offline story mode', cls: 'border-warn/50 bg-warn/10 text-warn', Icon: WifiOff }
    : source === 'gemini'
      ? { label: 'Gemini', cls: 'border-cyan/50 bg-cyan/10 text-cyan', Icon: Sparkles }
      : { label: 'Offline', cls: 'border-warn/50 bg-warn/10 text-warn', Icon: Bot }

  return (
    <Frame>
      <div className="mb-4 flex items-stretch justify-between gap-3">
        <Stat label="Turn" value={`${turns}/${MAX_TURNS}`} />
        <Stat label="Momentum" value={momentum} />
        <div className={`glass flex items-center gap-1.5 rounded-xl px-3 text-xs ${sourceChip.cls}`}>
          <sourceChip.Icon size={13} /> {sourceChip.label}
        </div>
      </div>

      <div className="glass rounded-3xl p-4 sm:p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-dim">
          <Feather size={13} className="text-violet-soft" /> {theme.name}
        </div>

        <div ref={logRef} className="mt-3 max-h-[46vh] space-y-3 overflow-y-auto pr-1" aria-label="Story log" aria-live="polite">
          <AnimatePresence initial={false}>
            {entries.map((e, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                {e.role === 'player' ? (
                  <div className="ml-8 rounded-2xl rounded-br-sm bg-violet/20 px-4 py-2.5 text-sm text-ink">
                    <span className="mr-1 text-[10px] uppercase tracking-wider text-violet-soft">You</span> {e.text}
                  </div>
                ) : (
                  <div className="mr-4 rounded-2xl rounded-bl-sm border border-white/10 bg-panel/70 px-4 py-3 text-sm leading-relaxed text-ink">
                    {e.text.split('\n\n').map((p, pi) => <p key={pi} className={pi ? 'mt-2' : ''}>{p}</p>)}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {busy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-2 py-1 text-sm text-dim">
              <motion.span animate={{ rotate: [0, -14, 10, -8, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}>
                <Feather size={16} className="text-violet-soft" />
              </motion.span>
              The dungeon master is writing…
              <Loader2 size={14} className="animate-spin text-dim" />
            </motion.div>
          )}
        </div>

        {ending ? (
          <div className="mt-4 rounded-2xl border border-success/50 bg-success/10 p-4">
            <div className="flex items-center gap-2 font-display font-bold text-success"><Sparkles size={18} /> The story has ended.</div>
            <Button className="mt-3" onClick={finish}>See results</Button>
          </div>
        ) : (
          <>
            {level !== 2 && choices.length > 0 && !busy && (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Suggested choices">
                {choices.map((c, i) => (
                  <button key={i} onClick={() => send(c)} className="glass rounded-xl px-3 py-2 text-left text-xs hover:border-violet/60 sm:text-sm">{c}</button>
                ))}
              </div>
            )}
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input) }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder={busy ? 'Waiting for the story…' : 'Type any action…'}
                aria-label="Your action"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-panel/70 px-4 py-2.5 text-sm text-ink placeholder:text-dim focus:border-violet/60 focus:outline-none disabled:opacity-50"
              />
              <Button type="submit" disabled={busy || !input.trim()} aria-label="Send action"><Send size={16} /></Button>
            </form>
            {level === 0 && !busy && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-dim">
                <span>Try verbs:</span>
                {['look', 'take', 'open', 'fight', 'talk', 'go'].map((v) => (
                  <button key={v} onClick={() => send(v)} className="rounded-full bg-white/5 px-2 py-0.5 hover:bg-violet/20 hover:text-violet-soft">{v}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Frame>
  )
}
