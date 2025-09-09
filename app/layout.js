// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Vito Media Client Health",
  description: "Live from Google Sheets",
};

function ThemeScript() {
  // Set the initial theme *before* React mounts to avoid a flash
  const code = `
  (function() {
    try {
      var t = localStorage.getItem('theme');
      if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var d = document.documentElement;
      if (t === 'dark') d.classList.add('dark'); else d.classList.remove('dark');
      d.style.colorScheme = (t === 'dark') ? 'dark' : 'light';
    } catch (e) {}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <ThemeScript />
      <body className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
