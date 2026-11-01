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
- `build-single.sh` – bundles everything into one HTML file in `dist/`
