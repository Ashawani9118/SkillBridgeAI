import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../../App.css'
import Sidebar from '../../components/Sidebar'
import { API_BASE_URL } from '../../utils/api'
import { getAccessToken } from '../../utils/auth'

function normalizeSkillName(name) {
  return String(name || '').trim().toLowerCase()
}

function getNumericProficiency(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null
  }

  const normalized = String(value).trim().replace(/\s*%$/, '').trim()

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null
  }

  const number = Number(normalized)

  return Number.isFinite(number) && number >= 0 && number <= 100
    ? number
    : null
}

function getProficiencyRank(value) {
  const numeric = getNumericProficiency(value)

  if (numeric !== null) {
    return numeric / 25
  }

  const normalized = String(value || '').trim().toLowerCase()

  if (['beginner', 'novice', 'basic'].includes(normalized)) return 1
  if (['intermediate', 'developing'].includes(normalized)) return 2
  if (['advanced', 'good', 'proficient'].includes(normalized)) return 3
  if (['expert', 'excellent', 'strong'].includes(normalized)) return 4

  return null
}

function getSkillTone(value) {
  const numeric = getNumericProficiency(value)

  if (numeric !== null) {
    if (numeric >= 85) return 'excellent'
    if (numeric >= 70) return 'good'
    if (numeric >= 50) return 'developing'
    return 'beginner'
  }

  const normalized = String(value || '').trim().toLowerCase()

  if (['expert', 'excellent', 'strong', 'advanced'].includes(normalized)) {
    return 'excellent'
  }

  if (['good', 'proficient', 'intermediate'].includes(normalized)) {
    return 'good'
  }

  if (['beginner', 'novice', 'basic'].includes(normalized)) {
    return 'beginner'
  }

  return 'developing'
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      typeof payload?.detail === 'string'
        ? payload.detail
        : `Request failed (${response.status}).`,
    )

    error.status = response.status
    throw error
  }

  return payload
}

function Skills() {
  const navigate = useNavigate()

  const [catalogSkills, setCatalogSkills] = useState([])
  const [userSkills, setUserSkills] = useState([])
  const [skillName, setSkillName] = useState('')
  const [proficiency, setProficiency] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingSkillId, setDeletingSkillId] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadSkills() {
      const token = getAccessToken()

      if (!token) {
        setLoadError('Your session has expired. Please log in again.')
        setIsLoading(false)
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      }

      try {
        const [catalog, mine] = await Promise.all([
          requestJson(`${API_BASE_URL}/skills/`, {
            headers,
            signal: controller.signal,
          }),
          requestJson(`${API_BASE_URL}/skills/my`, {
            headers,
            signal: controller.signal,
          }),
        ])

        if (controller.signal.aborted) return

        setCatalogSkills(Array.isArray(catalog) ? catalog : [])
        setUserSkills(Array.isArray(mine) ? mine : [])
        setLoadError('')
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Could not load your skills.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadSkills()

    return () => controller.abort()
  }, [])

  const skillCards = useMemo(
    () =>
      userSkills.map((skill) => {
        const rawProficiency = skill.proficiency
        const numericScore = getNumericProficiency(rawProficiency)
        const proficiencyText =
          rawProficiency === null ||
          rawProficiency === undefined ||
          String(rawProficiency).trim() === ''
            ? 'Not assessed'
            : numericScore !== null
              ? `${numericScore}%`
              : String(rawProficiency)

        return {
          id: skill.id ?? skill.skill_id,
          skillId: skill.skill_id,
          name: skill.skill_name,
          proficiencyText,
          score: numericScore,
          rank: getProficiencyRank(rawProficiency),
          tone: getSkillTone(rawProficiency),
          status:
            proficiencyText === 'Not assessed'
              ? 'Proficiency not set'
              : 'Saved in your profile',
        }
      }),
    [userSkills],
  )

  const numericSkills = skillCards.filter((skill) => skill.score !== null)

  const averageScore =
    numericSkills.length > 0
      ? Math.round(
          numericSkills.reduce((total, skill) => total + skill.score, 0) /
            numericSkills.length,
        )
      : null

  const assessedSkills = useMemo(() => {
    const ranked = numericSkills.length
      ? skillCards.filter((skill) => skill.score !== null)
      : skillCards.filter((skill) => skill.rank !== null)

    return [...ranked].sort((a, b) => {
      const aRank = numericSkills.length ? a.score : a.rank
      const bRank = numericSkills.length ? b.score : b.rank
      return bRank - aRank
    })
  }, [skillCards, numericSkills.length])

  const strongestSkill = assessedSkills[0] || null
  const focusSkill =
    assessedSkills.length > 0
      ? assessedSkills[assessedSkills.length - 1]
      : null

  async function handleAddSkill(event) {
    event.preventDefault()

    setFormMessage('')
    setFormError('')

    const cleanName = skillName.trim()
    const token = getAccessToken()

    if (!token) {
      setFormError('Your session has expired. Please log in again.')
      return
    }

    if (!cleanName) {
      setFormError('Please enter a skill name.')
      return
    }

    const duplicate = userSkills.some(
      (skill) => normalizeSkillName(skill.skill_name) === normalizeSkillName(cleanName),
    )

    if (duplicate) {
      setFormError('This skill is already in your profile.')
      return
    }

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    setIsAdding(true)

    try {
      let catalogSkill = catalogSkills.find(
        (skill) =>
          normalizeSkillName(skill.skill_name) === normalizeSkillName(cleanName),
      )

      // If a skill is not in the catalog, create it in the shared catalog first.
      if (!catalogSkill) {
        try {
          catalogSkill = await requestJson(`${API_BASE_URL}/skills/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              skill_name: cleanName,
              category: null,
            }),
          })

          setCatalogSkills((current) => [...current, catalogSkill])
        } catch (createError) {
          // If another request has already created the same skill,
          // reload the catalog and use the existing entry.
          if (createError.status !== 400) {
            throw createError
          }

          const refreshedCatalog = await requestJson(
            `${API_BASE_URL}/skills/`,
            {
              headers,
            },
          )

          const refreshed = Array.isArray(refreshedCatalog)
            ? refreshedCatalog
            : []

          setCatalogSkills(refreshed)

          catalogSkill = refreshed.find(
            (skill) =>
              normalizeSkillName(skill.skill_name) ===
              normalizeSkillName(cleanName),
          )

          if (!catalogSkill) {
            throw createError
          }
        }
      }

      const savedSkill = await requestJson(`${API_BASE_URL}/skills/my`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          skill_name: catalogSkill.skill_name,
          proficiency: proficiency || null,
        }),
      })

      setUserSkills((current) => [...current, savedSkill])
      setSkillName('')
      setProficiency('')
      setFormMessage(`${savedSkill.skill_name} successfully added to your profile.`)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to save the skill. Please try again.',
      )
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDeleteSkill(skill) {
    setFormMessage('')
    setFormError('')

    const token = getAccessToken()

    if (!token) {
      setFormError('Your session has expired. Please log in again.')
      return
    }

    if (skill.skillId === null || skill.skillId === undefined) {
      setFormError(
        'Unable to identify this skill. Refresh the page and try again.',
      )
      return
    }

    const confirmed = window.confirm(
      `Remove ${skill.name} from your profile? It will remain in the shared skill catalog.`,
    )

    if (!confirmed) return

    setDeletingSkillId(skill.skillId)

    try {
      await requestJson(
        `${API_BASE_URL}/skills/my/${encodeURIComponent(skill.skillId)}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      )

      setUserSkills((current) =>
        current.filter(
          (item) => String(item.id ?? item.skill_id) !== String(skill.id),
        ),
      )

      setFormMessage(`${skill.name} was removed from your profile.`)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to remove this skill. Please try again.',
      )
    } finally {
      setDeletingSkillId(null)
    }
  }
  return (
    <div className="skills-page">
      <Sidebar />

      <main className="skills-main">
        <div className="skills-container">
          <header className="skills-header">
            <div className="skills-header-top">
              <div>
                <p className="small-heading">MY SKILLS</p>

                <h1>Your Skill Profile</h1>

                <p>
                  Track your saved skills, record your proficiency, and
                  identify what to focus on next.
                </p>
              </div>

              <div className="skills-profile-badge">
                <span>AVERAGE NUMERIC PROFICIENCY</span>
                <strong>{averageScore === null ? '—' : `${averageScore}%`}</strong>
                <small>
                  {numericSkills.length} numeric{' '}
                  {numericSkills.length === 1 ? 'score' : 'scores'}
                </small>
              </div>
            </div>
          </header>

          {loadError && (
            <div
              role="alert"
              style={{
                padding: '12px 16px',
                marginBottom: '18px',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                background: '#fef2f2',
                color: '#991b1b',
              }}
            >
              {loadError}
            </div>
          )}

          <section
            aria-labelledby="add-skill-heading"
            style={{
              margin: '18px 0 28px',
              padding: '20px',
              border: '1px solid #dbe2ea',
              borderRadius: '16px',
              background: 'var(--card-bg, #ffffff)',
            }}
          >
            <p className="small-heading">UPDATE YOUR PROFILE</p>
            <h2 id="add-skill-heading" style={{ marginTop: '4px' }}>
              Add a skill
            </h2>
            <p style={{ marginTop: '8px', marginBottom: '18px' }}>
              Enter a skill name and select your proficiency level.
              A percentage is displayed only when a numeric score is available.
            </p>

            <form
              onSubmit={handleAddSkill}
              style={{
                display: 'flex',
                alignItems: 'end',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  flex: '1 1 220px',
                  fontWeight: 600,
                }}
              >
                Skill name
                <input
                  type="text"
                  value={skillName}
                  onChange={(event) => setSkillName(event.target.value)}
                  placeholder="e.g. Python, SQL, React"
                  maxLength={100}
                  required
                  disabled={isAdding || isLoading}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9px',
                    background: '#ffffff',
                    color: '#172033',
                    boxSizing: 'border-box',
                  }}
                />
              </label>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  flex: '1 1 180px',
                  fontWeight: 600,
                }}
              >
                Proficiency
                <select
                  value={proficiency}
                  onChange={(event) => setProficiency(event.target.value)}
                  disabled={isAdding || isLoading}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '9px',
                    background: '#ffffff',
                    color: '#172033',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Not assessed yet</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </label>

              <button
                type="submit"
                className="primary-btn"
                disabled={isAdding || isLoading}
              >
                {isAdding ? 'Saving...' : 'Add Skill'}
              </button>
            </form>

            <p
              style={{
                marginTop: '12px',
                fontSize: '13px',
                color: 'var(--text-secondary, #64748b)',
              }}
            >
              If a skill is not in the catalog, it will be added to the shared catalog and linked to your profile.
            </p>

            {formError && (
              <p role="alert" style={{ color: '#b91c1c', marginTop: '12px' }}>
                {formError}
              </p>
            )}

            {formMessage && (
              <p role="status" style={{ color: '#166534', marginTop: '12px' }}>
                {formMessage}
              </p>
            )}
          </section>

          <section className="skills-overview">
            <div className="skills-overview-card">
              <div className="overview-icon">✦</div>

              <div className="overview-content">
                <span className="overview-label">STRONGEST SKILL</span>

                <h2>{strongestSkill?.name || '—'}</h2>

                <p>
                  {strongestSkill
                    ? `${strongestSkill.proficiencyText} proficiency · Based on saved data`
                    : 'Set a proficiency level to see this insight.'}
                </p>
              </div>
            </div>

            <div className="skills-overview-card">
              <div className="overview-icon focus">↑</div>

              <div className="overview-content">
                <span className="overview-label">NEXT FOCUS</span>

                <h2>{focusSkill?.name || '—'}</h2>

                <p>
                  {focusSkill
                    ? `${focusSkill.proficiencyText} proficiency · Review this skill next`
                    : 'Add proficiency details to identify a focus area.'}
                </p>
              </div>
            </div>
          </section>

          <div className="skills-section-heading">
            <div>
              <p className="small-heading">CURRENT CAPABILITIES</p>
              <h2>Your saved skills</h2>
              <p>
                Your saved skills are loaded from your account.
              </p>
            </div>

            <span className="skills-count">
              {isLoading ? 'Loading...' : `${skillCards.length} Skills`}
            </span>
          </div>

          {isLoading ? (
            <p role="status">Loading your saved skills...</p>
          ) : skillCards.length > 0 ? (
            <section className="all-skills-grid">
              {skillCards.map((skill) => (
                <article
                  className={`all-skill-card ${skill.tone}`}
                  key={skill.skillId ?? skill.id ?? skill.name}
                >
                  <div className="skill-card-top">
                    <div className="skill-identity">
                      <div className="skill-icon-box">✦</div>

                      <div>
                        <h3>{skill.name}</h3>
                        <span className="skill-level">{skill.proficiencyText}</span>
                      </div>
                    </div>

                    <div className="skill-score">
                      <strong>{skill.proficiencyText}</strong>
                    </div>
                  </div>

                  <p className="skill-description">
                    Saved to your SkillBridgeAI profile.
                  </p>

                  <div className="skill-bar-wrapper">
                    <div className="skill-bar-meta">
                      <span>Proficiency</span>
                      <span>
                        {skill.score !== null
                          ? `${skill.score} / 100`
                          : skill.proficiencyText}
                      </span>
                    </div>

                    {skill.score !== null ? (
                      <div className="skill-bar">
                        <div style={{ width: `${skill.score}%` }} />
                      </div>
                    ) : (
                      <p style={{ marginTop: '8px', fontSize: '13px' }}>
                        {skill.proficiencyText === 'Not assessed'
                          ? 'No numeric score has been provided.'
                          : 'Text proficiency saved; no percentage was provided.'}
                      </p>
                    )}
                  </div>

                  <div className="skill-card-footer">
                    <span className="skill-status">{skill.status}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSkill(skill)}
                      disabled={deletingSkillId !== null}
                      aria-label={`Remove ${skill.name} from your profile`}
                      style={{
                        marginLeft: 'auto',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        background: 'transparent',
                        color: '#b91c1c',
                        fontWeight: 600,
                        cursor: deletingSkillId !== null ? 'wait' : 'pointer',
                        opacity: deletingSkillId !== null ? 0.65 : 1,
                      }}
                    >
                      {String(deletingSkillId) === String(skill.skillId)
                        ? 'Removing...'
                        : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section
              style={{
                padding: '28px 20px',
                border: '1px dashed #cbd5e1',
                borderRadius: '14px',
                textAlign: 'center',
              }}
            >
              <h3>No saved skills yet</h3>
              <p style={{ marginTop: '8px' }}>
                Add your first skill above to start building your professional profile.
              </p>
            </section>
          )}

          <section className="skill-readiness-card">
            <div className="readiness-left">
              <div className="readiness-icon">🚀</div>

              <div>
                <p className="small-heading">CAREER READINESS</p>

                <h2>Keep building toward your goal</h2>

                <p>
                  {strongestSkill && focusSkill
                    ? `Your saved data shows ${strongestSkill.name} as your strongest assessed skill. Review ${focusSkill.name} next.`
                    : 'Add your skills and proficiency levels to build a more useful learning profile.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate('/roadmap')}
            >
              View Learning Roadmap →
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Skills
