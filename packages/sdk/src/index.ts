import {
  PHANTOM_IFRAME_ID,
  PHANTOM_INITIALIZED_EVENT_NAME,
  SDK_URL
} from './constants.js'

export enum Position {
  bottomRight = 'bottom-right',
  bottomLeft = 'bottom-left',
  topRight = 'top-right',
  topLeft = 'top-left',
}

export type CreatePhantomConfig = Partial<{
  zIndex: number
  hideLauncherBeforeOnboarded: boolean
  colorScheme: string
  paddingBottom: number
  paddingRight: number
  paddingTop: number
  paddingLeft: number
  position: Position
  sdkURL: string
}>

export interface Phantom {
  show: () => void
  hide: () => void
}

export async function createPhantom (
  config: CreatePhantomConfig = {}
): Promise<Phantom> {
  const container = document.head ?? document.documentElement
  const scriptTag = document.createElement('script')

  const sdkURL = new URL(config.sdkURL ?? SDK_URL)
  if ('zIndex' in config && config.zIndex != null) {
    sdkURL.searchParams.append('zIndex', config.zIndex.toString())
  }
  if (
    'hideLauncherBeforeOnboarded' in config &&
    config.hideLauncherBeforeOnboarded != null
  ) {
    sdkURL.searchParams.append(
      'hideLauncherBeforeOnboarded',
      config.hideLauncherBeforeOnboarded.toString()
    )
  }
  if ('colorScheme' in config && config.colorScheme != null) {
    sdkURL.searchParams.append('colorScheme', config.colorScheme.toString())
  }
  if ('paddingBottom' in config && config.paddingBottom != null) {
    sdkURL.searchParams.append(
      'paddingBottom',
      config.paddingBottom.toString()
    )
  }
  if ('paddingRight' in config && config.paddingRight != null) {
    sdkURL.searchParams.append('paddingRight', config.paddingRight.toString())
  }

  if ('paddingTop' in config && config.paddingTop != null) {
    sdkURL.searchParams.append('paddingTop', config.paddingTop.toString())
  }
  if ('paddingLeft' in config && config.paddingLeft != null) {
    sdkURL.searchParams.append('paddingLeft', config.paddingLeft.toString())
  }
  if ('position' in config && config.position != null) {
    sdkURL.searchParams.append('position', config.position.toString())
  }

  scriptTag.setAttribute('type', 'module')
  scriptTag.setAttribute('src', sdkURL.toString())
  container.insertBefore(scriptTag, container.children[0])
  container.removeChild(scriptTag)

  return await new Promise<Phantom>((resolve, _reject) => {
    window.addEventListener(
      PHANTOM_INITIALIZED_EVENT_NAME,
      function handleInit () {
        resolve({
          hide: () => {
            const iframe = document.getElementById(PHANTOM_IFRAME_ID)
            if (iframe != null) iframe.style.display = 'none'
          },
          show: () => {
            const iframe = document.getElementById(PHANTOM_IFRAME_ID)
            if (iframe != null) iframe.style.display = 'block'
          }
        })
        window.removeEventListener(PHANTOM_INITIALIZED_EVENT_NAME, handleInit)
      }
    )
  })
}
