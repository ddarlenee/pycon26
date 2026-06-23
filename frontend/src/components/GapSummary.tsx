import { useState } from 'react'
import type { CoverageScore, GapItem, NextStepItem } from '../types'

const tierColour: Record<string, string> = {
  Essential: 'text-red-600',
  Important: 'text-amber-600',
  'Nice-to-have': 'text-green-600',
}

const tierBadge: Record<string, string> = {
  Essential: 'bg-red-50 text-red-700 border-red-200',
  Important: 'bg-amber-50 text-amber-700 border-amber-200',
  'Nice-to-have': 'bg-green-50 text-green-700 border-green-200',
}

function shortLine(step: NextStepItem): string {
  if (step.summary) return step.summary
  const t = step.text
  const comma = t.indexOf(',')
  if (comma > 20 && comma < 80) return t.slice(0, comma)
  return t.length > 72 ? t.slice(0, 70) + '…' : t
}

function StepRow({ step, index }: { step: NextStepItem; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const short = shortLine(step)
  const hasMore = step.text && step.text !== short

  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 text-xs font-bold text-gray-400 w-4 shrink-0">{index + 1}.</span>
      <div>
        {step.skill && (
          <span className={`inline-block text-xs font-semibold border px-1.5 py-0.5 rounded mb-0.5 mr-1 ${tierBadge[step.tier] ?? ''}`}>
            {step.skill}
          </span>
        )}
        <p className="text-sm text-gray-700 leading-snug inline">
          {expanded ? step.text : short}
          {hasMore && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="ml-1 text-xs text-blue-500 hover:underline whitespace-nowrap"
            >
              learn more
            </button>
          )}
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="ml-1 text-xs text-gray-400 hover:underline whitespace-nowrap"
            >
              less
            </button>
          )}
        </p>
      </div>
    </li>
  )
}

interface Props {
  score: CoverageScore
  gaps: GapItem[]
  nextSteps: NextStepItem[]
}

export default function GapSummary({ score, gaps, nextSteps }: Props) {
  const required = nextSteps.filter((s) => s.tier === 'Essential' || s.tier === 'Important')
  const optional = nextSteps.filter((s) => s.tier === 'Nice-to-have')

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold mb-3 text-gray-800">Coverage Score</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-red-600 font-medium">Essential</span>
            <span className="font-mono">{score.essential}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-600 font-medium">Important</span>
            <span className="font-mono">{score.important}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600 font-medium">Nice-to-have</span>
            <span className="font-mono">{score.nice_to_have}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold mb-3 text-gray-800">Top Gaps to Close</h3>
        {gaps.length === 0 ? (
          <p className="text-sm text-gray-400">No gaps detected — great match!</p>
        ) : (
          <ul className="space-y-1">
            {gaps.slice(0, 6).map((g) => (
              <li key={g.skill} className="flex items-center gap-2 text-sm">
                <span className={`font-medium w-24 shrink-0 text-xs ${tierColour[g.tier] ?? 'text-gray-600'}`}>
                  {g.tier}
                </span>
                <span className="text-gray-700">{g.skill}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {required.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-3 text-gray-800">Next Steps</h3>
          <ol className="space-y-3">
            {required.map((step, i) => <StepRow key={i} step={step} index={i} />)}
          </ol>
        </div>
      )}

      {optional.length > 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold mb-1 text-gray-600 text-sm">Optional — Nice-to-have skills</h3>
          <p className="text-xs text-gray-400 mb-3">These aren't required but will strengthen your profile.</p>
          <ol className="space-y-3">
            {optional.map((step, i) => <StepRow key={i} step={step} index={i} />)}
          </ol>
        </div>
      )}
    </div>
  )
}
