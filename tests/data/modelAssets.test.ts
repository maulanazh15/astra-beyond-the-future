import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { paths } from '../../src/app/paths'
import { routes } from '../../src/app/routes'
import { componentCatalog } from '../../src/data'
import {
  categoryFolders,
  getModelAsset,
  isSupportedModelPath,
  modelAssets,
  modelAssetsForComponent,
  publicAssetUrl,
  resolveModelSource,
} from '../../src/features/visualization/assetRegistry'
import { degreesToRadians } from '../../src/features/visualization/utilities/modelSource'
import type { ModelAsset } from '../../src/types/modelAsset'

const root = join(__dirname, '../..')
const publicDir = join(root, 'public')

describe('3D asset registry', () => {
  it('has unique ids', () => {
    const ids = modelAssets.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(modelAssets.map((a) => [a.id, a] as const))('%s follows the folder and format conventions', (_id, asset) => {
    expect(isSupportedModelPath(asset.modelPath)).toBe(true)
    expect(asset.modelPath.startsWith(`assets/3d/${categoryFolders[asset.category]}/`)).toBe(true)
    if (asset.thumbnailPath) expect(asset.thumbnailPath).toMatch(/^assets\/thumbnails\/.+\.(png|jpe?g|webp)$/)
    expect(asset.scale).toBeGreaterThan(0)
    expect(asset.rotationDeg).toHaveLength(3)
    for (const id of asset.componentIds ?? []) {
      expect(componentCatalog.components.some((c) => c.id === id), `${asset.id} references unknown component ${id}`).toBe(true)
    }
  })

  it('only marks an asset available when its file exists under public/', () => {
    for (const asset of modelAssets.filter((a) => a.status === 'available')) {
      expect(existsSync(join(publicDir, asset.modelPath)), `${asset.modelPath} is missing`).toBe(true)
    }
  })

  it('has a folder for every category plus textures and thumbnails', () => {
    for (const folder of Object.values(categoryFolders)) expect(existsSync(join(publicDir, 'assets/3d', folder))).toBe(true)
    expect(existsSync(join(publicDir, 'assets/textures'))).toBe(true)
    expect(existsSync(join(publicDir, 'assets/thumbnails'))).toBe(true)
  })

  it('looks assets up by id and by component', () => {
    expect(getModelAsset('lander-lunar-echo')?.category).toBe('lander')
    expect(getModelAsset('nope')).toBeUndefined()
    expect(modelAssetsForComponent('pay-dipole').map((a) => a.id)).toEqual(['payload-dipole-array'])
    expect(modelAssetsForComponent('thm-passive')).toEqual([])
  })
})

describe('model source resolution', () => {
  const asset: ModelAsset = { ...getModelAsset('lander-lunar-echo')!, status: 'available' }

  it('loads available GLB/GLTF files from the public base path', () => {
    expect(resolveModelSource(asset, '/')).toEqual({ kind: 'model', url: '/assets/3d/landers/lunar-echo-lander.glb' })
    expect(resolveModelSource({ ...asset, modelPath: 'assets/3d/landers/x.gltf' }, '/astra/')).toEqual({ kind: 'model', url: '/astra/assets/3d/landers/x.gltf' })
  })

  it('falls back to placeholders without requesting a file', () => {
    expect(resolveModelSource(undefined)).toEqual({ kind: 'placeholder', reason: 'unregistered' })
    expect(resolveModelSource({ ...asset, status: 'planned' })).toEqual({ kind: 'placeholder', reason: 'planned' })
    expect(resolveModelSource({ ...asset, modelPath: 'assets/3d/landers/x.fbx' })).toEqual({ kind: 'placeholder', reason: 'unsupportedFormat' })
  })

  it('joins public URLs without doubled slashes', () => {
    expect(publicAssetUrl('/assets/a.glb', '/base')).toBe('/base/assets/a.glb')
    expect(publicAssetUrl('assets/a.glb', '/base/')).toBe('/base/assets/a.glb')
  })

  it('converts registry rotations from degrees', () => {
    const [x, y, z] = degreesToRadians([90, 180, 0])
    expect(x).toBeCloseTo(Math.PI / 2)
    expect(y).toBeCloseTo(Math.PI)
    expect(z).toBe(0)
  })
})

describe('3D stays isolated from the 2D game', () => {
  /** Files reachable from `entry` through static imports only (dynamic import() is a split point). */
  function staticClosure(entry: string): Map<string, string> {
    const seen = new Map<string, string>()
    const visit = (file: string) => {
      if (seen.has(file)) return
      const text = readFileSync(file, 'utf8')
      seen.set(file, text)
      for (const match of text.matchAll(/^(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]/gm)) {
        if (/^import\s+type\s/.test(match[0]) || /^export\s+type\s/.test(match[0])) continue
        const base = join(dirname(file), match[1])
        const resolved = ['', '.ts', '.tsx', '/index.ts'].map((ext) => base + ext).find((p) => existsSync(p) && statSync(p).isFile())
        if (resolved && /\.tsx?$/.test(resolved)) visit(resolved)
      }
    }
    visit(entry)
    return seen
  }

  it('keeps three.js out of every statically loaded screen', () => {
    const closure = staticClosure(join(root, 'src/app/App.tsx'))
    expect(closure.size).toBeGreaterThan(40)
    for (const [file, text] of closure) {
      const rel = relative(root, file)
      expect(/from ['"](three|three\/.*|@react-three\/.*)['"]/.test(text), `${rel} pulls three.js into the main bundle`).toBe(false)
    }
    // The briefing screen reaches 3D only through the lazy entry point.
    expect([...closure.keys()].some((f) => f.endsWith('visualization/LazyScenes.tsx'))).toBe(true)
    expect([...closure.keys()].some((f) => f.endsWith('visualization/scenes/MissionOverviewScene.tsx'))).toBe(false)
  })

  it('loads the preview route lazily', () => {
    const leaf = matchRoutes(routes, paths.assetLab)?.at(-1)?.route
    expect(leaf?.path).toBe('lab/3d')
    expect(leaf?.lazy).toBeTypeOf('function')
  })
})
