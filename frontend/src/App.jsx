import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Verify from './pages/Verify.jsx'
import UniversityDashboard from './pages/UniversityDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/"           element={<Home />} />
          <Route path="/verify"     element={<Verify />} />
          <Route path="/university" element={<UniversityDashboard />} />
          <Route path="/admin"      element={<AdminDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
