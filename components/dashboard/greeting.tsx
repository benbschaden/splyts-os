'use client'

import { useEffect, useState } from 'react'

interface GreetingProps {
  name: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function Greeting({ name }: GreetingProps) {
  const [greeting, setGreeting] = useState('Welcome')

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  return (
    <div className="px-8 pt-10 pb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {greeting}{name ? `, ${name}` : ''}.
      </h1>
    </div>
  )
}
