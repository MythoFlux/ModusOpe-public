// src/components/Kanban/KanbanSidebarProjectList.tsx
import React from 'react';
import { Project } from '../../types';

interface KanbanSidebarProjectListProps {
  title: string;
  items: Project[];
  icon: React.ReactNode;
  selectedKanbanProjectId?: string | null;
  handleSelectProject: (projectId: string) => void;
  handleProjectDragStart: (e: React.DragEvent<HTMLLIElement>, projectId: string) => void;
  handleProjectDragEnter: (e: React.DragEvent<HTMLLIElement>, projectId: string) => void;
  handleProjectDragEnd: (e: React.DragEvent<HTMLLIElement>) => void;
  handleProjectDrop: () => void;
}

export default function KanbanSidebarProjectList({
  title,
  items,
  icon,
  selectedKanbanProjectId,
  handleSelectProject,
  handleProjectDragStart,
  handleProjectDragEnter,
  handleProjectDragEnd,
  handleProjectDrop,
}: KanbanSidebarProjectListProps) {
  return (
    <div onDragOver={(e) => e.preventDefault()}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase px-4 mt-6 mb-2 flex items-center">
        {icon} <span className="ml-2">{title}</span>
      </h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            draggable
            onDragStart={(e) => handleProjectDragStart(e, item.id)}
            onDragEnter={(e) => handleProjectDragEnter(e, item.id)}
            onDragEnd={handleProjectDragEnd}
            onDrop={handleProjectDrop}
            className="cursor-grab active:cursor-grabbing"
          >
            <button
              onClick={() => handleSelectProject(item.id)}
              className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors flex items-center ${
                selectedKanbanProjectId === item.id
                  ? 'bg-blue-100 text-blue-800 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full mr-3"
                style={{ backgroundColor: item.color }}
              ></span>
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
