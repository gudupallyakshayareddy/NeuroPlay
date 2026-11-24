import { Compass } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState.jsx'
import Button from '../components/ui/Button.jsx'

export default function NotFound() {
  return (
    <div className="section-pad py-24">
      <EmptyState
        icon={Compass}
        title="Lost in the neural network"
        text="This page does not exist. Let's get you back to somewhere real."
        action={<Button to="/">Back to home</Button>}
      />
    </div>
  )
}
