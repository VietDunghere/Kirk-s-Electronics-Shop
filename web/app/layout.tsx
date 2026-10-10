import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";
import ChatWidget from "@/components/ChatWidget";
import CompareBar from "@/components/CompareBar";

export const metadata: Metadata = {
  title: "Kirk's Ecommerce Shop — Demo E-commerce",
  description: "University ISAD e-commerce demo: register, login, search, cart, checkout, simulated payment, track order."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Navbar />
          <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-6">{children}</main>
          <Footer />
          <CompareBar />
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
