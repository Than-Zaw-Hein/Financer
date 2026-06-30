'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊', aria: 'Dashboard' },
  { href: '/income', label: 'Income', icon: '💰', aria: 'Income' },
  { href: '/expenses', label: 'Expenses', icon: '💸', aria: 'Expenses' },
  { href: '/payments', label: 'Payments', icon: '💳', aria: 'Payments' },
  { href: '/people', label: 'People', icon: '👥', aria: 'People' },
  { href: '/loans', label: 'Loans', icon: '🏦', aria: 'Loans' },
  { href: '/loans/compare', label: 'Compare', icon: '⚖️', aria: 'Compare Loans', sub: true },
  { href: '/cashflow', label: 'Cash Flow', icon: '📈', aria: 'Cash Flow' },
  { href: '/settings', label: 'Settings', icon: '⚙️', aria: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { data: settings } = useSWR('/api/settings', fetcher, { revalidateOnFocus: false })

  const currency = settings?.currency || 'MMK'

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 flex items-center justify-center rounded-[12px] bg-primary text-on-primary shadow-elevation-2"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-scrim md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 z-40 w-[280px] md:w-[240px] h-full bg-surface-container-high text-on-surface flex flex-col py-4 transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <Link href="/" className="px-4 mb-6 flex flex-col gap-0.5 hover:opacity-80 transition-opacity" onClick={() => setOpen(false)}>
          <h1 className="text-title-large font-normal tracking-tight">My Finance</h1>
          <p className="text-body-small text-on-surface-variant">မင်းရဲ့ဘဏ္ဍာရေး</p>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 px-3">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-label={item.aria}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-[28px] text-label-large font-medium transition-all min-h-[44px]
                  ${item.sub ? 'ml-3' : ''}
                  ${isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-on-surface/8'
                  }`}
              >
                <span className="text-xl" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 pt-4 border-t border-outline-variant text-label-small text-on-surface-variant">
          {currency} &middot; {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </div>
      </aside>
    </>
  )
}
