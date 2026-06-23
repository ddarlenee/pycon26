import { useState } from 'react'
import type { CareerRung } from '../types'
import MilestoneChips from './MilestoneChips'

interface Props {
  currentRole: string
  immediateNext: CareerRung
  fullLadder: CareerRung[]
  longTermDestination: string
  onStartNow?: (role: string) => void
  startingRole?: string | null
}

function StartNowButton({ role, onStartNow, startingRole, locked = false, size = 'md' }: {
  role: string
  onStartNow: (role: string) => void
  startingRole?: string | null
  locked?: boolean
  size?: 'sm' | 'md'
}) {
  const isThis = startingRole === role
  const isAny = startingRole !== null && startingRole !== undefined
  const isDisabled = isAny || locked

  return (
    <button
      onClick={() => { if (!locked && !isAny) onStartNow(role) }}
      disabled={isDisabled}
      title={locked && !isAny ? 'Complete all steps above to unlock' : undefined}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition-colors ${
        size === 'md' ? 'px-4 py-2 text-sm' : 'px-2.5 py-1 text-xs'
      } ${
        isThis
          ? 'bg-blue-200 text-blue-500 cursor-wait'
          : locked || isAny
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : size === 'md'
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-white hover:bg-blue-50 text-blue-600 border border-blue-300'
      }`}
    >
      {isThis ? (
        <>
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Analysing…
        </>
      ) : locked ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Complete all steps first
        </>
      ) : (
        <>
          Start now
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
          </svg>
        </>
      )}
    </button>
  )
}

export default function CareerLadder({ currentRole, immediateNext, fullLadder, longTermDestination, onStartNow, startingRole }: Props) {
  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(new Set())

  function toggleStep(key: string) {
    setCheckedSteps(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function isSkillConfirmed(skill: string): boolean {
    const steps = immediateNext.next_steps.filter(s => s.skill === skill)
    if (steps.length === 0) return false
    return steps.every((_, i) => checkedSteps.has(`${skill}::${i}`))
  }

  const skillsWithSteps = immediateNext.skill_delta.filter(skill =>
    immediateNext.next_steps.some(s => s.skill === skill)
  )
  const confirmedCount = skillsWithSteps.filter(skill => isSkillConfirmed(skill)).length
  const allChecked = skillsWithSteps.length === 0 || confirmedCount >= skillsWithSteps.length

  return (
    <div className="relative pl-8 border-l-2 border-blue-200">

      {/* Long-term north star */}
      <div className="mb-8 opacity-40">
        <div className="absolute -left-2.5 w-4 h-4 rounded-full bg-purple-300 border-2 border-white" />
        <p className="text-xs uppercase tracking-wide text-purple-500 font-semibold ml-4">Long-term goal</p>
        <p className="text-base font-bold text-purple-400 ml-4">{longTermDestination}</p>
      </div>

      {/* Distant future roles — locked, no Start now */}
      {[...fullLadder].reverse().map((rung) => (
        <div key={rung.role} className="mb-8 group">
          <div className="absolute -left-2 w-4 h-4 rounded-full bg-gray-300 border-2 border-white" />
          <div className="ml-4">
            <div className="flex items-center gap-3 opacity-50 group-hover:opacity-90 transition-opacity">
              <div>
                <p className="text-sm font-semibold text-gray-500">{rung.role}</p>
                <p className="text-xs text-gray-400">{rung.transferability_score}% transferable</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Complete {immediateNext.role} first
                </span>
              </div>
            </div>
            <div className="mt-1 hidden group-hover:block bg-white border shadow-md rounded-lg p-3 text-xs max-w-xs">
              <p className="font-medium text-gray-700 mb-1">{rung.why_good_fit}</p>
              {rung.skill_delta.length > 0 && (
                <p className="text-gray-500">
                  New skills needed: {rung.skill_delta.slice(0, 3).join(', ')}
                  {rung.skill_delta.length > 3 && ' …'}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Immediate next role — primary CTA with gated checklist */}
      <div className="mb-8 bg-blue-50 border-2 border-blue-400 rounded-xl p-5">
        <div className="absolute -left-3 w-5 h-5 rounded-full bg-blue-500 border-2 border-white" />
        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Your Next Step</p>
        <p className="text-xl font-bold text-blue-800 mb-1">{immediateNext.role}</p>
        <p className="text-sm text-blue-600">{immediateNext.transferability_score}% of your current skills transfer</p>
        <p className="text-sm text-gray-600 mt-2 italic">"{immediateNext.why_good_fit}"</p>

        {/* Skill delta — each skill with its per-step checklist */}
        {immediateNext.skill_delta.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">New skills you'll need:</p>
              {skillsWithSteps.length > 0 && (
                <span className="text-xs text-gray-400">{confirmedCount} / {skillsWithSteps.length} confirmed</span>
              )}
            </div>
            <div className="space-y-3">
              {immediateNext.skill_delta.map((skill) => {
                const steps = immediateNext.next_steps.filter(s => s.skill === skill)
                const confirmed = isSkillConfirmed(skill)

                return (
                  <div key={skill}>
                    {/* Skill header row */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        confirmed ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {confirmed && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 8">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs font-semibold ${confirmed ? 'line-through text-gray-400' : 'text-blue-700'}`}>
                        {skill}
                      </span>
                    </div>

                    {/* Per-step checkboxes */}
                    {steps.length > 0 ? (
                      <div className="ml-5 space-y-1.5">
                        {steps.map((step, i) => {
                          const key = `${skill}::${i}`
                          const isChecked = checkedSteps.has(key)
                          return (
                            <label key={key} className="flex items-start gap-2 cursor-pointer">
                              <button
                                type="button"
                                onClick={() => toggleStep(key)}
                                disabled={!!startingRole}
                                className={`mt-0.5 w-3.5 h-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                  isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'
                                } ${startingRole ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                              >
                                {isChecked && (
                                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 8">
                                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>
                              <span className={`text-xs leading-snug ${isChecked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                {step.summary || step.action}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      // Skill has no steps — show as static tag (fallback)
                      <div className="ml-5">
                        <span className="bg-white border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {immediateNext.milestones.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Milestones to get there:</p>
            <MilestoneChips milestones={immediateNext.milestones} />
          </div>
        )}

        {onStartNow && (
          <div className="mt-4">
            <StartNowButton
              role={immediateNext.role}
              onStartNow={onStartNow}
              startingRole={startingRole}
              locked={!allChecked}
              size="md"
            />
          </div>
        )}
      </div>

      {/* Current role */}
      <div className="mb-2">
        <div className="absolute -left-2 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
        <div className="ml-4">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">You are here</p>
          <p className="text-base font-bold text-gray-700">{currentRole}</p>
        </div>
      </div>

    </div>
  )
}
