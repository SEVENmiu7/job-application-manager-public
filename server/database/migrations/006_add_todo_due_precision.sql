ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS due_precision varchar(16) DEFAULT 'hour';

COMMENT ON COLUMN todos.due_precision IS 'Deadline precision: date or hour';
