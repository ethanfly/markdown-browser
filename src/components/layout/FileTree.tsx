import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  FolderPlus,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useI18n } from '../../i18n';
import type { FileNode } from '../../types';
import clsx from 'clsx';

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  forceExpanded?: boolean;
}

function FileTreeNode({ node, level, forceExpanded = false }: FileTreeNodeProps) {
  const { expandedFolders, toggleFolder, currentFile, setCurrentFile, setFileContent, setCurrentFilePath } = useAppStore();
  const isExpanded = forceExpanded || expandedFolders.has(node.id);
  const isCurrentFile = currentFile?.id === node.id;
  const isFolder = node.type === 'folder';

  const handleClick = async () => {
    if (isFolder) {
      toggleFolder(node.id);
    } else {
      setCurrentFile(node);
      // If content is not loaded, read from file
      if (!node.content && node.path && window.electronAPI?.readFile) {
        const result = await window.electronAPI.readFile(node.path);
        if (result.success && typeof result.content === 'string') {
          setFileContent(result.content, { dirty: false });
          setCurrentFilePath(node.path);
        }
      } else if (node.content) {
        setFileContent(node.content, { dirty: false });
        setCurrentFilePath(node.path || null);
      } else {
        setFileContent('', { dirty: false });
        setCurrentFilePath(node.path || null);
      }
    }
  };

  const getFileIcon = () => {
    if (isFolder) {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-500" />
      );
    }

    const ext = node.name.split('.').pop()?.toLowerCase();
    if (ext === 'md' || ext === 'markdown') {
      return <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={clsx(
          'flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded-md',
          'hover:bg-slate-100 dark:hover:bg-slate-700',
          'transition-colors duration-150',
          isCurrentFile && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isFolder && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
          </span>
        )}
        {!isFolder && <span className="w-4" />}
        {getFileIcon()}
        <span className="text-sm truncate">{node.name}</span>
      </div>

      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.id} node={child} level={level + 1} forceExpanded={forceExpanded} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { fileTree, sidebarOpen, setFileTree } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useI18n();

  const handleOpenFolder = async () => {
    if (window.electronAPI?.openFolderDialog) {
      const result = await window.electronAPI.openFolderDialog();
      if (result && result.tree) {
        setFileTree(result.tree);
      }
    }
  };

  if (!sidebarOpen) return null;

  const filteredTree = searchQuery
    ? filterTree(fileTree, searchQuery.toLowerCase())
    : fileTree;

  return (
    <aside className="w-60 shrink-0 h-full flex flex-col bg-slate-50 dark:bg-slate-800
                      border-r border-slate-200 dark:border-slate-700">
      {/* Search */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            data-testid="file-search"
            placeholder={t('searchFiles')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('searchFiles')}
            className="w-full pl-7 pr-2 py-1.5 text-sm rounded-md
                       bg-white dark:bg-slate-700
                       border border-slate-200 dark:border-slate-600
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-slate-400"
          />
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredTree.length > 0 ? (
          filteredTree.map((node) => (
            <FileTreeNode key={node.id} node={node} level={0} forceExpanded={Boolean(searchQuery)} />
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {searchQuery ? t('noFilesFound') : t('noFilesToDisplay')}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleOpenFolder}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-slate-600 dark:text-slate-400
                     hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer
                     focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={t('openFolder')}
          title={t('openFolder')}
        >
          <FolderPlus className="w-4 h-4" />
          {t('openFolder')}
        </button>
      </div>
    </aside>
  );
}

function filterTree(nodes: FileNode[], query: string): FileNode[] {
  const result: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === 'folder' && node.children) {
      const filteredChildren = filterTree(node.children, query);
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(query)) {
        result.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
    } else if (node.name.toLowerCase().includes(query)) {
      result.push(node);
    }
  }

  return result;
}
