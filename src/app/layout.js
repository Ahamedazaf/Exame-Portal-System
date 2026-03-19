import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'Exame Portal — Online Examination System',
  description: 'Class-based online MCQ examination management system',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans bg-slate-50 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
