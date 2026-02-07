import "./globals.css";

export const metadata = {
  title: "Workout Dashboard",
  description: "Track your workouts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}