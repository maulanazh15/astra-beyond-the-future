/**
 * Procedural geometry builders for mission hardware. Callers memoize the result and dispose it
 * on unmount. All profiles are mid-poly: enough segments to read as smooth at mission-scene range.
 */
import { ExtrudeGeometry, LatheGeometry, Path, Shape, Vector2 } from 'three'
import { octagonCorners } from '../utilities/hardwareLayout'

function octagonPath<T extends Path>(path: T, radiusM: number): T {
  octagonCorners(radiusM).forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)))
  path.closePath()
  return path
}

/**
 * Octagonal prism with beveled edges, faces toward ±X/±Z and the diagonals, spanning y = 0…height.
 * `holeRadiusM` cuts a round hole through the middle (e.g. the engine opening in a thrust plate);
 * `innerRadiusM` makes it an octagonal frame ring instead.
 */
export function octagonPrism(radiusM: number, heightM: number, bevelM: number, opts: { holeRadiusM?: number; innerRadiusM?: number } = {}): ExtrudeGeometry {
  const shape = octagonPath(new Shape(), radiusM - bevelM)
  if (opts.holeRadiusM) shape.holes.push(new Path().absarc(0, 0, opts.holeRadiusM, 0, Math.PI * 2, true))
  if (opts.innerRadiusM) shape.holes.push(octagonPath(new Path(), opts.innerRadiusM + bevelM))
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, heightM - 2 * bevelM),
    bevelEnabled: bevelM > 0,
    bevelThickness: bevelM,
    bevelSize: bevelM,
    bevelSegments: 2,
    curveSegments: 24,
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bevelM, 0)
  return geometry
}

/** Bell nozzle, throat at y = 0, exit at y = −length. Open at both ends (use a double-sided material). */
export function bellNozzle(throatRadiusM: number, exitRadiusM: number, lengthM: number, segments = 28): LatheGeometry {
  const points = Array.from({ length: 14 }, (_, i) => {
    const t = i / 13
    // Rao-style bell: fast initial expansion, nearly straight exit.
    const r = throatRadiusM + (exitRadiusM - throatRadiusM) * (1 - (1 - t) ** 1.8)
    return new Vector2(r, -t * lengthM)
  })
  return new LatheGeometry(points, segments)
}

/** Paraboloid surface, vertex at y = 0, opening up to `radiusM` at height `sagM`. */
export function paraboloid(radiusM: number, sagM: number, segments = 64, rings = 24): LatheGeometry {
  const points = Array.from({ length: rings + 1 }, (_, i) => {
    const r = (i / rings) * radiusM
    return new Vector2(r, sagM * (r / radiusM) ** 2)
  })
  return new LatheGeometry(points, segments)
}

/** Footpad: a shallow dish with a rolled lip and a flat sole, top at y = 0. */
export function footpad(radiusM: number, depthM: number): LatheGeometry {
  const profile: [number, number][] = [
    [0.001, -depthM],
    [radiusM * 0.72, -depthM],
    [radiusM * 0.95, -depthM * 0.7],
    [radiusM, -depthM * 0.25],
    [radiusM * 0.96, 0],
    [radiusM * 0.86, -depthM * 0.15],
    [radiusM * 0.3, -depthM * 0.3],
    [0.001, -depthM * 0.25],
  ]
  return new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), 24)
}

/** Conical feed horn with a flared mouth, throat at y = 0, mouth at y = −length. */
export function feedHorn(throatRadiusM: number, mouthRadiusM: number, lengthM: number): LatheGeometry {
  const points = Array.from({ length: 8 }, (_, i) => {
    const t = i / 7
    return new Vector2(throatRadiusM + (mouthRadiusM - throatRadiusM) * t ** 1.4, -t * lengthM)
  })
  return new LatheGeometry(points, 20)
}

/** Sun baffle for a star tracker or camera: a stepped cone opening upward from y = 0. */
export function sunBaffle(baseRadiusM: number, topRadiusM: number, heightM: number): LatheGeometry {
  const points = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6
    // Stepped vanes: small ledges every sixth of the height.
    const r = baseRadiusM + (topRadiusM - baseRadiusM) * t + (i % 2 === 1 ? 0.004 : 0)
    return new Vector2(r, t * heightM)
  })
  return new LatheGeometry(points, 18)
}
