/* Suspension Lab — component library.
   Each entry: name, cat (category key), fn (function), build (construction / material / manufacture),
   eng (engineering notes, design equations), specs, fail (failure modes → symptoms), test (inspection). */
'use strict';

const CATS = {
  struct: { label: 'Structure / locating', color: '#5b6b7c' },
  elastic: { label: 'Elastic element', color: '#d9342b' },
  damp: { label: 'Damping', color: '#0a7db4' },
  link: { label: 'Linkage & joints', color: '#7a4fd6' },
  wheel: { label: 'Wheel end', color: '#188a48' },
  steer: { label: 'Steering & driveline', color: '#d97400' },
  ctrl: { label: 'Control & air supply', color: '#c99300' }
};

const PARTS = {
  /* ── wheel end ─────────────────────────────────────────── */
  wheelnuts: {
    name: 'Wheel nuts / bolts', cat: 'wheel',
    fn: 'Clamp the wheel to the hub flange. The clamp force — not the stud in shear — carries braking and cornering loads by friction between the wheel and hub faces.',
    build: 'Property class 10.9 heat-treated steel, zinc-flake coated. 60° conical or spherical (radius) seat that centres the wheel on the stud circle; hub-centric spigot does the precise centring.',
    eng: 'Preload F = T / (K·d) with nut factor K ≈ 0.18–0.22. A 120 N·m torque on an M14 stud gives about 45 kN of clamp per stud. Uneven tightening distorts the disc hat and causes thickness variation (DTV) → brake judder.',
    specs: { 'Thread': 'M12×1.5 / M14×1.5', 'Torque (car)': '100–140 N·m', 'Torque (LCV)': '160–200 N·m', 'Seat': '60° cone / R12–R14 ball' },
    fail: ['Under-torque → studs fatigue, wheel loss', 'Over-torque / impact gun → stretched studs, warped disc hat', 'Wrong seat type → point contact, loosening'],
    test: ['Torque in star pattern with a calibrated wrench', 'Re-check after 50–100 km on alloy wheels', 'Inspect threads for stretch (nut binds by hand)']
  },
  rim: {
    name: 'Road wheel (alloy rim)', cat: 'wheel',
    fn: 'Carries the tyre bead, transmits all tyre forces to the hub and holds the inflation air. Its offset (ET) sets the scrub radius and the bearing load moment arm.',
    build: 'Low-pressure die-cast or flow-formed A356-T6 aluminium (Al-Si7Mg). Flow-forming spins the barrel thin and work-hardened, saving ~15% mass. Drop-centre well lets the bead be mounted; safety humps (H2) keep the bead seated when deflated.',
    eng: 'Rotating mass counts twice: rotational inertia adds an "equivalent mass" of I/r². Unsprung mass sets wheel-hop frequency f = (1/2π)·√((k_s+k_t)/m_u). A 1 kg reduction per corner is worth a measurable gain in tyre-load variation on rough roads.',
    specs: { 'Size': '7J × 17 typical', 'Offset (ET)': '+35 to +50 mm', 'PCD': '5 × 112 / 5 × 114.3', 'Mass': '8–11 kg' },
    fail: ['Kerb damage → bent flange, slow leaks', 'Corrosion at bead seat → air loss', 'Radial / lateral run-out → vibration at 80–120 km/h'],
    test: ['Dial-indicator run-out: < 0.5 mm radial and lateral', 'Dye-penetrant check near spokes after impacts', 'Balance on a dynamic balancer']
  },
  tyre: {
    name: 'Tyre (radial)', cat: 'wheel',
    fn: 'The only contact with the road. Generates the longitudinal, lateral and vertical forces, and is the first spring and damper in the ride path (vertical stiffness k_t).',
    build: 'Radial ply carcass (polyester / rayon cords at 90°) under two steel belts at ±20–25°, nylon cap ply, tread compound (SBR + silica), steel bead wire bundles, butyl inner liner.',
    eng: 'Lateral force F_y ≈ C_α·α for small slip angle, with cornering stiffness C_α around 1000–1500 N/deg. The Pacejka "Magic Formula" F = D·sin(C·atan(B·x − E(B·x − atan(B·x)))) fits the full curve. Vertical stiffness k_t ≈ 180–300 kN/m rises with inflation pressure.',
    specs: { 'Size': '225/45 R17 94W', 'Vertical rate k_t': '≈ 230 kN/m', 'Pressure': '2.2–2.6 bar', 'Mass': '9–11 kg' },
    fail: ['Under-inflation → shoulder wear, heat, carcass failure', 'Toe out of spec → feathered tread', 'Excess negative camber → inner-edge wear', 'Damper wear → cupping (scalloped wear)'],
    test: ['Tread depth ≥ 1.6 mm (legal), 3 mm recommended', 'Check DOT date code (age < 6–8 years)', 'Inspect sidewall for bulges, cracks']
  },
  caliper: {
    name: 'Brake caliper & carrier', cat: 'wheel',
    fn: 'Squeezes the pads onto the disc. The carrier (anchor bracket) passes the brake torque into the knuckle; the floating caliper slides on guide pins.',
    build: 'Spheroidal-graphite cast iron (EN-GJS-400) floating caliper or aluminium fixed multi-piston caliper. Square-section seal gives piston rollback and wear compensation.',
    eng: 'Clamp force F = p·A_piston. Brake torque T = 2·μ·F·r_eff with pad friction μ ≈ 0.35–0.45. Mounted as heavy unsprung mass and, ideally, close to the steering axis to keep steering inertia low.',
    specs: { 'Type': 'Single-piston floating', 'Piston Ø': '54–60 mm', 'Bracket torque': '90–120 N·m', 'Guide pin torque': '25–35 N·m' },
    fail: ['Seized guide pins → uneven pad wear, pulling', 'Piston seal leak → soft pedal, fluid loss', 'Sticking piston → overheating, drag'],
    test: ['Measure pad thickness (min 2–3 mm)', 'Check guide-pin boots and slide freely', 'Never hang the caliper by the brake hose']
  },
  disc: {
    name: 'Brake disc (rotor)', cat: 'wheel',
    fn: 'The rotating friction surface that turns kinetic energy into heat. Its vents pump air outward to cool it.',
    build: 'Grey cast iron EN-GJL-250 (high carbon for damping and thermal conductivity), internally vented with curved or straight vanes. Hat section separates the friction ring from the hub flange.',
    eng: 'One stop from 100 km/h in a 1500 kg car releases ½mv² ≈ 580 kJ, about 70% into the front discs. Thermal judder comes from disc thickness variation (DTV) > 10–15 µm.',
    specs: { 'Diameter': '280–320 mm', 'Thickness': '25–28 mm (vented)', 'Min. thickness': 'stamped on hat', 'Run-out max': '0.05 mm' },
    fail: ['DTV / run-out → steering judder', 'Heat-checking cracks', 'Lip formation / scoring', 'Corrosion of non-swept area'],
    test: ['Micrometer at 8 points for DTV', 'Dial gauge for lateral run-out on the hub', 'Clean the hub face before refitting']
  },
  hub: {
    name: 'Hub & wheel bearing unit', cat: 'wheel',
    fn: 'Lets the wheel rotate about the spindle while carrying radial, axial and moment loads. Gen-3 units include the flange, studs and ABS encoder ring in one sealed cartridge.',
    build: 'Double-row angular-contact ball bearing (O-arrangement) in SAE 52100 / 100Cr6 through-hardened steel, induction-hardened raceways, greased for life, with a magnetic multipole encoder seal.',
    eng: 'The O-arrangement widens the effective bearing span and so its moment stiffness. Rating life L10 = (C/P)³ × 10⁶ revolutions for ball bearings. Cornering at 0.8 g puts the largest moment load on the outer wheel bearing.',
    specs: { 'Type': 'Gen-3 DACB', 'Axle nut torque': '200–300 N·m (stake/replace)', 'End-play': '< 0.05 mm', 'Encoder': '48 pole pairs' },
    fail: ['Hum / growl that changes when cornering (load transfer)', 'Play → ABS warning, uneven pad wear', 'Seal failure → water ingress, brinelling'],
    test: ['Rock the wheel at 12–6 o\'clock for play', 'Spin by hand and feel for roughness', 'ABS sensor air gap & signal check']
  },
  knuckle: {
    name: 'Steering knuckle (upright)', cat: 'struct',
    fn: 'The rigid "upright" that carries the hub bearing, brake, steering arm and the joints to every locating link. Its hard points set the kingpin axis, scrub radius, caster trail and the Ackermann geometry.',
    build: 'Spheroidal-graphite iron EN-GJS-500 (cast) or forged / cast aluminium 6082-T6 or A356 for less unsprung mass. Bearing bore and joint tapers are CNC finish-machined.',
    eng: 'Kingpin inclination (KPI) of 10–14° with small scrub radius cuts steering kickback. The steering-arm length and toe-link height set the bump-steer curve, which should be almost flat (< 0.1°/50 mm).',
    specs: { 'Material': 'GJS-500 / Al 6082-T6', 'Mass': '3–6 kg', 'KPI': '10–14°', 'Scrub radius': '−10 to +20 mm' },
    fail: ['Crash / pothole → bent steering arm, toe out of spec', 'Bearing bore wear → creep, noise', 'Seized pinch bolt / taper'],
    test: ['Alignment check after any impact', 'Compare measured KPI and caster with spec — a large error points to a bent knuckle']
  },
  drum: {
    name: 'Brake drum & shoes', cat: 'wheel',
    fn: 'Rear brake on many commercial axles. Two shoes press outward against the inside of a rotating drum. The leading shoe is self-energising, so a small actuating force gives a large brake torque.',
    build: 'Grey cast-iron drum (often with a cast-in steel hat), bonded-lining shoes, wheel cylinder, auto-adjuster and return springs on a pressed backing plate. The parking brake works on the same shoes.',
    eng: 'Shoe factor C* ≈ 2–2.5 for a leading/trailing layout, against 0.8 for a disc (2μ). Higher gain but less stable as μ falls with heat ("fade"). The enclosed design resists mud — useful for off-road and commercial duty.',
    specs: { 'Diameter': '254–295 mm', 'Max wear Ø': 'cast on drum', 'Lining min.': '1.5 mm' },
    fail: ['Oval drum → pulsing pedal', 'Seized adjuster → long pedal travel, weak handbrake', 'Wheel-cylinder leak → contaminated linings'],
    test: ['Measure inner diameter against the max-wear limit', 'Back off the adjuster before pulling the drum']
  },
  stubaxle: {
    name: 'Stub axle / wheel carrier', cat: 'wheel',
    fn: 'Non-driven spindle bolted to the beam\'s end plate. Carries the hub bearing and sets the static toe and camber of the rear wheel.',
    build: 'Forged medium-carbon steel spindle with an induction-hardened bearing seat, bolted with four bolts to the welded end plate. Shims or the plate angle set toe and camber.',
    eng: 'On a twist beam, static toe-in (≈ +0.2°) and negative camber (≈ −1.5°) are built in. Lateral force compliance steer comes from the pivot bushings — not from the carrier.',
    specs: { 'Bolt torque': '60–80 N·m', 'Toe': '+0.1° to +0.3° per side', 'Camber': '−1.0° to −1.8°' },
    fail: ['Bent plate after kerb strike → tyre wear', 'Bearing wear'],
    test: ['Rear alignment check; the toe is not adjustable without shims']
  },

  /* ── elastic elements ─────────────────────────────────── */
  spring: {
    name: 'Coil spring', cat: 'elastic',
    fn: 'Stores energy and carries the static weight of the corner, setting ride height and ride frequency. Its rate, together with the motion ratio, gives the wheel rate.',
    build: 'Hot- or cold-coiled high-tensile Si-Cr spring steel (e.g. 54SiCr6), shot-peened for compressive surface stress, then epoxy powder-coated. Ends are pigtailed or ground flat into rubber or PU isolators.',
    eng: 'Rate k = G·d⁴ / (8·D³·n_a), where G ≈ 79 GPa, d is the wire Ø, D the mean coil Ø and n_a the active coils. Wheel rate k_w = k·MR², with motion ratio MR = spring travel / wheel travel. Ride frequency f = (1/2π)·√(k_ride/m_s), aiming for about 1.0–1.5 Hz on cars. Side-load (S-shaped or offset) springs cancel the strut friction moment on a MacPherson.',
    specs: { 'Wire Ø d': '11–14 mm', 'Mean coil Ø D': '110–150 mm', 'Active coils': '5–7', 'Rate': '20–45 N/mm' },
    fail: ['Broken end coil (corrosion pit → fatigue crack) → clunk, lean', 'Sag → low ride height, bottoming', 'Coating chips → corrosion'],
    test: ['Measure ride height at the arch vs spec', 'Inspect lower pigtail at the seat for breakage', 'Always replace in axle pairs']
  },
  leaf: {
    name: 'Multi-leaf spring pack', cat: 'elastic',
    fn: 'A spring and a locating link in one part. It carries the load, locates the axle fore-aft and laterally, and reacts drive and brake torque.',
    build: 'Graduated leaves of 55Cr3 / 60Si7 spring steel, hot-formed, quenched and tempered, then stress-peened. The main leaf has rolled eyes with rubber or polyurethane bushes, and a centre bolt and rebound clips hold the pack together.',
    eng: 'For a semi-elliptic spring of n leaves (span L between eyes), the rate is k ≈ 8·n·E·b·t³ / (3·L³) for a uniform-strength leaf pack. Inter-leaf Coulomb friction gives hysteresis (useful damping, but a harsh ride on small bumps). Under drive torque the spring winds up into an "S", causing axle tramp.',
    specs: { 'Leaves': '3–7 (graduated)', 'Width b': '60–75 mm', 'Thickness t': '7–12 mm', 'Rate': '60–200 N/mm (progressive with helper)' },
    fail: ['Broken main leaf → axle shift, dog-tracking', 'Sag / loss of arch → low rear', 'Worn eye bushes → clunks, rear steer', 'Rusted leaves → squeak, high friction'],
    test: ['Measure arch (free camber) against spec', 'Lever-check the eye and shackle bushes', 'Check the centre bolt and U-bolt torque']
  },
  airspring: {
    name: 'Air spring (rolling-lobe bellows)', cat: 'elastic',
    fn: 'Uses compressed air as the spring. It keeps ride height constant at any load and allows ride-height changes (access, motorway lowering).',
    build: 'Cord-reinforced (nylon / aramid) elastomer bellows that rolls over a contoured piston, with crimped aluminium end caps, an external guide tube, and an integrated residual-pressure valve that holds ≥ 1–2 bar so the bellows never fold.',
    eng: 'Force F = (p − p_atm)·A_eff. Rate k = n·p·A_e²/V + p·dA_e/dz, with polytropic index n ≈ 1.0 (slow, isothermal) to 1.4 (fast, adiabatic). Because rate rises with load, the natural frequency f = (1/2π)·√(k/m) stays nearly constant from empty to laden — the main advantage over steel springs. The piston contour shapes the dA/dz term (progression).',
    specs: { 'Working pressure': '5–12 bar', 'Effective Ø': '90–120 mm', 'Volume': '0.8–2.0 L', 'Ride freq.': '≈ 1.0 Hz at any load' },
    fail: ['Bellows cracking at the fold → leak, car "kneels" overnight', 'Residual-pressure valve stuck', 'Grit under the guide tube → abrasion'],
    test: ['Soap-water leak test at the crimps and fold', 'Read pressure / height values with a diagnostic tool', 'Never unbolt a pressurised spring — vent it with the tool first']
  },
  arb: {
    name: 'Anti-roll bar (stabiliser)', cat: 'elastic',
    fn: 'A torsion bar linking the left and right wheels. It resists body roll without stiffening single-wheel bumps much, and tunes the front/rear roll-stiffness split (and so understeer/oversteer balance).',
    build: 'Solid or tubular 34MnB5 / 51CrV4 steel, cold- or hot-bent, induction-hardened and shot-peened. Rubber D-bushes clamp it to the subframe; collars stop it sliding sideways.',
    eng: 'Bar torsional rate k_θ = G·J / L, with J = π(D⁴−d⁴)/32. With lever arm ℓ, track t and link motion ratio MR, the bar twists by MR·t·φ/ℓ when the body rolls by φ, so the roll stiffness is K_φ = k_θ·(MR·t/ℓ)². Bar stiffness rises with D⁴ — 2 mm more diameter adds about 30% stiffness. Raising the front share of total roll stiffness increases understeer.',
    specs: { 'Diameter': '20–28 mm (tubular 24×4)', 'Lever arm': '180–250 mm', 'Bush clamp torque': '45–60 N·m' },
    fail: ['Worn D-bushes → knock over bumps', 'Cracked bar at a bend (rare)', 'Bushes squeak when dry'],
    test: ['Lever-check the bushes; inspect for ovality', 'Tighten links and bushes at ride height, never at full droop']
  },
  droplink: {
    name: 'Drop link (stabiliser link)', cat: 'link',
    fn: 'Connects the anti-roll bar end to the strut or arm. Ball joints at both ends let the bar twist while the wheel moves through bump, rebound and steer.',
    build: 'Glass-fibre PA66 or steel body with two small ball joints (POM liner, grease, boot). Its length sets the bar\'s preload at ride height.',
    eng: 'Mounting the link on the strut body gives a motion ratio near 1 and keeps the link force in line, so it works well. A link that leans far from vertical loses effective bar stiffness (∝ cos²θ).',
    specs: { 'Length': '200–320 mm', 'Nut torque': '40–65 N·m (hold the hex/Torx)' },
    fail: ['Worn ball → "clonk" over speed bumps at low speed', 'Split boot → rapid wear'],
    test: ['Grip and shake with the wheels on the ground; any play is excessive', 'Hold the stud with an Allen key while undoing the nut']
  },

  /* ── damping ───────────────────────────────────────────── */
  damper: {
    name: 'Damper (shock absorber)', cat: 'damp',
    fn: 'Turns the energy of spring oscillation into heat by forcing oil through restrictive valves. It controls body motion (around 1 Hz) and wheel hop (around 10–15 Hz), and keeps the tyre load steady.',
    build: 'Twin-tube: a pressure tube inside a reservoir tube, piston valve plus base (foot) valve, low-pressure nitrogen at 4–8 bar. Monotube: a single tube with a floating piston and high-pressure gas at 20–30 bar. Shim stacks set the force–velocity curve. Hard-chromed rod with a PTFE guide and lip seal.',
    eng: 'F = c·v, usually as a digressive curve: high "low-speed" damping for body control, blown off at high speed for impacts. Damping ratio ζ = c/(2√(k·m)), with a target of about 0.25–0.4 (comfort) to 0.5–0.7 (sport). Rebound is typically 2–3 × compression. Gas pressure stops cavitation and adds a small extending force.',
    specs: { 'Type': 'Twin-tube gas', 'Rod Ø': '20–22 mm (strut)', 'Bore': '32 / 36 mm', 'Force @ 0.52 m/s': '≈ 1200 N reb / 500 N comp' },
    fail: ['Oil leak past rod seal → loss of damping', 'Worn valves → float, wallow, long stopping distance', 'Bent rod → binding, knocking', 'Cupped tyre wear'],
    test: ['Bounce test (should settle in ≤ 1.5 cycles)', 'EUSAMA plate tester: adhesion ≥ 40%', 'Look for fresh oil film below the rod seal']
  },
  cdc: {
    name: 'Adaptive damper (CDC valve)', cat: 'damp',
    fn: 'A continuously variable damper. A proportional solenoid valve changes the oil path in milliseconds so the ECU can apply "skyhook" control: soft over small bumps, firm against body motion.',
    build: 'Twin-tube damper with an external side-mounted proportional valve (current 0.3–1.8 A). Some designs use magnetorheological oil (MagneRide) whose viscosity changes with a magnetic field in the piston.',
    eng: 'Skyhook law: F = c_sky·ż_s when ż_s·(ż_s − ż_u) > 0, otherwise c_min. It reduces body acceleration near 1 Hz without the wheel-hop penalty of a fixed high c. Bandwidth > 20 Hz is needed to control wheel motion.',
    specs: { 'Valve current': '0.3–1.8 A (PWM)', 'Response': '< 10 ms', 'Force range': '≈ 4 : 1 soft–firm' },
    fail: ['Valve coil open circuit → default (firm-ish) mode, DTC', 'Connector corrosion', 'Internal leak'],
    test: ['Measure coil resistance (≈ 2–4 Ω)', 'Run the actuator test with a diagnostic tool', 'Read stored DTCs']
  },
  bumpstop: {
    name: 'Bump stop & dust boot', cat: 'damp',
    fn: 'The jounce bumper is a progressive secondary spring that limits travel and softens the end of travel. The boot keeps grit off the chromed rod.',
    build: 'Micro-cellular polyurethane (MCU) foam — compressible in volume, unlike rubber — moulded with convolutions for a progressive rate. The boot is a PE or TPE bellows.',
    eng: 'Bump-stop engagement is a deliberate tuning tool: early contact adds roll stiffness without raising ride rate. Force rises steeply, from ~0 to over 10 kN in the last 25 mm.',
    specs: { 'Free length': '50–90 mm', 'Material': 'MCU (Cellasto-type)', 'Max force': '15–25 kN' },
    fail: ['Crumbled bump stop → harsh crash over bumps', 'Torn boot → rod pitting → seal leak'],
    test: ['Replace with the damper; inspect for cracking']
  },
  topmount: {
    name: 'Strut top mount & bearing', cat: 'damp',
    fn: 'Fixes the strut to the body tower and isolates noise. On a front MacPherson, a thrust bearing lets the strut and spring turn with steering.',
    build: 'Steel inner and outer pressings bonded to a natural-rubber isolator, with a plastic or steel thrust ball bearing. Dual-path mounts separate the spring load from the damper-rod load for better isolation.',
    eng: 'The upper point of the steering axis. Its position sets the KPI and caster. Mount rubber stiffness (axial ≈ 1–3 kN/mm) is in series with the damper and reduces its effectiveness at high frequency.',
    specs: { 'Body nuts': '3 × M10 — 50–65 N·m', 'Piston-rod nut': '40–60 N·m', 'Bearing': 'Thrust ball / plain' },
    fail: ['Seized bearing → spring "boing" noise while steering, poor return', 'Collapsed rubber → knock, camber change', 'Torn isolator → clunk'],
    test: ['Hand on the spring while turning the wheel lock-to-lock: feel for notchiness', 'Inspect rubber for cracks and separation']
  },

  /* ── linkage ──────────────────────────────────────────── */
  lca: {
    name: 'Lower control arm (wishbone)', cat: 'link',
    fn: 'Locates the bottom of the knuckle laterally and longitudinally and reacts braking, cornering and kerb-strike loads into the subframe. Its length and pivot height set camber gain and roll-centre height.',
    build: 'Pressed and welded high-strength steel (S420MC / dual-phase DP600), forged aluminium 6082-T6, or hollow-cast aluminium. E-coated. Front bushing radial, rear "hydro" or vertical bushing to tune longitudinal compliance.',
    eng: 'Longitudinal compliance (≈ 1–2 mm/kN) absorbs impact harshness, while lateral stiffness must stay high (≈ 10–20 kN/mm) for precise steering. The arm is designed to buckle before the subframe in a misuse impact.',
    specs: { 'Material': 'S420MC steel / Al forging', 'Mass': '2.5–4.5 kg', 'Pivot bolts': 'M12–M14 — 100–150 N·m + angle' },
    fail: ['Worn bushings → clunk, braking shimmy, toe change', 'Bent arm after impact → alignment off', 'Corrosion (steel arms)'],
    test: ['Pry-bar check at bushings', 'Tighten pivot bolts at ride height to avoid pre-twisting the bushes']
  },
  uca: {
    name: 'Upper control arm (wishbone)', cat: 'link',
    fn: 'Locates the top of the upright. Being shorter than the lower arm (SLA — short-long arm), it pulls the top of the wheel inward in bump, gaining negative camber that matches body roll.',
    build: 'Forged aluminium or tubular steel A-arm with two rubber bushings and a press-fit or bolted ball joint.',
    eng: 'Front-view instant centre (IC) = intersection of the upper and lower arm lines. The roll centre lies on the line from the contact patch to the IC. Camber gain ≈ 1/(fvsa length) rad per metre of travel. Side-view arm inclination sets anti-dive / anti-squat.',
    specs: { 'Length': '200–300 mm', 'Pivot axis inclination': 'anti-dive 5–15%', 'BJ nut': '50–80 N·m' },
    fail: ['Ball joint wear → knock, vague steering', 'Bush wear → camber change under braking'],
    test: ['Lever the joint with the wheel off the ground — no axial play is allowed']
  },
  lbj: {
    name: 'Ball joint', cat: 'link',
    fn: 'A spherical joint that lets the knuckle steer and move in bump while carrying large loads. It defines a hard point of the kingpin axis.',
    build: 'A case-hardened ball stud in a POM / PA bearing shell, preloaded by a rolled or welded housing, greased for life, sealed by a neoprene boot. The taper (1:10) or pinch-bolt joint fixes it to the knuckle.',
    eng: 'A load-carrying ball joint (spring sits on that arm) takes the full corner load. A follower joint carries mostly lateral loads. Friction torque around 1–3 N·m gives good steering feel without stiction.',
    specs: { 'Ball Ø': '22–30 mm', 'Pinch-bolt torque': '50–70 N·m', 'Axial play': '0 mm (limit ≈ 0.5)' },
    fail: ['Boot split → water → rapid wear → knock', 'Excessive play → separation (wheel collapse)', 'Seized joint → heavy steering'],
    test: ['Lever between arm and knuckle: watch for movement', 'Inspect boot for splits and grease']
  },
  bushing: {
    name: 'Elastomer bushings', cat: 'link',
    fn: 'Flexible pivots between links and the body. They filter road noise and vibration, need no lubrication, and add the elasto-kinematic compliance that tunes compliance-steer.',
    build: 'Natural rubber (NR) or NR/BR blend bonded between steel or aluminium sleeves. Voids (kidney cut-outs) make radial stiffness directional. Hydro-bushings add fluid channels for frequency-dependent damping.',
    eng: 'Radial : axial : torsional stiffness ratios are tuned per location. Rubber is visco-elastic, with loss angle δ ≈ 5–10° (hydro: up to 40° at the tuned frequency). Bushings must be clamped at ride height so they work around zero twist.',
    specs: { 'Radial rate': '1–20 kN/mm', 'Shore hardness': '45–70 ShA', 'Life': '≈ 150 000 km' },
    fail: ['Torn / perished rubber → knocks, wander', 'Oil contamination → swelling, softening', 'Hydro bush leak → shimmy'],
    test: ['Pry-bar check; look for cracks at the bond line', 'Press out/in with the correct tool and orientation']
  },
  tierod: {
    name: 'Tie rod & tie-rod end', cat: 'steer',
    fn: 'Transmits steering rack motion to the knuckle steering arm. Its threaded joint is the toe adjuster. Its geometry against the arms sets bump-steer.',
    build: 'Inner axial ball joint (inside the rack boot) and outer ball-joint end, with a threaded rod and lock nut. Forged steel 42CrMo4.',
    eng: 'To avoid bump-steer, the outer tie-rod end must move on an arc whose centre matches the knuckle\'s instant motion. The inner pivot should lie on the line through the arm instant centre (the "Ackermann / bump-steer" layout).',
    specs: { 'Outer nut torque': '40–60 N·m', 'Lock nut': '45–75 N·m', 'Toe (front total)': '0 to +0.2°' },
    fail: ['Play → wander, knock, toe instability', 'Seized adjuster', 'Bent rod → toe off, steering wheel off-centre'],
    test: ['Grip the rod and shake, watching for joint movement', 'Set toe on an alignment rig after replacement']
  },
  rack: {
    name: 'Steering rack (EPS)', cat: 'steer',
    fn: 'Turns steering-wheel rotation into the linear tie-rod motion. Electric power steering (EPS) adds assist torque that depends on speed and the driver\'s input.',
    build: 'Variable-ratio rack and pinion, with a column-, pinion- or belt-driven rack-assist motor. A torsion-bar torque sensor measures driver torque.',
    eng: 'Rack gain ≈ 40–55 mm per steering-wheel revolution. The rack\'s height and length are hard points for the bump-steer curve. Rack-mounted EPS suits heavier front axle loads.',
    specs: { 'Ratio': '13–16 : 1', 'Lock to lock': '2.5–3 turns', 'Mounting': 'Subframe, 2–3 bolts' },
    fail: ['Boot split → inner tie-rod wear', 'Rack knock (yoke wear)', 'Torque-sensor fault → assist loss'],
    test: ['Check for play at the inner joint through the boot', 'Calibrate the steering-angle sensor after an alignment']
  },
  driveshaft: {
    name: 'Drive shaft (CV joints)', cat: 'steer',
    fn: 'Delivers torque from the differential to the hub while the wheel steers and moves in bump. Constant-velocity joints keep the output speed equal to the input speed at any angle.',
    build: 'Outer Rzeppa ball joint (up to ~47°) and inner tripod plunge joint (allows length change). Induction-hardened steel shaft, boots filled with molybdenum grease.',
    eng: 'A plain Cardan joint\'s speed fluctuates at angle β: ω₂/ω₁ varies between cos β and 1/cos β — a CV joint removes this. Plunge length handles the track change through travel.',
    specs: { 'Hub nut torque': '200–330 N·m', 'Outer joint angle': '≤ 47°', 'Plunge': '± 25 mm' },
    fail: ['Torn boot → grit → clicking on full lock (outer joint)', 'Tripod wear → shudder on acceleration'],
    test: ['Inspect boots; turn full lock and accelerate gently, listening for clicking']
  },

  /* ── structure ────────────────────────────────────────── */
  subframe: {
    name: 'Subframe (cradle)', cat: 'struct',
    fn: 'A separate frame carrying the arm pivots, steering rack and anti-roll bar. It holds the hard points accurately and can be rubber-mounted to the body for extra isolation.',
    build: 'Hydroformed / welded steel tubes or a cast aluminium cradle, bolted to the body with large bushings or solid mounts. Locating dowels hold the alignment.',
    eng: 'Hard-point tolerance about ±0.5 mm. Subframe mount rates (~5–15 kN/mm) are a second isolation stage. It is a key load path in front crash structures.',
    specs: { 'Body bolts': 'M14 — 110–180 N·m + angle', 'Material': 'Steel / Al' },
    fail: ['Corroded mounts', 'Mis-alignment after refit → pull, steering off-centre'],
    test: ['Use alignment pins when lowering or refitting']
  },
  body: {
    name: 'Body / strut tower', cat: 'struct',
    fn: 'The sprung structure. The strut tower reacts the top-mount load and the full spring force.',
    build: 'Spot-welded high-strength steel or cast aluminium tower (on premium cars), often braced by a strut bar.',
    eng: 'Tower stiffness affects camber stiffness under lateral load. Strut-brace bars raise it.',
    specs: { 'Tower load': '6–12 kN static per corner' },
    fail: ['Corrosion / fatigue cracks around top-mount holes'],
    test: ['Inspect the tower for cracks when replacing top mounts']
  },

  /* ── multi-link specific ──────────────────────────────── */
  link_uf: {
    name: 'Upper front link', cat: 'link',
    fn: 'One of two upper links that together act as a "virtual" upper wishbone. Because the links are separate, the virtual pivot can sit somewhere a real arm could not.',
    build: 'Forged aluminium or pressed steel link with rubber bushings at both ends.',
    eng: 'In a 5-link layout each link removes one degree of freedom of the wheel carrier (6 − 5 = 1 DOF left: wheel travel). Each link mainly carries axial force, which allows light, slim links.',
    specs: { 'Bolt torque': '70–110 N·m + angle (at ride height)' },
    fail: ['Bush wear → toe and camber instability, rear-steer feel'],
    test: ['Pry check; a rear alignment is needed after replacement']
  },
  link_ur: {
    name: 'Upper rear link', cat: 'link',
    fn: 'Pairs with the upper front link. Its angle relative to the front link sets the virtual pivot axis and so the anti-squat and longitudinal compliance.',
    build: 'Forged aluminium link with bushings.',
    eng: 'The links\' convergence point in plan view sets the virtual kingpin. On rear axles it is placed so braking forces produce slight toe-in (stable).',
    specs: { 'Bolt torque': '70–110 N·m + angle' },
    fail: ['Bush wear → clunk'], test: ['Pry check']
  },
  link_camber: {
    name: 'Lower front (camber) link', cat: 'link',
    fn: 'The lower lateral link. It sets camber and works with the spring link as the virtual lower wishbone. On many cars it has an eccentric bolt for camber adjustment.',
    build: 'Steel or aluminium link with an eccentric cam bolt at the inner end.',
    eng: 'A cam bolt moves the inner pivot laterally by about ±5 mm, giving about ±1° camber adjustment.',
    specs: { 'Cam bolt torque': '90–120 N·m' }, fail: ['Seized cam bolt'], test: ['Mark the cam position before removal']
  },
  link_toe: {
    name: 'Toe link (track rod)', cat: 'link',
    fn: 'A short link at the front or rear of the carrier that controls toe. It has an eccentric or threaded adjuster.',
    build: 'Steel rod with a ball joint or stiff bushing.',
    eng: 'Its length and inclination shape the rear-axle bump-steer and roll-steer. Designers aim for slight toe-in in bump (roll understeer) to stabilise the car in corners.',
    specs: { 'Toe (rear, per side)': '+0.10° to +0.20°' }, fail: ['Bent toe link → crab walk, tyre wear'], test: ['Alignment check']
  },
  springlink: {
    name: 'Spring link (lower trailing arm)', cat: 'link',
    fn: 'The large lower link that carries the coil spring. It also takes most of the vertical load. Together with the camber link it forms the virtual lower wishbone.',
    build: 'Cast or forged aluminium (or pressed steel) arm with a spring pan and bump-stop seat. Hydro-bushing at the inner pivot.',
    eng: 'With the spring part-way along the link the motion ratio is only about 0.45–0.7, so the coil must be 1/MR² ≈ 2–5× stiffer than the target wheel rate.',
    specs: { 'Motion ratio': '0.45–0.7', 'Inner bolt': '100–140 N·m + angle' }, fail: ['Bushing tear', 'Spring-pan corrosion'], test: ['Inspect bush; support the link before unbolting (spring load!)']
  },

  /* ── beam axles ───────────────────────────────────────── */
  twistbeam: {
    name: 'Twist-beam (torsion-beam) axle', cat: 'struct',
    fn: 'Two trailing arms welded to a cross-beam with an open (U/V) section. The beam is stiff in bending but soft in torsion, so it acts as the axle, the locating linkage and the anti-roll bar in one.',
    build: 'High-strength steel tubes and stampings (S500MC / 22MnB5 press-hardened), MAG-welded, sometimes with an internal torsion rod added for more roll stiffness. E-coat with wax injection.',
    eng: 'Behaviour lies between a trailing-arm and a solid axle, set by the beam\'s position along the arm. A beam near the pivots acts like independent trailing arms; near the wheel centres it acts like a solid axle. The open section has a low torsional constant J ≈ Σ b·t³/3, and the shear centre position sets roll-steer.',
    specs: { 'Mass': '14–22 kg', 'Roll stiffness': '≈ 400–800 N·m/deg', 'Beam section': 'V / U, t = 3–6 mm' },
    fail: ['Weld fatigue cracks at arm–beam joint', 'Corrosion inside the arms', 'Bent arm → rear toe/camber error (not adjustable)'],
    test: ['Rear alignment; check side-to-side wheelbase', 'Crack check at weld toes']
  },
  pivotbush: {
    name: 'Trailing-arm pivot bushings', cat: 'link',
    fn: 'Large rubber bushings that hold the twist-beam to the body. They allow pivoting and give the beam\'s lateral and longitudinal compliance.',
    build: 'Voided NR bushing, often angled 20–30° in plan view ("toe-correcting") so lateral force produces toe-in on the outer wheel.',
    eng: 'Angling the bushes makes compliance-steer understeering under side load. A hydro-bush adds longitudinal damping to cut impact harshness.',
    specs: { 'Bracket bolt': 'M12 — 80–110 N·m (at ride height)' },
    fail: ['Torn bush → rear steering feel, clunks'], test: ['Lever between arm and bracket']
  },
  axlehousing: {
    name: 'Live axle housing (banjo)', cat: 'struct',
    fn: 'A rigid tube connecting both wheels. It holds the differential and half-shafts and carries the full load. The wheels stay parallel, so camber relative to the road stays constant when both rise together.',
    build: 'Fabricated steel "banjo" housing (press-welded halves) or cast centre section with pressed-in tubes. Spring seats, shock brackets and the brake flanges are welded on.',
    eng: 'Very high unsprung mass (≈ 60–120 kg per axle), so wheel-hop and tramp are hard to control. One-wheel bump tilts the whole axle, giving camber to both wheels. Roll centre is high — near the spring seats for a Hotchkiss axle.',
    specs: { 'Tube Ø': '70–90 mm', 'Wall': '6–10 mm', 'Axle rating': '1.2–4 t' },
    fail: ['Bent housing → tyre wear, bearing failure', 'Seal leaks at the hubs'], test: ['Check the camber/toe of each wheel on the axle (should be ≈ 0)']
  },
  diff: {
    name: 'Differential (final drive)', cat: 'steer',
    fn: 'Hypoid crown-wheel and pinion that turns the drive by 90°, gives the final reduction, and lets the left and right wheels turn at different speeds in corners.',
    build: 'Hypoid gear set (carburised 20MnCr5), bevel spider gears, tapered roller bearings, and hypoid oil (GL-5).',
    eng: 'The pinion offset (hypoid) lowers the propshaft and lets more teeth be in contact. Drive torque reacts into the springs as wind-up (an S-shape), which causes axle tramp under hard launches.',
    specs: { 'Ratio': '3.5–4.5 : 1', 'Oil': '75W-90 GL-5, 1.5–2.5 L' }, fail: ['Whine (pinion bearing preload)', 'Oil leak at pinion seal'], test: ['Backlash 0.10–0.20 mm', 'Gear-contact pattern check']
  },
  halfshaft: {
    name: 'Half-shaft (axle shaft)', cat: 'steer',
    fn: 'Transfers torque from the differential side gear to the wheel hub inside the axle tube.',
    build: 'Induction-hardened 4140 shaft splined at the inner end. Semi-floating: the shaft also carries the wheel load through the outer bearing.',
    eng: 'Semi-floating: the shaft is in combined bending + torsion. Full-floating (trucks): the hub rides on the housing and the shaft carries only torque.',
    specs: { 'Type': 'Semi-floating', 'Spline': '28–35 teeth' }, fail: ['Outer bearing wear → oil on brakes'], test: ['Check end-float']
  },
  ubolt: {
    name: 'U-bolts & spring plate', cat: 'struct',
    fn: 'Clamp the axle to the centre of the leaf spring. The clamped length is inactive, which effectively shortens and stiffens the spring.',
    build: 'Hot-forged 40Cr / 10.9 steel U-bolts with rolled threads, high nuts and a stamped or cast spring plate (bottom plate).',
    eng: 'The clamp must prevent the leaves slipping in shear and the centre bolt breaking. U-bolts stretch on first loading, so re-torque after use.',
    specs: { 'Size': 'M14–M20', 'Torque': '120–350 N·m (criss-cross)' }, fail: ['Loose U-bolts → broken centre bolt, axle walk'], test: ['Re-torque after 500 km on new springs']
  },
  shackle: {
    name: 'Spring shackle', cat: 'link',
    fn: 'Swinging link at the rear spring eye. It lets the spring\'s length change as it flattens under load.',
    build: 'Pair of forged / pressed plates with bolts and bushes (rubber, PU or bronze with grease nipples).',
    eng: 'Shackle angle changes the effective rate. A shackle working in compression or tension changes progression.',
    specs: { 'Length': '80–120 mm', 'Bolt torque': '90–140 N·m' }, fail: ['Worn shackle bushes → clunk, rear steer'], test: ['Lever check, grease if fitted with nipples']
  },
  hanger: {
    name: 'Spring hanger & frame rail', cat: 'struct',
    fn: 'The fixed front-eye bracket and the ladder-frame rail it is riveted or bolted to. Drive and brake thrust go from the spring into the frame through this eye.',
    build: 'Pressed or cast hanger, riveted or Huck-bolted to a C-section ladder frame rail (S420MC).',
    eng: 'The front-eye position defines the axle\'s path (an arc around the eye) and the roll-steer.',
    specs: { 'Frame section': 'C 200×70×5' }, fail: ['Cracks around rivets'], test: ['Visual check']
  },

  /* ── air system / control ─────────────────────────────── */
  compressor: {
    name: 'Compressor & air dryer', cat: 'ctrl',
    fn: 'A 12 V oil-free piston compressor that fills the system. The integrated dryer removes moisture (it is regenerated when the system vents), and a solenoid exhaust valve lowers the car.',
    build: 'Brushed DC motor, PTFE-ringed piston, desiccant (silica gel) dryer cartridge, pressure-limiting valve, thermal cut-out.',
    eng: 'The duty cycle is limited thermally — the ECU models compressor temperature and blocks operation when hot. A closed-loop system with a reservoir lifts faster and draws less moist air.',
    specs: { 'Max pressure': '16–18 bar', 'Current': '25–40 A', 'Relay / fuse': '40 A' }, fail: ['Worn piston ring → slow lift', 'Saturated dryer → water, corroded valves', 'Relay burnt'], test: ['Time a full lift; check current draw']
  },
  reservoir: {
    name: 'Air reservoir', cat: 'ctrl',
    fn: 'Stores compressed air so height changes are fast and quiet without starting the compressor.',
    build: 'Aluminium or steel pressure vessel with a pressure sensor and drain.',
    eng: 'Energy stored E ≈ p·V·ln(p/p0). A 5 L reservoir at 16 bar can lift the vehicle several times.',
    specs: { 'Volume': '4–8 L', 'Pressure': '≤ 18 bar' }, fail: ['Leak at fitting', 'Internal corrosion'], test: ['Pressure decay test']
  },
  valveblock: {
    name: 'Solenoid valve block', cat: 'ctrl',
    fn: 'A block of 2/2 solenoid valves (one per spring, plus the reservoir valve) with a pressure sensor. The ECU opens a valve to fill or vent each corner.',
    build: 'Aluminium manifold with 4–6 poppet solenoid valves (12 V, ~1–2 A) and an integrated pressure transducer.',
    eng: 'Only one pressure sensor is needed — the ECU reads each spring pressure by opening one valve at a time.',
    specs: { 'Valves': '5 × 2/2 NC', 'Coil': '≈ 8–12 Ω' }, fail: ['Stuck valve → one corner low', 'Water ingress'], test: ['Actuate each valve with a scan tool']
  },
  heightsensor: {
    name: 'Ride-height sensor', cat: 'ctrl',
    fn: 'Measures arm angle (so ride height) at each corner for levelling, headlight aim and damper control.',
    build: 'Contactless Hall-effect angle sensor with a lever and a ball-jointed link to the control arm. Output 0.5–4.5 V or PWM.',
    eng: 'Signal is filtered (~1 s) for levelling, but used raw for damper control (relative velocity ż_s − ż_u).',
    specs: { 'Supply': '5 V', 'Output': '0.5–4.5 V ratiometric' }, fail: ['Broken link → car rises or drops on one side', 'Offset after repair → calibrate'], test: ['Live data check and height calibration']
  },
  ecu: {
    name: 'Suspension ECU', cat: 'ctrl',
    fn: 'Runs the levelling logic (fill/vent to target height) and the damper controller (skyhook, groundhook, comfort and sport maps), using height sensors, body accelerometers, speed and steering angle.',
    build: '32-bit microcontroller with H-bridge / high-side drivers, on CAN or FlexRay.',
    eng: 'Levelling uses a slow loop (dead-band ±10 mm, faster when stationary). Damping uses a fast loop at 1 kHz. Motorway mode lowers ride height by 15–25 mm above about 120 km/h to cut aerodynamic drag.',
    specs: { 'Bus': 'CAN-FD / FlexRay', 'Loop rate': '1 kHz damping' }, fail: ['Software / calibration lost', 'Power supply / ground faults'], test: ['Read DTCs, run height calibration']
  },
  airlines: {
    name: 'Air lines & fittings', cat: 'ctrl',
    fn: 'PA12 nylon pipes connecting compressor, reservoir, valve block and air springs.',
    build: '6 mm / 4 mm PA12 tube with push-in Voss-type fittings and an O-ring seal.',
    eng: 'Small leaks are the main reliability issue. The ECU counts fill events per day to diagnose a leak.',
    specs: { 'Tube': 'Ø6 × 1 mm PA12', 'Burst': '> 50 bar' }, fail: ['Chafed line → leak', 'Fitting O-ring leak'], test: ['Soap test at every fitting']
  }
};
