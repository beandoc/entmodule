import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Sans_Devanagari, IBM_Plex_Mono } from 'next/font/google';

export const fontDisplay = Source_Serif_4({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const fontSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const fontSansHi = IBM_Plex_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-hi',
  display: 'swap',
});

export const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});
