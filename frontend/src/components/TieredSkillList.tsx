import type { TieredSkill } from '../types'

const unmatchedStyle: Record<string, string> = {
  Essential: 'border-red-200 bg-red-50 text-red-700',
  Important: 'border-amber-200 bg-amber-50 text-amber-700',
  'Nice-to-have': 'border-orange-200 bg-orange-50 text-orange-700',
}

const matchedStyle = 'border-l-4 border-l-blue-500 border-blue-200 bg-blue-50 text-blue-800'

const tierOrder = ['Essential', 'Important', 'Nice-to-have'] as const

export default function TieredSkillList({ skills }: { skills: TieredSkill[] }) {
  return (
    <div className="space-y-4">
      {tierOrder.map((tier) => {
        const items = skills.filter((s) => s.tier === tier)
        if (!items.length) return null
        return (
          <div key={tier}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{tier}</h4>
            {items.map((s) => {
              const matched = s.matched_by && s.matched_by.length > 0
              return (
                <div
                  key={s.name}
                  className={`border rounded px-3 py-2 mb-1 text-sm ${matched ? matchedStyle : (unmatchedStyle[tier] ?? '')}`}
                  title={s.reasoning}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{s.name}</span>
                    {matched && <span className="text-blue-500 font-bold shrink-0">✓</span>}
                  </div>
                  {matched && (
                    <div className="text-xs mt-0.5 text-blue-600 opacity-80">
                      via {s.matched_by.join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
