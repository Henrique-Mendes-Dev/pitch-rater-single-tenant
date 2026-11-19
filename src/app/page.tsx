'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Usuario, Equipe } from '../types'
import Header from '../components/Header'
import AuthScreen from '../components/AuthScreen'
import EvaluationForm from '../components/EvaluationForm'
import AdminDashboard from '../components/AdminDashboard'

export default function Home() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [equipes, setEquipes] = useState<Equipe[]>([])

  useEffect(() => {
    async function carregarEquipes() {
      const { data, error } = await supabase.from('equipes').select('id, nome').order('nome')
      if (!error && data) {
        setEquipes(data as Equipe[]) 
      }
    }
    
    if (usuario) {
      carregarEquipes()
    }
  }, [usuario])

  return (
    <div className="min-h-screen bg-white text-[#161616] flex flex-col font-sans">
      <Header usuario={usuario} onLogout={() => setUsuario(null)} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8">
        {!usuario ? (
          <AuthScreen onLogin={(u) => setUsuario(u)} />
        ) : usuario.cargo === 'admin' ? (
          <AdminDashboard />
        ) : (
          <EvaluationForm usuario={usuario} equipes={equipes} />
        )}
      </main>
    </div>
  )
}