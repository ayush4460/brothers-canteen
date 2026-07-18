import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Brothers Canteen',
    short_name: 'Canteen',
    description: 'Manage your canteen accounts and payments easily.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '192x192',
        type: 'image/x-icon',
      },
    ],
  }
}
