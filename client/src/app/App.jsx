import { Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout.jsx'
import Landing from '../pages/Landing.jsx'
import GameLibrary from '../pages/GameLibrary.jsx'
import GameDetail from '../pages/GameDetail.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Profile from '../pages/Profile.jsx'
import Play from '../pages/Play.jsx'
import AuthPage from '../pages/AuthPage.jsx'
import OnlinePage from '../pages/OnlinePage.jsx'
import RoomPage from '../pages/RoomPage.jsx'
import FriendsPage from '../pages/FriendsPage.jsx'
import LeaderboardPage from '../pages/LeaderboardPage.jsx'
import NotFound from '../pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Landing />} />
        <Route path="games" element={<GameLibrary />} />
        <Route path="games/:slug" element={<GameDetail />} />
        <Route path="play/:slug" element={<Play />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="online" element={<OnlinePage />} />
        <Route path="online/:code" element={<RoomPage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
