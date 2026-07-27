import React, { useState, useEffect } from 'react';
import { NoCProject } from '../types/noc';
import { Network, FolderOpen, Save, Download, Eye, Plus, Sparkles, Sun, Moon, Smartphone, AlertTriangle, CheckCircle2, ShieldAlert, Wand2, Settings, Activity } from 'lucide-react';
import { openProjectGnoc, saveProjectGnoc, exportGem5Python } from '../utils/fileSystem';
import { validateProjectSanity, autoFixAllMemoryOverlaps } from '../utils/validationUtils';

interface HeaderProps {
  project: NoCProject;
  onProjectChange: (updated: NoCProject) => void;
  onOpenGenerator: () => void;
  onOpenCodePreview: () => void;
  onNewProject: () => void;
  onSelectNode?: (id: string | null) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  animateFlow?: boolean;
  onToggleAnimateFlow?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onProjectChange,
  onOpenGenerator,
  onOpenCodePreview,
  onNewProject,
  onSelectNode,
  theme,
  onToggleTheme,
  animateFlow = false,
  onToggleAnimateFlow,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showSanityFlyout, setShowSanityFlyout] = useState(false);
  const [showSettingsFlyout, setShowSettingsFlyout] = useState(false);

  const sanityIssues = validateProjectSanity(project);
  const errorCount = sanityIssues.filter((i) => i.type === 'error').length;
  const warningCount = sanityIssues.filter((i) => i.type === 'warning').length;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleLoadProject = async () => {
    const loaded = await openProjectGnoc();
    if (loaded) {
      onProjectChange(loaded);
    }
  };

  const isLight = theme === 'light';

  return (
    <header className={`h-14 border-b px-4 flex items-center justify-between z-20 transition-colors relative ${
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
          </div>
        </div>
      </div>

      {/* Center Presets & Sanity Checker Badge */}
      <div className="flex items-center gap-2">
        {/* Sanity Check Badge Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSanityFlyout((prev) => !prev);
              setShowSettingsFlyout(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              errorCount > 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/20 animate-pulse'
                : warningCount > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
            title="Click to view real-time project sanity check issues"
          >
            {errorCount > 0 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            ) : warningCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>
              {errorCount > 0
                ? `${errorCount} Error${errorCount > 1 ? 's' : ''}`
                : warningCount > 0
                ? `${warningCount} Warning${warningCount > 1 ? 's' : ''}`
                : 'Sanity OK'}
            </span>
          </button>

          {/* Sanity Issues Popover / Flyout */}
          {showSanityFlyout && (
            <div className={`absolute left-0 mt-2 w-80 rounded-xl border p-3 shadow-2xl z-50 backdrop-blur-xl ${
              isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-800 text-slate-100'
            }`}>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Sanity Check Report ({sanityIssues.length})
                </span>
                <button
                  onClick={() => setShowSanityFlyout(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              {sanityIssues.length === 0 ? (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>No address conflicts, router ID duplications, or topology warnings detected!</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {sanityIssues.some((i) => i.code === 'MEMORY_OVERLAP') && (
                    <button
                      onClick={() => {
                        onProjectChange(autoFixAllMemoryOverlaps(project));
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 transition-all mb-1.5"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Auto-Fix All Memory Overlaps
                    </button>
                  )}
                  {sanityIssues.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => {
                        if (issue.nodeId && onSelectNode) {
                          onSelectNode(issue.nodeId);
                        }
                        setShowSanityFlyout(false);
                      }}
                      className={`p-2 rounded-lg border text-xs cursor-pointer transition-all hover:scale-[1.02] ${
                        issue.type === 'error'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      <div className="font-semibold flex items-center justify-between">
                        <span>{issue.title}</span>
                        {issue.nodeId && <span className="text-[10px] underline font-mono">Select Node</span>}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">{issue.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {deferredPrompt && (
          <button
            onClick={handleInstallPWA}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all animate-pulse"
            title="Install Garnet NoC as standalone PWA with .gnoc file association"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Install App (PWA)
          </button>
        )}

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

      {/* Right File Import / Export & Settings Toolbar */}
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

        {/* Canvas Settings Button & Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSettingsFlyout((prev) => !prev);
              setShowSanityFlyout(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              showSettingsFlyout
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Open Application & Rendering Settings"
          >
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span>Settings</span>
          </button>

          {/* Settings Popover */}
          {showSettingsFlyout && (
            <div className={`absolute right-0 mt-2 w-80 rounded-xl border p-4 shadow-2xl z-50 backdrop-blur-xl ${
              isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-800 text-slate-100'
            }`}>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Application Settings
                  </span>
                </div>
                <button
                  onClick={() => setShowSettingsFlyout(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Render Setting 1: Flow Animation */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Link Flow Animation</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      Animate directional paths on bidirectional links.
                      <span className="block font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                        Off by default to maintain 0% Idle CPU.
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleAnimateFlow}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      animateFlow ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        animateFlow ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Render Setting 2: Light Mode Toggle Switch */}
                <div className="border-t border-slate-200 dark:border-slate-800/80 pt-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-semibold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                      {isLight ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
                      <span>Light Mode</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Toggle workspace between Light and Dark visual themes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isLight ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isLight ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
