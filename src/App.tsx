import { useBanzuke } from './hooks/useBanzuke'
import { Hero } from './components/Hero/Hero'
import { BanzukeGrid } from './components/BanzukeGrid/BanzukeGrid'
import { Footer } from './components/Footer/Footer'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'

function App() {
  const { data, loading, error, sourceLabel } = useBanzuke()

  return (
    <ErrorBoundary>
      <Hero data={data} />
      <main>
        {loading && (
          <div role="status" className="status">
            Loading the banzuke…
          </div>
        )}
        {error && !data && (
          <div role="alert" className="status error">
            {error}
          </div>
        )}
        {error && data && (
          <div role="status" className="status warning">
            {error}
          </div>
        )}
        {data && (
          <ErrorBoundary>
            <BanzukeGrid rows={data.BanzukeTable || []} />
          </ErrorBoundary>
        )}
        {sourceLabel && (
          <div className="source-label" aria-label="Data source information">
            {sourceLabel}
          </div>
        )}
      </main>
      <Footer />
    </ErrorBoundary>
  )
}

export default App
