/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPhantom, CreatePhantomConfig } from './index'
import { PHANTOM_INITIALIZED_EVENT_NAME } from './constants'

describe('createPhantom function', () => {
  beforeEach(() => {})

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a Phantom object', async () => {
    setTimeout(
      () => window.dispatchEvent(new Event(PHANTOM_INITIALIZED_EVENT_NAME)),
      500
    )
    const phantom = await createPhantom()
    expect(phantom).toHaveProperty('show')
    expect(phantom).toHaveProperty('hide')
  })

  it('appends searchParams based on config', async () => {
    const config: CreatePhantomConfig = {
      zIndex: 10,
      hideLauncherBeforeOnboarded: true,
      colorScheme: 'dark'
    }

    const container = document.head ?? document.documentElement
    const insertBeforeSpy = vi.spyOn(container, 'insertBefore')

    setTimeout(
      () => window.dispatchEvent(new Event(PHANTOM_INITIALIZED_EVENT_NAME)),
      500
    )
    await createPhantom(config)
    const scriptTagSrc = new URL(
      insertBeforeSpy.mock.calls[0][0].src
    ).toString()
    expect(scriptTagSrc).toContain('zIndex=10')
    expect(scriptTagSrc).toContain('hideLauncherBeforeOnboarded=true')
    expect(scriptTagSrc).toContain('colorScheme=dark')
  })

  it('inserts and removes a script tag in the head', async () => {
    const container = document.head ?? document.documentElement
    const insertBeforeSpy = vi.spyOn(container, 'insertBefore')
    const removeChildSpy = vi.spyOn(container, 'removeChild')

    setTimeout(
      () => window.dispatchEvent(new Event(PHANTOM_INITIALIZED_EVENT_NAME)),
      500
    )
    await createPhantom()

    expect(insertBeforeSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
  })
})
