import { renderToString } from 'react-dom/server'
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '../src/app/routes'

const screens = [
  '/',
  '/missions',
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

    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1])
    expect(hrefs.length).toBeGreaterThan(0)
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
