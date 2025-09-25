// src/components/Kanban/KanbanSidebarProjectList.tsx
import React from 'react';
import { Project } from '../../types';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableProjectItemProps {
  item: Project;
  selectedKanbanProjectId?: string | null;
  handleSelectProject: (projectId: string) => void;
}

const SortableProjectItem = ({ item, selectedKanbanProjectId, handleSelectProject }: SortableProjectItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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
  );
};

interface KanbanSidebarProjectListProps {
  title: string;
  items: Project[];
  icon: React.ReactNode;
  selectedKanbanProjectId?: string | null;
  handleSelectProject: (projectId: string) => void;
}

export default function KanbanSidebarProjectList({
  title,
  items,
  icon,
  selectedKanbanProjectId,
  handleSelectProject,
}: KanbanSidebarProjectListProps) {
  const itemIds = useMemo(() => items.map(item => item.id), [items]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase px-4 mt-6 mb-2 flex items-center">
        {icon} <span className="ml-2">{title}</span>
      </h3>
      <ul className="space-y-1">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableProjectItem
              key={item.id}
              item={item}
              selectedKanbanProjectId={selectedKanbanProjectId}
              handleSelectProject={handleSelectProject}
            />
          ))}
        </SortableContext>
      </ul>
    </div>
  );
}
