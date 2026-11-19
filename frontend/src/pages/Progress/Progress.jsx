// PROGRESS_API_INTEGRATION_20261018
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../App.css'
import Sidebar from '../../components/Sidebar'
import { API_BASE_URL } from '../../utils/api'
import { getAccessToken } from '../../utils/auth'

function getErrorMessage(payload, fallback) {
  if (typeof payload?.detail === 'string') return payload.detail
  if (typeof payload?.message === 'string') return payload.message
  return fallback
}

async function requestApi(path, token) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    const payload = await response.json().catch(() => ({}))

    return {
      ok: response.ok,
      status: response.status,
      payload,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      payload: {
        detail: error.message || 'Unable to connect to the API.',
      },
    }
  }
}

function getNumericProficiency(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null
  }

  const normalized = String(value).trim().replace(/\s*%$/, '').trim()

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null

  const score = Number(normalized)

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return null
  }

  return score
}

function getSkillIcon(name = '') {
  const normalized = name.toLowerCase()

  if (normalized.includes('python')) return '🐍'
  if (normalized.includes('sql') || normalized.includes('database')) return '🗄️'
  if (normalized.includes('statistic')) return '📊'
  if (normalized.includes('machine learning')) return '🤖'
  if (normalized.includes('javascript')) return '🟨'
  if (normalized.includes('react')) return '⚛️'
  if (normalized.includes('java')) return '☕'
  if (normalized.includes('data analysis')) return '📈'
  if (normalized.includes('git')) return '🔗'

  return '💡'
}

function normalizeSkill(skill) {
  const name = skill.skill_name || skill.name || 'Unnamed skill'
  const rawValue = skill.proficiency
  const score = getNumericProficiency(rawValue)
  const rawStatus =
    rawValue === null || rawValue === undefined || String(rawValue).trim() === ''
      ? 'Not assessed'
      : String(rawValue).trim()

  return {
    id: skill.id ?? skill.skill_id ?? name,
    name,
    icon: getSkillIcon(name),
    score,
    status: score !== null ? 'Recorded score' : rawStatus,
    description:
      score !== null
        ? `Your saved numeric proficiency score is ${score}%.`
        : rawStatus === 'Not assessed'
          ? 'No proficiency level or numeric score has been recorded for this skill.'
          : `Your saved proficiency level is ${rawStatus}. No numeric score is recorded.`,
  }
}

function Progress() {
  const navigate = useNavigate()

  const [skills, setSkills] = useState([])
  const [roadmap, setRoadmap] = useState([])
  const [career, setCareer] = useState('')
  const [summary, setSummary] = useState(null)
  const [selectedSkill, setSelectedSkill] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [skillsError, setSkillsError] = useState('')
  const [roadmapError, setRoadmapError] = useState('')
  const [progressError, setProgressError] = useState('')

  const loadProgressData = useCallback(async () => {
    await Promise.resolve()
    setIsLoading(true)
    setAuthError('')
    setSkillsError('')
    setRoadmapError('')
    setProgressError('')

    const token = getAccessToken()

    if (!token) {
      setSkills([])
      setRoadmap([])
      setSummary(null)
      setCareer('')
      setAuthError('Your session has expired. Please log in again.')
      setIsLoading(false)
      return
    }

    const [skillsResult, progressResult, roadmapResult] = await Promise.all([
      requestApi('/skills/my', token),
      requestApi('/progress/', token),
      requestApi('/roadmap/', token),
    ])

    if (skillsResult.ok && Array.isArray(skillsResult.payload)) {
      const loadedSkills = skillsResult.payload.map(normalizeSkill)
      setSkills(loadedSkills)
      setSelectedSkill((previous) =>
        loadedSkills.find((skill) => skill.id === previous?.id) || null
      )
    } else {
      setSkills([])
      setSkillsError(
        getErrorMessage(
          skillsResult.payload,
          'Unable to load your saved skills.'
        )
      )
    }

    if (progressResult.ok) {
      setSummary(progressResult.payload)
    } else {
      setSummary(null)
      setProgressError(
        getErrorMessage(
          progressResult.payload,
          'The progress summary is currently unavailable.'
        )
      )
    }

    if (
      roadmapResult.ok &&
      Array.isArray(roadmapResult.payload.roadmap)
    ) {
      setCareer(
        typeof roadmapResult.payload.career === 'string'
          ? roadmapResult.payload.career
          : ''
      )

      setRoadmap(
        roadmapResult.payload.roadmap.map((step, index) => ({
          ...step,
          id: step.id ?? `${step.step_number ?? index}-${step.title}`,
          title: step.title || step.skill || `Step ${index + 1}`,
          completed: Boolean(step.completed),
        }))
      )
    } else {
      setCareer('')
      setRoadmap([])
      setRoadmapError(
        getErrorMessage(
          roadmapResult.payload,
          'Unable to load your saved roadmap.'
        )
      )
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    Promise.resolve().then(() => {
      if (active) {
        void loadProgressData()
      }
    })

    return () => {
      active = false
    }
  }, [loadProgressData])

  const completedSteps = roadmap.filter((step) => step.completed)
  const incompleteSteps = roadmap.filter((step) => !step.completed)

  const completedCount =
    summary && Number.isFinite(Number(summary.completed_steps))
      ? Number(summary.completed_steps)
      : completedSteps.length

  const totalSteps =
    summary && Number.isFinite(Number(summary.total_steps))
      ? Number(summary.total_steps)
      : roadmap.length

  const remainingCount =
    summary && Number.isFinite(Number(summary.remaining_steps))
      ? Number(summary.remaining_steps)
      : Math.max(0, totalSteps - completedCount)

  const progressValue =
    summary && summary.progress_percentage !== undefined &&
    Number.isFinite(Number(summary.progress_percentage))
      ? Number(summary.progress_percentage)
      : roadmap.length > 0
        ? (completedSteps.length / roadmap.length) * 100
        : null

  const progressPercentage =
    progressValue === null
      ? null
      : Math.max(0, Math.min(100, Math.round(progressValue)))

  const nextStep = incompleteSteps[0]

  return (
    <div className="progress-page">
      <Sidebar />

      <main className="progress-main">
        <header className="progress-header">
          <p className="small-heading">YOUR PERFORMANCE</p>

          <h1>Learning Progress</h1>

          <p>
            Track the skills saved to your account and your actual roadmap
            completion.
          </p>

          {career && <p>Career goal: {career}</p>}
        </header>

        {authError && (
          <section className="progress-section" role="alert">
            <p>{authError}</p>
            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate('/login')}
            >
              Log In
            </button>
          </section>
        )}

        {isLoading && (
          <p role="status">Loading your saved learning progress...</p>
        )}

        {!isLoading && (
          <>
            <section className="overall-progress-card">
              <div className="overall-progress-top">
                <div>
                  <span>Overall Roadmap Progress</span>

                  <p>
                    {totalSteps > 0
                      ? `${completedCount} of ${totalSteps} roadmap steps completed.`
                      : 'Progress will appear when your selected career has a roadmap.'}
                  </p>
                </div>

                <strong>
                  {progressPercentage === null
                    ? '—'
                    : `${progressPercentage}%`}
                </strong>
              </div>

              <div
                className="overall-progress-bar"
                role="progressbar"
                aria-label="Overall roadmap progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercentage ?? 0}
              >
                <div
                  className="overall-progress-fill"
                  style={{
                    width:
                      progressPercentage === null
                        ? '0%'
                        : `${progressPercentage}%`,
                  }}
                />
              </div>

              <div className="progress-milestone">
                <span>
                  {progressPercentage === null
                    ? '🎯 Select a career to begin'
                    : progressPercentage >= 75
                      ? '🎯 75% milestone reached'
                      : '🎯 Next milestone: 75%'}
                </span>

                <span>
                  {progressPercentage === null
                    ? 'Not available'
                    : progressPercentage >= 75
                      ? 'Milestone reached'
                      : `${75 - progressPercentage}% remaining`}
                </span>
              </div>

              {progressError && <p role="status">{progressError}</p>}
            </section>

            <section className="progress-stats">
              <div className="progress-stat-card">
                <span>✅</span>
                <p>Roadmap Steps Completed</p>
                <h2>{summary || roadmap.length ? completedCount : '—'}</h2>
              </div>

              <div className="progress-stat-card">
                <span>🧭</span>
                <p>Steps Remaining</p>
                <h2>{summary || roadmap.length ? remainingCount : '—'}</h2>
              </div>

              <div className="progress-stat-card">
                <span>💡</span>
                <p>Skills Tracked</p>
                <h2>{skills.length}</h2>
              </div>

              <div className="progress-stat-card">
                <span>🎯</span>
                <p>Career Goal</p>
                <h2>{career || 'Not set'}</h2>
              </div>
            </section>

            <section className="progress-section">
              <div className="progress-section-heading">
                <p className="small-heading">SKILL DEVELOPMENT</p>

                <h2>Your Skills</h2>

                <p>
                  These proficiency levels come from your saved skills.
                  Percentages appear only when a numeric score is recorded.
                </p>
              </div>

              {skillsError && (
                <p role="alert">
                  {skillsError}
                </p>
              )}

              {!skillsError && skills.length === 0 && (
                <p>
                  No saved skills were found. Add your skills to start tracking
                  your profile.
                </p>
              )}

              <div className="progress-skill-list">
                {skills.map((skill) => (
                  <div
                    className={`progress-skill ${
                      selectedSkill?.id === skill.id ? 'selected' : ''
                    }`}
                    key={skill.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedSkill?.id === skill.id}
                    onClick={() => setSelectedSkill(skill)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedSkill(skill)
                      }
                    }}
                  >
                    <div className="progress-skill-header">
                      <span>
                        {skill.icon} {skill.name}
                      </span>

                      <div>
                        <strong>
                          {skill.score === null
                            ? skill.status
                            : `${skill.score}%`}
                        </strong>

                        <small>
                          {skill.score === null
                            ? 'No numeric score'
                            : 'Recorded score'}
                        </small>
                      </div>
                    </div>

                    <div
                      className="skill-progress-bar"
                      role="progressbar"
                      aria-label={`${skill.name} recorded proficiency`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={skill.score ?? 0}
                    >
                      <div
                        style={{
                          width: `${skill.score ?? 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {selectedSkill && (
                <div className="progress-selected-card">
                  <div>
                    <p className="small-heading">SKILL DETAILS</p>

                    <h3>
                      {selectedSkill.icon} {selectedSkill.name}
                    </h3>

                    <p>{selectedSkill.description}</p>

                    <strong>
                      Recorded proficiency:{' '}
                      {selectedSkill.score === null
                        ? selectedSkill.status
                        : `${selectedSkill.score}%`}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => setSelectedSkill(null)}
                  >
                    Close
                  </button>
                </div>
              )}
            </section>

            <section className="progress-section">
              <div className="progress-section-heading">
                <p className="small-heading">ROADMAP STATUS</p>

                <h2>Your Learning Steps</h2>

                <p>
                  Completion status is loaded from your saved roadmap.
                </p>
              </div>

              {roadmapError && <p role="alert">{roadmapError}</p>}

              {!roadmapError && roadmap.length === 0 && (
                <div>
                  <p>
                    No roadmap steps are available for your account yet.
                  </p>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => navigate('/career-analysis')}
                  >
                    Choose a Career
                  </button>
                </div>
              )}

              <div className="activity-list">
                {roadmap.map((step) => (
                  <div className="activity-item" key={step.id}>
                    <span>{step.completed ? '✓' : '○'}</span>

                    <div>
                      <strong>{step.title}</strong>

                      <p>
                        {step.completed
                          ? 'Completed and saved'
                          : 'Not completed yet'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="progress-achievement">
              <div className="achievement-icon">
                {roadmap.length > 0 && remainingCount === 0 ? '🏆' : '🎯'}
              </div>

              <div>
                <p className="small-heading">NEXT MILESTONE</p>

                <h2>
                  {!career
                    ? 'Choose a Career'
                    : !roadmap.length
                      ? 'Roadmap Not Available'
                      : nextStep
                        ? `Complete ${nextStep.title}`
                        : 'Roadmap Completed'}
                </h2>

                <p>
                  {!career
                    ? 'Select a career to see its learning roadmap and track completion.'
                    : !roadmap.length
                      ? 'A configured roadmap is required before progress can be tracked.'
                      : nextStep
                        ? 'Complete the next roadmap step and your saved progress will update.'
                        : 'All available roadmap steps have been marked as completed.'}
                </p>
              </div>

              <strong>
                {!roadmap.length
                  ? 'Not available'
                  : remainingCount > 0
                    ? `${remainingCount} steps remaining`
                    : '100% complete'}
              </strong>
            </section>

            {progressError && !summary && (
              <section className="progress-section" role="status">
                <p>
                  The progress summary endpoint did not return a usable result.
                  The display above uses saved roadmap completion records when
                  available.
                </p>
                <button
                  type="button"
                  className="outline-button"
                  onClick={loadProgressData}
                >
                  Refresh Progress
                </button>
              </section>
            )}

            <div className="progress-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => navigate('/roadmap')}
              >
                Continue Learning →
              </button>

              <button
                type="button"
                className="outline-button"
                onClick={() => navigate('/dashboard')}
              >
                ← Back to Dashboard
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default Progress