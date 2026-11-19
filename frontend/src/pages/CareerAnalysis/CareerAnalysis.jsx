import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../App.css'
import Sidebar from '../../components/Sidebar'
import { API_BASE_URL } from '../../utils/api'
import { getAccessToken } from '../../utils/auth'

function getNumericProficiency(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null
  }

  const normalized = String(value).trim().replace(/\s*%$/, '').trim()

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null

  const number = Number(normalized)

  return Number.isFinite(number) && number >= 0 && number <= 100
    ? number
    : null
}

function getSkillIcon(name) {
  const value = String(name || '').toLowerCase()

  if (value.includes('python')) return '🐍'
  if (value.includes('sql') || value.includes('database')) return '🗄️'
  if (value.includes('data') || value.includes('excel')) return '📊'
  if (value.includes('machine learning') || value.includes('artificial intelligence')) {
    return '🤖'
  }
  if (value.includes('java')) return '☕'
  if (value.includes('react') || value.includes('javascript')) return '💻'

  return '✦'
}

function getCareerIcon(name) {
  const value = String(name || '').toLowerCase()

  if (value.includes('data')) return '📈'
  if (value.includes('machine learning') || value.includes('scientist')) return '🧠'
  if (value.includes('python') || value.includes('developer')) return '💻'

  return '🎯'
}

function CareerAnalysis() {
  const navigate = useNavigate()

  const [skills, setSkills] = useState([])
  const [careerPaths, setCareerPaths] = useState([])
  const [selectedCareer, setSelectedCareer] = useState(null)
  const [selectedCareerId, setSelectedCareerId] = useState(null)
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savingCareerId, setSavingCareerId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadCareerAnalysis() {
      const token = getAccessToken()

      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/careers/recommendations`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        )

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          const detail = typeof payload.detail === 'string'
            ? payload.detail
            : 'Unable to load career recommendations.'

          throw new Error(detail)
        }

        if (controller.signal.aborted) return

        const loadedSkills = (Array.isArray(payload.user_skills)
          ? payload.user_skills
          : []
        ).map((skill) => {
          const numericScore = getNumericProficiency(skill.proficiency)

          const level = skill.proficiency === null ||
            skill.proficiency === undefined ||
            String(skill.proficiency).trim() === ''
            ? 'Not assessed'
            : String(skill.proficiency)

          return {
            id: skill.id,
            skillId: skill.skill_id,
            name: skill.skill_name,
            icon: getSkillIcon(skill.skill_name),
            level,
            score: numericScore,
            description: numericScore !== null
              ? 'This numeric proficiency score comes from your saved profile.'
              : level === 'Not assessed'
                ? 'No proficiency level has been recorded for this skill yet.'
                : `Your saved proficiency is ${level}. No numeric score is available.`,
          }
        })

        const loadedCareers = (Array.isArray(payload.careers)
          ? payload.careers
          : []
        ).map((career) => {
          const requiredSkills = Array.isArray(career.required_skills)
            ? career.required_skills
            : []

          const matchedSkills = Array.isArray(career.matched_skills)
            ? career.matched_skills
            : []

          const missingSkills = Array.isArray(career.missing_skills)
            ? career.missing_skills
            : []

          const score = typeof career.match_percentage === 'number'
            ? career.match_percentage
            : null

          const details = requiredSkills.length === 0
            ? 'No required skills have been configured for this career yet.'
            : missingSkills.length === 0
              ? 'All currently configured required skills are present in your saved profile.'
              : `Matched skills: ${matchedSkills.join(', ') || 'None'}. Missing skills: ${missingSkills.join(', ')}.`

          return {
            id: career.id,
            name: career.career_name,
            icon: getCareerIcon(career.career_name),
            description: career.description ||
              'Match results are calculated from your saved skills and this career’s requirements.',
            score,
            details,
            requiredSkills,
            matchedSkills,
            missingSkills,
          }
        }).sort((a, b) => {
          if (a.score === null && b.score === null) return a.name.localeCompare(b.name)
          if (a.score === null) return 1
          if (b.score === null) return -1
          return b.score - a.score
        })

        setSkills(loadedSkills)
        setCareerPaths(loadedCareers)

        const currentCareerId = payload.selected_career_id ?? null
        setSelectedCareerId(currentCareerId)

        const currentCareer = loadedCareers.find(
          (career) => String(career.id) === String(currentCareerId),
        )

        setSelectedCareer(currentCareer || null)
        setError('')
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load career recommendations.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadCareerAnalysis()

    return () => controller.abort()
  }, [navigate])

  const bestMatchCareer = careerPaths.find((career) => career.score !== null) || null

  async function handleSelectCareer(career) {
    const token = getAccessToken()

    if (!token) {
      setError('Your session has expired. Please log in again.')
      return
    }

    setError('')
    setMessage('')
    setSavingCareerId(career.id)

    try {
      const response = await fetch(`${API_BASE_URL}/careers/select`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          career_id: career.id,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          typeof payload.detail === 'string'
            ? payload.detail
            : 'Unable to save your selected career.',
        )
      }

      setSelectedCareerId(career.id)
      setSelectedCareer(career)
      setMessage(`${career.name} has been saved as your selected career.`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save your selected career.',
      )
    } finally {
      setSavingCareerId(null)
    }
  }

  const missingFocusSkills = bestMatchCareer?.missingSkills?.slice(0, 3) || []

  return (
    <div className="career-page">
      <Sidebar />

      <main className="career-main">
        <header className="career-header">
          <p className="small-heading">CAREER ANALYSIS</p>

          <h1>Find Your Best Career Path</h1>

          <p>
            Explore career paths using your saved skills and the required skills
            recorded for each career.
          </p>
        </header>

        {error && (
          <p role="alert" style={{ color: '#b91c1c', marginBottom: '16px' }}>
            {error}
          </p>
        )}

        {message && (
          <p role="status" style={{ color: '#166534', marginBottom: '16px' }}>
            {message}
          </p>
        )}

        {isLoading && (
          <p role="status">Loading your saved skills and career matches...</p>
        )}

        <section className="career-result-card">
          <div className="career-result-content">
            <span className="recommendation-badge">
              {bestMatchCareer ? 'BEST SKILL MATCH' : 'CAREER PROFILE'}
            </span>

            <h2>
              {bestMatchCareer?.name || 'Build Your Career Profile'}
            </h2>

            <p>
              {bestMatchCareer
                ? bestMatchCareer.description
                : 'Save skills to your profile and ensure career requirements are configured to calculate a match.'}
            </p>

            <div className="career-result-tags">
              {bestMatchCareer?.requiredSkills?.length > 0 ? (
                bestMatchCareer.requiredSkills.slice(0, 6).map((skill) => (
                  <span key={skill}>{skill}</span>
                ))
              ) : (
                <span>Based on saved profile data</span>
              )}
            </div>
          </div>

          <div className="career-score">
            <strong>
              {bestMatchCareer?.score !== null && bestMatchCareer
                ? `${bestMatchCareer.score}%`
                : '—'}
            </strong>

            <span>Skill Match</span>
          </div>
        </section>

        <section className="career-section">
          <div className="career-section-heading">
            <p className="small-heading">SKILL ANALYSIS</p>
            <h2>Your Current Skill Profile</h2>
            <p>
              These are the skills and proficiency levels saved to your account.
              Numeric scores are shown only when one is recorded.
            </p>
          </div>

          <div className="career-skills-grid">
            {skills.map((skill) => (
              <div
                className={`career-skill-card ${
                  selectedSkill?.id === skill.id ? 'selected' : ''
                }`}
                key={skill.id ?? skill.skillId ?? skill.name}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSkill(skill)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedSkill(skill)
                  }
                }}
              >
                <div className="career-skill-top">
                  <span className="career-skill-icon">{skill.icon}</span>
                  <strong>
                    {skill.score !== null ? `${skill.score}%` : skill.level}
                  </strong>
                </div>

                <h3>{skill.name}</h3>
                {skill.score !== null && <p>{skill.level}</p>}

                {skill.score !== null ? (
                  <div className="career-progress">
                    <div
                      className="career-progress-fill"
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>
                ) : (
                  <p style={{ marginTop: '10px', fontSize: '13px' }}>
                    {skill.level === 'Not assessed'
                      ? 'No proficiency level recorded.'
                      : 'No numeric proficiency score recorded.'}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!isLoading && skills.length === 0 && (
            <p style={{ marginTop: '16px' }}>
              No saved skills yet. Add your skills to begin matching career requirements.
              {' '}
              <button
                type="button"
                className="outline-button"
                onClick={() => navigate('/skills')}
              >
                Add Skills
              </button>
            </p>
          )}

          {selectedSkill && (
            <div className="selected-skill-card">
              <div>
                <p className="small-heading">SKILL DETAILS</p>
                <h3>{selectedSkill.icon} {selectedSkill.name}</h3>
                <p>{selectedSkill.description}</p>
                <strong>
                  {selectedSkill.score !== null
                    ? `Recorded proficiency: ${selectedSkill.score}%`
                    : `Recorded proficiency: ${selectedSkill.level}`}
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

        <section className="career-improvement">
          <div>
            <span className="recommendation-badge">SKILL GAP INSIGHT</span>

            <h2>What should you focus on next?</h2>

            <p>
              {bestMatchCareer
                ? missingFocusSkills.length > 0
                  ? `Your current match is based on the skills you have saved. Focus on ${missingFocusSkills.join(', ')} to cover more of the ${bestMatchCareer.name} requirements.`
                  : `You have matched all currently configured required skills for ${bestMatchCareer.name}. Continue strengthening your skills and building practical projects.`
                : 'Add skills to your profile and configure career requirements to get actionable next steps.'}
            </p>
          </div>

          <div className="career-focus-list">
            {missingFocusSkills.length > 0 ? (
              missingFocusSkills.map((skill, index) => (
                <div key={skill}>
                  <span>{index + 1}</span>
                  <p>Develop {skill}</p>
                </div>
              ))
            ) : (
              <div>
                <span>1</span>
                <p>Keep your saved skill profile up to date</p>
              </div>
            )}
          </div>
        </section>

        <section className="career-section">
          <div className="career-section-heading">
            <p className="small-heading">OTHER OPTIONS</p>
            <h2>Recommended Career Paths</h2>
            <p>
              Compare each available career using its configured requirements
              and your saved skills.
            </p>
          </div>

          <div className="career-paths">
            {careerPaths.map((career) => (
              <div
                className={`career-path-card ${
                  selectedCareer?.id === career.id ? 'selected' : ''
                }`}
                key={career.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCareer(career)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedCareer(career)
                  }
                }}
              >
                <div className="career-path-info">
                  <span>{career.icon}</span>
                  <div>
                    <h3>{career.name}</h3>
                    <p>{career.description || career.details}</p>
                  </div>
                </div>

                <strong>
                  {career.score !== null ? `${career.score}%` : 'Not scored'}
                </strong>
              </div>
            ))}
          </div>

          {!isLoading && careerPaths.length === 0 && (
            <p style={{ marginTop: '16px' }}>
              No careers are currently available in the database.
            </p>
          )}

          {selectedCareer && (
            <div className="selected-skill-card selected-career-detail-card">
              <div>
                <p className="small-heading">CAREER DETAILS</p>

                <h3>{selectedCareer.icon} {selectedCareer.name}</h3>

                <p>{selectedCareer.details}</p>

                <p style={{ marginTop: '8px' }}>
                  Required skills: {selectedCareer.requiredSkills.join(', ') || 'Not configured'}
                </p>

                <strong>
                  {selectedCareer.score !== null
                    ? `Skill Match: ${selectedCareer.score}%`
                    : 'Skill Match: Not available'}
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleSelectCareer(selectedCareer)}
                  disabled={
                    savingCareerId !== null ||
                    String(selectedCareerId) === String(selectedCareer.id)
                  }
                >
                  {savingCareerId === selectedCareer.id
                    ? 'Saving...'
                    : String(selectedCareerId) === String(selectedCareer.id)
                      ? 'Selected Career'
                      : 'Select This Career'}
                </button>

                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setSelectedCareer(null)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="career-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate('/roadmap')}
          >
            Start Learning Roadmap →
          </button>

          <button
            type="button"
            className="outline-button"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  )
}

export default CareerAnalysis