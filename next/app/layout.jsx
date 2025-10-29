export const metadata = {
  title: 'Jastalk Vapi Next',
  description: 'AI-powered voice interview agent (Next.js)'
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

