export type User = {
  id: number
  name: string
  email: string
  created_at: string
}

export type NewUser = Omit<User, 'id' | 'created_at'> 