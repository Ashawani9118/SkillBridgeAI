// ROADMAP_API_INTEGRATION_20261017
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

function Roadmap() {
  const navigate = useNavigate()

  const [roadmap, setRoadmap] = useState([])
  const [career, setCareer] = useState('')
  const [selectedStep, setSelectedStep] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [completingStepId, setCompletingStepId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadRoadmap = useCallback(async () => {
    await Promise.resolve()
    setIsLoading(true)
    setError('')

    const token = getAccessToken()

    if (!token) {
      setRoadmap([])
      setSelectedStep(null)
      setError('Your session has expired. Please log in again.')
      setIsLoading(false)
      return false
    }

    try {
      const response = await fetch(`${API_BASE_URL}/roadmap/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, 'Unable to load your learning roadmap.')
        )
      }

      const records = Array.isArray(payload.roadmap) ? payload.roadmap : []
      const firstIncompleteId = records.find((step) => !step.completed)?.id

      const loadedSteps = records.map((step, index) => {
        const completed = Boolean(step.completed)
        const isNext = !completed && step.id === firstIncompleteId

        return {
          ...step,
          number: completed ? '✓' : String(step.step_number ?? index + 1),
          progress: completed ? 100 : 0,
          status: completed ? 'Completed' : isNext ? 'Next Up' : 'Upcoming',
          className: completed ? 'completed' : isNext ? 'current' : '',
          details:
            step.description ||
            'No additional details are available for this roadmap step.',
        }
      })

      setCareer(typeof payload.career === 'string' ? payload.career : '')
      setRoadmap(loadedSteps)

      setSelectedStep((previous) => {
        return (
          loadedSteps.find((step) => step.id === previous?.id) ||
          loadedSteps.find((step) => !step.completed) ||
          loadedSteps[0] ||
          null
        )
      })

      return true
    } catch (loadError) {
      setRoadmap([])
      setSelectedStep(null)
      setError(loadError.message || 'Unable to load your learning roadmap.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    Promise.resolve().then(() => {
      if (active) {
        void loadRoadmap()
      }
    })

    return () => {
      active = false
    }
  }, [loadRoadmap])

  const completedCount = roadmap.filter((step) => step.completed).length
  const currentStep = roadmap.find((step) => !step.completed)
  const overallProgress = roadmap.length
    ? Math.round((completedCount / roadmap.length) * 100)
    : 0

  const handleCompleteStep = async (step) => {
    if (!step?.id || step.completed || completingStepId !== null) return

    const token = getAccessToken()

    if (!token) {
      setError('Your session has expired. Please log in again.')
      return
    }

    setCompletingStepId(step.id)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/progress/complete/${step.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, 'Unable to save this completed step.')
        )
      }

      const refreshed = await loadRoadmap()

      setNotice(
        refreshed
          ? `${step.title} has been saved as completed.`
          : `${step.title} was saved. Refresh the page to reload your roadmap.`
      )
    } catch (completeError) {
      setError(
        completeError.message || 'Unable to save this completed step.'
      )
    } finally {
      setCompletingStepId(null)
    }
  }

  return (
    <div className="roadmap-page">
      <Sidebar />

      <main className="roadmap-main">
        <header className="roadmap-header">
          <div>
            <p className="small-heading">YOUR LEARNING JOURNEY</p>

            <h1>Learning Roadmap</h1>

            <p>
              Follow your personalized path toward{' '}
              {career || 'your career goal'}.
            </p>
          </div>
        </header>

        <section className="roadmap-summary">
          <div className="stat-card">
            <span>✅</span>
            <p>Completed</p>
            <h2>{isLoading ? '—' : completedCount}</h2>
          </div>

          <div className="stat-card">
            <span>🔥</span>
            <p>Current Step</p>
            <h2>
              {isLoading
                ? '—'
                : currentStep
                  ? currentStep.step_number
                  : roadmap.length
                    ? 'Done'
                    : '—'}
            </h2>
          </div>

          <div className="stat-card">
            <span>🎯</span>
            <p>Overall Progress</p>
            <h2>{isLoading ? '—' : `${overallProgress}%`}</h2>
          </div>
        </section>

        <section className="roadmap-section">
          <div className="section-title-row">
            <div>
              <p className="small-heading">
                {career ? `${career.toUpperCase()} PATH` : 'YOUR CAREER PATH'}
              </p>

              <h2>Your Roadmap</h2>
            </div>
          </div>

          {isLoading && <p>Loading your saved learning roadmap...</p>}

          {!isLoading && error && (
            <div className="roadmap-selected-card" role="alert">
              <div>
                <h3>Unable to load your roadmap</h3>
                <p>{error}</p>

                {error.toLowerCase().includes('career') && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => navigate('/career-analysis')}
                  >
                    Choose a Career
                  </button>
                )}
              </div>

              <button
                type="button"
                className="outline-button"
                onClick={loadRoadmap}
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && roadmap.length === 0 && (
            <div className="roadmap-selected-card">
              <div>
                <h3>No roadmap steps available</h3>
                <p>
                  Select a career with a configured learning roadmap to get
                  started.
                </p>
              </div>

              <button
                type="button"
                className="primary-btn"
                onClick={() => navigate('/career-analysis')}
              >
                Choose a Career
              </button>
            </div>
          )}

          {!isLoading && roadmap.length > 0 && (
            <div className="roadmap-timeline">
              {roadmap.map((step, index) => (
                <div
                  className={`roadmap-item ${step.className} ${
                    selectedStep?.id === step.id ? 'selected' : ''
                  }`}
                  key={step.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedStep?.id === step.id}
                  onClick={() => setSelectedStep(step)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedStep(step)
                    }
                  }}
                >
                  <div className="roadmap-marker">{step.number}</div>

                  <div className="roadmap-content">
                    <div className="roadmap-content-header">
                      <div>
                        <span className="roadmap-status">{step.status}</span>
                        <h3>{step.title}</h3>
                      </div>

                      <strong>{step.progress}%</strong>
                    </div>

                    <p>{step.description || 'Description not available.'}</p>

                    <div className="roadmap-local-progress">
                      <div style={{ width: `${step.progress}%` }} />
                    </div>
                  </div>

                  {index !== roadmap.length - 1 && (
                    <div className="roadmap-connector" />
                  )}
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && selectedStep && (
            <div className="roadmap-selected-card">
              <div>
                <p className="small-heading">ROADMAP STEP</p>

                <h3>
                  {selectedStep.step_number}. {selectedStep.title}
                </h3>

                <p>{selectedStep.details}</p>

                <strong>Progress: {selectedStep.progress}%</strong>

                {!selectedStep.completed && (
                  <div style={{ marginTop: '18px' }}>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={completingStepId !== null}
                      onClick={() => handleCompleteStep(selectedStep)}
                    >
                      {completingStepId === selectedStep.id
                        ? 'Saving...'
                        : 'Mark Step Complete'}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="outline-button"
                onClick={() => setSelectedStep(null)}
              >
                Close
              </button>
            </div>
          )}

          {notice && (
            <p role="status" aria-live="polite">
              {notice}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

export default Roadmap