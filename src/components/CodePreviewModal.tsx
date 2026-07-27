import React, { useState, useMemo } from 'react';
import { NoCProject } from '../types/noc';
import { generateGem5PythonScript } from '../utils/pythonGenerator';
import { saveProjectGnoc, exportGem5Python } from '../utils/fileSystem';
import { Code, FileText, Copy, Download, Check, X } from 'lucide-react';

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: NoCProject;
}

export const CodePreviewModal: React.FC<CodePreviewModalProps> = ({ isOpen, onClose, project }) => {
  const [activeTab, setActiveTab] = useState<'python' | 'json'>('python');
  const [copied, setCopied] = useState(false);

  const pythonScript = useMemo(() => (isOpen ? generateGem5PythonScript(project) : ''), [isOpen, project]);
  const jsonScript = useMemo(() => (isOpen ? JSON.stringify(project, null, 2) : ''), [isOpen, project]);

  if (!isOpen) return null;

  const contentToDisplay = activeTab === 'python' ? pythonScript : jsonScript;

  const handleCopy = () => {
    navigator.clipboard.writeText(contentToDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6">
      <div className="glass-panel w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-lg">
              <Code className="w-5 h-5 text-blue-400" />
              <span>Export & Configuration Preview</span>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'python'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                gem5 Python Script (.py)
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'json'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Native NoC Format (.gnoc)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content Editor Area */}
        <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
          <pre className="whitespace-pre">{contentToDisplay}</pre>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {activeTab === 'python'
              ? 'Ready for direct execution in gem5 Garnet simulation environment.'
              : 'Contains topology layout positions, node metadata & custom template code blocks.'}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => saveProjectGnoc(project)}
              className="px-4 py-2 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4 text-amber-400" />
              Save .gnoc File
            </button>
            <button
              onClick={() => exportGem5Python(project)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              Export .py Script
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
