import { useParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import GameShell from '../components/game/GameShell.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Button from '../components/ui/Button.jsx'
import { registry } from '../games/registry'
import { getGame } from '../data/games'

export default function Play() {
  const { slug } = useParams()
  const game = getGame(slug)
  const Component = registry[slug]
  if (!game || !Component) {
    return (
      <div className="section-pad py-24">
        <EmptyState icon={SearchX} title={game ? 'Not playable yet' : 'Game not found'} text={game ? `${game.title} is on the roadmap but not built yet.` : 'We could not find that game.'} action={<Button to="/games">Back to library</Button>} />
      </div>
    )
  }
  return <GameShell key={slug} game={game} Component={Component} />
}
