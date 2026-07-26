import React from 'react';
import { NoCProject } from '../types/noc';
import { Network, FolderOpen, Save, Download, Eye, Plus, Sparkles } from 'lucide-react';
import { openProjectGnoc, saveProjectGnoc, exportGem5Python } from '../utils/fileSystem';

interface HeaderProps {
  project: NoCProject;
  onProjectChange: (updated: NoCProject) => void;
  onOpenGenerator: () => void;
  onOpenCodePreview: () => void;
  onNewProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onProjectChange,
  onOpenGenerator,
  onOpenCodePreview,
  onNewProject,
}) => {
  const handleLoadProject = async () => {
    const loaded = await openProjectGnoc();
    if (loaded) {
      onProjectChange(loaded);
    }
  };

  return (
    <header className="h-14 bg-slate-900/90 border-b border-slate-800 glass-panel px-4 flex items-center justify-between z-20">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
          <Network className="w-5 h-5" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={project.name}
              onChange={(e) => onProjectChange({ ...project, name: e.target.value })}
              className="bg-transparent text-sm font-bold text-slate-100 focus:outline-none focus:bg-slate-950/60 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-700"
            />
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
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
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-slate-400" />
          New Canvas
        </button>
      </div>

      {/* Right File Import / Export Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleLoadProject}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all"
          title="Open saved .gnoc configuration file"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
          Import .gnoc
        </button>

        <button
          onClick={() => saveProjectGnoc(project)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium flex items-center gap-1.5 border border-amber-500/30 transition-all"
          title="Save project state as native .gnoc JSON file"
        >
          <Save className="w-3.5 h-3.5 text-amber-400" />
          Save .gnoc
        </button>

        <button
          onClick={() => exportGem5Python(project)}
          className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/40 transition-all"
          title="Export executable gem5 Python configuration script"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          Export .py
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onOpenCodePreview}
          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          Preview Code
        </button>
      </div>
    </header>
  );
};
