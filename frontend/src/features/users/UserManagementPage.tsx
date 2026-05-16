import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { normalizeApiError } from '../../lib/api/errors'
import { roleLabels } from '../../lib/permissions/roles'
import type { UserRole } from '../../types/auth'
import { createUser, getUsers, updateUser, type UserRow } from './api'
import {
  createUserSchema,
  roleValues,
  type CreateUserInput,
  type CreateUserValues,
} from './userSchemas'

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const [pageError, setPageError] = useState<string | null>(null)
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput, unknown, CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'team_member' },
  })
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      reset({ role: 'team_member', email: '', full_name: '', password: '' })
      setPageError(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => setPageError(normalizeApiError(error).message),
  })
  const usersError = usersQuery.error ? normalizeApiError(usersQuery.error).message : null

  return (
    <section className="users-page" data-testid="users-page">
      <div className="page-heading">
        <div>
          <p>System administration</p>
          <h1>Users</h1>
        </div>
        <span className="pill">RBAC</span>
      </div>

      {pageError || usersError ? (
        <div className="notice error">{pageError ?? usersError}</div>
      ) : null}

      <div className="slice-grid admin-grid">
        <form
          className="panel onboarding-panel"
          data-testid="user-create-form"
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="panel-header">
            <h2>Create user</h2>
            <UserPlus size={18} />
          </div>

          <div className="form-stack">
            <label className="field">
              <span>Email</span>
              <input data-testid="input-user-email" {...register('email')} />
              {errors.email ? <small>{errors.email.message}</small> : null}
            </label>
            <label className="field">
              <span>Full Name</span>
              <input data-testid="input-user-full-name" {...register('full_name')} />
              {errors.full_name ? <small>{errors.full_name.message}</small> : null}
            </label>
            <label className="field">
              <span>Role</span>
              <select data-testid="select-user-role" {...register('role')}>
                {roleValues.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Temporary Password</span>
              <input
                data-testid="input-user-password"
                type="password"
                {...register('password')}
              />
              {errors.password ? <small>{errors.password.message}</small> : null}
            </label>
          </div>

          <button
            className="primary-action compact"
            data-testid="button-create-user"
            disabled={createMutation.isPending}
            type="submit"
          >
            {createMutation.isPending ? 'Creating...' : 'Create user'}
          </button>
        </form>

        <section className="panel directory-panel" data-testid="user-directory">
          <div className="panel-header">
            <h2>User directory</h2>
            <span className="muted">
              {usersQuery.isLoading ? 'Loading...' : `${usersQuery.data?.length ?? 0} users`}
            </span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(usersQuery.data ?? []).map((user) => (
                  <UserRowItem key={user.id} user={user} />
                ))}
                {!usersQuery.isLoading && (usersQuery.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4}>No users found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}

function UserRowItem({ user }: { user: UserRow }) {
  const queryClient = useQueryClient()
  const [rowError, setRowError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (payload: { role?: UserRole; is_active?: boolean }) =>
      updateUser(user.id, payload),
    onSuccess: () => {
      setRowError(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => setRowError(normalizeApiError(error).message),
  })

  return (
    <>
      <tr data-testid="user-row">
        <td>
          <strong>{user.full_name}</strong>
          {rowError ? <small className="inline-error">{rowError}</small> : null}
        </td>
        <td>{user.email}</td>
        <td>
          <label className="table-control">
            <ShieldCheck size={13} />
            <select
              aria-label={`Role for ${user.full_name}`}
              data-testid="select-user-row-role"
              disabled={mutation.isPending}
              value={user.role.name}
              onChange={(event) =>
                mutation.mutate({ role: event.target.value as UserRole })
              }
            >
              {roleValues.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
        </td>
        <td>
          <label className="table-control">
            <input
              checked={user.is_active}
              data-testid="checkbox-user-active"
              disabled={mutation.isPending}
              onChange={(event) => mutation.mutate({ is_active: event.target.checked })}
              type="checkbox"
            />
            {user.is_active ? 'Active' : 'Inactive'}
          </label>
        </td>
      </tr>
    </>
  )
}

