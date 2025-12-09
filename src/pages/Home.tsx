import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-5xl font-bold mb-8">25 Tiles: Sigils of Descent</h1>
      <p className="text-xl text-gray-400 mb-12 max-w-2xl text-center">
        A 2D roguelike built around 5×5 tile modules with deterministic gameplay
      </p>
      <div className="flex gap-4">
        <Link
          to="/play"
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-xl font-semibold transition"
        >
          Start Game
        </Link>
        <Link
          to="/editor"
          className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-xl font-semibold transition"
        >
          Floor Editor
        </Link>
      </div>
    </div>
  );
}
