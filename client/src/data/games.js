// The NeuroPlay game catalogue: 32 games across 7 categories.
import {
  Brain, Binary, BookOpen, Compass, DoorOpen, FlaskConical, Gift, LayoutGrid, Fingerprint, Languages,
  Layers, Lock, Map, PartyPopper, MessageSquareQuote, Mic, Moon, Palette, Repeat, Search, Sparkles, Timer, UserX, Zap,
  Bot, BrainCircuit, Building2, Dna, Globe2, Music2, Rocket, Swords, Wand2, CircleDot,
} from 'lucide-react'

export const categories = [
  { id: 'mystery', name: 'Mystery & Investigation', short: 'Mystery', color: '#8B5CF6', icon: Search, blurb: 'Read the clues. Find the truth.' },
  { id: 'survival', name: 'Survival & Adventure', short: 'Survival', color: '#F59E0B', icon: Compass, blurb: 'Every choice costs something.' },
  { id: 'story', name: 'Story & Fantasy', short: 'Story', color: '#EC4899', icon: Sparkles, blurb: 'Worlds that react to you.' },
  { id: 'logic', name: 'Brain & Logic', short: 'Logic', color: '#22D3EE', icon: Brain, blurb: 'Pure reasoning and memory.' },
  { id: 'creative', name: 'Creativity & Fun', short: 'Creative', color: '#34D399', icon: Palette, blurb: 'Wit, wonder and weirdness.' },
  { id: 'ai', name: 'AI Games', short: 'AI', color: '#A68BFF', icon: Bot, blurb: 'Games powered by generative AI.' },
  { id: 'arcade', name: 'Arcade & Simulation', short: 'Arcade', color: '#60A5FA', icon: Zap, blurb: 'Reflexes, physics and building.' },
]

export const difficulties = ['Easy', 'Medium', 'Hard']

// Duration buckets used by the library filter.
export const durations = [
  { id: 'quick', label: 'Under 5 min', test: (m) => m <= 5 },
  { id: 'medium', label: '6–15 min', test: (m) => m > 5 && m <= 15 },
  { id: 'long', label: '15+ min', test: (m) => m > 15 },
]

// `art` picks which procedural artwork style the card uses (see GameArt.jsx).
export const games = [
  // ---- Mystery & Investigation (4)
  {
    slug: 'escape-room', title: 'Escape Room', category: 'mystery', difficulty: 'Medium', minutes: 20,
    modes: ['Solo'], icon: Lock, art: 'doors',
    description: 'Locked inside a room nobody has seen before. Chain clues, crack locks, and get out before time runs out.',
    howTo: ['Search the room to discover objects and clues.', 'Combine clues to open each lock in order.', 'Use hints sparingly: they lower your final score.'],
  },
  {
    slug: 'detective-mode', title: 'Detective Mode', category: 'mystery', difficulty: 'Hard', minutes: 20,
    modes: ['Solo'], icon: Search, art: 'nodes',
    description: 'A fresh case, a cast of suspects, one hidden culprit. Weigh the evidence and name the guilty party.',
    howTo: ['Read each suspect file and the evidence board.', 'Spot which clues contradict which stories.', 'Make your accusation. You only get a limited number of tries.'],
  },
  {
    slug: 'interrogation-master', title: 'Interrogation Master', category: 'mystery', difficulty: 'Hard', minutes: 15,
    modes: ['Solo'], icon: Mic, art: 'beams',
    description: 'Question a suspect who is hiding something. Their secret never changes, so find the right pressure point.',
    howTo: ['Ask questions within your limited question budget.', 'Look for slips and inconsistencies in the answers.', 'Submit the truth you uncovered.'],
  },
  {
    slug: 'traitor-among-us', title: 'The Traitor Among Us', category: 'mystery', difficulty: 'Medium', minutes: 15,
    modes: ['Solo vs AI', 'Multiplayer'], icon: UserX, art: 'cards',
    description: 'A group mission with one hidden saboteur. Discuss, deduce, and vote before the mission fails.',
    howTo: ['Everyone receives a secret role.', 'Complete tasks and discuss who is acting strangely.', 'Vote out the traitor, or sabotage if you are one. Play online with friends or against AI crewmates.'],
  },
  // ---- Survival & Adventure (4)
  {
    slug: 'survival-simulator', title: 'Survival Simulator', category: 'survival', difficulty: 'Hard', minutes: 15,
    modes: ['Solo'], icon: Compass, art: 'peaks',
    description: 'Stranded with limited supplies. Each decision changes the situation and drains something you cannot get back.',
    howTo: ['Check your resources: food, water, health, energy.', 'Choose actions for each new situation.', 'Survive as many days as you can.'],
  },
  {
    slug: 'time-loop', title: 'Time Loop', category: 'survival', difficulty: 'Hard', minutes: 20,
    modes: ['Solo'], icon: Repeat, art: 'rings',
    description: 'The same moments replay again and again. Only what you learn carries over. Use it to break the loop.',
    howTo: ['Explore the scenario and note what happens when.', 'Knowledge you discover persists into the next loop.', 'Use it to change the outcome before loops run out.'],
  },
  {
    slug: 'treasure-hunt-ai', title: 'Treasure Hunt AI', category: 'survival', difficulty: 'Medium', minutes: 15,
    modes: ['Solo'], icon: Map, art: 'maze',
    description: 'A chain of AI-generated riddles leads to a hidden prize. Each solved clue unlocks the location of the next.',
    howTo: ['Read the current clue carefully.', 'Enter your answer to unlock the next clue.', 'Reach the final location to claim the treasure.'],
  },
  {
    slug: 'dream-maze', title: 'Dream Maze', category: 'survival', difficulty: 'Medium', minutes: 10,
    modes: ['Solo'], icon: Moon, art: 'maze',
    description: 'A maze where the rules of reality bend. Paths shift, and symbols mean different things in each dream.',
    howTo: ['Move through the maze with arrow keys or the on-screen pad.', 'Learn what each dream symbol does.', 'Find the exit before you wake up.'],
  },
  // ---- Story & Fantasy (4)
  {
    slug: 'stair-jump', title: 'Stair Jump', category: 'story', difficulty: 'Easy', minutes: 5,
    modes: ['Solo'], icon: Layers, art: 'stairs',
    description: 'A reflex climb up endless stairs. Time your jumps, dodge the gaps, and chase a higher score.',
    howTo: ['Tap or press Space to jump to the next stair.', 'Wrong timing means a fall.', 'Climb as high as you can.'],
  },
  {
    slug: 'story-quest', title: 'Story Quest', category: 'story', difficulty: 'Easy', minutes: 20,
    modes: ['Solo'], icon: BookOpen, art: 'cards',
    description: 'A branching adventure where the story remembers what you did. Characters keep their personalities, and choices matter.',
    howTo: ['Read each scene.', 'Pick a choice. There is no undo.', 'Reach one of the story endings.'],
  },
  {
    slug: 'potion-master', title: 'Potion Master', category: 'story', difficulty: 'Medium', minutes: 10,
    modes: ['Solo'], icon: FlaskConical, art: 'orbs',
    description: 'Brew potions from strange ingredients. Every ingredient has fixed effects, so learn the rules and mix wisely.',
    howTo: ['Read the order you need to brew.', 'Pick ingredients from your shelf.', 'Combine them. Wrong mixes waste ingredients.'],
  },
  {
    slug: 'ai-story-adventure', title: 'AI Story Adventure', category: 'story', difficulty: 'Medium', minutes: 20,
    modes: ['Solo'], icon: Wand2, art: 'waves',
    description: 'An AI dungeon master that reacts to anything you type. No fixed script: the plot evolves with your actions.',
    howTo: ['Read the scene the AI writes for you.', 'Type any action, or pick a suggested one.', 'Reach an ending. The AI decides how your story concludes.'],
  },
  // ---- Brain & Logic (4)
  {
    slug: 'mind-games', title: 'Mind Games', category: 'logic', difficulty: 'Medium', minutes: 10,
    modes: ['Solo'], icon: Brain, art: 'grid',
    description: 'A rotating set of logic and reasoning puzzles that get harder as you get better.',
    howTo: ['Solve each puzzle before the timer ends.', 'Streaks raise the difficulty.', 'Hints cost points.'],
  },
  {
    slug: 'two-doors', title: 'The Two Doors Challenge', category: 'logic', difficulty: 'Medium', minutes: 5,
    modes: ['Solo'], icon: DoorOpen, art: 'doors',
    description: 'Two doors, two guardians, one always lies. Ask the right question and walk through the safe door.',
    howTo: ['Read what each guardian says.', 'Decide who to question and what to ask.', 'Choose a door.'],
  },
  {
    slug: 'code-breaker', title: 'Code Breaker', category: 'logic', difficulty: 'Medium', minutes: 10,
    modes: ['Solo'], icon: Binary, art: 'glyphs',
    description: 'Crack a hidden code using feedback from each guess. Fewer attempts means a higher score.',
    howTo: ['Enter a guess.', 'Read the feedback on each position.', 'Crack the code within the attempts allowed.'],
  },
  {
    slug: 'memory-matrix', title: 'Memory Matrix', category: 'logic', difficulty: 'Easy', minutes: 5,
    modes: ['Solo'], icon: LayoutGrid, art: 'grid',
    description: 'Watch a pattern flash on the grid, then rebuild it from memory. Patterns grow every round.',
    howTo: ['Memorise the lit tiles.', 'Tap the same tiles after they disappear.', 'Each round adds more tiles.'],
  },
  // ---- Creativity & Fun (4)
  {
    slug: 'who-am-i', title: 'Who Am I?', category: 'creative', difficulty: 'Easy', minutes: 10,
    modes: ['Solo'], icon: Fingerprint, art: 'nodes',
    description: 'Guess the hidden identity from a growing list of clues. The fewer clues you need, the more you score.',
    howTo: ['Reveal clues one at a time.', 'Make a guess whenever you are ready.', 'Wrong guesses cost points.'],
  },
  {
    slug: 'caption-battle', title: 'Caption Battle', category: 'creative', difficulty: 'Easy', minutes: 10,
    modes: ['Solo vs AI', 'Multiplayer'], icon: MessageSquareQuote, art: 'burst',
    description: 'Write the funniest, smartest caption for a wild prompt. An AI judge scores every entry on the same rubric.',
    howTo: ['Read the prompt.', 'Write your caption before time is up.', 'See how each entry scored and why. Battle friends online or an AI rival.'],
  },
  {
    slug: 'surprise-box', title: 'Surprise Box', category: 'creative', difficulty: 'Easy', minutes: 5,
    modes: ['Solo'], icon: Gift, art: 'cards',
    description: 'Open a box and get a random mini-challenge: a riddle, a reaction test, a memory flash. No two boxes are alike.',
    howTo: ['Open the box.', 'Complete the mini-challenge shown.', 'Open another for a new surprise.'],
  },
  {
    slug: 'alien-decoder', title: 'Alien Language Decoder', category: 'creative', difficulty: 'Hard', minutes: 10,
    modes: ['Solo'], icon: Languages, art: 'glyphs',
    description: 'Decode an invented alien language from a handful of examples, then translate a new message.',
    howTo: ['Study the symbol and meaning pairs.', 'Work out the grammar rules.', 'Translate the final message.'],
  },
  // ---- AI Games (6)
  {
    slug: 'ai-fusion', title: 'AI Fusion', category: 'ai', difficulty: 'Easy', minutes: 15,
    modes: ['Solo'], icon: Sparkles, art: 'orbs',
    description: 'Combine any two items and the AI imagines what they become. Build a collection of discoveries nobody else has.',
    howTo: ['Pick two items from your collection.', 'Fuse them. The AI invents a meaningful result.', 'New discoveries join your shelf. Find the secret legendary items.'],
  },
  {
    slug: 'human-vs-ai', title: 'Human vs AI', category: 'ai', difficulty: 'Medium', minutes: 8,
    modes: ['Solo'], icon: Bot, art: 'beams',
    description: 'Can you tell machine writing from human writing? Read each text and call it before the AI fools you.',
    howTo: ['Read the text carefully.', 'Decide: human or AI?', 'Streaks multiply your score. The texts get subtler as you improve.'],
  },
  {
    slug: 'trivia-party', title: 'Trivia Party', category: 'ai', difficulty: 'Medium', minutes: 8,
    modes: ['Solo'], icon: PartyPopper, art: 'burst',
    description: 'AI-written multiple-choice quizzes on any topic you choose. Race the timer and build streaks for bonus points.',
    howTo: ['Pick a topic and difficulty (or type your own topic).', 'Answer before the 20-second timer runs out.', 'Faster answers and streaks score more points.'],
  },
  {
    slug: 'neuro-world', title: 'NeuroWorld', category: 'ai', difficulty: 'Medium', minutes: 20,
    modes: ['Solo'], icon: Globe2, art: 'nodes',
    description: 'A small world of AI characters with real personalities. Explore, talk, earn their trust and finish their quests.',
    howTo: ['Move between locations on the world map.', 'Talk to characters. They remember what you say.', 'Complete quests to unlock the world\u2019s secret.'],
  },
  {
    slug: 'mind-counter', title: 'Mind Counter', category: 'ai', difficulty: 'Medium', minutes: 8,
    modes: ['Solo'], icon: BrainCircuit, art: 'rings',
    description: 'A pattern-learning AI tries to predict your every move. Spot its strategy and stay one step ahead.',
    howTo: ['Pick a move each round; the AI picks one too.', 'The AI learns your habits. Break your own patterns.', 'Outscore the AI over 20 rounds.'],
  },
  {
    slug: 'endless-quest', title: 'Endless Quest', category: 'ai', difficulty: 'Hard', minutes: 20,
    modes: ['Solo'], icon: Swords, art: 'peaks',
    description: 'A roguelike descent through procedurally generated floors. Fight, loot, level up, and see how deep you can go.',
    howTo: ['Explore each floor: fight enemies, find loot, reach the stairs.', 'Manage health, potions and gear.', 'Death is permanent. Depth is your score.'],
  },
  // ---- Arcade & Simulation (6)
  {
    slug: 'neon-survivor', title: 'Neon Survivor', category: 'arcade', difficulty: 'Medium', minutes: 5,
    modes: ['Solo'], icon: Rocket, art: 'burst',
    description: 'Pilot a neon ship through asteroid fields and enemy waves. Shoot, dodge, grab power-ups, survive.',
    howTo: ['Move with arrow keys / WASD or drag on touch. Space or hold to shoot.', 'Destroy asteroids and enemies for points.', 'Grab power-ups. Survive the waves.'],
  },
  {
    slug: 'beat-sync', title: 'Beat Sync', category: 'arcade', difficulty: 'Medium', minutes: 5,
    modes: ['Solo'], icon: Music2, art: 'waves',
    description: 'Notes fall to an original synthesized beat. Hit them on the line, chain combos, and stay in sync.',
    howTo: ['Press D, F, J, K (or tap the lanes) when notes reach the line.', 'Perfect timing builds combos and multipliers.', 'Miss too many and the track falls apart.'],
  },
  {
    slug: 'city-architect', title: 'City Architect', category: 'arcade', difficulty: 'Medium', minutes: 15,
    modes: ['Solo'], icon: Building2, art: 'grid',
    description: 'Grow a city on a grid. Roads connect, houses fill, shops earn, parks please. Balance budget and happiness.',
    howTo: ['Place roads, houses, shops and parks on the grid.', 'Buildings need road access to work.', 'Grow population and happiness before the budget runs out.'],
  },
  {
    slug: 'bounce-lab', title: 'Bounce Lab', category: 'arcade', difficulty: 'Medium', minutes: 10,
    modes: ['Solo'], icon: CircleDot, art: 'orbs',
    description: 'A physics playground: launch a ball, place platforms, and bounce it into the goal. Real gravity, real collisions.',
    howTo: ['Drag to aim and launch the ball.', 'Place and move platforms to guide the bounce.', 'Reach the goal with as few launches as possible.'],
  },
  {
    slug: 'evo-lab', title: 'Evo Lab', category: 'arcade', difficulty: 'Easy', minutes: 15,
    modes: ['Solo'], icon: Dna, art: 'nodes',
    description: 'Raise a digital creature. Feed it, train it, and steer its mutations through five evolution stages.',
    howTo: ['Feed and train your creature to raise its stats.', 'Stats decide which mutation path it takes.', 'Unlock all evolution forms.'],
  },
  {
    slug: 'one-minute-challenge', title: 'One Minute Challenge', category: 'arcade', difficulty: 'Easy', minutes: 1,
    modes: ['Solo'], icon: Timer, art: 'rings',
    description: 'Sixty seconds. One challenge. As many right answers as you can fit in.',
    howTo: ['Press start. The clock begins at once.', 'Answer as many as you can.', 'Your score is the number correct.'],
  },
]

export const getGame = (slug) => games.find((g) => g.slug === slug)
export const getCategory = (id) => categories.find((c) => c.id === id)
export const gamesIn = (categoryId) => games.filter((g) => g.category === categoryId)