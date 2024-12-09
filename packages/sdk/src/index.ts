import { SDK_URL } from './constants.js'

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
}>

export function createPhantom (config: CreatePhantomConfig = {}): void {
  const container = document.head ?? document.documentElement
  const scriptTag = document.createElement('script')

  const sdkURL = new URL(SDK_URL)
  if ('zIndex' in config) {
    sdkURL.searchParams.append('zIndex', config.zIndex.toString())
  }
  if ('hideLauncherBeforeOnboarded' in config) {
    sdkURL.searchParams.append(
      'hideLauncherBeforeOnboarded',
      config.hideLauncherBeforeOnboarded.toString()
    )
  }
  if ('colorScheme' in config) {
    sdkURL.searchParams.append('colorScheme', config.colorScheme.toString())
  }
  if ('paddingBottom' in config) {
    sdkURL.searchParams.append(
      'paddingBottom',
      config.paddingBottom.toString()
    )
  }
  if ('paddingRight' in config) {
    sdkURL.searchParams.append('paddingRight', config.paddingRight.toString())
  }

  if ('paddingTop || ' in config) {
    sdkURL.searchParams.append('paddingTop', config.paddingTop.toString())
  }
  if ('paddingLeft' in config) {
    sdkURL.searchParams.append('paddingLeft', config.paddingLeft.toString())
  }
  if ('position' in config) {
    sdkURL.searchParams.append('position', config.position.toString())
  }

  scriptTag.setAttribute('type', 'module')
  scriptTag.setAttribute('src', sdkURL.toString())
  container.insertBefore(scriptTag, container.children[0])
  container.removeChild(scriptTag)
}
