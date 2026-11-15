import { Color, DoubleSide, MeshStandardMaterial, Vector2 } from 'three'
import { foilCrinkleNormalMap, gridAlphaMap, panelSeamNormalMap } from '../utilities/proceduralTextures'
import { toTexture } from './textures'

/** Clean industrial palette with ASTRA's cyan technology accent (Tailwind cyan-400). */
export const ACCENT_CYAN = '#22d3ee'

function withRepeat<T extends { repeat: { set: (x: number, y: number) => unknown } }>(texture: T, x: number, y: number): T {
  texture.repeat.set(x, y)
  return texture
}

export type SpacecraftMaterials = ReturnType<typeof createSpacecraftMaterials>

/** Shared spacecraft materials. Create once per scene and dispose with `disposeMaterials`. */
export function createSpacecraftMaterials() {
  const cellGrid = toTexture(gridAlphaMap(128, 8, 0.08), { repeat: true })
  const fineCellGrid = toTexture(gridAlphaMap(128, 12, 0.06), { repeat: true })
  const seams = toTexture(panelSeamNormalMap(256, 4), { repeat: true })
  const crinkle = toTexture(foilCrinkleNormalMap(256, 17), { repeat: true })
  return {
    // ── Modular spacecraft palette: graphite, white, metallic, muted gold, cyan accents ──
    /** Dark graphite composite: structure, brackets, housings. */
    graphite: new MeshStandardMaterial({ color: new Color('#2a2e35'), metalness: 0.45, roughness: 0.42, normalMap: seams, normalScale: new Vector2(0.35, 0.35) }),
    /** White thermal paint with recessed panel seams and rivets. */
    white: new MeshStandardMaterial({ color: new Color('#e4e7eb'), metalness: 0.05, roughness: 0.5, normalMap: seams, normalScale: new Vector2(0.6, 0.6) }),
    /** Machined aluminium and titanium: struts, joints, tanks. */
    aluminium: new MeshStandardMaterial({ color: new Color('#b9c1ca'), metalness: 0.9, roughness: 0.28 }),
    /** Muted gold multi-layer insulation, crinkled. */
    mli: new MeshStandardMaterial({ color: new Color('#b8924a'), metalness: 0.75, roughness: 0.32, normalMap: crinkle, normalScale: new Vector2(0.5, 0.5) }),
    /** Heat-tinted niobium nozzle extension. */
    nozzle: new MeshStandardMaterial({ color: new Color('#5d5a57'), metalness: 0.85, roughness: 0.38, side: DoubleSide }),
    /** High-efficiency triple-junction cells: near black with a fine bright grid. */
    solarHi: new MeshStandardMaterial({
      color: new Color('#0b1220'),
      metalness: 0.5,
      roughness: 0.2,
      emissive: new Color('#155e75'),
      emissiveMap: fineCellGrid,
      emissiveIntensity: 0.22,
    }),
    /** Silvered radiator surface: bright, smooth. */
    radiator: new MeshStandardMaterial({ color: new Color('#f1f4f7'), metalness: 0.3, roughness: 0.18, normalMap: seams, normalScale: new Vector2(0.25, 0.25) }),
    /** Black anodized and rubber parts: wheels, grommets, lens housings. */
    black: new MeshStandardMaterial({ color: new Color('#111316'), metalness: 0.2, roughness: 0.7 }),
    /** Hot-surface tint for radioisotope hardware (orange heat-shield paint). */
    warm: new MeshStandardMaterial({ color: new Color('#8a4b22'), metalness: 0.4, roughness: 0.5 }),
    /** Ceramic thermal-protection blanket and tiles: matte off-white, non-metallic. */
    ceramic: new MeshStandardMaterial({ color: new Color('#e6e0d4'), metalness: 0, roughness: 0.88, normalMap: seams, normalScale: new Vector2(0.45, 0.45) }),
    /** Camera and sensor optics: dark coated glass. */
    glass: new MeshStandardMaterial({ color: new Color('#0a1626'), metalness: 0.6, roughness: 0.06 }),
    /** Braided suspension cable and tethers. */
    cable: new MeshStandardMaterial({ color: new Color('#9aa5b1'), metalness: 0.7, roughness: 0.45 }),

    // ── Shared with the lunar scene ──
    /** Gold multi-layer insulation foil. */
    // Partly metallic: with no environment map, a fully metallic surface would only reflect black space.
    foil: new MeshStandardMaterial({ color: new Color('#d6a645'), metalness: 0.55, roughness: 0.4 }),
    /** White thermal paint on panels and structure. */
    panel: new MeshStandardMaterial({ color: new Color('#d9dde3'), metalness: 0.1, roughness: 0.55 }),
    /** Bare machined aluminium (struts, pads). */
    metal: new MeshStandardMaterial({ color: new Color('#aab3bd'), metalness: 0.5, roughness: 0.4 }),
    /** Dark engine and radiator surfaces. */
    dark: new MeshStandardMaterial({ color: new Color('#22262d'), metalness: 0.6, roughness: 0.5 }),
    /** Solar cells: deep blue with a fine bright grid (the cell gaps). */
    solar: new MeshStandardMaterial({
      color: new Color('#13244a'),
      metalness: 0.4,
      roughness: 0.25,
      emissive: new Color('#0e7490'),
      emissiveMap: cellGrid,
      emissiveIntensity: 0.18,
    }),
    /** Radio telescope wire mesh: grid alpha so the ground shows through. */
    wireMesh: new MeshStandardMaterial({
      color: new Color('#c3ccd6'),
      metalness: 0.5,
      roughness: 0.35,
      // Repeated around (u) and along (v) a lathe: 64 radial wires × 32 rings.
      alphaMap: withRepeat(toTexture(gridAlphaMap(256, 16, 0.12), { repeat: true }), 4, 2),
      alphaTest: 0.5,
      // The wires cover ~23% of each cell: at range the mipmapped alpha falls below alphaTest and the
      // whole reflector would vanish. Alpha-to-coverage (MSAA) fades it to its true density instead.
      alphaToCoverage: true,
      side: DoubleSide,
    }),
    /**
     * What a fine wire mesh looks like from tens of meters: a faint metallic sheet. Drawn under the
     * wires so the reflector keeps its shape in wide shots and in crater shadow.
     */
    wireSheen: new MeshStandardMaterial({
      color: new Color('#d3dbe5'),
      metalness: 0.35,
      roughness: 0.55,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: DoubleSide,
    }),
    /** Status lights and accent strips. */
    accent: new MeshStandardMaterial({ color: new Color('#0b1528'), emissive: new Color(ACCENT_CYAN), emissiveIntensity: 2.2 }),
  }
}

export function disposeMaterials(materials: Record<string, MeshStandardMaterial>) {
  for (const material of Object.values(materials)) {
    for (const map of [material.map, material.normalMap, material.alphaMap, material.emissiveMap]) map?.dispose()
    material.dispose()
  }
}
