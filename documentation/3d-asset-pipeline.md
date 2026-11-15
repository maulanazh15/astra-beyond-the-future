# 3D Asset Pipeline

How 3D models get from Blender into ASTRA. The game never depends on a model: every screen
works without them, and a missing or broken model shows amber wireframe **development
placeholders** instead.

## Where things live

```
public/assets/
  3d/
    environments/   terrain tiles, surface sets          (category: environment)
    spacecraft/     orbiters, relay satellites           (category: spacecraft)
    landers/        lander bodies                        (category: lander)
    payloads/       instruments, antennas                (category: payload)
    rovers/         robotic rovers                       (category: rover)
    structures/     surface hubs, assembled structures   (category: structure)
  textures/         shared textures for .gltf files (GLB files embed their own)
  thumbnails/       512×512 PNG previews, one per asset

src/data/assets/model-assets.json      the asset registry data (typed by src/types/modelAsset.ts)
src/features/visualization/
  assetRegistry.ts                     registry lookups and model source resolution
  LazyScenes.tsx                       the ONLY entry for 2D screens (no three.js inside)
  components/  Scene3D, SceneCamera, SceneLighting, OrbitControls, ModelViewer,
               SpacecraftViewer, LoadingFallback, ErrorFallback, SceneErrorBoundary
  scenes/      LunarEnvironment, LunarMissionScene, MissionSceneViewer, RoverController,
               MissionOverviewScene (briefing + live surface entry points)
  models/      lander/ (LunarLander), telescope/ (LCRTelescope), rover/ (ConstructionRover),
               spacecraft/ (modular designer modules), terrain, rocks, stars, Earth;
               placeholders/ = development-only wireframes (never final art)
  materials/   regolith, rock and spacecraft materials; procedural textures
  animations/  pure curves: beacon, easing, mission timeline (simulation → visual state), camera focus
  hooks/       WebGL detection, in-view rendering pause, reduced motion
  utilities/   pure, tested generators: seeded RNG, noise, terrain, rocks, stars, layouts
  types/       scene types
src/features/asset-lab/                /lab/3d preview page (lazy route, not linked in the game)
```

Three.js lives in its own lazily loaded chunk. A test walks the static import graph from
`App.tsx` and fails if any statically loaded file imports `three`.

## Procedural mission scene

The Mission Briefing shows a 3D **Mission Overview** built entirely from code: no model files.

- **Terrain**: one polar-grid mesh (~77k triangles) from the landing site to a 1.8 km horizon;
  0.75 m spacing near the site, coarser rings further out. Seeded per landing site.
- **Craters**: a prominent main crater (52 m across) plus ~20–40 smaller ones (more at rougher
  sites), using a simple bowl-and-rim profile with ejecta. Fresh craters get bright halos.
- **Rocks**: ~220–480 boulders and cobbles (power-law sizes, clustered on the main crater's ejecta),
  drawn as three instanced meshes.
- **Lander, telescope, construction rover**: procedural mission hardware, described below.
- **Sky**: stars (stylized: a real sunlit-surface exposure would show few) and Earth. **Earth is
  shown only at Earth-facing (near-side) sites.** LUNAR ECHO's far-side sites never see Earth,
  which is why they are radio-quiet. Earth is drawn ~1.5× its true angular size to read on small
  screens.

The scene follows the landing site chosen in the Mission Designer.

## LUNAR ECHO mission hardware

Three reusable, animated procedural models. Positions come from
`utilities/missionSceneLayout.ts` (`MissionSceneConfig`: lander heading, serviced anchors, rover
standoff, speeds), never from inside the models.

| Model | File | Driven by props | Notes |
| --- | --- | --- | --- |
| `LunarLander` | `models/lander/` | `landing` 0–1, `roverEgress` 0–1 | Octagonal MLI body, open tank bay (4 propellant + 2 He tanks), beveled thrust plate with ceramic heat shield, gimballed bell nozzle + plume, 4 hinged legs with telescoping shock struts and level footpads, payload shelf with launch clamps, umbilical and hinged ramp, HGA, star trackers, hazard lidar, radar altimeter, descent cameras, RCS quads. |
| `LCRTelescope` | `models/telescope/` | `deployment` 0–1, `receiverActive` | Wire-mesh paraboloid on 24 ribs and hoops, furled in a petal canister on the crater floor; 12 rim anchors with rover docking targets, 3 telescoping lattice towers with winches and guy wires, suspension/tie-down/bridle cables (`utilities/lcrtRig.ts`), receiver cabin with feed horns and dipoles hoisted to the focus. |
| `ConstructionRover` | `models/rover/` | `motion` ref (scene) or `activity` | Six-wheel rocker-bogie, grousered wheels, 4-joint arm with anchor drill (planar IK in `utilities/roverLayout.ts`), stereo pan/tilt mast camera with lidar, hazard cameras, cable spool, anchor magazine. |

Animation values are plain numbers; each model eases toward them in its own frame loop
(`hooks/useEasedValue.ts`), so updates at 10 Hz (playback) or at simulation speed stay smooth and
the React tree does not re-render per frame. `prefers-reduced-motion` snaps to the target.

**Sequences.** `animations/missionTimeline.ts` holds the pure curves: `landerPose` (descent from
24 m, legs lock before touchdown, shock stroke, engine shutdown, dust), `egressPose` (clamps → ramp
→ drive), `telescopeDeployment` (anchors → towers → cables → reflector → receiver). The rover's work
loop (`utilities/roverRoute.ts`) drives the rim route, turns to face each anchor and runs the drill.

**Gameplay connection.** `visualStateFromSimulation(state, context)` maps the engine's state to the
scene; it only reads state:

| Simulation | Scene |
| --- | --- |
| `launch` / `transit` / `orbitalArrival` | site empty, lander not yet arrived |
| `landing` (`daysInPhase / landingDays`) | descent → touchdown → engine shutdown |
| entering `construction` with `rob-rover` in the design | rover egress down the ramp |
| `constructionProgress` | telescope assembly 0–100 % |
| `isLunarNight`, `constructionStallUntilDay` (robotic delay) | rover parks; sun dims at night |
| `instrumentStatus` operating/degraded | receiver feed ring glows, faster tower beacons |
| `failureReason` | caption; launch/transit losses leave the site empty |

Gaps (documented, not invented): the engine has no separate landing-touchdown, rover-deployment,
or per-step construction events, so touchdown is the landing phase's progress, egress happens at
the start of construction, and assembly sub-steps are fixed fractions of `constructionProgress`.
`firstLight` is shown through `instrumentStatus`. Designs with only a winch or arm show no rover
(the robotics are not modeled separately in the scene).

**Where it appears.** Briefing: concept playback (`MissionOverview3D`; play/scrub the deployment).
Mission Control: live view (`MissionSurface3D`) driven by the running simulation. Both let the
player select/focus each asset (click or chips), hide assets, reset the camera, and read details.
The telescope card states that it is hypothetical ASTRA hardware inspired by the NASA NIAC LCRT
concept, not an operational NASA mission.

**GLB replacement.** Each model sits in `ReplaceableModel` with a registry id
(`lander-lunar-echo`, `structure-lcrt-telescope`, `rover-deployment`). Marking the asset
`available` swaps in the GLB; a static GLB shows one configuration (no deployment animation).

## Modular spacecraft (Mission Designer)

The **Spacecraft Preview** in the Mission Designer builds the spacecraft from the player's design.
The design entries are the single source of truth; the viewer never adds hardware of its own.

1. `utilities/componentVisuals.ts` maps every catalog component id to one or more visual parts
   (model kind, variant, mount type, preferred faces or deck slots). A test fails if a component
   has no mapping or two options in a category look identical.
2. `utilities/spacecraftAssembly.ts` (`assembleSpacecraft`) expands the design into units and
   places each on a mount point: the bus core, below the bus (engines, tanks), one of 8 side faces on
   two tiers, 7 deck slots, or the landing gear. Pure, deterministic and unit-tested.
3. `models/spacecraft/ModularSpacecraft.tsx` draws each module with its procedural model.

| Category | Components → model |
| --- | --- |
| Bus | compact / standard (equipment ring) / cargo (hardpoints): beveled octagon, longerons, deck bolt ring |
| Propulsion | each unit = tank set (propulsion module) + main engine: biprop spheres + bell, throttle capsules + larger bell and turbopump, electric xenon tank + ion thruster |
| Power | standard 2-panel wing, high-efficiency 3-panel wing, finned RPS |
| Battery | Li-ion pack, high-capacity pack, regenerative fuel cell |
| Communication | S-band helix antenna, X-band high-gain dish on a 2-axis gimbal, optical terminal |
| Payload | dipole array (4 booms), wire-mesh reflector (ribbed umbrella), receiver suite |
| Landing | shock-absorber legs, crushable pads (or legs fitted with pads), hazard-detection sensor pod |
| Thermal | MLI wraps the bus in gold foil; radiator panel, heater system, RHU cluster |
| Robotics | stowed rover, anchor winch with tether, folded robotic arm |
| Structure | always present: thrust ring and gussets; a ground stand when there is no landing gear |

**Replacing a procedural module with a GLB:** add a registry entry of category `payload`,
`rover` or `structure` whose `componentIds` lists the component, export it with its origin at the
mount point (side modules: on the bus face with +X pointing outward; deck modules: on the deck; engines:
at the bus floor, hanging down), and mark it `available`. The assembly still decides where it mounts,
and the procedural model remains the loading/error fallback. Whole-vehicle assets (`lander`,
`spacecraft`) never replace a single module.

## Blender export checklist

1. **Units and scale.** Scene Properties → Units: *Metric*, Unit Scale *1.0*. Model at real
   size: 1 Blender unit = 1 meter.
2. **Orientation.** Blender is Z-up. Keep the model upright on Z, front facing **−Y** (the side
   you see in Front view, numpad 1). The exporter converts to glTF's +Y-up.
3. **Origin.**
   - Landers, rovers, structures: at ground contact, centered under the model.
   - Payloads: at the point where they attach to the lander.
   - Environments: at ground level, at the landing spot.
4. **Apply transforms.** Select all → Ctrl+A → *All Transforms*. Fix scale and rotation in
   Blender rather than in the registry when possible.
5. **Materials.** Principled BSDF only. Image textures as PNG or JPEG, power-of-two sizes,
   2048 px maximum.
6. **Export.** File → Export → glTF 2.0:
   - Format: **glTF Binary (.glb)** (preferred; textures embedded).
   - Include: *Selected Objects* (export one asset per file).
   - Transform: **+Y Up** checked.
   - Mesh: *Apply Modifiers*, *UVs*, *Normals* on.
   - Compression: **off**. Draco compression is not supported by the loader yet.
   - Animation: off unless the asset needs it (animations are not played yet).
7. **Name and place the file.** kebab-case, in its category folder,
   e.g. `public/assets/3d/landers/lunar-echo-lander.glb`. If you export `.gltf` + `.bin`, keep
   them together in that folder and put shared textures in `public/assets/textures/`.

Triangle budgets (gameplay guideline, not a hard limit): lander ≤ 60k, rover ≤ 25k,
payload ≤ 15k, structure ≤ 30k, environment tile ≤ 100k.

## Registering a model

Edit `src/data/assets/model-assets.json`. Each entry:

| Field | Meaning |
| --- | --- |
| `id` | Unique, kebab-case, prefixed by category (`lander-…`, `payload-…`). |
| `name` | Display name. |
| `category` | `environment`, `spacecraft`, `lander`, `payload`, `rover`, or `structure`. Must match the folder. |
| `status` | `planned` (no file yet: placeholder shown, nothing requested) or `available`. |
| `modelPath` | Path under `public/`, `.glb` or `.gltf`. |
| `thumbnailPath` | Optional, under `assets/thumbnails/`, `.png`/`.jpg`/`.webp`. |
| `scale` | Uniform scale after import. Normally `1` if exported in meters. |
| `rotationDeg` | Extra rotation `[x, y, z]` in degrees, if the export faces the wrong way. |
| `componentIds` | Optional ids from `components.json`. A payload, rover or structure asset replaces that component's procedural module in the spacecraft viewer (mount point comes from the assembly). |
| `notes` | Optional. Record the source and license of any model not made in-house (for example NASA 3D Resources). |

Then:

1. Drop the file in place and set `"status": "available"`.
2. `npm run dev`, open `/lab/3d?asset=<id>`. The badge should read **Model loaded**.
   - **Load failed · placeholder shown**: the path is wrong or the file is broken (details in
     the browser console in dev).
   - **Dev placeholder**: the status is still `planned`.
3. `npm test`. It fails if an `available` asset's file is missing, a path is in the wrong
   folder or format, or a `componentIds` entry does not exist.

Large binaries: consider Git LFS for `public/assets/**/*.glb` once real assets arrive.

## Using models in a screen

```tsx
// In a 2D screen: always go through the lazy entry point.
import { MissionOverview3D } from '../visualization/LazyScenes'
import { sceneSiteFrom } from '../visualization/utilities/sceneSite'

<MissionOverview3D site={sceneSiteFrom(site)} />
```

New scenes go in `scenes/` and get a lazy wrapper in `LazyScenes.tsx`. Inside a scene, compose
`Scene3D` with `SceneCamera`, `OrbitControls`, `SceneLighting` and content. `Scene3D` shows a plain message when WebGL is unavailable. `ModelViewer`
shows the placeholder while loading and on error, so a screen never breaks because of a model.
