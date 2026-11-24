// Authored case bank for Detective Mode.
// Every case is logically solvable: exactly one culprit, three contradiction
// rules that point at them, and evidence that clears each innocent suspect.
// Dialogue lives on each suspect: `responses[evidenceId]` is the authored
// cross-examination answer, `default` is used for everything else.

const CASES = [
  {
    id: 'gallery',
    title: 'The Midnight Gallery',
    intro:
      'At 1:02 AM the Halloway Gallery\u2019s alarm company received a silent fault signal. By the time police arrived, the Crimson Meridian \u2014 a painting worth nine million \u2014 had been cut from its frame. A storm raged outside, the front doors never opened, and the thief walked out through the fire exit. Four people had access to the building that night.',
    suspects: [
      {
        id: 'voss', name: 'Dr. Elena Voss', role: 'Curator',
        alibi: 'At home cataloguing auction lots. I was on a video call with the auctioneer until half past midnight \u2014 the recording will prove it.',
        traits: ['Meticulous', 'Insured the painting last month', 'Holds a staff alarm code'],
        default: 'I was home cataloguing. And yes, I insured the painting last month \u2014 that is procedure, not motive.',
        responses: {
          e1: 'Yes, I hold a code \u2014 every curator does. But the panel is operated in person, and I was on camera with the auctioneer until half past midnight.',
          e6: 'That\u2019s my session. I bid on the Hartley lot at 12:21 \u2014 watch the call recording, my face never leaves the screen.',
          e3: 'A scalpel cut\u2026 Sofia\u2019s tools live in the studio. Anyone with a studio key could borrow one. The guard signs that key out too.',
        },
      },
      {
        id: 'bell', name: 'Marcus Bell', role: 'Night guard',
        alibi: 'At my post, then patrolling the east wing every half hour. I found the empty frame at 1 AM and called it in.',
        traits: ['New hire', 'Gambling debts', 'Size 11 boots'],
        default: 'I was at my post. I found the empty frame at 1 AM and called it in. That\u2019s all I know.',
        responses: {
          e1: 'I never signed out any code card. I don\u2019t even know the master code \u2014 ask the desk sergeant.',
          e2: 'I walked the east wing every half hour, like always. That sensor\u2019s been broken for weeks, everyone knows it.',
          e7: 'Size 11? Not me \u2014 I take a 9. Anyone could have worn big boots. Those prints are a setup.',
          e3: 'Cut clean, sure. I don\u2019t own a scalpel. The restorer\u2019s the one with blades, isn\u2019t she?',
        },
      },
      {
        id: 'reyes', name: 'Sofia Reyes', role: 'Restorer',
        alibi: 'In the basement studio until midnight, then I took the 12:07 tram home. The stop camera saw me board.',
        traits: ['Knows the alarm panel', 'Studio scalpel missing', 'Holds a staff alarm code'],
        default: 'I restored that painting for six weeks. Why would I cut my own work out of its frame?',
        responses: {
          e3: 'That\u2019s a restorer\u2019s cut, true. But my scalpel was in the studio drawer, and the guard has a studio key. I was on a tram when your sensor says the canvas moved.',
          e4: 'That\u2019s me boarding. Midnight, home by half past. Check the tram\u2019s own camera if you like.',
          e1: 'I have a code, yes. I also have a tram ticket and a very confused cat who expected me home at midnight.',
        },
      },
      {
        id: 'crane', name: 'Julian Crane', role: 'Collector',
        alibi: 'At the mayor\u2019s gala until half past midnight. Dozens of witnesses, and the press photographed me at 11:55.',
        traits: ['Tried to buy the painting twice', 'No staff code', 'Wealthy beyond suspicion'],
        default: 'I offered to buy it twice. They said no. I don\u2019t steal \u2014 I acquire.',
        responses: {
          e5: 'That\u2019s me raising a glass at 11:55. I wanted the painting, detective, not a scandal.',
          e1: 'I don\u2019t have a staff code. I\u2019m a collector, not an employee. Money opens doors, but not that panel.',
        },
      },
    ],
    evidence: [
      { id: 'e1', icon: 'KeyRound', name: 'Alarm panel log', text: 'The alarm was disabled at 11:47 PM from the physical panel using the staff master code \u2014 it cannot be operated remotely. The code card was signed out to M. Bell at 10:02 PM. Card holders: Voss, Bell, Reyes.' },
      { id: 'e2', icon: 'Activity', name: 'East wing sensors', text: 'Motion sensors in the east wing recorded zero movement between 11:00 PM and 12:40 AM. The sensors were serviced and certified last Tuesday \u2014 they are not faulty.' },
      { id: 'e3', icon: 'Frame', name: 'The empty frame', text: 'The canvas was cut out with a restorer\u2019s scalpel. The frame\u2019s pressure sensor logged the painting\u2019s weight leaving at exactly 12:22 AM.' },
      { id: 'e4', icon: 'Camera', name: 'Tram stop CCTV', text: 'Sofia Reyes boards the 12:07 AM tram, two stops from the gallery. She could not have been inside at 12:22.' },
      { id: 'e5', icon: 'Image', name: 'Gala press photo', text: 'A timestamped press photograph shows Julian Crane raising a glass at the mayor\u2019s gala at 11:55 PM. Guests confirm he stayed until 12:30.' },
      { id: 'e6', icon: 'Video', name: 'Voss laptop session', text: 'The auctioneer\u2019s video call shows Dr. Voss on camera from 11:40 PM to 12:30 AM. Her home IP logged a bid on the Hartley lot at 12:21 AM.' },
      { id: 'e7', icon: 'Footprints', name: 'Fire exit boot prints', text: 'Fresh size-11 boot prints in red varnish dust lead from the alarm panel to the frame and out the fire exit. Staff records list Marcus Bell as the only size 11. Voss wears 7, Reyes 8, Crane 9.' },
    ],
    culprit: 'bell',
    rules: [
      { suspect: 'bell', evidence: 'e1', note: 'Bell denies signing out the code card \u2014 the log shows his signature at 10:02 PM.' },
      { suspect: 'bell', evidence: 'e2', note: 'Bell claims half-hourly east wing patrols; the certified sensors recorded nobody there for a hundred minutes.' },
      { suspect: 'bell', evidence: 'e7', note: 'Bell claims to wear size 9; staff records and the varnish prints say size 11.' },
    ],
    solution: [
      'The thief had to disable the alarm in person at 11:47 PM and lift the canvas at 12:22 AM. The master code card was signed out to Marcus Bell at 10:02 \u2014 his denial is the first lie.',
      'Dr. Voss is on camera until 12:30 and bidding from her home IP at 12:21. Sofia Reyes boards the 12:07 tram, fifteen minutes before the canvas moved. Julian Crane is photographed at the gala at 11:55 and never holds a staff code. Each of them is somewhere else at 12:22.',
      'Bell claims half-hourly patrols, but certified sensors show the east wing empty for a hundred minutes. He claims size 9 boots; the varnish prints from panel to frame to fire exit are size 11 \u2014 his size, per staff records. Three contradictions, one culprit: Marcus Bell cut the painting, walked it out the fire exit, and called in his own \u201cdiscovery\u201d at 1 AM.',
    ],
  },

  {
    id: 'decanter',
    title: 'The Poisoned Pen',
    intro:
      'Retired judge Ambrose Whitfield collapsed at the literary gala\u2019s dessert course, his personal port decanter laced with digitalis. He will recover \u2014 but someone at the gala tried to kill him between the 8:10 PM refill and the 8:25 PM pour. Four people had the means or the moment.',
    suspects: [
      {
        id: 'frost', name: 'Nadia Frost', role: 'Sommelier',
        alibi: 'Serving the high table all evening \u2014 twenty witnesses. I refilled the judge\u2019s decanter at 8:10 and carried it to the alcove sideboard myself.',
        traits: ['Refilled the decanter', 'Holds a cellar key', 'Steady hands'],
        default: 'A sommelier who poisons the port is a sommelier who never works again. I poured for twenty witnesses.',
        responses: {
          e1: 'I refilled it at 8:10 from the cellar bottle and set it on the alcove sideboard. Then I was at the high table \u2014 twenty people watched me pour water, not poison.',
          e2: 'My cellar key never left my apron. And the cellar bottle is clean, detective \u2014 your poison walked upstairs on someone\u2019s own two feet.',
        },
      },
      {
        id: 'marsh', name: 'Theo Marsh', role: 'Nephew & heir',
        alibi: 'I stepped out between 8 and 8:30 to take a long call from my broker \u2014 half an hour, on my mobile.',
        traits: ['Inherits the estate', 'Gambling debts', 'Torn jacket cuff'],
        default: 'I was on a call with my broker. I came back to dessert and chaos. I inherit nothing but grief.',
        responses: {
          e3: 'I was on my mobile with my broker for half an hour, 8 to 8:30. Check my records \u2014 you\u2019ll see the call.',
          e8: 'Three minutes? No, no \u2014 half an hour, and from my mobile. Your broker is misremembering.',
          e4: 'That\u2019s not me. And this cuff? Snagged it on a taxi door at 8:40, after the collapse. Ask the doorman.',
          e7: 'Uncle Ambrose loved me. That letter is\u2026 he was confused in his last years. I\u2019d never hurt him.',
        },
      },
      {
        id: 'hale', name: 'Lillian Hale', role: 'Event planner',
        alibi: 'In the kitchen arguing with the caterer about the souffl\u00e9s from 7:45 until the collapse. The whole kitchen heard us.',
        traits: ['Holds a cellar key', 'Runs the seating plan', 'Feuded with the judge'],
        default: 'The judge and I disagreed about canap\u00e9s. I don\u2019t murder over canap\u00e9s.',
        responses: {
          e2: 'My key, my pocket, all night. The kitchen can vouch for me \u2014 I was shouting about souffl\u00e9s from quarter to eight.',
          e1: 'I planned the seating, not the menu\u2019s chemistry. The alcove sideboard is the sommelier\u2019s station \u2014 I never went near it.',
        },
      },
      {
        id: 'okoye', name: 'Dr. Samuel Okoye', role: 'Physician',
        alibi: 'Seated at table four beside the mayor, who will vouch for me. My medical bag was in coat check all evening.',
        traits: ['Carries digitalis', 'Family friend', 'Heart condition of his own'],
        default: 'I was beside the mayor at table four. I spent the evening trying to save the judge, not shorten his life.',
        responses: {
          e5: 'My vial is empty, not missing \u2014 I take digitalis myself, for my heart. The pharmacy receipt is in my coat, next to the empty vial.',
          e6: 'That receipt is mine. Refilled yesterday, last dose this morning. Check my prescription history.',
        },
      },
    ],
    evidence: [
      { id: 'e1', icon: 'FlaskConical', name: 'The poisoned decanter', text: 'Only the judge\u2019s personal decanter was poisoned. The cellar bottle it was refilled from at 8:10 PM tests clean \u2014 the poison was added upstairs, between the refill and the 8:25 pour.' },
      { id: 'e2', icon: 'KeyRound', name: 'Cellar key log', text: 'The cellar stayed locked all evening; its two keys never left Frost\u2019s and Hale\u2019s pockets. The cellar bottle is clean, so the cellar is a dead end \u2014 the dosing happened at the alcove sideboard.' },
      { id: 'e3', icon: 'Phone', name: 'Marsh phone records', text: 'Theo Marsh\u2019s mobile made and received zero calls between 7 PM and 9 PM. No call to any broker exists on his phone that evening.' },
      { id: 'e4', icon: 'Camera', name: 'Alcove corridor CCTV', text: 'Between the 8:10 refill and the 8:25 pour, exactly one guest entered the alcove: 8:14 PM, dinner jacket, torn left cuff. The figure\u2019s back is to the camera.' },
      { id: 'e5', icon: 'Pill', name: 'The missing vial', text: 'A digitalis vial is missing from Dr. Okoye\u2019s medical bag \u2014 the same drug in the decanter. The bag hung in coat check from 7:30 PM.' },
      { id: 'e6', icon: 'Receipt', name: 'Pharmacy receipt & empty vial', text: 'Okoye\u2019s own prescription for digitalis was refilled yesterday; the empty vial is in his coat pocket. He takes the drug for his own heart \u2014 the \u201cmissing\u201d vial was simply used up.' },
      { id: 'e7', icon: 'ScrollText', name: 'The solicitor\u2019s letter', text: 'A letter in the judge\u2019s jacket: Whitfield intended to disinherit Theo Marsh on Monday, \u201cin light of the gambling debts and the forged signatures.\u201d' },
      { id: 'e8', icon: 'Phone', name: 'Broker\u2019s statement', text: 'The broker confirms a three-minute call from the hotel lobby payphone at 8:04 PM \u2014 not half an hour, and not from a mobile. Marsh was back in the ballroom by 8:08.' },
    ],
    culprit: 'marsh',
    rules: [
      { suspect: 'marsh', evidence: 'e3', note: 'Marsh claims a half-hour mobile call; his phone records show no calls at all.' },
      { suspect: 'marsh', evidence: 'e8', note: 'The broker describes a three-minute payphone call; Marsh insists on half an hour from his mobile.' },
      { suspect: 'marsh', evidence: 'e4', note: 'Marsh says his cuff tore on a taxi door at 8:40; the 8:14 CCTV already shows the tear.' },
    ],
    solution: [
      'The poison entered the decanter upstairs between 8:10 and 8:25 \u2014 the clean cellar bottle and the locked cellar clear Frost and Hale of the dosing itself, and both have crowded alibis for that window: the high table and the kitchen.',
      'Dr. Okoye\u2019s \u201cmissing\u201d digitalis is his own heart medication, empty vial and receipt in his coat, and the mayor seats him at table four throughout.',
      'The alcove camera caught one guest at 8:14: a dinner jacket with a torn left cuff. Theo Marsh claims the tear happened at 8:40 \u2014 after the camera saw it. He claims a half-hour mobile call; his phone made none, and the broker describes three minutes on a payphone. With the disinheritance letter dated Monday, the nephew had motive, window, and three lies. Theo Marsh dosed the port.',
    ],
  },

  {
    id: 'violin',
    title: 'The Vanished Violin',
    intro:
      'During a seven-minute blackout at the orchestra hall\u2019s evening rehearsal, the maestro\u2019s 1721 Stradivarius vanished from its stand. The lights died at 7:05 PM and returned at 7:12. The empty case turned up in a loading-dock bin at 7:40. Four people were in the building.',
    suspects: [
      {
        id: 'petrov', name: 'Maestro Ivan Petrov', role: 'Conductor',
        alibi: 'On the podium throughout. The emergency podium lamp stayed lit \u2014 the whole orchestra watched me beat time in the dark.',
        traits: ['Owns the Stradivarius', 'Insured it heavily', 'Never left the podium'],
        default: 'That violin is my voice. I would sooner lose my arm than leave it unguarded \u2014 and I never left the podium.',
        responses: {
          e3: 'My green-room card is in my jacket, and I was on the lit podium for all seven minutes. The orchestra watched me. Someone else used a card \u2014 or borrowed mine.',
          e5: 'That lamp has saved a hundred rehearsals. I beat time in the dark like a lighthouse. Ask any player.',
        },
      },
      {
        id: 'chen', name: 'Daisy Chen', role: 'Second violinist',
        alibi: 'In the green room tuning the whole time. I came back when the lights died \u2014 ask anyone, they heard me playing.',
        traits: ['Passed over for the solo', 'Repossession notice on her own violin', 'Holds a green-room keycard'],
        default: 'I was tuning. I came back when the lights died and the stand was empty. I\u2019m as upset as anyone.',
        responses: {
          e4: 'That book is wrong. I was tuning in the green room the whole time \u2014 I never signed out. People heard me playing!',
          e3: 'The loading dock? I\u2019ve never set foot on that dock. I don\u2019t even know where the bins are.',
          e8: 'That notice? Paid it off months ago. My accounts are spotless \u2014 I\u2019m practically solvent.',
          e5: 'The maestro never leaves his podium, everyone knows that. Honestly, look at Rocco \u2014 he controls the lights.',
        },
      },
      {
        id: 'marino', name: 'Rocco Marino', role: 'Stagehand',
        alibi: 'Up in the lighting rig fixing the arcing breaker \u2014 that\u2019s why the lights went out. I filed the incident report at 7:20.',
        traits: ['Holds the rig key', 'Filed the report early', 'Smokes on the dock'],
        default: 'I fix lights, not violins. Check my report \u2014 I filed it before the theft was even discovered.',
        responses: {
          e1: 'Yes, my card, yes I threw the breaker \u2014 it was arcing like a firework. I filed the report at 7:20, before anyone knew the fiddle was gone.',
          e7: 'That\u2019s me up the rig, wrestling the breaker. I came down at 7:13 to a room full of shouting.',
        },
      },
      {
        id: 'ashford', name: 'Vivian Ashford', role: 'Patron',
        alibi: 'In my box with the ambassador, who will confirm I never left. I donated the hall\u2019s new wing.',
        traits: ['Deep pockets', 'Box corridor on camera', 'Loves the maestro\u2019s playing'],
        default: 'I donated a wing, detective. I don\u2019t steal violins \u2014 I fund them.',
        responses: {
          e6: 'The ambassador and I discussed the new wing\u2019s acoustics for twenty minutes. The corridor camera agrees with him.',
        },
      },
    ],
    evidence: [
      { id: 'e1', icon: 'DoorOpen', name: 'Rig door log', text: 'Marino\u2019s keycard opened the lighting rig at 7:04 PM. The breaker was thrown manually \u2014 but his incident report, filed 7:20, describes the arcing fault before anyone knew the violin was gone.' },
      { id: 'e2', icon: 'FileText', name: 'Incident report', text: 'Timestamped 7:20 PM: \u201cBreaker arcing, manual shutdown, restored 7:12.\u201d Filed five minutes before the theft was discovered at 7:25 \u2014 Marino could not have known to cover a theft that hadn\u2019t been found.' },
      { id: 'e3', icon: 'Package', name: 'Empty case & dock log', text: 'The violin case was dumped in a loading-dock bin. The dock side door logged a green-room keycard at 7:09 PM. Green-room cards are issued only to Petrov and Chen.' },
      { id: 'e4', icon: 'BookOpen', name: 'Green room sign-in book', text: 'D. Chen signed out at 7:02 PM and back in at 7:16 PM \u2014 she was not in the green room during the blackout, contrary to her alibi.' },
      { id: 'e5', icon: 'Lightbulb', name: 'Emergency lighting', text: 'The podium\u2019s independent emergency lamp stayed lit through the blackout. Orchestra statements: the maestro was visible on the podium the entire seven minutes.' },
      { id: 'e6', icon: 'Camera', name: 'Box corridor CCTV', text: 'The corridor to the private boxes shows no movement from 7:00 to 7:20. The ambassador confirms Mrs. Ashford never left the box.' },
      { id: 'e7', icon: 'Video', name: 'Rig camera', text: 'Grainy rig footage shows Marino at the breaker panel from 7:05 to 7:12 \u2014 he never came down during the blackout.' },
      { id: 'e8', icon: 'AlertTriangle', name: 'Repossession notice', text: 'A final demand dated last week: Chen\u2019s own violin will be repossessed unless she pays 4,200 by Friday. Unpaid.' },
    ],
    culprit: 'chen',
    rules: [
      { suspect: 'chen', evidence: 'e4', note: 'Chen claims she never left the green room; the sign-in book shows her out 7:02\u20137:16.' },
      { suspect: 'chen', evidence: 'e3', note: 'Chen denies ever visiting the loading dock; a green-room card opened it at 7:09, and the maestro \u2014 the only other cardholder \u2014 was on the lit podium.' },
      { suspect: 'chen', evidence: 'e8', note: 'Chen claims the notice was settled months ago; it is a final demand dated last week, still unpaid.' },
    ],
    solution: [
      'The blackout was honest: Marino\u2019s rig camera and his 7:20 incident report \u2014 filed before the theft was discovered \u2014 show him wrestling an arcing breaker from 7:05 to 7:12.',
      'Petrov stood on the lit podium the entire time, and the box corridor camera plus the ambassador keep Ashford in her box. That leaves the green-room card that opened the loading dock at 7:09 \u2014 issued only to Petrov or Chen, and the maestro was visible on stage.',
      'Daisy Chen claims she never left the green room, but the sign-in book puts her out from 7:02 to 7:16. She denies the dock; her card opened it. She calls her repossession notice settled; it is a final demand dated last week. Passed over for the solo and days from losing her own instrument, she used the dark seven minutes to take the maestro\u2019s.',
    ],
  },

  {
    id: 'formula',
    title: 'The Frozen Formula',
    intro:
      'At 2:14 AM the lab\u2019s \u221280\u00b0C freezer opened, and the only copy of the Halden sequence \u2014 a protein fold worth millions \u2014 walked out on a drive. The freezer logs every card. No forced entry, no broken glass: someone with access took it, and three of the four suspects swear they were nowhere near the east wing.',
    suspects: [
      {
        id: 'raman', name: 'Dr. Priya Raman', role: 'Project lead',
        alibi: 'At the conference hotel across town. My room keycard shows me in from 12:50 AM until morning.',
        traits: ['Wrote the sequence', 'Knows its value', 'Hotel across town'],
        default: 'I wrote the sequence. I don\u2019t need to steal it \u2014 and I was across town in a hotel bed.',
        responses: {
          e4: 'That\u2019s my room key. I was across town, asleep, dreaming about grant renewals. The hotel log doesn\u2019t lie.',
          e1: 'The sequence is my life\u2019s work. Why would I steal my own paper from a freezer I can open any weekday?',
        },
      },
      {
        id: 'grant', name: 'Felix Grant', role: 'Night technician',
        alibi: 'Running the autoclave in the prep room. I stepped to the corridor vending machine at 2:12 for two minutes \u2014 the camera will show me.',
        traits: ['Night-shift access', 'Honest to a fault', 'Prep room is six minutes from the freezer'],
        default: 'I run the autoclave and I buy crisps at 2:12. The camera and the cycle log both agree with me.',
        responses: {
          e3: 'That\u2019s me at the vending machine, 2:12, two minutes, back by 2:16. The freezer\u2019s six minutes away \u2014 do the maths.',
          e7: 'Door openings at 2:10 and 2:20 \u2014 that\u2019s my loading schedule. The autoclave logs itself; I couldn\u2019t fake it if I tried.',
        },
      },
      {
        id: 'silva', name: 'Marta Silva', role: 'Visiting researcher',
        alibi: 'Asleep in the dorm. My badge shows me in at 11:40 PM, and my roommate confirms the snoring.',
        traits: ['New to the lab', 'Dorm badge logged', 'Early riser'],
        default: 'I\u2019m new here. I sleep in the dorm and I badge everything. Check the logs.',
        responses: {
          e2: 'In at 11:40, out at 6:02. My roommate will tell you about the snoring \u2014 she\u2019s complained twice.',
        },
      },
      {
        id: 'bianchi', name: 'Prof. Aldo Bianchi', role: 'Department head',
        alibi: 'On a video call with the funding agency from my study until past 2:30. My admin card? I reported it lost weeks ago.',
        traits: ['Only admin-card holder', 'Funding under review', 'Study computer logged in'],
        default: 'I was on a call with the funding agency until past 2:30. My card was lost weeks ago. I run this department \u2014 I don\u2019t burgle it.',
        responses: {
          e1: 'My card was lost weeks ago \u2014 I reported it to security. Anyone could have picked it up. This is an embarrassment, not evidence.',
          e5: 'The call ran past 2:30, I remember the closing pleasantries. The agency\u2019s clocks have always been fast.',
          e6: 'I have never emailed any rival institute. That draft is fabricated \u2014 my account was probably hacked.',
          e7: 'Grant\u2019s autoclave? The man lives in that prep room. Ask him about the freezer, not me.',
        },
      },
    ],
    evidence: [
      { id: 'e1', icon: 'Thermometer', name: 'Freezer access log', text: 'The freezer opened at 2:14 AM with Prof. Bianchi\u2019s admin card \u2014 the only card that opens it without raising an alert. Security has no record of any lost-card report, ever.' },
      { id: 'e2', icon: 'CreditCard', name: 'Dorm badge log', text: 'Silva\u2019s dorm badge: in at 11:40 PM, no exit until 6:02 AM. Her roommate confirms she never left.' },
      { id: 'e3', icon: 'Camera', name: 'Corridor camera', text: 'Felix Grant at the vending machine 2:12\u20132:14 AM, back in the prep room by 2:16. The freezer is a six-minute walk away \u2014 the window is far too short.' },
      { id: 'e4', icon: 'KeyRound', name: 'Hotel keycard log', text: 'Dr. Raman\u2019s conference-hotel room opened at 12:50 AM and not again until 7:05 AM. The hotel is across town.' },
      { id: 'e5', icon: 'Video', name: 'Funding call recording', text: 'The agency\u2019s recording of Bianchi\u2019s study call ends at 1:05 AM \u2014 the agency\u2019s own timestamp, not his. He was alone in the study after 1:05.' },
      { id: 'e6', icon: 'Mail', name: 'The 2:40 draft', text: 'A draft on Bianchi\u2019s study computer, timestamped 2:40 AM, to a rival institute: \u201cThe sequence is in hand. Two million, as discussed.\u201d His account was logged in.' },
      { id: 'e7', icon: 'FileText', name: 'Autoclave cycle log', text: 'The prep-room autoclave ran 1:50\u20132:40 AM with door openings at 2:10 and 2:20 \u2014 Grant\u2019s loading schedule, matching his statement exactly.' },
    ],
    culprit: 'bianchi',
    rules: [
      { suspect: 'bianchi', evidence: 'e1', note: 'Bianchi claims he reported his admin card lost weeks ago; security has no such report, and his card opened the freezer at 2:14.' },
      { suspect: 'bianchi', evidence: 'e5', note: 'Bianchi claims the funding call ran past 2:30; the agency recording ends at 1:05.' },
      { suspect: 'bianchi', evidence: 'e6', note: 'Bianchi denies contacting any rival institute; a 2:40 AM draft on his logged-in account offers the sequence for two million.' },
    ],
    solution: [
      'The freezer opened at 2:14 AM to an admin card \u2014 only the department head holds one. Bianchi says he reported it lost weeks ago; security has never received such a report. Lie one.',
      'Raman\u2019s hotel room logged her in at 12:50 across town. Silva\u2019s dorm badge shows no exit until morning. Grant\u2019s two-minute vending-machine trip is on camera, and the freezer is six minutes away \u2014 the autoclave log matches his story to the minute.',
      'Bianchi claims his funding call ran past 2:30; the agency\u2019s recording ends at 1:05, leaving him alone in his study. At 2:40 his logged-in account drafted an offer to a rival institute: the sequence, for two million. With funding under review, the professor sold the fold he was paid to protect. Three lies, one admin card, one culprit.',
    ],
  },
]

export default CASES
