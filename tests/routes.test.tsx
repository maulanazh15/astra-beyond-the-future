import { renderToString } from 'react-dom/server'
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '../src/app/routes'

const screens = [
  '/',
  '/missions',
  '/encyclopedia',
  '/missions/lunar-echo/briefing',
  '/missions/lunar-echo/design',
  '/missions/lunar-echo/control',
  '/missions/lunar-echo/report',
]

function render(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] })
  return renderToString(<RouterProvider router={memoryRouter} />)
}

describe('routes', () => {
  it.each(screens)('renders %s with only links to known screens', (path) => {
    const html = render(path)
    expect(html).not.toContain('Signal lost')

    const allHrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
    const hrefs = allHrefs.filter((href) => href.startsWith('/'))
    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of allHrefs.filter((h) => h.startsWith('#'))) {
      expect(html, `${path} has a dangling anchor ${href}`).toContain(`id="${href.slice(1)}"`)
    }
    for (const href of allHrefs.filter((h) => !h.startsWith('/') && !h.startsWith('#'))) {
      expect(href).toMatch(/^https:\/\//)
    }
    for (const href of hrefs) {
      const matches = matchRoutes(routes, href) ?? []
      const leaf = matches[matches.length - 1]?.route
      expect(leaf?.path, `${path} links to unknown ${href}`).not.toBe('*')
    }
  })

  it('shows the not-found screen for unknown paths', () => {
    expect(render('/nowhere')).toContain('Signal lost')
  })
})

describe('mission overview 3D on the briefing screen', () => {
  it('reserves the scene with a loading state and keeps the 2D briefing intact', () => {
    const html = render('/missions/lunar-echo/briefing')
    expect(html).toContain('Mission Overview')
    expect(html).toContain('Preparing lunar surface')
    expect(html).toContain('Mission Background')
  })
})
