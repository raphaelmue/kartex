import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

// ---- Types ----

interface InviteCode {
  id: string
  code: string
  expiresAt: string
  usedAt: string | null
  usedById: string | null
  usedByUsername?: string | null
  createdAt: string
}

interface UserRecord {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  createdAt: string
}

type InviteCodeStatus = 'active' | 'used' | 'expired'

function getInviteCodeStatus(code: InviteCode): InviteCodeStatus {
  if (code.usedAt) return 'used'
  if (new Date(code.expiresAt) < new Date()) return 'expired'
  return 'active'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10)
}

// ---- Invite Codes Section ----

function InviteCodesSection() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [expiryDays, setExpiryDays] = useState(7)
  const [generating, setGenerating] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const confirmRef = useRef<HTMLSpanElement | null>(null)

  const fetchCodes = async () => {
    try {
      const res = await api.get('/api/admin/invite-codes')
      if (res.ok) {
        const data = await res.json()
        setCodes(data)
      }
    } catch {
      // silently ignore fetch errors on load
    }
  }

  useEffect(() => {
    void fetchCodes()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/api/admin/invite-codes', { expiryDays })
      if (res.ok) {
        toast.success('Invite code generated')
        await fetchCodes()
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/invite-codes/${id}`)
      if (res.ok) {
        toast.success('Invite code deleted')
        setCodes((prev) => prev.filter((c) => c.id !== id))
        setConfirmDeleteId(null)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const handleConfirmKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setConfirmDeleteId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite codes</CardTitle>
        <CardDescription>
          Generate one-time invite codes for new user registration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate form */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="expiry-days"
              className="text-sm font-medium leading-none"
            >
              Expiry (days)
            </label>
            <Input
              id="expiry-days"
              type="number"
              min={1}
              max={365}
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              placeholder="7"
              className="w-24"
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {/* Table */}
        <Table aria-label="Invite codes">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Used By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No invite codes yet.
                </TableCell>
              </TableRow>
            )}
            {codes.map((code) => {
              const status = getInviteCodeStatus(code)
              return (
                <TableRow key={code.id}>
                  <TableCell className="font-mono text-sm">{code.code}</TableCell>
                  <TableCell>
                    <InviteStatusBadge status={status} />
                  </TableCell>
                  <TableCell>{code.usedByUsername ?? '—'}</TableCell>
                  <TableCell>{formatDate(code.expiresAt)}</TableCell>
                  <TableCell>
                    {status === 'active' && confirmDeleteId !== code.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmDeleteId(code.id)}
                      >
                        Delete
                      </Button>
                    )}
                    {status === 'active' && confirmDeleteId === code.id && (
                      <span
                        ref={confirmRef}
                        role="alert"
                        className="flex items-center gap-2 flex-wrap"
                        onKeyDown={handleConfirmKeyDown}
                        tabIndex={-1}
                      >
                        <span className="text-sm">Are you sure?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(code.id)}
                        >
                          Yes, delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ---- Users Section ----

function UsersSection() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    void fetchUsers()
  }, [])

  const handleRoleChange = async (id: string, newRole: 'ADMIN' | 'USER') => {
    try {
      const res = await api.patch(`/api/admin/users/${id}`, { role: newRole })
      if (res.ok) {
        toast.success('Role updated')
        await fetchUsers()
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const res = await api.patch(`/api/admin/users/${id}`, { isActive: false })
      if (res.ok) {
        toast.success('Account deactivated')
        await fetchUsers()
        setConfirmDeactivateId(null)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const handleConfirmKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setConfirmDeactivateId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage user accounts and roles.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table aria-label="Users">
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="text-sm">{u.username}</TableCell>
                <TableCell>
                  <RoleBadge role={u.role} />
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={u.isActive} />
                </TableCell>
                <TableCell>{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Role change */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleRoleChange(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')
                      }
                    >
                      {u.role === 'ADMIN' ? 'Make user' : 'Make admin'}
                    </Button>

                    {/* Deactivate — hidden for own account or already inactive */}
                    {u.isActive && u.id !== authUser?.id && (
                      <>
                        {confirmDeactivateId !== u.id && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmDeactivateId(u.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                        {confirmDeactivateId === u.id && (
                          <span
                            role="alert"
                            className="flex items-center gap-2 flex-wrap"
                            onKeyDown={handleConfirmKeyDown}
                            tabIndex={-1}
                          >
                            <span className="text-sm">Are you sure?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeactivate(u.id)}
                            >
                              Yes, deactivate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmDeactivateId(null)}
                            >
                              Cancel
                            </Button>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ---- Badge helpers ----

function InviteStatusBadge({ status }: { status: InviteCodeStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    )
  }
  if (status === 'used') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
        Used
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
      Expired
    </span>
  )
}

function RoleBadge({ role }: { role: 'ADMIN' | 'USER' }) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground">
        Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
      User
    </span>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
      Inactive
    </span>
  )
}

// ---- AdminPage ----

export function AdminPage() {
  useEffect(() => {
    document.title = 'Admin — Kartex'
  }, [])

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Admin</h2>
      <InviteCodesSection />
      <UsersSection />
    </div>
  )
}
