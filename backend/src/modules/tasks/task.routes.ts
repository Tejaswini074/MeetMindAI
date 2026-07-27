import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import { uploadAttachment } from '@middlewares/upload.middleware';
import {
  createTask,
  listTasks,
  getBoard,
  getTask,
  updateTask,
  moveTask,
  deleteTask,
  addComment,
  addAttachment,
} from '@modules/tasks/task.controller';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  taskIdParamSchema,
  listTasksSchema,
  boardQuerySchema,
  addCommentSchema,
} from '@modules/tasks/task.dto';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 *   get:
 *     summary: List tasks for a team (paginated)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/', validate(createTaskSchema), createTask);
router.get('/', validate(listTasksSchema), listTasks);

/**
 * @openapi
 * /tasks/board:
 *   get:
 *     summary: Get the full Kanban board for a team (unpaginated, grouped for column rendering)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/board', validate(boardQuerySchema), getBoard);

router.get('/:id', validate(taskIdParamSchema), getTask);
router.patch('/:id', validate(updateTaskSchema), updateTask);
router.delete('/:id', validate(taskIdParamSchema), deleteTask);

/**
 * @openapi
 * /tasks/{id}/move:
 *   patch:
 *     summary: Move a task to a new status/position (Kanban drag-and-drop)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.patch('/:id/move', validate(moveTaskSchema), moveTask);

router.post('/:id/comments', validate(addCommentSchema), addComment);
router.post('/:id/attachments', uploadAttachment.single('file'), addAttachment);

export default router;
