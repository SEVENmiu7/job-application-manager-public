export const TODO_DATA_CHANGED_EVENT = 'todo-data-changed';
export const OPEN_TODO_COMPOSER_EVENT = 'open-todo-composer';

export interface TodoComposerDetail {
  applicationId?: string;
  applicationLabel?: string;
  title?: string;
}
export function notifyTodoDataChanged(): void {
  window.dispatchEvent(new CustomEvent(TODO_DATA_CHANGED_EVENT));
}

export function openTodoComposer(detail: TodoComposerDetail = {}): void {
  window.dispatchEvent(
    new CustomEvent<TodoComposerDetail>(OPEN_TODO_COMPOSER_EVENT, { detail }),
  );
}
