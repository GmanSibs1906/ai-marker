import './globals.css'
import { Inter } from 'next/font/google'
import Image from 'next/image'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AI Assessment Marker',
  description: 'Professional automated assessment and project marking system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} gradient-bg`}>
        <div className="min-h-screen">
          {/* Header */}
          <header className="glass-header border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm p-1">
                    <Image 
                      src="/logo.png" 
                      alt="Melsoft Academy Logo" 
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white text-shadow">
                      Melsoft Academy AI Marker
                    </h1>
                    <p className="text-white/70 text-sm">
                      Professional automated marking system
                    </p>
                  </div>
                </div>
                
                <nav className="hidden md:flex items-center space-x-1">
                  <button className="btn-ghost">
                    Documentation
                  </button>
                  <button className="btn-ghost">
                    Support
                  </button>
                  <button className="btn-primary">
                    Get Started
                  </button>
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-white/10 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-2 mb-4 md:mb-0">
                  <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center p-1">
                    <Image 
                      src="/logo.png" 
                      alt="Melsoft Academy Logo" 
                      width={32}
                      height={32}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-white/70 text-sm">
                    © 2025 Melsoft Academy. All rights reserved.
                  </span>
                </div>
                
                <div className="flex items-center space-x-6">
                  <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">
                    Privacy Policy
                  </a>
                  <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">
                    Terms of Service
                  </a>
                  <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
