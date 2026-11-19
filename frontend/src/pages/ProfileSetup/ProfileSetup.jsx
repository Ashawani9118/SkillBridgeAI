import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../App.css'
import { API_BASE_URL } from '../../utils/api'
import { getAccessToken, getUser, updateUser } from '../../utils/auth'

function ProfileSetup() {
  const navigate = useNavigate()

  const [form, setForm] = useState(() => {
    const user = getUser()

    return {
      full_name: user?.name || user?.full_name || '',
      college: '',
      degree: '',
      location: '',
    }
  })

  const [checkingProfile, setCheckingProfile] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function checkProfile() {
      const token = getAccessToken()

      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/profile/`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        const payload = await response.json().catch(() => ({}))

        if (controller.signal.aborted) return

        if (response.ok) {
          navigate('/dashboard', { replace: true })
          return
        }

        if (response.status === 404) {
          setCheckingProfile(false)
          return
        }

        const detail = typeof payload.detail === 'string'
          ? payload.detail
          : 'Unable to verify your profile. Please try again.'

        throw new Error(detail)
      } catch (err) {
        if (controller.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to connect to the profile service.'
        )
        setCheckingProfile(false)
      }
    }

    checkProfile()

    return () => controller.abort()
  }, [navigate])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const token = getAccessToken()

    if (!token) {
      setError('Your session has expired. Please log in again.')
      return
    }

    const fullName = form.full_name.trim()

    if (fullName.length < 2) {
      setError('Please enter your full name.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_BASE_URL}/profile/`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          college: form.college.trim() || null,
          degree: form.degree.trim() || null,
          location: form.location.trim() || null,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        const detail = typeof payload.detail === 'string'
          ? payload.detail
          : Array.isArray(payload.detail)
            ? payload.detail.map((item) => item.msg).join(', ')
            : ''

        throw new Error(
          detail || 'Unable to save your profile. Please try again.'
        )
      }

      updateUser({
        name: payload.full_name,
        full_name: payload.full_name,
        college: payload.college,
        degree: payload.degree,
        location: payload.location,
        profileComplete: true,
      })

      navigate('/skills', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save your profile. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-page profile-setup-page">
      <div className="auth-shell auth-signup-shell">
        <section className="auth-brand-panel">
          <div className="auth-brand-logo">
            Skill<span>Bridge</span>
          </div>

          <div className="auth-brand-content">
            <div className="auth-brand-badge">
              PERSONALIZE YOUR LEARNING
            </div>

            <h2>
              Your journey.
              <br />
              <span>Your future.</span>
            </h2>

            <p>
              Add your education and location details to help
              personalize your SkillBridge AI experience.
            </p>
          </div>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <div className="auth-feature-icon">✦</div>
              <div>
                <strong>Personalized Guidance</strong>
                <span>Build a learning profile around your goals.</span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">✓</div>
              <div>
                <strong>Track Your Skills</strong>
                <span>Connect your current skills to future opportunities.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-mobile-logo">
              Skill<span>Bridge</span>
            </div>

            <div className="auth-heading">
              <div className="auth-welcome-label">
                PROFILE SETUP
              </div>

              <h1>Complete your profile</h1>

              <p>
                Tell us a little about yourself to get started.
              </p>
            </div>

            {checkingProfile ? (
              <p role="status">Checking your profile...</p>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label htmlFor="full_name">Full Name</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">Aa</span>
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      value={form.full_name}
                      onChange={handleChange}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="college">College or Institution</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">⌂</span>
                    <input
                      id="college"
                      name="college"
                      type="text"
                      autoComplete="organization"
                      placeholder="Enter your college or institution"
                      value={form.college}
                      onChange={handleChange}
                      maxLength={150}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="degree">Degree or Program</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">▤</span>
                    <input
                      id="degree"
                      name="degree"
                      type="text"
                      placeholder="e.g. Bachelor of Computer Applications"
                      value={form.degree}
                      onChange={handleChange}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="location">Location</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">⌖</span>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="City, state or region"
                      value={form.location}
                      onChange={handleChange}
                      maxLength={100}
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" style={{ color: '#b91c1c', marginTop: '4px' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: '100%',
                    border: 0,
                    borderRadius: '12px',
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: saving ? 'wait' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving Profile...' : 'Save and Continue'}
                </button>
              </form>
            )}

            {error && checkingProfile && (
              <p role="alert" style={{ color: '#b91c1c', marginTop: '16px' }}>
                {error}
              </p>
            )}

            <div className="auth-security-note">
              <span>🔒</span>
              <span>Your profile details are securely associated with your account.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProfileSetup