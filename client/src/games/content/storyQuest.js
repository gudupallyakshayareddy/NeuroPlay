// The Lighthouse of Vess — authored branching narrative for StoryQuest.
// Flags: trust (0..6), courage (0..6), lantern (0 none / 1 hand lantern / 2 stormglass), ally (0/1 Mira).
// Every non-ending scene has at least two choices with NO requirements (no dead ends).
// requires: { flag, min?, max? } — locked choices render disabled with `lockReason`.

export const STORY_TITLE = 'The Lighthouse of Vess'

export const FLAG_META = {
  trust: { label: 'Trust', max: 6 },
  courage: { label: 'Courage', max: 6 },
  lantern: { label: 'Lantern', max: 2 },
  ally: { label: 'Ally', max: 1 },
}

export const START_SCENE = 'arrival'
export const START_FLAGS = { trust: 0, courage: 0, lantern: 0, ally: 0 }

export const SCENES = {
  // ───────────────────────── ACT I — THE DARK COAST ─────────────────────────
  arrival: {
    id: 'arrival', act: 1,
    text: `The ferry leaves you on the jetty at Vess just as the sky closes like a fist. Above the village, on a tooth of black rock, the lighthouse stands dark — the first dark night in ninety years.\n\nSomewhere out in the rising sea, the evening boats are still out. The harbormaster's bell rings and rings, and nobody answers it.`,
    choices: [
      { text: 'Climb straight for the lighthouse before the storm breaks.', next: 'cliff_path', effects: { courage: 1 } },
      { text: 'Push into the lamplit tavern and ask what happened here.', next: 'tavern', effects: { trust: 1 } },
    ],
  },
  tavern: {
    id: 'tavern', act: 1,
    text: `The Salted Crown goes quiet when you enter. Fishermen study their nets like scripture. In the corner, old Sella — who has pulled more drowned men from the water than anyone living — watches you with one clouded eye.\n\n"Another hero," she says, not unkindly. "The last one went up three nights ago. The light went out the night after."`,
    choices: [
      { text: 'Sit with Sella and listen to her story of the last keeper.', next: 'sella_tale', effects: { trust: 1 } },
      { text: 'Buy a round for the room and let the talk come to you.', next: 'tavern_round', effects: { trust: 1 } },
      { text: 'Slip out while she is still talking. The light cannot wait.', next: 'cliff_path', effects: { trust: -1, courage: 1 } },
    ],
  },
  sella_tale: {
    id: 'sella_tale', act: 1,
    text: `Sella turns her cup in her scarred hands. "Keeper Elian was no fool. He wrote to me that the lens was cracked — and that a false light was answering his from somewhere across the bay. Wreckers' work. Ships steered onto the Teeth."\n\nShe presses a small tin token into your palm: a gull with a broken wing. "His apprentice Mira still lives in the village. Show her that, if you mean to help. And the lamp itself — it only truly burns with stormglass. The market man has a shard, if you've the stomach to trade for it."`,
    choices: [
      { text: 'Ask Sella the way to Mira’s workshop.', next: 'mira_intro', effects: { trust: 1 } },
      { text: 'Seek out the night market and the stormglass seller.', next: 'market' },
    ],
  },
  tavern_round: {
    id: 'tavern_round', act: 1,
    text: `The ale loosens the room. A net-mender tells you the keeper's apprentice, Mira, keeps a workshop by the rope-walk and trusts no one since Elian vanished. A smuggler-turned-fisherman mutters that the cliff has a ledge only fools and locals use.\n\nSella catches your sleeve as you rise. "The lamp needs stormglass, stranger. The night market. Remember it when the dark comes."`,
    choices: [
      { text: 'Follow the directions to Mira’s workshop.', next: 'mira_intro' },
      { text: 'Visit the night market for supplies.', next: 'market' },
    ],
  },
  mira_intro: {
    id: 'mira_intro', act: 1,
    text: `Mira's workshop smells of brass polish and lamp oil. She is young, sharp-eyed, and standing between you and a half-built lens grinder like a sentinel. "Elian went up to fix the light and never came down," she says. "The village says he ran. I say the tower took him. Which lie do you believe?"`,
    choices: [
      { text: 'Show her Sella’s gull token.', next: 'mira_trust', effects: { ally: 1, trust: 1 }, requires: { flag: 'trust', min: 2 }, lockReason: 'The village must vouch for you first (Trust 2+).' },
      { text: 'Offer to help her finish the lens grinder, no questions asked.', next: 'mira_help' },
      { text: 'Leave her to her grief and climb the cliff alone.', next: 'cliff_path', effects: { courage: 1 } },
    ],
  },
  mira_help: {
    id: 'mira_help', act: 1,
    text: `For an hour you hold the brass steady while Mira files the lens seat, and neither of you speaks. When it is done she wipes her hands and looks at you properly for the first time.\n\n"You work like someone who expects to be paid in nothing," she says. "Elian was the same. Fine. Ask me what you came to ask."`,
    choices: [
      { text: 'Tell her the truth: you came to bring the keeper home.', next: 'mira_trust', effects: { ally: 1 } },
      { text: 'Ask only for a lantern, and go up alone.', next: 'lantern_gift', effects: { lantern: 1 } },
    ],
  },
  mira_trust: {
    id: 'mira_trust', act: 1,
    text: `Mira closes the workshop door and takes a key from around her neck. "Then I'm coming with you. Elian taught me the tower's bones — every latch, every gear. You'll not get past the gate without me, or without the village at your back."\n\nShe pulls a battered hand-lantern from the shelf and checks its wick with practiced fingers.`,
    choices: [
      { text: 'Take the hand-lantern she offers before you set out.', next: 'lantern_gift', effects: { lantern: 1 } },
      { text: 'Set out together at once, before your nerve cools.', next: 'cliff_path', effects: { courage: 1 } },
    ],
  },
  market: {
    id: 'market', act: 1,
    text: `The night market is three stalls and a fire in a barrel. The stormglass seller unwraps a shard the size of your thumb: it holds a small, patient lightning that never quite strikes.\n\n"Price is the silver compass at your belt," he says. "No coin. The glass only trades for something that knows the way home." Behind you, the cliff path waits in the rain.`,
    choices: [
      { text: 'Trade your silver compass for the stormglass shard.', next: 'shard_gain', effects: { lantern: 2 } },
      { text: 'Keep the compass. You will find another way to light the lamp.', next: 'cliff_path', effects: { courage: 1 } },
    ],
  },
  lantern_gift: {
    id: 'lantern_gift', act: 1,
    text: `The hand-lantern is heavier than it looks, its glass smoked from a hundred nights. Mira — or the memory of her kindness — goes with it.\n\n"Stormglass is what the great lens truly wants," she told you. "But a small light carried bravely has saved more ships than a great light left dark." The cliff path climbs into the weather.`,
    choices: [
      { text: 'Take the cliff path now, lantern swinging at your side.', next: 'cliff_path', effects: { courage: 1 } },
      { text: 'Cut down to the smuggler’s ledge along the shore.', next: 'ledge' },
    ],
  },
  shard_gain: {
    id: 'shard_gain', act: 1,
    text: `The compass leaves your hand like a bird released. In its place the stormglass settles into your palm, warm as a held breath, and the lightning inside it leans toward the lighthouse.\n\nYou have no way home now but forward. The seller points with his chin: the cliff path, or the ledge below it where the sea is already angry.`,
    choices: [
      { text: 'Climb the cliff path with the stormglass lighting your fingers.', next: 'cliff_path', effects: { courage: 1 } },
      { text: 'Take the low ledge — faster, if the sea allows it.', next: 'ledge', effects: { courage: 1 } },
    ],
  },

  // ───────────────────────── ACT II — THE CLIMB ─────────────────────────
  cliff_path: {
    id: 'cliff_path', act: 2,
    text: `The path to the lighthouse is a scar in the cliff face, slick with spray. Halfway up, the stair has fallen away into a gap of churning black. To the left, a rusted chain marks where the stair used to be. Below, a narrow ledge runs along the waterline toward the tower's sea door.\n\nThe storm is done waiting. It arrives all at once, like a decision.`,
    choices: [
      { text: 'Climb the broken stair in the dark, by feel and will.', next: 'dark_stair', effects: { courage: 1 } },
      { text: 'Edge along the smuggler’s ledge above the surf.', next: 'ledge' },
      { text: 'Raise your lantern and read the rock before you commit.', next: 'lit_stair', effects: { courage: 1 }, requires: { flag: 'lantern', min: 1 }, lockReason: 'You carry no light to read the rock by.' },
    ],
  },
  ledge: {
    id: 'ledge', act: 2,
    text: `The ledge is a hand's width wider than your boot, and the sea reaches for it with white fingers. Ten paces along, you nearly step on a man: a sailor from the evening boats, washed up and half-frozen, his leg twisted under him.\n\n"The Teeth," he manages. "There's a false light on the Teeth. We followed it. Don't—" His eyes roll toward the dark tower above.`,
    choices: [
      { text: 'Stop and bind his leg with your scarf, whatever it costs.', next: 'sailor', effects: { trust: 1 } },
      { text: 'Press on — every minute the true light stays dark, more ships die.', next: 'gate', effects: { courage: 1 } },
    ],
  },
  sailor: {
    id: 'sailor', act: 2,
    text: `You splint the leg with a driftwood stave and your own scarf. The sailor grips your wrist with surprising strength. "The wreck of the Mercy is just below the ledge. She carried stormglass for the lamp — Elian ordered it himself, the week before he vanished. If any survived the sea, it's hers."\n\nHe presses a brass pry-bar into your hand. "Take it. And take my thanks, which is all I have."`,
    choices: [
      { text: 'Search the wreck of the Mercy before climbing on.', next: 'wreck', effects: { courage: 1 } },
      { text: 'Climb straight to the lighthouse gate with the pry-bar.', next: 'gate' },
    ],
  },
  wreck: {
    id: 'wreck', act: 2,
    text: `The Mercy lies broken-backed in the shallows, her ribs against the sky. In the figurehead's hollow chest, wrapped in oilskin, you find it: a shard of stormglass, twin to the market man's, its lightning still patient.\n\nBeside it, sealed in wax, lies the keeper's logbook — or what the sea has left of it. The tide is coming in fast. You cannot carry everything and climb.`,
    choices: [
      { text: 'Fit the stormglass shard into your lantern.', next: 'wreck_shard', effects: { lantern: 1 }, requires: { flag: 'lantern', min: 1, max: 1 }, lockReason: 'You need a hand-lantern to hold the shard — and yours must not already burn with stormglass.' },
      { text: 'Take the keeper’s logbook instead, and let the glass go.', next: 'logbook', effects: { trust: 1 } },
      { text: 'Leave the wreck to the tide and climb to the gate.', next: 'gate' },
    ],
  },
  wreck_shard: {
    id: 'wreck_shard', act: 2,
    text: `The shard seats into your lantern's cage as if it was always meant to be there. The flame that catches is white-blue and utterly steady — the storm leans on it and cannot bend it.\n\nSomewhere below, the saved sailor whoops into the wind. Above, the lighthouse waits with its one blind eye. You have never carried a light like this. It feels like carrying a promise.`,
    choices: [
      { text: 'Climb to the gate with the stormglass burning.', next: 'gate', effects: { courage: 1 } },
      { text: 'Signal the village with the bright flame first, then climb.', next: 'gate', effects: { trust: 1 } },
    ],
  },
  logbook: {
    id: 'logbook', act: 2,
    text: `The logbook's last pages are written in a hand that starts neat and ends ragged: "The false light answers mine from the Teeth. I have written to the harbor council. No answer. If I douse the true light, the wreckers lose their mark — but the honest ships lose their star. God forgive the arithmetic. I will go out to the Teeth myself tomorrow and end it."\n\nThere is no entry after that. The sea slaps the wreck's ribs like a slow applause.`,
    choices: [
      { text: 'Read the rest as you climb, learning the tower’s secrets.', next: 'gate', effects: { trust: 1 } },
      { text: 'Seal the book away to give back to Elian — if he lives.', next: 'gate', effects: { courage: 1 } },
    ],
  },
  dark_stair: {
    id: 'dark_stair', act: 2,
    text: `You climb the broken stair blind, fingers hooked into rusted chain, boots testing every stone before you trust it. Twice the rock gives way under you and twice you hang over the surf by one hand and pull yourself up by the other.\n\nWhen you haul onto the tower's shoulder, your palms are raw and your heart is a drum. But you are up, and the dark did not get you.`,
    choices: [
      { text: 'Feel along the tower wall to the landward gate.', next: 'gate', effects: { courage: 1 } },
      { text: 'Climb back down and try the ledge instead — pride is not a plan.', next: 'ledge' },
    ],
  },
  lit_stair: {
    id: 'lit_stair', act: 2,
    text: `Lantern-light washes the cliff and the rock gives up its secrets: handholds worn smooth by ninety years of keepers, and — chalked beside the broken stair — a line of keeper's marks. Arrows, warnings, a small gull with a broken wing.\n\nElian marked a safe way up before he vanished. The chalk leads around the gap and down toward a cellar mouth in the tower's root.`,
    choices: [
      { text: 'Follow the chalk marks into the cellar way.', next: 'chalk_cellar', effects: { trust: 1 } },
      { text: 'Ignore the cellar and climb straight to the gate.', next: 'gate', effects: { courage: 1 } },
    ],
  },
  chalk_cellar: {
    id: 'chalk_cellar', act: 2,
    text: `The cellar way is dry and smells of old rope. The chalk marks end at a cache shelf: a coil of good line, a tin of lamp biscuits, and the keeper's spare logbook, its cover stamped with the gull.\n\nElian left this here for whoever came after him. He always believed someone would come. The stair at the cellar's far end climbs up inside the tower wall, toward the gate.`,
    choices: [
      { text: 'Take the spare logbook and read Elian’s last plans.', next: 'logbook', effects: { trust: 1 } },
      { text: 'Take the rope and climb on to the gate.', next: 'gate', effects: { courage: 1 } },
    ],
  },
  gate: {
    id: 'gate', act: 2,
    text: `The lighthouse gate is iron-bound oak, swollen with rain and locked from within. Above it the tower rises into cloud, its lamp room dark as a pulled tooth. The wind here shoves like a living thing.\n\nSomewhere inside, or somewhere on the Teeth, keeper Elian is waiting — for rescue, for judgment, or for the sea to finish its work. The gate is the last locked thing between you and the truth.`,
    choices: [
      { text: 'Put your shoulder to the gate and force it.', next: 'door_forced', effects: { courage: 1 } },
      { text: 'Search the lintel for the keepers’ spare key.', next: 'lintel_key' },
      { text: 'Call out — if the village trusts you, they will answer.', next: 'village_aid', effects: { trust: 1 }, requires: { flag: 'trust', min: 3 }, lockReason: 'Vess does not trust you enough to follow you up here (Trust 3+).' },
      { text: 'Let Mira work the hidden latch she told you about.', next: 'mira_latch', effects: { trust: 1 }, requires: { flag: 'ally', min: 1 }, lockReason: 'Mira is not with you — only she knows the hidden latch.' },
    ],
  },

  // ───────────────────────── ACT III — THE LIGHT ─────────────────────────
  door_forced: {
    id: 'door_forced', act: 3,
    text: `The gate gives on the third blow, and you go down hard on stone, shoulder singing with pain. The tower's throat swallows the sound of the storm. A spiral stair coils up into blackness; a low door to the keeper's quarters stands ajar.\n\nFrom somewhere above comes a sound that might be wind in the lamp room, or might be a voice.`,
    choices: [
      { text: 'Climb straight for the lamp room.', next: 'lamp_room', effects: { courage: 1 } },
      { text: 'Search the keeper’s quarters first.', next: 'quarters' },
    ],
  },
  lintel_key: {
    id: 'lintel_key', act: 3,
    text: `Your fingers find it where keepers have always hidden it: a brass key in an oilskin pocket under the lintel stone, wrapped with a note gone soft with handling. "For the next hands," it says. "The lamp wants stormglass. The clockwork wants patience. The keeper wants to come home."\n\nThe lock turns like it has been waiting for you. Inside, the spiral stair climbs into the dark, and the keeper's quarters door stands ajar.`,
    choices: [
      { text: 'Climb for the lamp room, the note in your fist.', next: 'lamp_room', effects: { trust: 1 } },
      { text: 'Search the keeper’s quarters first.', next: 'quarters' },
    ],
  },
  village_aid: {
    id: 'village_aid', act: 3,
    text: `You call into the wind, and Vess answers. Lanterns bob up the cliff path — Sella in the lead, the net-mender, the smuggler-turned-fisherman, half the tavern at your back. They rig a rope line to the gate and heave the swollen oak open with a cheer the storm cannot drown.\n\n"We kept the boats in," Sella shouts over the gale. "Now you keep your promise. Bring the light back — and bring Elian."`,
    choices: [
      { text: 'Climb for the lamp room with the village’s rope at your waist.', next: 'lamp_room', effects: { courage: 1 } },
      { text: 'Search the keeper’s quarters while the village holds the gate.', next: 'quarters', effects: { trust: 1 } },
    ],
  },
  mira_latch: {
    id: 'mira_latch', act: 3,
    text: `Mira kneels at the gate's hinge side and works a nail from a seam you would have sworn was solid stone. A hidden latch clicks; the whole door swings inward on oiled hinges, silent as a held breath.\n\n"Elian built this for the nights the lock froze," she says quietly. "He always planned for someone to come after him." She looks up the spiral stair, and her jaw sets. "Together, then."`,
    choices: [
      { text: 'Climb for the lamp room side by side.', next: 'lamp_room', effects: { trust: 1 } },
      { text: 'Search the keeper’s quarters first, Mira covering the stair.', next: 'quarters' },
    ],
  },
  quarters: {
    id: 'quarters', act: 3,
    text: `Elian's room is a monk's cell with a sailor's charts. On the desk, open, lies his journal — and the truth in it is uglier than any ghost: the wreckers' false light on the Teeth, the council's silence, and Elian's terrible arithmetic. He doused the true light to blind the wreckers, then went out to the Teeth alone to end them.\n\nThe stove is still warm. Someone has been here recently. The journal could damn Elian in the village's eyes — or explain everything.`,
    choices: [
      { text: 'Take the journal to the lamp room as evidence of the truth.', next: 'lamp_room', effects: { trust: 1 } },
      { text: 'Burn the journal in the stove. Some arithmetic no one should judge.', next: 'keeper_wakes', effects: { courage: 1, trust: -1 } },
    ],
  },
  lamp_room: {
    id: 'lamp_room', act: 3,
    text: `The lamp room is a cathedral of glass and brass, and it is wrecked. The great lens is cracked across its heart; the clockwork that turns it hangs slack. And beside the mechanism, wrapped in a keeper's coat, lies Elian — alive, barely, frost-bitten and fever-bright, dragged back from the Teeth by someone or something.\n\nThe storm is at its peak. Out in the dark, the false light on the Teeth winks its patient lie. You have minutes, not hours.`,
    choices: [
      { text: 'Seat stormglass in the cracked lens and call the true flame.', next: 'kindle', effects: { courage: 1 }, requires: { flag: 'lantern', min: 2 }, lockReason: 'The great lens only answers stormglass — you carry none.' },
      { text: 'Have Mira splice the clockwork while you hold the lens true.', next: 'kindle_mira', effects: { trust: 1 }, requires: { flag: 'ally', min: 1 }, lockReason: 'Only Mira knows the clockwork well enough to splice it.' },
      { text: 'Wake Elian and demand the truth before you touch anything.', next: 'keeper_wakes' },
      { text: 'Burn the keeper’s oil reserves yourself — crude fire, no lens.', next: 'oil_fire', effects: { courage: 1 } },
    ],
  },
  keeper_wakes: {
    id: 'keeper_wakes', act: 3,
    text: `Elian surfaces from the fever like a man coming up from deep water. His eyes find the dark lens, then you. "I doused it," he rasps. "The wreckers steered ships by my light. I made the coast dark to make it honest — and the honest ships paid. I went to the Teeth to smash their false lamp. The sea disagreed."\n\nHe grips your wrist. "Judge me after. Light it now, or let it stay dark and end the lie forever. Either way — choose."`,
    choices: [
      { text: 'Forgive him. Ask him to talk you through lighting the lamp.', next: 'kindle', effects: { trust: 1 } },
      { text: 'Leave him bound to the rail and light the lamp your own way.', next: 'oil_fire', effects: { courage: 1, trust: -1 } },
      { text: 'Carry him down through the storm to the village — the light can wait.', next: 'descend', effects: { courage: 1 }, requires: { flag: 'courage', min: 3 }, lockReason: 'You have not the nerve to carry a man down that cliff in this storm (Courage 3+).' },
    ],
  },
  kindle: {
    id: 'kindle', act: 3,
    text: `The flame catches — small, then sure, then enormous. The cracked lens drinks it and throws a blade of white light across the bay, and out on the Teeth the false lamp guttering in answer looks suddenly small and cheap, a candle beside a star.\n\nYou hear it even through the storm: a ship's horn, far out, turning away from the rocks. The light of Vess has come back. Now the only question is who keeps it.`,
    choices: [
      { text: 'Hold the beam steady until dawn, whatever the storm sends.', next: 'end_beacon', requires: { flag: 'trust', min: 2 }, lockReason: 'Vess must trust you to stand its watch (Trust 2+).' },
      { text: 'Share the watch with Mira, as keepers have always shared it.', next: 'end_shared', requires: { flag: 'ally', min: 1 }, lockReason: 'Mira is not here to share the watch.' },
      { text: 'Light the lamp and slip away before anyone climbs the stair.', next: 'end_wanderer' },
      { text: 'Burn it hot and fast — you don’t trust the cracked lens to hold.', next: 'end_embers' },
    ],
  },
  kindle_mira: {
    id: 'kindle_mira', act: 3,
    text: `Mira's hands move through the clockwork like a musician's through a familiar instrument. Gears seat, the great lens shudders and begins to turn, and when you touch flame to the wick the whole room becomes a slow wheel of light.\n\nShe laughs once, half a sob. "Ninety years this tower has turned, and I thought I'd never see it again." The beam sweeps the bay. Out on the Teeth, the false light flickers — uncertain, for the first time.`,
    choices: [
      { text: 'Take the first watch together, keeper and apprentice reborn.', next: 'end_shared', effects: { trust: 1 } },
      { text: 'Feed the flame your stormglass and make the light unbreakable.', next: 'kindle', effects: { courage: 1 }, requires: { flag: 'lantern', min: 2 }, lockReason: 'You carry no stormglass to feed the flame.' },
      { text: 'Send Mira down to tell the village, and keep the watch alone.', next: 'end_wanderer' },
    ],
  },
  oil_fire: {
    id: 'oil_fire', act: 3,
    text: `You drag the oil reserves to the lamp room's heart and light them without the lens. The fire is crude and furious, a bonfire in a cathedral; the cracked glass screams as heat climbs it. Light floods the bay — uneven, wild, but light.\n\nA ship's horn answers, turning. But the lens is dying, the tower is filling with smoke, and Elian watches you from the rail with unreadable eyes. This fire will not last the night.`,
    choices: [
      { text: 'Feed the fire everything that will burn, and let it rage till dawn.', next: 'end_embers', effects: { courage: 1 } },
      { text: 'Smother it before the tower catches — save the tower, lose the light.', next: 'end_quiet' },
      { text: 'Shield and steady the flame with your own lantern’s glass.', next: 'kindle', effects: { trust: 1 }, requires: { flag: 'lantern', min: 1 }, lockReason: 'You carry no lantern glass to shield the flame.' },
    ],
  },
  descend: {
    id: 'descend', act: 3,
    text: `You strap Elian to your back with the cellar rope and go down into the storm. The cliff is a black wall running with water; every step is a negotiation with gravity. The keeper murmurs coordinates of the false light against your ear — wreckers' marks, burned into his memory.\n\nHalfway down, the path forks: the smuggler's ledge, short and deadly, or the long chalk way past the cellar. And somewhere below, if you dared to hope, lanterns.`,
    choices: [
      { text: 'Go alone down the smuggler’s ledge — fastest way to the village.', next: 'end_dark' },
      { text: 'Shelter in the chalk cellar with Elian until dawn breaks.', next: 'end_quiet' },
      { text: 'Call for Mira — she knows the chalk way better than anyone.', next: 'end_quiet', effects: { trust: 1 }, requires: { flag: 'ally', min: 1 }, lockReason: 'Mira is not with you to guide the descent.' },
    ],
  },

  // ───────────────────────── ENDINGS ─────────────────────────
  end_beacon: {
    id: 'end_beacon', act: 3,
    ending: { title: 'Keeper of Vess', type: 'good', quality: 600 },
    text: `You hold the beam until the storm spends itself against the light and breaks. At dawn the bay is full of sails that should have been wreckage, and the village climbs the cliff to find you at the lens, half-asleep, still turning the watch.\n\nSella pins the gull token to your coat herself. Elian lives, the wreckers' false light is smashed by the harbor boats at first light, and the council — shamed — names you keeper of Vess. The light never goes dark again. Not on your watch.`,
    choices: [],
  },
  end_shared: {
    id: 'end_shared', act: 3,
    ending: { title: 'Two Lights', type: 'good', quality: 500 },
    text: `You and Mira keep the watch the way keepers always have: in pairs, in turns, in the small hours when the light matters most. She splices the clockwork properly by spring; you learn the lens's cracked heart and how to nurse it.\n\nElian retires to the village with his journal and his arithmetic, and forgives himself slowly, over years, in the warmth of the tavern. The wreckers are taken by the harbor boats. Two lights burn in Vess now — the great one on the cliff, and the small steady one in Mira's workshop, where the next keeper is already learning.`,
    choices: [],
  },
  end_wanderer: {
    id: 'end_wanderer', act: 3,
    ending: { title: 'The Unnamed Keeper', type: 'bittersweet', quality: 350 },
    text: `The light burns when the village finally climbs the stair — but the lamp room is empty except for Elian, sleeping, and a lantern still warm on the rail. You are already down the cliff, already past the jetty, already gone into the grey morning.\n\nVess tells the story for years: the stranger who lit the light and wanted nothing for it. The harbor boats smash the false lamp at dawn; the ships come home. Sometimes, in other ports, you hear the story told wrong, and you never correct it. The light is what matters. It was always what matters.`,
    choices: [],
  },
  end_embers: {
    id: 'end_embers', act: 3,
    ending: { title: 'The Wild Bright Night', type: 'bittersweet', quality: 250 },
    text: `The fire rages until dawn and saves every ship on the water — then the cracked lens gives way with a sound like a bell drowning, and the great lamp of Vess dies forever in a cascade of molten glass.\n\nThe village is safe, the wreckers exposed by the night's wild light, and Elian lives to face the council's questions. But the tower stands blind now, and a new light must be built stone by stone, subscription by subscription, over years. Some nights you wonder if patience would have saved the lens. The sailors' widows do not wonder. They are not widows.`,
    choices: [],
  },
  end_quiet: {
    id: 'end_quiet', act: 3,
    ending: { title: 'The Long Dark Morning', type: 'bittersweet', quality: 300 },
    text: `The light stays dark that night, and two ships are lost on the Teeth before the storm blows itself out. But Elian lives — carried down, sheltered, warmed back from the edge — and his journal tells the whole ugly truth to a village that listens, finally, because you made them listen.\n\nThe council hangs the wreckers' false lamp in chains as a warning. By spring, Vess has rebuilt the great lens with money shamed out of the harbor council, and Elian lights it himself with a steady hand. You were not there for the lighting. You were there for the harder part: the long dark morning, and the truth.`,
    choices: [],
  },
  end_dark: {
    id: 'end_dark', act: 3,
    ending: { title: 'The Sea Keeps Its Own', type: 'bad', quality: 100 },
    text: `The ledge is faster. The ledge is also slick with weed and blind with spray, and halfway along it the sea takes you both — you and the keeper strapped to your back, one wave, no ceremony.\n\nThe village finds the rope end trailing in the surf at dawn. The light stays dark for a season; the wreckers take two more ships before the harbor boats finally hunt them down. Vess remembers you as the one who almost made it. The sea does not remember you at all. That is the sea's whole nature, and its only mercy.`,
    choices: [],
  },
}

export const ACT_NAMES = { 1: 'The Dark Coast', 2: 'The Climb', 3: 'The Light' }

// Score: ending quality (100..600) + flags collected (>0) * 30 + scenes visited * 5.
export const RATING_MAX = 750
export function computeScore(ending, flags, scenesVisited) {
  const collected = Object.keys(FLAG_META).filter((f) => (flags[f] || 0) > 0).length
  const score = ending.quality + collected * 30 + scenesVisited * 5
  return { score, collected }
}

export function meetsRequirement(flags, req) {
  if (!req) return true
  const v = flags[req.flag] || 0
  if (req.min != null && v < req.min) return false
  if (req.max != null && v > req.max) return false
  return true
}
