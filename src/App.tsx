import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Play from './pages/Play.tsx';
import Editor from './pages/Editor.tsx';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </div>
  );
}

export default App;
