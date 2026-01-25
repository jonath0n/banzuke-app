import { useBanzuke } from './hooks/useBanzuke'
import { Hero } from './components/Hero/Hero'
import { BanzukeGrid } from './components/BanzukeGrid/BanzukeGrid'
import { Footer } from './components/Footer/Footer'

function App() {
  const { data, loading, error } = useBanzuke()

  return (
    <>
      <Hero data={data} />
      <main>
        {loading && (
          <div role="status" className="status">
            Loading the banzuke…
          </div>
        )}
        {error && !data && (
          <div role="status" className="status">
            {error}
          </div>
        )}
        {data && <BanzukeGrid rows={data.BanzukeTable || []} />}
      </main>
      <Footer />
    </>
  )
}

export default App
