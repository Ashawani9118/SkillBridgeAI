import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../App.css'
import { getUser, saveUser } from '../../utils/auth'
import { API_BASE_URL } from '../../utils/api'

function Signup() {
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')
    setLoading(true)

    const name = e.target.name.value.trim()
    const email = e.target.email.value.trim()
    const password = e.target.password.value
    const confirmPassword = e.target.confirmPassword.value

    if (name.length < 2) {
      setError('Please enter your full name.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.id) {
        const detail = typeof result.detail === 'string'
          ? result.detail
          : Array.isArray(result.detail)
            ? result.detail.map((item) => item.msg).join(', ')
            : ''

        throw new Error(detail || 'Account registration failed. Please try again.')
      }

      const previousUser = getUser() || {}

      saveUser({
        ...previousUser,
        id: result.id,
        name: result.name,
        email: result.email,
        level: 'beginner',
        appearance: previousUser.appearance || 'light',
        careerRecommendations: previousUser.careerRecommendations ?? true,
        learningReminders: previousUser.learningReminders ?? true,
        weeklyProgress: previousUser.weeklyProgress ?? true,
      })

      setSuccess('Account created successfully! Redirecting to login...')

      window.setTimeout(() => {
        navigate('/login')
      }, 800)
    } catch (err) {
      setError(
        err.message || 'Unable to connect to the SkillBridgeAI backend.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell auth-signup-shell">

        {/* LEFT BRAND PANEL */}

        <section className="auth-brand-panel">

          <div className="auth-brand-logo">
            Skill<span>Bridge</span>
          </div>

          <div className="auth-brand-content">

            <div className="auth-brand-badge">
              AI-POWERED CAREER PLATFORM
            </div>

            <h2>
              Build skills.
              <br />
              <span>Build your future.</span>
            </h2>

            <p>
              Discover the right career direction, build
              practical skills, and follow a personalized
              learning path designed around your goals.
            </p>

          </div>

          <div className="auth-feature-list">

            <div className="auth-feature">
              <div className="auth-feature-icon">
                ✦
              </div>

              <div>
                <strong>AI Career Guidance</strong>

                <span>
                  Understand which career paths fit your
                  current skills.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">
                ↗
              </div>

              <div>
                <strong>Personalized Roadmap</strong>

                <span>
                  Know what to learn next without getting
                  overwhelmed.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <div className="auth-feature-icon">
                ◈
              </div>

              <div>
                <strong>Track Your Progress</strong>

                <span>
                  See your skills and career readiness grow.
                </span>
              </div>
            </div>

          </div>

          <div className="auth-brand-footer">
            © 2026 SkillBridge AI
          </div>

        </section>


        {/* RIGHT SIGNUP PANEL */}

        <section className="auth-login-panel">

          <div className="auth-card">

            <div className="auth-mobile-logo">
              Skill<span>Bridge</span>
            </div>

            <div className="auth-heading">

              <div className="auth-welcome-label">
                START YOUR JOURNEY
              </div>

              <h1>
                Create your account
              </h1>

              <p>
                Start your personalized learning journey
                today.
              </p>

            </div>


            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >

              {/* NAME */}

              <div className="auth-field">

                <label htmlFor="name">
                  Full Name
                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">
                    Aa
                  </span>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Ashawani Singh"
                    autoComplete="name"
                    required
                  />

                </div>

              </div>


              {/* EMAIL */}

              <div className="auth-field">

                <label htmlFor="email">
                  Email Address
                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">
                    @
                  </span>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className="auth-field">

                <div className="auth-password-label">

                  <label htmlFor="password">
                    Password
                  </label>

                  <span className="auth-secure-text">
                    Secure account
                  </span>

                </div>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">
                    •••
                  </span>

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Create a password"
                    autoComplete="new-password"
                    minLength="6"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showPassword ? '◉' : '◌'}
                  </button>

                </div>

              </div>


              {/* CONFIRM PASSWORD */}

              <div className="auth-field">

                <label htmlFor="confirmPassword">
                  Confirm Password
                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">
                    •••
                  </span>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    minLength="6"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (prev) => !prev
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showConfirmPassword
                      ? '◉'
                      : '◌'}
                  </button>

                </div>

              </div>


              {/* ERROR */}

              {error && (
                <div
                  className="auth-error"
                  role="alert"
                >
                  <span className="auth-error-icon">
                    !
                  </span>

                  <span>
                    {error}
                  </span>
                </div>
              )}


              {/* SUCCESS */}

              {success && (
                <div
                  className="auth-success"
                  role="status"
                >
                  <span>
                    ✓
                  </span>

                  <span>
                    {success}
                  </span>
                </div>
              )}


              {/* CREATE ACCOUNT */}

              <button
                type="submit"
                className="auth-button"
                disabled={loading}
              >
                <span>
                  {loading
                    ? 'Creating account...'
                    : 'Create account'}
                </span>

                {!loading && (
                  <span className="auth-button-arrow">
                    →
                  </span>
                )}
              </button>

            </form>


            <div className="auth-security-note">
              <span>🔒</span>

              <span>
                Your learning progress stays securely
                connected to your account.
              </span>
            </div>


            <p className="auth-switch">
              Already have an account?

              <button
                type="button"
                className="auth-link-button"
                onClick={() =>
                  navigate('/login')
                }
              >
                Log in
              </button>
            </p>

          </div>

        </section>

      </div>
    </div>
  )
}

export default Signup