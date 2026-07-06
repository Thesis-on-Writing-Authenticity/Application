import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Extension',
  description: 'Starting point',
  version: '0.0.1',
  icons: {
    16: 'public/icons/icon16.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'public/icons/icon16.png',
      48: 'public/icons/icon48.png',
      128: 'public/icons/icon128.png',
    },
  },
})
