# ECM Lab

Interactive petrol & diesel **engine-management (ECM) and auto-electrical training simulator** that runs in any browser. No install, no build step.

Open `index.html` directly, or serve the folder (`python3 -m http.server`) and visit `http://localhost:8000`.

## What's inside

| Section | What you can do |
|---|---|
| **Car map** | Cut-away car showing where every sensor, actuator, power part and body load is fitted. Dots pulse while a part is working and turn red when faulted. |
| **Wiring diagram** | Full ECM schematic for petrol MPFI or diesel common-rail: battery → fusible link → EFI relay → +B bus, every sensor and actuator with pin numbers, ECM pins and real wire colours (with tracer stripes). Live voltages on every wire and a clickable multimeter probe. |
| **Live simulator** | Ignition key (LOCK/ACC/ON/START), accelerator, gear, A/C, brake. Gauges, animated 4-cylinder engine cycle (firing order 1-3-4-2, spark/injection/valves), oscilloscope (CKP 60-2, CMP, injector, ignition primary, O2, TPS, MAP, MAF, rail pressure, boost), scan-tool live data, fault codes, and 22 injectable faults with realistic effects (no-start, limp mode, misfire, open loop, glow-plug problems…). |
| **Body electrics** | Switch panel for lamps, indicators/hazard, horn (with sound), wipers, power windows, central locking, dome lamp, blower, rear defog, mirrors and A/C. Top-view car responds; live circuit diagram shows battery → fuse → relay/switch → load → ground with current flow. Inject blown fuse, failed relay, open bulb or bad ground. |
| **Parts library** | 56 components drawn in their real colours and shapes. Each opens a detail drawer with function, working principle, a "how it works" animation with live signal trace, specs, connector pin-out with wire colours and live voltages, failure symptoms, DTCs and test procedure. |
| **Quiz** | 15 workshop questions with explanations. |

Wire colours and values are typical examples for training. Always use the manufacturer's wiring diagram and data for a specific vehicle.

# Suspension Lab

Interactive **3D suspension tear-down simulator** (in `suspension/`). Open `suspension/index.html`, or use the "Suspension Lab" button in the ECM Lab header.

Six systems, each modelled part-by-part from real hard points: **MacPherson strut** (front FWD), **double wishbone / SLA** (front RWD), **5-link multi-link** (rear RWD), **twist-beam axle** (rear FWD), **leaf-spring Hotchkiss live axle** (pickup rear) and **adaptive air suspension** (air strut + CDC damper, compressor, reservoir, valve block, height sensor, ECU).

| Section | What you can do |
|---|---|
| **Tear-down bench** | Orbit / zoom / pan a PBR-rendered 3D assembly. Work through the workshop procedure step by step (tools, refit torques, notes, safety warnings) and watch each part come off. Toggle a full exploded view, a half-section cut (damper valves and oil, bushings, ball joints, hub-bearing balls, tyre carcass), numbered BOM balloons, isolate, parts tray and auto-rotate. Move the wheel through bump/rebound and the linkage, spring and damper move with live camber, roll centre, track change and motion ratio. Click any part for function, construction and material, engineering equations, specs, failure modes and inspection. |
| **Kinematics** | Scaled front-view (or side-view for beam axles) geometry with instant centre and roll-centre construction lines. Curves of camber, roll-centre height, track change, wheel-centre shift, leaf arch and motion ratio vs wheel travel. Wheel-rate KPIs and design notes. |
| **Ride dynamics** | 2-DOF quarter-car model (RK4, 2 kHz) with asymmetric damping, bump/rebound stops, tyre lift-off, Coulomb leaf friction, progressive air spring and skyhook semi-active control. Road inputs: bump, speed hump, pothole, kerb, sine, ISO 8608 random road (A–E). Live animation, scopes, natural frequencies, damping ratio, RMS comfort (ISO 2631 scale), dynamic tyre load and the frequency response. |
| **Compare** | Ratings matrix and key design values for all six systems. |

Torques, dimensions and specs are typical figures for training — always follow the manufacturer's workshop manual for a specific vehicle.

## Files

- `index.html` – page structure
- `css/style.css` – styles (light & dark themes)
- `js/data.js` – parts, pin-outs, faults, body circuits, quiz
- `js/parts.js` – SVG drawings of each part
- `js/sim.js` – engine/ECM simulation model
- `js/anim.js` – "how it works" animations
- `js/views.js` – car map, wiring, simulator, library, quiz, part drawer
- `js/body.js` – body electrics bench
- `js/app.js` – routing, controls, main loop
- `build-single.sh` – bundles each app into one self-contained HTML file in `dist/` (`ecm-lab.html`, `suspension-lab.html`)

Suspension Lab (`suspension/`):

- `index.html`, `css/susp.css` – page and styles (light & dark themes)
- `js/vendor/three.min.js` – Three.js r149 (MIT), vendored so the app works offline
- `js/parts-data.js` – component library: function, construction, engineering, specs, failures, inspection
- `js/geom.js` – materials and procedural 3D builders (coil springs, dampers with internals, tyres, rims, discs, joints…)
- `js/kinmath.js` – planar kinematic solvers (SLA, MacPherson, twist beam, live axle)
- `js/systems.js` – the six systems: hard points, 3D assembly, kinematics, tear-down procedures
- `js/bench.js` – 3D renderer, orbit camera, picking, explode / section / balloons
- `js/kinview.js`, `js/charts.js` – kinematics view and SVG charts
- `js/dynamics.js` – quarter-car ride simulator
- `js/app.js` – UI, routing, procedure, BOM and part drawer
