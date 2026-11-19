export interface Usuario {
  id: string
  nome: string
  email: string
  cargo: 'admin' | 'avaliador'
  pin: string
}

export interface Equipe {
  id: string
  nome: string
}

export interface Criterio {
  id: string
  peso: number
  titulo: string
  descricao: string
}

export interface LikertOption {
  val: number
  label: string
  desc: string
}