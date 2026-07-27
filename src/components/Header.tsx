import React from 'react';
import { NoCProject } from '../types/noc';
import { Network, FolderOpen, Save, Download, Eye, Plus, Sparkles, Sun, Moon } from 'lucide-react';
import { openProjectGnoc, saveProjectGnoc, exportGem5Python } from '../utils/fileSystem';

interface HeaderProps {
  project: NoCProject;
  onProjectChange: (updated: NoCProject) => void;
  onOpenGenerator: () => void;
  onOpenCodePreview: () => void;
  onNewProject: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onProjectChange,
  onOpenGenerator,
  onOpenCodePreview,
  onNewProject,
  theme,
  onToggleTheme,
}) => {
  const handleLoadProject = async () => {
    const loaded = await openProjectGnoc();
    if (loaded) {
      onProjectChange(loaded);
    }
  };

  const isLight = theme === 'light';

  return (
    <header className={`h-14 border-b px-4 flex items-center justify-between z-20 transition-colors ${
      isLight
        ? 'bg-white/90 border-slate-200 text-slate-800 backdrop-blur-md shadow-sm'
        : 'bg-slate-900/90 border-slate-800 text-slate-100 glass-panel'
    }`}>
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-500">
          <Network className="w-5 h-5" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={project.name}
              onChange={(e) => onProjectChange({ ...project, name: e.target.value })}
              className={`bg-transparent text-sm font-bold focus:outline-none px-1.5 py-0.5 rounded border border-transparent ${
                isLight
                  ? 'text-slate-900 focus:bg-slate-100 hover:border-slate-300'
                  : 'text-slate-100 focus:bg-slate-950/60 hover:border-slate-700'
              }`}
            />
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono font-semibold">
              gem5 Garnet NoC
            </span>
          </div>
        </div>
      </div>

      {/* Center Presets & Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenGenerator}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Presets (Mesh / Torus / Ring)
        </button>

        <button
          onClick={onNewProject}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-slate-400" />
          New Canvas
        </button>
      </div>

      {/* Right File Import / Export Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleLoadProject}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Open saved .gnoc configuration file"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
          Import .gnoc
        </button>

        <button
          onClick={() => saveProjectGnoc(project)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
            isLight
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
          }`}
          title="Save project state as native .gnoc JSON file"
        >
          <Save className="w-3.5 h-3.5 text-amber-500" />
          Save .gnoc
        </button>

        <button
          onClick={() => exportGem5Python(project)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            isLight
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
              : 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border-emerald-500/40'
          }`}
          title="Export executable gem5 Python configuration script"
        >
          <Download className="w-3.5 h-3.5 text-emerald-500" />
          Export .py
        </button>

        <div className={`h-4 w-px mx-1 ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />

        <button
          onClick={onOpenCodePreview}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            isLight
              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-blue-500" />
          Preview Code
        </button>

        <div className={`h-4 w-px mx-1 ${isLight ? 'bg-slate-300' : 'bg-slate-800'}`} />

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            isLight
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
          }`}
          title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
        >
          {isLight ? <Moon className="w-3.5 h-3.5 text-slate-700" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          <span>{isLight ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
};
