/// <reference types="node" />

import assert from 'node:assert/strict'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'
import { BlockersService } from '../src/blockers/blockers.service'
import { NotificationsService } from '../src/notifications/notifications.service'

type MockNotificationRow = {
  tenant_id: string
  user_id: string
  type: string
  title: string
  message: string
  related_entity_type?: string
  related_entity_id?: string
}

const tenantId = '10000000-0000-4000-8000-000000000000'

const teamWriter: RequestUser = {
  id: 'writer-id-1111-4111-8111-111111111111',
  authUserId: 'writer-auth-id',
  tenantId,
  email: 'team.writer@agency.com',
  fullName: 'Team Writer',
  role: UserRole.TeamMember,
  isActive: true,
}

const pmUser: RequestUser = {
  id: 'pm-id-2222-4222-8222-222222222222',
  authUserId: 'pm-auth-id',
  tenantId,
  email: 'pm@agency.com',
  fullName: 'Project Manager',
  role: UserRole.ProjectManager,
  isActive: true,
}

const accountManagerUser: RequestUser = {
  id: 'am-id-3333-4333-8333-333333333333',
  authUserId: 'am-auth-id',
  tenantId,
  email: 'am@agency.com',
  fullName: 'Account Manager',
  role: UserRole.TeamMember,
  isActive: true,
}

const baseTask = {
  id: 'task-id-4444-4444-8444-444444444444',
  tenant_id: tenantId,
  workflow_id: 'workflow-id-5555-5555',
  client_id: 'client-id-6666-6666',
  assigned_to: teamWriter.id,
  status: 'ongoing',
  title: 'Blog Article Copywriting',
  workflow: {
    id: 'workflow-id-5555-5555',
    client_id: 'client-id-6666-6666',
    project_manager_id: pmUser.id,
    client: { id: 'client-id-6666-6666', name: 'Acme Corp' },
  },
  client: { id: 'client-id-6666-6666', name: 'Acme Corp' },
}

const baseBlocker = {
  id: 'blocker-id-7777-7777-8777-777777777777',
  task_id: baseTask.id,
  client_id: baseTask.client_id,
  flagged_by: teamWriter.id, // Raised by team.writer@agency.com (Assigned by / Owner)
  resolved_by: null,
  assigned_to: pmUser.id, // Assigned to pm@agency.com (Assigned to / Resolver)
  title: 'Brand Brief Clarification Needed',
  description: 'Target audience specifications missing in brief.',
  severity: 'high',
  status: 'open',
  impact: 'Writing cannot begin without tone guidelines.',
  resolution_notes: null,
  notify: ['Account Manager'],
  flagged_at: new Date('2026-08-24T10:00:00.000Z'),
  resolved_at: null,
  created_at: new Date('2026-08-24T10:00:00.000Z'),
  updated_at: new Date('2026-08-24T10:00:00.000Z'),
  task: {
    id: baseTask.id,
    workflow_id: baseTask.workflow_id,
    title: baseTask.title,
    assigned_to: teamWriter.id,
    status: 'blocked',
    workflow: baseTask.workflow,
  },
  flagger: { id: teamWriter.id, full_name: teamWriter.fullName, email: teamWriter.email },
  assignee: { id: pmUser.id, full_name: pmUser.fullName, email: pmUser.email },
}

async function run() {
  await testFlaggerNotifiedOnBlockerResolution()
  await testPMAndStakeholdersNotifiedOnBlockerResolution()
  await testBlockerAssigneeAndTaskAssigneeNotifiedOnCreation()
  await testSelfResolutionNoDuplicateNotification()

  console.log('✅ All blocker resolution notification test cases passed successfully!')
}

async function testFlaggerNotifiedOnBlockerResolution() {
  console.log('Running testFlaggerNotifiedOnBlockerResolution...')
  const createdNotifications: MockNotificationRow[] = []

  const mockNotifRepo = {
    createMany: async (rows: MockNotificationRow[]) => {
      createdNotifications.push(...rows)
      return { count: rows.length }
    },
    findUsersByDesignation: async () => [],
  }

  const mockTeamsService = {
    sendNotification: async () => {},
  }

  const notifService = new NotificationsService(mockNotifRepo as any, mockTeamsService as any)

  const mockBlockersRepo = {
    findDetail: async () => ({ ...baseBlocker }),
    resolveAndMaybeUnblockTask: async (payload: any) => ({
      ...baseBlocker,
      status: 'resolved',
      resolution_notes: payload.resolutionNotes,
      resolved_at: new Date(),
      resolved_by: payload.userId,
    }),
  }

  const blockersService = new BlockersService(mockBlockersRepo as any, notifService)

  // PM resolves the blocker logged by team.writer@agency.com
  await blockersService.resolve(
    baseBlocker.id,
    { resolution_notes: 'Brand brief updated with tone guidelines.' },
    pmUser,
  )

  // Verify that team.writer@agency.com received the notification
  const flaggerNotif = createdNotifications.find((n) => n.user_id === teamWriter.id)
  assert.ok(flaggerNotif, 'The user who raised the blocker (team.writer@agency.com) MUST receive a notification upon resolution')
  assert.equal(flaggerNotif.type, 'blocker_resolved')
  assert.equal(flaggerNotif.title, 'Blocker resolved')
  assert.match(flaggerNotif.message, /Brand Brief Clarification Needed/)
  assert.match(flaggerNotif.message, /Brand brief updated with tone guidelines./)
  console.log('  ✔ Flagger (team.writer@agency.com) successfully received blocker resolution notification.')
}

async function testPMAndStakeholdersNotifiedOnBlockerResolution() {
  console.log('Running testPMAndStakeholdersNotifiedOnBlockerResolution...')
  const createdNotifications: MockNotificationRow[] = []

  const mockNotifRepo = {
    createMany: async (rows: MockNotificationRow[]) => {
      createdNotifications.push(...rows)
      return { count: rows.length }
    },
    findUsersByDesignation: async (_tenantId: string, designations: string[]) => {
      if (designations.includes('Account Manager')) {
        return [{ id: accountManagerUser.id }]
      }
      return []
    },
  }

  const mockTeamsService = {
    sendNotification: async () => {},
  }

  const notifService = new NotificationsService(mockNotifRepo as any, mockTeamsService as any)

  const mockBlockersRepo = {
    findDetail: async () => ({ ...baseBlocker, notify: ['Account Manager'] }),
    resolveAndMaybeUnblockTask: async (payload: any) => ({
      ...baseBlocker,
      status: 'resolved',
      resolution_notes: payload.resolutionNotes,
    }),
  }

  const blockersService = new BlockersService(mockBlockersRepo as any, notifService)

  // Team member resolves blocker (actorId = teamWriter.id)
  await blockersService.resolve(
    baseBlocker.id,
    { resolution_notes: 'Resolved by writer.' },
    teamWriter,
  )

  // Verify PM and Account Manager received notifications
  const pmNotif = createdNotifications.find((n) => n.user_id === pmUser.id)
  const amNotif = createdNotifications.find((n) => n.user_id === accountManagerUser.id)

  assert.ok(pmNotif, 'Project Manager MUST receive blocker resolution notification')
  assert.ok(amNotif, 'Notified stakeholder (Account Manager) MUST receive blocker resolution notification')
  console.log('  ✔ PM and designated Account Manager successfully received resolution notifications.')
}

async function testBlockerAssigneeAndTaskAssigneeNotifiedOnCreation() {
  console.log('Running testBlockerAssigneeAndTaskAssigneeNotifiedOnCreation...')
  const createdNotifications: MockNotificationRow[] = []

  const mockNotifRepo = {
    createMany: async (rows: MockNotificationRow[]) => {
      createdNotifications.push(...rows)
      return { count: rows.length }
    },
    findUsersByDesignation: async () => [],
  }

  const mockTeamsService = {
    sendNotification: async () => {},
  }

  const notifService = new NotificationsService(mockNotifRepo as any, mockTeamsService as any)

  const mockBlockersRepo = {
    findTaskForBlocker: async () => baseTask,
    findDuplicateOpenBlocker: async () => null,
    createAndBlockTask: async () => ({
      ...baseBlocker,
      task: baseTask,
    }),
  }

  const blockersService = new BlockersService(mockBlockersRepo as any, notifService)

  // teamWriter creates blocker assigned to pmUser
  await blockersService.create(
    {
      task_id: baseTask.id,
      title: 'Brand Brief Clarification Needed',
      description: 'Missing guidelines',
      severity: 'high',
      assigned_to: pmUser.id,
    },
    teamWriter,
  )

  const pmNotif = createdNotifications.find((n) => n.user_id === pmUser.id)
  assert.ok(pmNotif, 'Assigned blocker resolver (PM) MUST receive blocker creation notification')
  assert.equal(pmNotif.type, 'task_blocker_created')
  console.log('  ✔ Assigned blocker resolver (PM) received blocker creation notification.')
}

async function testSelfResolutionNoDuplicateNotification() {
  console.log('Running testSelfResolutionNoDuplicateNotification...')
  const createdNotifications: MockNotificationRow[] = []

  const mockNotifRepo = {
    createMany: async (rows: MockNotificationRow[]) => {
      createdNotifications.push(...rows)
      return { count: rows.length }
    },
    findUsersByDesignation: async () => [],
  }

  const mockTeamsService = {
    sendNotification: async () => {},
  }

  const notifService = new NotificationsService(mockNotifRepo as any, mockTeamsService as any)

  const mockBlockersRepo = {
    findDetail: async () => ({ ...baseBlocker, flagged_by: teamWriter.id, assigned_to: teamWriter.id }),
    resolveAndMaybeUnblockTask: async () => ({ ...baseBlocker, status: 'resolved' }),
  }

  const blockersService = new BlockersService(mockBlockersRepo as any, notifService)

  // teamWriter resolves their own blocker
  await blockersService.resolve(
    baseBlocker.id,
    { resolution_notes: 'Self resolved.' },
    teamWriter,
  )

  // teamWriter should not receive a notification to themselves
  const selfNotif = createdNotifications.find((n) => n.user_id === teamWriter.id)
  assert.equal(selfNotif, undefined, 'Actor resolving their own blocker should not be sent a self-notification')
  console.log('  ✔ Self-resolution correctly filters out self notification.')
}

run().catch((err) => {
  console.error('❌ Test suite failed:', err)
  process.exit(1)
})
