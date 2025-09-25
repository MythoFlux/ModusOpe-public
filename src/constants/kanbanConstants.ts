// src/constants/kanbanConstants.ts
import { KanbanColumn } from '../types';

export const KANBAN_COLUMN_IDS = {
  TODO: 'todo',
  IN_PROGRESS: 'inProgress',
  DONE: 'done',
};

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: KANBAN_COLUMN_IDS.TODO, title: 'Suunnitteilla' },
  { id: KANBAN_COLUMN_IDS.IN_PROGRESS, title: 'Työn alla' },
  { id: KANBAN_COLUMN_IDS.DONE, title: 'Valmis' },
];

// Lista kaikista oletussarakkeiden ID:istä
export const DEFAULT_COLUMN_ID_ARRAY = Object.values(KANBAN_COLUMN_IDS);
