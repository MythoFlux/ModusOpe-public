// src/components/Auth.tsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { LogIn } from 'lucide-react'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuthAction = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    if (isSigningUp) {
      // Käsittele rekisteröityminen erikseen
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      })

      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        // Tarkistetaan, onko käyttäjällä jo olemassa olevia identiteettejä.
        // Jos identities-taulukko on tyhjä, käyttäjä on täysin uusi ja tarvitsee vahvistuksen.
        if (data.user.identities && data.user.identities.length === 0) {
           setMessage('Käyttäjätunnus on jo olemassa, mutta sähköpostia ei ole vahvistettu. Kokeile kirjautumista tai salasanan nollausta.')
        } else {
           setMessage('Rekisteröinti onnistui! Vahvista sähköpostiosoitteesi tarkistamalla sähköpostisi.')
           setIsSigningUp(false); // Vaihda takaisin kirjautumisnäkymään
        }
      }
    } else {
      // Käsittele normaali kirjautuminen
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) {
        setMessage(error.message)
      }
      // Kirjautuminen onnistui, AppContext hoitaa uudelleenohjauksen
    }

    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
            <LogIn className="w-12 h-12 mx-auto text-blue-600"/>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">
                {isSigningUp ? 'Luo tunnus' : 'Kirjaudu sisään'}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
                {isSigningUp ? 'Luo tunnus jatkaaksesi ModusOpeen.' : 'Tervetuloa takaisin!'}
            </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleAuthAction}>
          <div className="space-y-4">
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="email"
              placeholder="Sähköpostiosoite"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              type="password"
              placeholder="Salasana"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button
              className="w-full py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={loading}
            >
              {loading ? <span>Ladataan...</span> : <span>{isSigningUp ? 'Luo tunnus' : 'Kirjaudu sisään'}</span>}
            </button>
          </div>
          {message && <p className="text-sm text-center text-red-600">{message}</p>}
        </form>
          <div className="text-sm text-center text-gray-600">
            {isSigningUp ? (
                <>
                Onko sinulla jo tunnus?{' '}
                <button onClick={() => setIsSigningUp(false)} className="font-medium text-blue-600 hover:underline">
                    Kirjaudu sisään
                </button>
                </>
            ) : (
                <>
                Eikö sinulla ole tunnusta?{' '}
                <button onClick={() => setIsSigningUp(true)} className="font-medium text-blue-600 hover:underline">
                    Luo tunnus
                </button>
                </>
            )}
        </div>
      </div>
    </div>
  )
}
