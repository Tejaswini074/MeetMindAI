import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import {
  createTeam,
  listTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  listMembers,
  removeMember,
  updateMemberRole,
  inviteMember,
  listInvitations,
  acceptInvitation,
} from '@modules/teams/team.controller';
import {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  listTeamsSchema,
  inviteMemberSchema,
  acceptInvitationSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
} from '@modules/teams/team.dto';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /teams:
 *   post:
 *     summary: Create a new team (creator becomes owner + team lead)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 *   get:
 *     summary: List teams the current user belongs to (all teams for admins)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/', validate(createTeamSchema), createTeam);
router.get('/', validate(listTeamsSchema), listTeams);

/**
 * @openapi
 * /teams/invitations/{token}/accept:
 *   post:
 *     summary: Accept a team invitation using its token
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/invitations/:token/accept', validate(acceptInvitationSchema), acceptInvitation);

/**
 * @openapi
 * /teams/{id}:
 *   get:
 *     summary: Get a team by id
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 *   patch:
 *     summary: Update a team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 *   delete:
 *     summary: Delete a team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id', validate(teamIdParamSchema), getTeam);
router.patch('/:id', validate(updateTeamSchema), updateTeam);
router.delete('/:id', validate(teamIdParamSchema), deleteTeam);

/**
 * @openapi
 * /teams/{id}/members:
 *   get:
 *     summary: List team members
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id/members', validate(teamIdParamSchema), listMembers);
router.delete('/:id/members/:userId', validate(removeMemberSchema), removeMember);
router.patch('/:id/members/:userId', validate(updateMemberRoleSchema), updateMemberRole);

/**
 * @openapi
 * /teams/{id}/invite:
 *   post:
 *     summary: Invite a member to the team by email
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.post('/:id/invite', validate(inviteMemberSchema), inviteMember);
router.get('/:id/invitations', validate(teamIdParamSchema), listInvitations);

export default router;
