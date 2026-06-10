'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Plus, MessageSquare, Trash2, Edit3, MoreVertical, X, Menu, 
  ChevronLeft, ChevronRight, Check, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { ConversationMetadata } from '@/types';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  conversations: ConversationMetadata[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({
  isOpen,
  setIsOpen,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onNewChat,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setActiveMenuId(null);
  };

  // Grouping logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  const groups = {
    today: [] as ConversationMetadata[],
    yesterday: [] as ConversationMetadata[],
    older: [] as ConversationMetadata[],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt || conv.createdAt);
    if (date >= startOfToday) {
      groups.today.push(conv);
    } else if (date >= startOfYesterday) {
      groups.yesterday.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  const renderGroupList = (groupTitle: string, items: ConversationMetadata[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {groupTitle}
        </h3>
        <ul className="space-y-1">
          {items.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = conv.id === editingId;

            return (
              <li key={conv.id} className="relative group/item">
                {isEditing ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 mx-1">
                    <input
                      type="text"
                      className="bg-transparent text-sm text-white focus:outline-none flex-1 font-medium min-w-0"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveRename(conv.id)}
                      onKeyDown={(e) => handleKeyDown(e, conv.id)}
                      autoFocus
                    />
                    <button 
                      onClick={() => handleSaveRename(conv.id)}
                      className="p-1 rounded hover:bg-white/10 text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded hover:bg-white/10 text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      if (window.innerWidth < 768) {
                        setIsOpen(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectConversation(conv.id);
                        if (window.innerWidth < 768) {
                          setIsOpen(false);
                        }
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group/btn border text-sm cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50",
                      isActive
                        ? "bg-white/5 border-white/10 text-white shadow-inner font-semibold"
                        : "border-transparent text-gray-400 hover:bg-white/[0.02] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MessageSquare className={cn(
                        "w-4 h-4 shrink-0 transition-colors duration-200",
                        isActive ? "text-indigo-400" : "text-gray-500 group-hover/btn:text-gray-300"
                      )} />
                      <span className="truncate pr-4">{conv.title || 'New Conversation'}</span>
                    </div>

                    {/* Actions trigger */}
                    <div className="relative shrink-0 flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                        }}
                        className={cn(
                          "p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-opacity duration-200 opacity-0 group-hover/item:opacity-100",
                          activeMenuId === conv.id && "opacity-100 bg-white/5 text-white"
                        )}
                        aria-label="Conversation actions"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === conv.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-0 top-7 w-32 glass rounded-xl border border-white/10 shadow-2xl z-[100] py-1 animate-in fade-in duration-100"
                        >
                          <button
                            onClick={(e) => handleStartRename(conv.id, conv.title, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 text-left font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Rename
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(conv.id, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 md:relative md:translate-x-0 transform flex flex-col h-full bg-black/35 backdrop-blur-2xl border-r border-white/5 transition-transform duration-300 ease-in-out shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header & New Chat button */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider">Chat History</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="md:hidden h-8 w-8 p-0 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="w-full justify-start py-2 px-3 hover-glow border border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/5 text-white"
          >
            <Plus className="w-4 h-4 mr-2 text-indigo-400" />
            <span>New Chat</span>
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-4 no-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
              <MessageSquare className="w-8 h-8 text-gray-600 mb-2 stroke-1" />
              <p className="text-xs text-gray-500 font-medium">No previous chats. Start one above!</p>
            </div>
          ) : (
            <>
              {renderGroupList("Today", groups.today)}
              {renderGroupList("Yesterday", groups.yesterday)}
              {renderGroupList("Previous Chats", groups.older)}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
