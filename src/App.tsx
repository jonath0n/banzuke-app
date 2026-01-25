import { useBanzuke } from './hooks/useBanzuke'
import { LanguageProvider } from './contexts/LanguageContext'
import { Hero } from './components/Hero/Hero'
import { BanzukeGrid, BanzukeGridSkeleton } from './components/BanzukeGrid/BanzukeGrid'
import { Footer } from './components/Footer/Footer'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import styles from './App.module.css'

function App() {
  const { data, loading, error } = useBanzuke()

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <Hero data={data} />
        <main>
          {loading && !data && <BanzukeGridSkeleton />}
          {error && !data && (
            <div role="alert" className={`${styles.status} ${styles.error}`}>
              {error}
            </div>
          )}
          {error && data && (
            <div role="status" className={`${styles.status} ${styles.warning}`}>
              {error}
            </div>
          )}
          {data && (
            <ErrorBoundary>
              <BanzukeGrid rows={data.BanzukeTable || []} />
            </ErrorBoundary>
          )}
        </main>
        <Footer />
      </ErrorBoundary>
    </LanguageProvider>
  )
}

export default App
