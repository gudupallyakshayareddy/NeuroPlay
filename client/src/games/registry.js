// Maps a game slug to its playable component. A game is "playable" only if it is listed here.
// Games are lazy-loaded so the initial bundle stays small (30 playable games).
import { lazy } from 'react'

const MemoryMatrix = lazy(() => import('./MemoryMatrix.jsx'))
const CodeBreaker = lazy(() => import('./CodeBreaker.jsx'))
const StairJump = lazy(() => import('./StairJump.jsx'))
const OneMinute = lazy(() => import('./OneMinute.jsx'))
const TwoDoors = lazy(() => import('./TwoDoors.jsx'))
const MindGames = lazy(() => import('./MindGames.jsx'))
const TriviaParty = lazy(() => import('./TriviaParty.jsx'))
const EscapeRoom = lazy(() => import('./EscapeRoom.jsx'))
const DetectiveMode = lazy(() => import('./DetectiveMode.jsx'))
const InterrogationMaster = lazy(() => import('./InterrogationMaster.jsx'))
const TraitorAmongUs = lazy(() => import('./TraitorAmongUs.jsx'))
const SurvivalSimulator = lazy(() => import('./SurvivalSimulator.jsx'))
const TimeLoop = lazy(() => import('./TimeLoop.jsx'))
const TreasureHuntAI = lazy(() => import('./TreasureHuntAI.jsx'))
const DreamMaze = lazy(() => import('./DreamMaze.jsx'))
const StoryQuest = lazy(() => import('./StoryQuest.jsx'))
const PotionMaster = lazy(() => import('./PotionMaster.jsx'))
const AIStoryAdventure = lazy(() => import('./AIStoryAdventure.jsx'))
const WhoAmI = lazy(() => import('./WhoAmI.jsx'))
const CaptionBattle = lazy(() => import('./CaptionBattle.jsx'))
const SurpriseBox = lazy(() => import('./SurpriseBox.jsx'))
const AlienDecoder = lazy(() => import('./AlienDecoder.jsx'))
const AIFusion = lazy(() => import('./AIFusion.jsx'))
const HumanVsAI = lazy(() => import('./HumanVsAI.jsx'))
const NeuroWorld = lazy(() => import('./NeuroWorld.jsx'))
const MindCounter = lazy(() => import('./MindCounter.jsx'))
const EndlessQuest = lazy(() => import('./EndlessQuest.jsx'))
const NeonSurvivor = lazy(() => import('./NeonSurvivor.jsx'))
const BeatSync = lazy(() => import('./BeatSync.jsx'))
const EvoLab = lazy(() => import('./EvoLab.jsx'))

export const registry = {
  'memory-matrix': MemoryMatrix,
  'code-breaker': CodeBreaker,
  'stair-jump': StairJump,
  'one-minute-challenge': OneMinute,
  'two-doors': TwoDoors,
  'mind-games': MindGames,
  'trivia-party': TriviaParty,
  'escape-room': EscapeRoom,
  'detective-mode': DetectiveMode,
  'interrogation-master': InterrogationMaster,
  'traitor-among-us': TraitorAmongUs,
  'survival-simulator': SurvivalSimulator,
  'time-loop': TimeLoop,
  'treasure-hunt-ai': TreasureHuntAI,
  'dream-maze': DreamMaze,
  'story-quest': StoryQuest,
  'potion-master': PotionMaster,
  'ai-story-adventure': AIStoryAdventure,
  'who-am-i': WhoAmI,
  'caption-battle': CaptionBattle,
  'surprise-box': SurpriseBox,
  'alien-decoder': AlienDecoder,
  'ai-fusion': AIFusion,
  'human-vs-ai': HumanVsAI,
  'neuro-world': NeuroWorld,
  'mind-counter': MindCounter,
  'endless-quest': EndlessQuest,
  'neon-survivor': NeonSurvivor,
  'beat-sync': BeatSync,
  'evo-lab': EvoLab,
}
export const isPlayable = (slug) => slug in registry
export const playableSlugs = () => Object.keys(registry)
