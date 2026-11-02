/* Suspension Lab — Theory: simple explanations (English / Gujarati / Hindi) with animated diagrams */
'use strict';

const THEORY_SVG = {
  jobs: `<svg viewBox="0 0 320 150" class="th-svg" aria-hidden="true">
    <path class="th-road" d="M0 128 H320"/>
    <g class="th-carbody"><rect x="70" y="40" width="180" height="40" rx="12" class="th-body"/><rect x="110" y="18" width="95" height="30" rx="10" class="th-body"/></g>
    <g class="th-wheel th-wheel-a"><circle cx="105" cy="104" r="22" class="th-tyre"/><circle cx="105" cy="104" r="9" class="th-hub"/></g>
    <g class="th-wheel"><circle cx="215" cy="104" r="22" class="th-tyre"/><circle cx="215" cy="104" r="9" class="th-hub"/></g>
    <path d="M105 80 V96 M215 80 V96" class="th-link"/>
    <path class="th-bumpr" d="M80 128 q25 -26 50 0"/>
  </svg>`,
  quarter: `<svg viewBox="0 0 260 230" class="th-svg" aria-hidden="true">
    <rect x="70" y="14" width="120" height="44" rx="8" class="th-body th-bob"/>
    <path class="th-spring" d="M105 58 l14 8 -28 8 28 8 -28 8 28 8 -28 8 14 8"/>
    <rect x="150" y="70" width="18" height="34" rx="3" class="th-damp"/><path d="M159 58 V78" class="th-link"/>
    <path d="M90 128 H170 M130 128 V146" class="th-link"/>
    <circle cx="130" cy="168" r="28" class="th-tyre"/><circle cx="130" cy="168" r="11" class="th-hub"/>
    <path class="th-road" d="M20 198 H240"/>
    <path class="th-bracket" d="M206 14 V58"/><text x="212" y="40" class="th-t">①</text>
    <path class="th-bracket2" d="M206 128 V196"/><text x="212" y="166" class="th-t">②</text>
  </svg>`,
  spring: `<svg viewBox="0 0 260 200" class="th-svg" aria-hidden="true">
    <g class="th-press"><rect x="80" y="10" width="100" height="36" rx="6" class="th-body"/><text x="130" y="35" class="th-t th-tc th-inv">↓</text></g>
    <g class="th-coil"><path class="th-spring2" d="M130 48 l26 10 -52 10 52 10 -52 10 52 10 -52 10 52 10 -52 10 52 10 -26 10"/></g>
    <rect x="70" y="160" width="120" height="10" class="th-base"/>
    <path class="th-dim" d="M210 48 V150"/><text x="216" y="104" class="th-t">↕</text>
  </svg>`,
  damper: `<svg viewBox="0 0 260 220" class="th-svg" aria-hidden="true">
    <rect x="95" y="60" width="70" height="140" rx="8" class="th-damp-body"/>
    <rect x="102" y="66" width="56" height="128" rx="4" class="th-oil"/>
    <g class="th-piston"><path d="M130 10 V96" class="th-rod"/><rect x="102" y="94" width="56" height="12" rx="2" class="th-pist"/>
      <circle cx="116" cy="100" r="2.6" class="th-hole"/><circle cx="130" cy="100" r="2.6" class="th-hole"/><circle cx="144" cy="100" r="2.6" class="th-hole"/></g>
    <g class="th-drops"><circle cx="116" cy="120" r="3" class="th-drop"/><circle cx="144" cy="130" r="3" class="th-drop"/><circle cx="130" cy="84" r="3" class="th-drop th-drop2"/></g>
    <text x="180" y="110" class="th-t">↕</text>
  </svg>`,
  axles: `<svg viewBox="0 0 320 170" class="th-svg" aria-hidden="true">
    <text x="80" y="16" class="th-t th-tc">1</text><text x="240" y="16" class="th-t th-tc">2</text>
    <g><path class="th-road" d="M10 150 H150"/><path class="th-road" d="M10 150 H40 q18 -24 36 0" />
      <rect x="40" y="40" width="80" height="22" rx="5" class="th-body"/>
      <g class="th-indep"><rect x="22" y="92" width="16" height="50" rx="5" class="th-tyre"/></g><rect x="122" y="100" width="16" height="50" rx="5" class="th-tyre"/>
      <path d="M40 62 L30 92 M120 62 L130 100" class="th-link"/></g>
    <g><path class="th-road" d="M170 150 H310"/>
      <rect x="200" y="40" width="80" height="22" rx="5" class="th-body"/>
      <g class="th-rigid"><rect x="182" y="100" width="16" height="50" rx="5" class="th-tyre"/><rect x="282" y="100" width="16" height="50" rx="5" class="th-tyre"/><path d="M198 125 H282" class="th-axle"/></g>
      <path d="M215 62 V112 M265 62 V112" class="th-link"/></g>
  </svg>`,
  align: `<svg viewBox="0 0 330 160" class="th-svg" aria-hidden="true">
    <g><text x="55" y="16" class="th-t th-tc">{CAMBER}</text><path class="th-road" d="M10 140 H100"/><path d="M55 30 V140" class="th-dim"/>
      <rect x="44" y="50" width="22" height="88" rx="6" class="th-tyre" transform="rotate(-8 55 138)"/></g>
    <g><text x="165" y="16" class="th-t th-tc">{CASTER}</text><path class="th-road" d="M120 140 H210"/><circle cx="165" cy="112" r="26" class="th-tyre"/>
      <path d="M165 30 V140" class="th-dim"/><path d="M150 32 L172 140" class="th-axis"/></g>
    <g><text x="275" y="16" class="th-t th-tc">{TOE}</text><rect x="240" y="40" width="14" height="44" rx="4" class="th-tyre" transform="rotate(-6 247 62)"/>
      <rect x="296" y="40" width="14" height="44" rx="4" class="th-tyre" transform="rotate(6 303 62)"/><path d="M247 110 V146 M303 110 V146" class="th-dim"/><text x="275" y="132" class="th-t th-tc">↑</text></g>
  </svg>`,
  roll: `<svg viewBox="0 0 300 170" class="th-svg" aria-hidden="true">
    <path class="th-road" d="M10 150 H290"/>
    <g class="th-lean"><rect x="70" y="40" width="160" height="34" rx="8" class="th-body"/><rect x="105" y="16" width="90" height="28" rx="8" class="th-body"/></g>
    <rect x="70" y="100" width="18" height="50" rx="5" class="th-tyre"/><rect x="212" y="100" width="18" height="50" rx="5" class="th-tyre"/>
    <path d="M88 118 Q150 132 212 118" class="th-arb"/>
    <text x="240" y="40" class="th-t">→</text>
  </svg>`
};

const THEORY = {
  en: [
    { id: 'jobs', svg: 'jobs', h: 'What does a suspension do?',
      p: ['The suspension connects the wheels to the car body. It has four jobs:'],
      li: ['Comfort — it soaks up bumps so the people and load inside are not shaken.', 'Grip — it keeps every tyre pressed on the road, so steering and brakes work.', 'Carry the weight — the springs hold up the car at the right height.', 'Hold the wheel in the right position — angles (camber, toe) stay correct while the wheel moves.'] },
    { id: 'parts', svg: 'quarter', h: 'The main parts',
      li: ['Spring — carries the weight and stores the energy of a bump (coil, leaf, torsion bar or air).', 'Shock absorber (damper) — stops the spring bouncing again and again.', 'Arms and links — hold the wheel in place and let it move only up and down.', 'Bushes and ball joints — the flexible pivots between arms, knuckle and body.', 'Anti-roll bar — links left and right wheels to reduce body lean in corners.'],
      p: ['In the picture, ① is the sprung weight (body, engine, people — carried by the spring). ② is the unsprung weight (wheel, tyre, brake, knuckle — not carried by the spring). The lighter ② is, the better the tyre follows the road.'] },
    { id: 'spring', svg: 'spring', h: 'How a spring works',
      p: ['The heavier the load, the more the spring is squeezed. Put double the weight on it and it squeezes double.'],
      li: ['When the wheel hits a bump the spring squeezes and stores the energy, then pushes back.', 'A soft spring gives a comfortable ride but the body moves more.', 'A stiff spring is used for heavy loads (trucks, pickups) but the ride is harder.', 'A broken or tired (sagging) spring makes that corner of the car sit low.'] },
    { id: 'damper', svg: 'damper', h: 'How a shock absorber works',
      p: ['A spring alone keeps bouncing up and down. The shock absorber stops this.'],
      li: ['Inside is a piston on a rod, moving in a tube full of oil.', 'When the wheel moves, the piston forces oil through very small holes and valves.', 'Pushing oil through small holes needs force — the movement energy turns into heat.', 'Compression (wheel goes up) is kept soft; rebound (wheel comes down) is made firmer, so the car settles in one bounce.', 'Test: push down one corner of the car and let go. It should rise and stop. If it bounces 2–3 times, the shock is worn.'] },
    { id: 'types', svg: 'axles', h: 'Independent and rigid (dependent) suspension',
      li: ['1 — Independent: each wheel moves on its own. A bump on one side does not tilt the other wheel. Better comfort and grip. Examples: MacPherson strut, double wishbone, multi-link.', '2 — Rigid axle: both wheels are joined by one solid axle. When one wheel goes up, both wheels tilt. Very strong and cheap — used for heavy loads. Examples: leaf-spring live axle in trucks and pickups.', 'In between: the twist-beam axle — the beam twists, so the wheels are partly independent.'] },
    { id: 'align', svg: 'align', h: 'Wheel alignment angles',
      li: ['Camber — the tilt of the wheel seen from the front. Top tilted in = negative camber. Wrong camber wears one edge of the tyre.', 'Caster — the backward tilt of the steering axis seen from the side. It makes the steering come back to straight by itself (like a shopping-trolley wheel).', 'Toe — wheels seen from above. Toe-in = fronts of the wheels point slightly inward. Wrong toe makes the tyre wear with a feathered edge.', 'After replacing any arm, tie rod or knuckle, always do a wheel alignment.'] },
    { id: 'roll', svg: 'roll', h: 'Body roll and the anti-roll bar',
      li: ['In a corner, the body leans to the outside (body roll) because of centrifugal force.', 'The anti-roll bar is a steel torsion bar connecting left and right suspension. When one side goes up and the other down, the bar twists and resists the lean.', 'When both wheels go up together (a speed breaker), the bar does not twist, so the ride stays comfortable.', 'A thicker bar = less lean. A stiffer front bar makes the car understeer (go wider in a turn).'] },
    { id: 'faults', h: 'Common faults — symptom and cause', table: [['Clunk / knock over bumps', 'Worn drop link, ball joint, bush or top mount'], ['Car keeps bouncing', 'Worn shock absorber (oil leak)'], ['One corner sits low', 'Broken or sagging spring; air spring leak'], ['Pulls to one side', 'Wrong alignment, worn bush, bent arm'], ['Tyre worn on one edge', 'Wrong camber or toe'], ['Noise when steering at parking speed', 'Top-mount bearing seized'], ['Steering wheel shakes when braking', 'Disc thickness variation, worn arm bush']] },
    { id: 'safety', h: 'Workshop safety', li: ['Never work under a car held only by a jack — always use axle stands.', 'Never open a strut without a proper spring compressor. A compressed spring can kill.', 'Release air pressure before opening any air-suspension part.', 'Do not blow brake dust with compressed air. Wear a mask and gloves.', 'Tighten rubber-bush bolts with the car at normal ride height, and use a torque wrench for every bolt.'] }
  ],
  gu: [
    { id: 'jobs', svg: 'jobs', h: 'સસ્પેન્શન શું કામ કરે છે?',
      p: ['સસ્પેન્શન વ્હીલને ગાડીની બૉડી સાથે જોડે છે. તેના ચાર કામ છે:'],
      li: ['આરામ — ખાડા-ટેકરાના આંચકા શોષી લે છે, જેથી અંદર બેઠેલા લોકો અને માલ હલે નહીં.', 'પકડ — દરેક ટાયરને રસ્તા પર દબાવેલું રાખે છે, જેથી સ્ટીયરિંગ અને બ્રેક બરાબર કામ કરે.', 'વજન ઉપાડવું — સ્પ્રિંગ ગાડીને સાચી ઊંચાઈ પર રાખે છે.', 'વ્હીલને સાચી પોઝિશનમાં રાખવું — વ્હીલ ઉપર-નીચે થાય ત્યારે પણ ખૂણા (કૅમ્બર, ટો) બરાબર રહે.'] },
    { id: 'parts', svg: 'quarter', h: 'મુખ્ય ભાગ',
      li: ['સ્પ્રિંગ — વજન ઉપાડે છે અને આંચકાની ઊર્જા ભરી રાખે છે (કોઇલ, પાટા, ટોર્શન બાર અથવા હવા).', 'શૉક એબ્ઝોર્બર — સ્પ્રિંગને વારંવાર ઉછળતી અટકાવે છે.', 'આર્મ અને લિંક — વ્હીલને જગ્યા પર પકડે છે અને ફક્ત ઉપર-નીચે જવા દે છે.', 'બુશ અને બૉલ જોઇન્ટ — આર્મ, નકલ અને બૉડી વચ્ચેના લવચીક સાંધા.', 'એન્ટી-રોલ બાર — ડાબા-જમણા વ્હીલને જોડે છે અને વળાંકમાં બૉડીનો ઝુકાવ ઘટાડે છે.'],
      p: ['આકૃતિમાં ① સ્પ્રંગ વજન છે (બૉડી, એન્જિન, લોકો — સ્પ્રિંગ ઉપાડે છે). ② અનસ્પ્રંગ વજન છે (વ્હીલ, ટાયર, બ્રેક, નકલ — સ્પ્રિંગ ઉપાડતી નથી). ② જેટલું હલકું, તેટલું ટાયર રસ્તાને વધુ સારી રીતે અનુસરે.'] },
    { id: 'spring', svg: 'spring', h: 'સ્પ્રિંગ કેવી રીતે કામ કરે છે',
      p: ['વજન જેટલું વધારે, સ્પ્રિંગ એટલી વધારે દબાય. વજન બમણું કરો તો સ્પ્રિંગ પણ બમણી દબાય.'],
      li: ['વ્હીલ ટેકરા સાથે અથડાય ત્યારે સ્પ્રિંગ દબાઈને ઊર્જા ભરે છે અને પછી પાછી ધકેલે છે.', 'નરમ સ્પ્રિંગ આરામ આપે છે, પણ બૉડી વધુ હલે છે.', 'કડક સ્પ્રિંગ ભારે વજન માટે (ટ્રક, પિકઅપ) વપરાય છે, પણ સવારી કડક લાગે છે.', 'તૂટેલી કે બેસી ગયેલી સ્પ્રિંગથી ગાડીનો તે ખૂણો નીચો બેસે છે.'] },
    { id: 'damper', svg: 'damper', h: 'શૉક એબ્ઝોર્બર કેવી રીતે કામ કરે છે',
      p: ['એકલી સ્પ્રિંગ વારંવાર ઉપર-નીચે ઉછળ્યા કરે. શૉક એબ્ઝોર્બર તેને રોકે છે.'],
      li: ['અંદર રૉડ પર પિસ્ટન છે, જે ઑઇલ ભરેલી ટ્યુબમાં ફરે છે.', 'વ્હીલ હલે ત્યારે પિસ્ટન ઑઇલને બહુ નાના છિદ્રો અને વાલ્વમાંથી ધકેલે છે.', 'નાના છિદ્રોમાંથી ઑઇલ ધકેલવા બળ જોઈએ — હલનચલનની ઊર્જા ગરમીમાં બદલાય છે.', 'કૉમ્પ્રેશન (વ્હીલ ઉપર) નરમ રાખવામાં આવે છે; રિબાઉન્ડ (વ્હીલ નીચે) કડક, જેથી ગાડી એક ઉછાળામાં સ્થિર થાય.', 'ટેસ્ટ: ગાડીનો એક ખૂણો દબાવીને છોડો. તે ઉપર આવીને અટકવી જોઈએ. 2-3 વાર ઉછળે તો શૉક ઘસાયેલો છે.'] },
    { id: 'types', svg: 'axles', h: 'ઇન્ડિપેન્ડન્ટ અને રિજિડ (ડિપેન્ડન્ટ) સસ્પેન્શન',
      li: ['1 — ઇન્ડિપેન્ડન્ટ: દરેક વ્હીલ અલગ હલે છે. એક બાજુના ટેકરાથી બીજું વ્હીલ નમતું નથી. આરામ અને પકડ વધુ. ઉદાહરણ: મૅકફર્સન, ડબલ વિશબોન, મલ્ટી-લિંક.', '2 — રિજિડ એક્સલ: બંને વ્હીલ એક જ મજબૂત એક્સલથી જોડાયેલા. એક વ્હીલ ઉપર જાય તો બંને નમે. બહુ મજબૂત અને સસ્તું — ભારે વજન માટે. ઉદાહરણ: ટ્રક અને પિકઅપનો લીફ સ્પ્રિંગ એક્સલ.', 'વચ્ચેનો પ્રકાર: ટ્વિસ્ટ બીમ — બીમ વળ ખાય છે, તેથી વ્હીલ થોડા અંશે અલગ હલી શકે.'] },
    { id: 'align', svg: 'align', h: 'વ્હીલ એલાઇનમેન્ટના ખૂણા',
      li: ['કૅમ્બર — આગળથી જોતાં વ્હીલનો ઝુકાવ. ઉપરનો ભાગ અંદર = નેગેટિવ કૅમ્બર. ખોટો કૅમ્બર ટાયરની એક કિનારી ઘસે છે.', 'કૅસ્ટર — બાજુથી જોતાં સ્ટીયરિંગ ધરીનો પાછળ તરફ ઝુકાવ. તેનાથી સ્ટીયરિંગ જાતે સીધું થઈ જાય છે (શોપિંગ ટ્રોલીના પૈડાં જેવું).', 'ટો — ઉપરથી જોતાં વ્હીલની દિશા. ટો-ઇન = વ્હીલનો આગળનો ભાગ થોડો અંદર. ખોટો ટો ટાયરને પીંછા જેવું ઘસે છે.', 'કોઈ પણ આર્મ, ટાઇ રૉડ કે નકલ બદલ્યા પછી હંમેશા વ્હીલ એલાઇનમેન્ટ કરો.'] },
    { id: 'roll', svg: 'roll', h: 'બૉડી રોલ અને એન્ટી-રોલ બાર',
      li: ['વળાંકમાં કેન્દ્રત્યાગી બળને લીધે બૉડી બહારની તરફ નમે છે (બૉડી રોલ).', 'એન્ટી-રોલ બાર ડાબા-જમણા સસ્પેન્શનને જોડતો સ્ટીલનો ટોર્શન બાર છે. એક બાજુ ઉપર અને બીજી નીચે જાય ત્યારે બાર વળ ખાય છે અને ઝુકાવ રોકે છે.', 'બંને વ્હીલ સાથે ઉપર જાય (સ્પીડ બ્રેકર) ત્યારે બાર વળતો નથી, તેથી સવારી આરામદાયક રહે.', 'જાડો બાર = ઓછો ઝુકાવ. આગળનો બાર વધુ કડક હોય તો ગાડી અન્ડરસ્ટીયર કરે (વળાંકમાં બહાર જાય).'] },
    { id: 'faults', h: 'સામાન્ય ખરાબી — લક્ષણ અને કારણ', table: [['ખાડા પર ખટખટ અવાજ', 'ઘસાયેલી ડ્રોપ લિંક, બૉલ જોઇન્ટ, બુશ અથવા ટોપ માઉન્ટ'], ['ગાડી વારંવાર ઉછળે', 'ઘસાયેલો શૉક એબ્ઝોર્બર (ઑઇલ લીક)'], ['એક ખૂણો નીચો', 'તૂટેલી કે બેસી ગયેલી સ્પ્રિંગ; એર સ્પ્રિંગ લીક'], ['ગાડી એક બાજુ ખેંચાય', 'ખોટું એલાઇનમેન્ટ, ઘસાયેલો બુશ, વાંકો આર્મ'], ['ટાયર એક કિનારીથી ઘસાય', 'ખોટો કૅમ્બર અથવા ટો'], ['પાર્કિંગમાં સ્ટીયરિંગ ફેરવતાં અવાજ', 'ટોપ માઉન્ટ બેરિંગ જામ'], ['બ્રેક મારતાં સ્ટીયરિંગ ધ્રૂજે', 'ડિસ્ક જાડાઈમાં ફરક, ઘસાયેલો આર્મ બુશ']] },
    { id: 'safety', h: 'વર્કશોપ સેફ્ટી', li: ['ફક્ત જૅક પર ઊભી ગાડી નીચે ક્યારેય કામ ન કરો — હંમેશા એક્સલ સ્ટેન્ડ વાપરો.', 'સાચા સ્પ્રિંગ કૉમ્પ્રેસર વગર સ્ટ્રટ ક્યારેય ન ખોલો. દબાયેલી સ્પ્રિંગ જીવલેણ બની શકે.', 'એર સસ્પેન્શનનો કોઈ ભાગ ખોલતા પહેલાં હવાનું દબાણ કાઢો.', 'બ્રેકની ધૂળ કૉમ્પ્રેસ્ડ એરથી ન ઉડાડો. માસ્ક અને હાથમોજાં પહેરો.', 'રબર બુશના બોલ્ટ ગાડી સામાન્ય ઊંચાઈ પર હોય ત્યારે ટાઇટ કરો, અને દરેક બોલ્ટ ટૉર્ક રેન્ચથી ટાઇટ કરો.'] }
  ],
  hi: [
    { id: 'jobs', svg: 'jobs', h: 'सस्पेंशन क्या काम करता है?',
      p: ['सस्पेंशन पहियों को गाड़ी की बॉडी से जोड़ता है. इसके चार काम हैं:'],
      li: ['आराम — गड्ढों के झटके सोख लेता है, ताकि अंदर बैठे लोग और सामान न हिलें.', 'पकड़ — हर टायर को सड़क पर दबाए रखता है, ताकि स्टीयरिंग और ब्रेक ठीक काम करें.', 'वज़न उठाना — स्प्रिंग गाड़ी को सही ऊँचाई पर रखती है.', 'पहिए को सही पोज़िशन में रखना — पहिया ऊपर-नीचे हो तब भी कोण (कैम्बर, टो) सही रहें.'] },
    { id: 'parts', svg: 'quarter', h: 'मुख्य पार्ट',
      li: ['स्प्रिंग — वज़न उठाती है और झटके की ऊर्जा जमा करती है (कॉइल, पत्ती, टॉर्शन बार या हवा).', 'शॉक एब्ज़ॉर्बर — स्प्रिंग को बार-बार उछलने से रोकता है.', 'आर्म और लिंक — पहिए को जगह पर पकड़ते हैं और सिर्फ़ ऊपर-नीचे जाने देते हैं.', 'बुश और बॉल जॉइंट — आर्म, नकल और बॉडी के बीच के लचीले जोड़.', 'एंटी-रोल बार — बाएँ-दाएँ पहिए को जोड़ता है और मोड़ पर बॉडी का झुकाव कम करता है.'],
      p: ['आकृति में ① स्प्रंग वज़न है (बॉडी, इंजन, लोग — स्प्रिंग उठाती है). ② अनस्प्रंग वज़न है (पहिया, टायर, ब्रेक, नकल — स्प्रिंग नहीं उठाती). ② जितना हल्का, टायर उतना अच्छा सड़क को पकड़ता है.'] },
    { id: 'spring', svg: 'spring', h: 'स्प्रिंग कैसे काम करती है',
      p: ['वज़न जितना ज़्यादा, स्प्रिंग उतनी ज़्यादा दबती है. वज़न दोगुना करें तो स्प्रिंग भी दोगुनी दबती है.'],
      li: ['पहिया उभार से टकराए तो स्प्रिंग दबकर ऊर्जा जमा करती है और फिर वापस धकेलती है.', 'नरम स्प्रिंग आराम देती है, पर बॉडी ज़्यादा हिलती है.', 'सख्त स्प्रिंग भारी वज़न के लिए (ट्रक, पिकअप) लगती है, पर सवारी सख्त लगती है.', 'टूटी या बैठी स्प्रिंग से गाड़ी का वह कोना नीचा बैठता है.'] },
    { id: 'damper', svg: 'damper', h: 'शॉक एब्ज़ॉर्बर कैसे काम करता है',
      p: ['अकेली स्प्रिंग बार-बार ऊपर-नीचे उछलती रहती है. शॉक एब्ज़ॉर्बर इसे रोकता है.'],
      li: ['अंदर रॉड पर पिस्टन है, जो तेल से भरी ट्यूब में चलता है.', 'पहिया हिलने पर पिस्टन तेल को बहुत छोटे छेदों और वाल्व से धकेलता है.', 'छोटे छेदों से तेल धकेलने में बल लगता है — हलचल की ऊर्जा गर्मी में बदल जाती है.', 'कंप्रेशन (पहिया ऊपर) नरम रखा जाता है; रिबाउंड (पहिया नीचे) सख्त, ताकि गाड़ी एक उछाल में स्थिर हो जाए.', 'टेस्ट: गाड़ी का एक कोना दबाकर छोड़ें. वह ऊपर आकर रुक जाए. 2-3 बार उछले तो शॉक घिसा है.'] },
    { id: 'types', svg: 'axles', h: 'इंडिपेंडेंट और रिजिड (डिपेंडेंट) सस्पेंशन',
      li: ['1 — इंडिपेंडेंट: हर पहिया अलग से हिलता है. एक तरफ़ के झटके से दूसरा पहिया नहीं झुकता. आराम और पकड़ ज़्यादा. उदाहरण: मैकफर्सन, डबल विशबोन, मल्टी-लिंक.', '2 — रिजिड एक्सल: दोनों पहिए एक ही मज़बूत एक्सल से जुड़े. एक पहिया ऊपर जाए तो दोनों झुकते हैं. बहुत मज़बूत और सस्ता — भारी वज़न के लिए. उदाहरण: ट्रक और पिकअप का लीफ स्प्रिंग एक्सल.', 'बीच का प्रकार: ट्विस्ट बीम — बीम मरोड़ खाता है, इसलिए पहिए कुछ हद तक अलग हिल सकते हैं.'] },
    { id: 'align', svg: 'align', h: 'व्हील अलाइनमेंट के कोण',
      li: ['कैम्बर — सामने से देखने पर पहिए का झुकाव. ऊपरी हिस्सा अंदर = नेगेटिव कैम्बर. गलत कैम्बर टायर का एक किनारा घिसता है.', 'कैस्टर — साइड से देखने पर स्टीयरिंग धुरी का पीछे की ओर झुकाव. इससे स्टीयरिंग खुद सीधा हो जाता है (शॉपिंग ट्रॉली के पहिए जैसा).', 'टो — ऊपर से देखने पर पहियों की दिशा. टो-इन = पहियों का आगे का हिस्सा थोड़ा अंदर. गलत टो से टायर पंख जैसा घिसता है.', 'कोई भी आर्म, टाई रॉड या नकल बदलने के बाद हमेशा व्हील अलाइनमेंट करें.'] },
    { id: 'roll', svg: 'roll', h: 'बॉडी रोल और एंटी-रोल बार',
      li: ['मोड़ पर अपकेंद्री बल के कारण बॉडी बाहर की ओर झुकती है (बॉडी रोल).', 'एंटी-रोल बार बाएँ-दाएँ सस्पेंशन को जोड़ने वाला स्टील टॉर्शन बार है. एक तरफ़ ऊपर और दूसरी नीचे जाए तो बार मरोड़ खाता है और झुकाव रोकता है.', 'दोनों पहिए साथ ऊपर जाएँ (स्पीड ब्रेकर) तो बार नहीं मुड़ता, इसलिए सवारी आरामदायक रहती है.', 'मोटा बार = कम झुकाव. आगे का बार ज़्यादा सख्त हो तो गाड़ी अंडरस्टीयर करती है (मोड़ पर बाहर जाती है).'] },
    { id: 'faults', h: 'आम खराबी — लक्षण और कारण', table: [['गड्ढे पर खटखट आवाज़', 'घिसी ड्रॉप लिंक, बॉल जॉइंट, बुश या टॉप माउंट'], ['गाड़ी बार-बार उछलती है', 'घिसा शॉक एब्ज़ॉर्बर (तेल लीक)'], ['एक कोना नीचा', 'टूटी या बैठी स्प्रिंग; एयर स्प्रिंग लीक'], ['गाड़ी एक तरफ़ खिंचती है', 'गलत अलाइनमेंट, घिसा बुश, मुड़ा आर्म'], ['टायर एक किनारे से घिसता है', 'गलत कैम्बर या टो'], ['पार्किंग में स्टीयरिंग घुमाने पर आवाज़', 'टॉप माउंट बेयरिंग जाम'], ['ब्रेक लगाने पर स्टीयरिंग काँपता है', 'डिस्क की मोटाई में फ़र्क, घिसा आर्म बुश']] },
    { id: 'safety', h: 'वर्कशॉप सेफ्टी', li: ['सिर्फ़ जैक पर खड़ी गाड़ी के नीचे कभी काम न करें — हमेशा एक्सल स्टैंड लगाएँ.', 'सही स्प्रिंग कंप्रेसर के बिना स्ट्रट कभी न खोलें. दबी स्प्रिंग जानलेवा हो सकती है.', 'एयर सस्पेंशन का कोई भी पार्ट खोलने से पहले हवा का दबाव निकालें.', 'ब्रेक की धूल कंप्रेस्ड एयर से न उड़ाएँ. मास्क और दस्ताने पहनें.', 'रबर बुश के बोल्ट गाड़ी सामान्य ऊँचाई पर हो तब टाइट करें, और हर बोल्ट टॉर्क रिंच से टाइट करें.'] }
  ]
};
const THEORY_HEAD = { en: ['Symptom', 'Likely cause'], gu: ['લક્ષણ', 'સંભવિત કારણ'], hi: ['लक्षण', 'संभावित कारण'] };

const THEORY_SVG_TX = { en: { CAMBER: 'Camber', CASTER: 'Caster', TOE: 'Toe-in' }, gu: { CAMBER: 'કૅમ્બર', CASTER: 'કૅસ્ટર', TOE: 'ટો-ઇન' }, hi: { CAMBER: 'कैम्बर', CASTER: 'कैस्टर', TOE: 'टो-इन' } };
