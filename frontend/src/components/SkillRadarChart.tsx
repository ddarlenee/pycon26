import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { TieredSkill } from '../types'

interface Props {
  roleSkills: TieredSkill[]
}

export default function SkillRadarChart({ roleSkills }: Props) {
  const data = roleSkills.map((s) => ({
    skill: s.name.length > 16 ? s.name.slice(0, 14) + '…' : s.name,
    fullName: s.name,
    Role: 100,
    You: s.matched_by && s.matched_by.length > 0 ? 100 : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart data={data} outerRadius={120}>
        <PolarGrid />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
        <Tooltip formatter={(val: number) => val === 100 ? '✓ Have it' : '✗ Gap'} labelFormatter={(_label: string, payload: any[]) => payload?.[0]?.payload?.fullName ?? _label} />
        <Radar name="Role Requirement" dataKey="Role" stroke="#e2e8f0" fill="#e2e8f0" fillOpacity={0.5} />
        <Radar name="Your Skills" dataKey="You" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  )
}
