"use client"
import { useState } from 'react'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={`${isOpen ? 'w-64' : 'w-16'} bg-gray-800 text-white transition-all duration-300 flex flex-col`}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-4 text-left hover:bg-gray-700"
      >
        {isOpen ? '⮜ Collapse' : '⮞'}
      </button>
      <div className="flex-1 p-4">
        {isOpen ? <p className="text-sm text-gray-300">Menu Sidebar</p> : null}
      </div>
    </div>
  )
}