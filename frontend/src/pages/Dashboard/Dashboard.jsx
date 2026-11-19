import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Sidebar from '../../components/Sidebar'
import useAuth from '../../hooks/useAuth'
import { API_BASE_URL } from '../../utils/api'
import { getAccessToken } from '../../utils/auth'

function Dashboard() {
  const navigate = useNavigate()
  const { userName } = useAuth()

  const [selectedSkill, setSelectedSkill] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      const token = getAccessToken()

      if (!token) {
        setDashboardError('Your login session is missing. Please log in again.')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Your session may have expired. Please log in again.')
          }

          const detail =
            typeof payload?.detail === 'string'
              ? payload.detail
              : `Dashboard request failed (${response.status}).`

          throw new Error(detail)
        }

        setDashboardData(payload)
        setDashboardError('')
      } catch (error) {
        if (!controller.signal.aborted) {
          setDashboardError(
            error instanceof Error
              ? error.message
              : 'Could not load dashboard data.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => controller.abort()
  }, [])

  const profile = dashboardData?.profile || null
  const apiUser = dashboardData?.user

  const displayName = apiUser?.name || userName || 'User'

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const skills = Array.isArray(dashboardData?.skills)
    ? dashboardData.skills.map((skill, index) => {
        const rawProficiency = skill?.proficiency

        const hasNumericProficiency =
          rawProficiency !== null &&
          rawProficiency !== undefined &&
          String(rawProficiency).trim() !== '' &&
          Number.isFinite(Number(rawProficiency))

        const numericProficiency = hasNumericProficiency
          ? Number(rawProficiency)
          : null

        const hasPercentageScale =
          numericProficiency !== null &&
          numericProficiency >= 0 &&
          numericProficiency <= 100

        let level = 'Not provided'

        if (hasNumericProficiency && hasPercentageScale) {
          if (numericProficiency >= 80) {
            level = 'High proficiency'
          } else if (numericProficiency >= 60) {
            level = 'Developing'
          } else {
            level = 'Building skills'
          }
        } else if (hasNumericProficiency) {
          level = `Numeric value: ${numericProficiency}`
        } else if (
          typeof rawProficiency === 'string' &&
          rawProficiency.trim()
        ) {
          level = rawProficiency.trim()
        }

        const proficiencyDisplay = hasNumericProficiency
          ? hasPercentageScale
            ? `${numericProficiency}%`
            : String(numericProficiency)
          : typeof rawProficiency === 'string' && rawProficiency.trim()
            ? rawProficiency.trim()
            : '—'

        return {
          id: skill?.id ?? `${skill?.skill_name || skill?.name || 'skill'}-${index}`,
          name: skill?.skill_name || skill?.name || `Skill ${index + 1}`,
          score: hasPercentageScale ? numericProficiency : null,
          level,
          proficiencyDisplay,
        }
      })
    : []

  const savedSkillCount = dashboardData
    ? dashboardData.skill_count ?? skills.length
    : '—'

  const profileSummary = [
    profile?.degree,
    profile?.college,
    profile?.location,
  ]
    .filter(Boolean)
    .join(' • ')

  const stats = [
    {
      label: 'Skills Added',
      value: isLoading ? '...' : savedSkillCount,
      change: dashboardData ? 'Saved in your account' : 'Live data unavailable',
    },
    {
      label: 'Skill Match',
      value: '—',
      change: 'Not provided by backend',
    },
    {
      label: 'Courses',
      value: '—',
      change: 'Not provided by backend',
    },
    {
      label: 'Learning Streak',
      value: '—',
      change: 'Not provided by backend',
    },
  ]

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-welcome">Welcome back</p>

            <h1>Hello, {displayName} 👋</h1>

            <p className="dashboard-subtitle">
              Here&apos;s your learning progress and career overview.
            </p>
          </div>

          <div className="dashboard-profile">
            <div className="profile-avatar">{initials}</div>

            <div>
              <strong>{displayName}</strong>
              <p>Student</p>
            </div>
          </div>
        </header>

        {dashboardError && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '12px',
              background: '#fff1f2',
              color: '#9f1239',
              border: '1px solid #fecdd3',
            }}
          >
            {dashboardError}
          </div>
        )}

        <section className="dashboard-stats">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <div className="stat-top">
                <span>✦</span>
              </div>

              <p>{stat.label}</p>

              <h2>{stat.value}</h2>

              <span className="stat-trend">{stat.change}</span>
            </div>
          ))}
        </section>

        <section className="ai-recommendation">
          <div className="ai-content">
            <span className="recommendation-badge">Account Overview</span>

            <h2>Your learning profile</h2>

            <p>
              {isLoading
                ? 'Loading your profile and saved skills from SkillBridgeAI...'
                : profile
                  ? 'Your account profile has been loaded from the SkillBridgeAI backend.'
                  : 'Your profile details are not available from the current dashboard response.'}
            </p>

            {profileSummary && <p>{profileSummary}</p>}

            <p>
              Career recommendations and match scores are not returned by this
              dashboard API, so no estimated score is displayed here.
            </p>

            <div className="ai-action-row">
              <button
                type="button"
                className="dashboard-button"
                onClick={() => navigate('/career-analysis')}
              >
                View Analysis
              </button>

              <button
                type="button"
                className="ai-secondary-button"
                onClick={() => navigate('/roadmap')}
              >
                View Roadmap
              </button>
            </div>
          </div>

          <div className="recommendation-score">
            <div className="score-circle">
              <strong>
                {isLoading ? '…' : profile ? '✓' : '—'}
              </strong>
            </div>

            <span>Profile Status</span>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <p className="dashboard-card-label">Skill Progress</p>

                <h2>Your saved skills</h2>
              </div>

              <button
                type="button"
                className="dashboard-text-button"
                onClick={() => navigate('/skills')}
              >
                View all
              </button>
            </div>

            <div className="dashboard-skills">
              {isLoading ? (
                <p>Loading saved skills...</p>
              ) : skills.length > 0 ? (
                skills.map((skill) => (
                  <button
                    type="button"
                    className="dashboard-skill-row"
                    key={skill.id}
                    onClick={() => setSelectedSkill(skill)}
                  >
                    <div className="dashboard-skill-info">
                      <span className="dashboard-skill-name">
                        {skill.name}
                      </span>

                      <span className="dashboard-skill-level">
                        {skill.level}
                      </span>
                    </div>

                    {skill.score !== null && (
  <div className="dashboard-skill-progress">
    <div className="dashboard-progress-track">
      <div
        className="dashboard-progress-fill"
        style={{ width: `${skill.score}%` }}
      />
    </div>
    <span>{skill.proficiencyDisplay}</span>
  </div>
)}
                  </button>
                ))
              ) : (
                <p>
                  {dashboardError
                    ? 'Saved skills could not be loaded. Check your session and backend connection.'
                    : 'No saved skills were returned. Add skills from My Skills to see them here.'}
                </p>
              )}
            </div>

            {selectedSkill && (
              <div className="dashboard-selected-skill">
                <strong>{selectedSkill.name}</strong>

                <span>Current level: {selectedSkill.level}</span>
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <p className="dashboard-card-label">Quick Access</p>

                <h2>Continue your journey</h2>
              </div>
            </div>

            <div className="dashboard-action-grid">
              <button
                type="button"
                className="dashboard-action-card"
                onClick={() => navigate('/career-analysis')}
              >
                <span className="dashboard-action-icon">✦</span>

                <span>Career Analysis</span>

                <small>Explore suitable career paths</small>
              </button>

              <button
                type="button"
                className="dashboard-action-card"
                onClick={() => navigate('/roadmap')}
              >
                <span className="dashboard-action-icon">↗</span>

                <span>Learning Roadmap</span>

                <small>Follow your personalized roadmap</small>
              </button>

              <button
                type="button"
                className="dashboard-action-card"
                onClick={() => navigate('/github-analysis')}
              >
                <span className="dashboard-action-icon">◉</span>

                <span>GitHub Analysis</span>

                <small>Analyze your GitHub profile</small>
              </button>

              <button
                type="button"
                className="dashboard-action-card"
                onClick={() => navigate('/resume-analysis')}
              >
                <span className="dashboard-action-icon">▤</span>

                <span>Resume Analysis</span>

                <small>Check your resume score</small>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
