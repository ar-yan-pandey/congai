import '@/styles/globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function App({ Component, pageProps }) {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Navbar />
      <Component {...pageProps} />
    </div>
  )
}
