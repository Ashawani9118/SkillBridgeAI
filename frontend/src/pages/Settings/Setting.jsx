
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../../App.css'

import {
  logoutUser,
  updateUser,
  getUser,
  getAccessToken,
} from '../../utils/auth'

import useAuth from '../../hooks/useAuth'
import Sidebar from '../../components/Sidebar'
import { API_BASE_URL } from '../../utils/api'

const SETTINGS_STORAGE_KEY = 'skillbridge_settings_overrides'

function getSavedOverrides() {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function saveOverrides(settings) {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(settings)
  )
}

function Settings() {
  const navigate = useNavigate()
  const { userName, email } = useAuth()

  const [settings, setSettings] = useState(() => {
    const savedUser = getUser() || {}
    const overrides = getSavedOverrides()

    return {
      name: savedUser.name || userName || 'Student',
      email: savedUser.email || email || '',
      level: savedUser.level || 'beginner',
      college: savedUser.college || '',
      degree: savedUser.degree || '',
      location: savedUser.location || '',
      appearance: savedUser.appearance || 'light',
      careerRecommendations:
        savedUser.careerRecommendations ?? true,
      learningReminders:
        savedUser.learningReminders ?? true,
      weeklyProgress:
        savedUser.weeklyProgress ?? true,
      ...overrides,
    }
  })

  const [saved, setSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileExists, setProfileExists] = useState(null)
  const [profileError, setProfileError] = useState('')

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))

    setSaved(false)
    setSaveMessage('')
  }

  const applyTheme = useCallback((appearance) => {
    document.body.classList.remove(
      'dark-mode',
      'light-mode'
    )

    if (appearance === 'dark') {
      document.body.classList.add('dark-mode')
      return
    }

    if (appearance === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches

      document.body.classList.add(
        prefersDark ? 'dark-mode' : 'light-mode'
      )

      return
    }

    document.body.classList.add('light-mode')
  }, [])

  // Load existing profile from FastAPI
  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      const token = getAccessToken()

      if (!token) {
        if (active) {
          setProfileError(
            'Authentication token not found. Please log in again.'
          )
          setLoading(false)
        }
        return
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/profile/`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.status === 404) {
          if (active) {
            setProfileExists(false)
          }
          return
        }

        if (!response.ok) {
          throw new Error(
            `Profile request failed (${response.status})`
          )
        }

        const profile = await response.json()

        if (!active) return

        setProfileExists(true)

        const overrides = getSavedOverrides()

        setSettings((prev) => ({
          ...prev,
          name:
            overrides.name ??
            profile.full_name ??
            getUser()?.name ??
            'Student',
          college:
            overrides.college ??
            profile.college ??
            '',
          degree:
            overrides.degree ??
            profile.degree ??
            '',
          location:
            overrides.location ??
            profile.location ??
            '',
        }))
      } catch (error) {
        if (active) {
          setProfileError(
            error.message || 'Unable to load profile.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    applyTheme(settings.appearance)
  }, [applyTheme, settings.appearance])

  // Save profile to database and preferences to browser
  const handleSave = async () => {
    const token = getAccessToken()

    if (!settings.name.trim()) {
      setSaved(false)
      setSaveMessage('Please enter your full name.')
      return
    }

    if (!token) {
      setSaved(false)
      setSaveMessage(
        'Please log in again. Authentication token is missing.'
      )
      return
    }

    if (profileExists === null) {
      setSaved(false)
      setSaveMessage(
        'Profile status is not verified. Please refresh the page and try again.'
      )
      return
    }

    setSaving(true)
    setSaved(false)
    setSaveMessage('Saving your settings...')

    try {
      const profilePayload = {
        full_name: settings.name.trim(),
        college: settings.college.trim() || null,
        degree: settings.degree.trim() || null,
        location: settings.location.trim() || null,
      }

      // Existing profile: PUT
      // New profile: POST
      const method = profileExists ? 'PUT' : 'POST'

      const response = await fetch(
        `${API_BASE_URL}/profile/`,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(profilePayload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        const errorMessage =
          typeof errorData.detail === 'string'
            ? errorData.detail
            : `Profile save failed (${response.status})`

        throw new Error(errorMessage)
      }

      const updatedProfile = await response.json()

      setProfileExists(true)

      const settingsToSave = {
        name: updatedProfile.full_name || settings.name.trim(),
        email: settings.email.trim(),
        level: settings.level,
        college: updatedProfile.college || '',
        degree: updatedProfile.degree || '',
        location: updatedProfile.location || '',
        appearance: settings.appearance,
        careerRecommendations: settings.careerRecommendations,
        learningReminders: settings.learningReminders,
        weeklyProgress: settings.weeklyProgress,
      }

      // Save preferences in browser
      saveOverrides(settingsToSave)

      // Update frontend user data
      updateUser({
        name: settingsToSave.name,
        full_name: settingsToSave.name,
        email: settingsToSave.email,
        level: settingsToSave.level,
        college: settingsToSave.college,
        degree: settingsToSave.degree,
        location: settingsToSave.location,
        appearance: settingsToSave.appearance,
        careerRecommendations:
          settingsToSave.careerRecommendations,
        learningReminders:
          settingsToSave.learningReminders,
        weeklyProgress:
          settingsToSave.weeklyProgress,
      })

      setSettings((prev) => ({
        ...prev,
        ...settingsToSave,
      }))

      applyTheme(settingsToSave.appearance)

      window.dispatchEvent(
        new Event('skillbridge-theme-change')
      )

      setSaved(true)
      setSaveMessage(
        'Profile successfully saved to database. Other preferences saved in this browser.'
      )
    } catch (error) {
      setSaved(false)
      setSaveMessage(
        error.message || 'Unable to save Settings.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Reset local Settings overrides
  const handleReset = () => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)

    const currentUser = getUser() || {}

    const resetSettings = {
      name: currentUser.name || userName || 'Student',
      email: currentUser.email || email || '',
      level: currentUser.level || 'beginner',
      college: currentUser.college || '',
      degree: currentUser.degree || '',
      location: currentUser.location || '',
      appearance: currentUser.appearance || 'light',
      careerRecommendations:
        currentUser.careerRecommendations ?? true,
      learningReminders:
        currentUser.learningReminders ?? true,
      weeklyProgress:
        currentUser.weeklyProgress ?? true,
    }

    setSettings(resetSettings)
    applyTheme(resetSettings.appearance)

    window.dispatchEvent(
      new Event('skillbridge-theme-change')
    )

    setSaved(false)
    setSaveMessage(
      'Local Settings changes have been reset.'
    )
  }

  const handleLogout = () => {
    logoutUser()

    document.body.classList.remove(
      'dark-mode',
      'light-mode'
    )

    document.body.classList.add('light-mode')

    navigate('/')
  }

  return (
    <div className="settings-page">
      <Sidebar />

      <main className="settings-container">

        <header className="settings-header">
          <p className="small-heading">
            ACCOUNT SETTINGS
          </p>

          <h1>Settings</h1>

          <p>
            Manage your profile, preferences and
            SkillBridge experience.
          </p>
        </header>

        {loading && (
          <p>Loading your profile...</p>
        )}

        {profileError && (
          <p role="alert">{profileError}</p>
        )}

        {/* PROFILE */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <div>
              <span>👤</span>
              <div>
                <h2>Profile</h2>
                <p>
                  Update your personal learning information.
                </p>
              </div>
            </div>
          </div>

          <div className="settings-form">
            <div className="settings-field">
              <label>Full Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) =>
                  updateSetting('name', e.target.value)
                }
                placeholder="Enter your name"
              />
            </div>

            <div className="settings-field">
              <label>Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) =>
                  updateSetting('email', e.target.value)
                }
                placeholder="Enter your email"
              />
            </div>

            <div className="settings-field">
              <label>Learning Level</label>
              <select
                value={settings.level}
                onChange={(e) =>
                  updateSetting('level', e.target.value)
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="settings-field">
              <label>College</label>
              <input
                type="text"
                value={settings.college}
                onChange={(e) =>
                  updateSetting('college', e.target.value)
                }
                placeholder="Enter your college"
              />
            </div>

            <div className="settings-field">
              <label>Degree</label>
              <input
                type="text"
                value={settings.degree}
                onChange={(e) =>
                  updateSetting('degree', e.target.value)
                }
                placeholder="Enter your degree"
              />
            </div>

            <div className="settings-field">
              <label>Location</label>
              <input
                type="text"
                value={settings.location}
                onChange={(e) =>
                  updateSetting('location', e.target.value)
                }
                placeholder="Enter your location"
              />
            </div>
          </div>
        </section>

        {/* APPEARANCE */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <div>
              <span>🎨</span>
              <div>
                <h2>Appearance</h2>
                <p>
                  Choose how SkillBridge looks for you.
                </p>
              </div>
            </div>
          </div>

          <div className="appearance-options">
            <button
              type="button"
              className={`appearance-option ${
                settings.appearance === 'light' ? 'active' : ''
              }`}
              onClick={() => {
                updateSetting('appearance', 'light')
                applyTheme('light')
              }}
            >
              <span className="appearance-icon">☀️</span>
              <span>
                <strong>Light</strong>
                <small>Clean and bright</small>
              </span>
            </button>

            <button
              type="button"
              className={`appearance-option ${
                settings.appearance === 'dark' ? 'active' : ''
              }`}
              onClick={() => {
                updateSetting('appearance', 'dark')
                applyTheme('dark')
              }}
            >
              <span className="appearance-icon">🌙</span>
              <span>
                <strong>Dark</strong>
                <small>Easy on the eyes</small>
              </span>
            </button>

            <button
              type="button"
              className={`appearance-option ${
                settings.appearance === 'system' ? 'active' : ''
              }`}
              onClick={() => {
                updateSetting('appearance', 'system')
                applyTheme('system')
              }}
            >
              <span className="appearance-icon">💻</span>
              <span>
                <strong>System</strong>
                <small>Follow device settings</small>
              </span>
            </button>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <div>
              <span>🔔</span>
              <div>
                <h2>Notifications</h2>
                <p>
                  Control the updates you receive from SkillBridge.
                </p>
              </div>
            </div>
          </div>

          <div className="settings-option">
            <div>
              <strong>AI Career Recommendations</strong>
              <p>
                Receive personalized career suggestions based on your skills.
              </p>
            </div>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.careerRecommendations}
                onChange={(e) =>
                  updateSetting(
                    'careerRecommendations',
                    e.target.checked
                  )
                }
              />
              <span></span>
            </label>
          </div>

          <div className="settings-option">
            <div>
              <strong>Learning Reminders</strong>
              <p>
                Get reminders to continue your learning journey.
              </p>
            </div>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.learningReminders}
                onChange={(e) =>
                  updateSetting(
                    'learningReminders',
                    e.target.checked
                  )
                }
              />
              <span></span>
            </label>
          </div>

          <div className="settings-option">
            <div>
              <strong>Weekly Progress Report</strong>
              <p>
                Receive a weekly summary of your learning progress.
              </p>
            </div>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.weeklyProgress}
                onChange={(e) =>
                  updateSetting(
                    'weeklyProgress',
                    e.target.checked
                  )
                }
              />
              <span></span>
            </label>
          </div>
        </section>

        {/* SECURITY */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <div>
              <span>🔐</span>
              <div>
                <h2>Security</h2>
                <p>Manage your account security.</p>
              </div>
            </div>
          </div>

          <div className="settings-security">
            <div>
              <strong>Password</strong>
              <p>
                Keep your account secure with a strong password.
              </p>
            </div>

            <button
              type="button"
              className="outline-button"
              onClick={() =>
                alert('Password change will be available soon.')
              }
            >
              Change Password
            </button>
          </div>

          <div className="security-status">
            <span>🛡️</span>
            <div>
              <strong>Account Security</strong>
              <p>
                Your SkillBridge account is currently protected.
              </p>
            </div>
            <span className="security-active">Active</span>
          </div>
        </section>

        {/* SAVE / RESET */}
        <div className="settings-actions">
          <div className="settings-save-row">
            <button
              type="button"
              className="primary-btn"
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? 'Saving...' : '💾 Save Settings'}
            </button>

            {saved && (
              <span className="settings-saved">
                ✓ Saved
              </span>
            )}
          </div>

          {saveMessage && (
            <p role="status">
              {saveMessage}
            </p>
          )}

          <button
            type="button"
            className="reset-settings-button"
            onClick={handleReset}
          >
            🔄 Reset
          </button>
        </div>

        {/* SIGN OUT */}
        <section className="settings-card settings-danger">
          <div>
            <h2>Sign Out</h2>
            <p>
              Sign out from your current SkillBridge account.
            </p>
          </div>

          <button
            type="button"
            className="logout-settings-button"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </section>

        {/* BACK TO DASHBOARD */}
        <button
          type="button"
          className="outline-button settings-back"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </button>

      </main>
    </div>
  )
}

export default Settings
