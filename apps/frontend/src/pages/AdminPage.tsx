import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { MoreVertical } from 'lucide-react'

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
  email?: string | null
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
  const { t } = useTranslation()
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
        toast.success(t('admin.inviteGenerated'))
        await fetchCodes()
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/invite-codes/${id}`)
      if (res.ok) {
        toast.success(t('admin.inviteDeleted'))
        setCodes((prev) => prev.filter((c) => c.id !== id))
        setConfirmDeleteId(null)
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
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
        <CardTitle>{t('admin.inviteCodesTitle')}</CardTitle>
        <CardDescription>
          {t('admin.inviteCodesDesc')}
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
              {t('admin.expiryDaysLabel')}
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
            {generating ? t('admin.generating') : t('admin.generate')}
          </Button>
        </div>

        {/* Table */}
        <Table aria-label={t('admin.inviteCodesTitle')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.codeColumn')}</TableHead>
              <TableHead>{t('table.statusColumn')}</TableHead>
              <TableHead>{t('table.usedByColumn')}</TableHead>
              <TableHead>{t('table.expiresColumn')}</TableHead>
              <TableHead>{t('table.actionsColumn')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t('admin.noInviteCodes')}
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
                        {t('common.delete')}
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
                        <span className="text-sm">{t('common.confirm')}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(code.id)}
                        >
                          {t('common.yesDelete')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          {t('common.cancel')}
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
  const { t } = useTranslation()
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [usernameInput, setUsernameInput] = useState('')

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
        toast.success(t('admin.roleUpdated'))
        await fetchUsers()
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const res = await api.patch(`/api/admin/users/${id}`, { isActive: false })
      if (res.ok) {
        toast.success(t('admin.accountDeactivated'))
        await fetchUsers()
        setConfirmDeactivateId(null)
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/users/${id}`)
      if (res.ok) {
        toast.success(t('admin.deleteUserSuccess'))
        await fetchUsers()
        setDeleteTargetId(null)
        setUsernameInput('')
      } else {
        const body = await res.json().catch(() => ({}))
        const errorCode = (body as { error?: string }).error
        if (errorCode === 'SELF_DELETE') {
          toast.error(t('admin.deleteUserSelf'))
        } else if (errorCode === 'LAST_ADMIN') {
          toast.error(t('admin.deleteUserLastAdmin'))
        } else {
          toast.error(t('common.somethingWrong'))
        }
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }

  const handleConfirmKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setConfirmDeactivateId(null)
    }
  }

  const deleteTarget = users.find((u) => u.id === deleteTargetId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.usersTitle')}</CardTitle>
        <CardDescription>{t('admin.usersDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table aria-label={t('admin.usersTitle')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.usernameColumn')}</TableHead>
              <TableHead>{t('table.roleColumn')}</TableHead>
              <TableHead>{t('table.statusColumn')}</TableHead>
              <TableHead>{t('table.joinedColumn')}</TableHead>
              <TableHead>{t('admin.emailColumn')}</TableHead>
              <TableHead>{t('table.actionsColumn')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('admin.noUsers')}
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                {/* username is user content — not passed through t() (D-07) */}
                <TableCell className="text-sm">{u.username}</TableCell>
                <TableCell>
                  <RoleBadge role={u.role} />
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={u.isActive} />
                </TableCell>
                <TableCell>{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  {u.email != null ? (
                    u.email
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
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
                      {u.role === 'ADMIN' ? t('admin.makeUser') : t('admin.makeAdmin')}
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
                            {t('admin.deactivate')}
                          </Button>
                        )}
                        {confirmDeactivateId === u.id && (
                          <span
                            role="alert"
                            className="flex items-center gap-2 flex-wrap"
                            onKeyDown={handleConfirmKeyDown}
                            tabIndex={-1}
                          >
                            <span className="text-sm">{t('common.confirm')}</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeactivate(u.id)}
                            >
                              {t('admin.yesDeactivate')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmDeactivateId(null)}
                            >
                              {t('common.cancel')}
                            </Button>
                          </span>
                        )}
                      </>
                    )}

                    {/* 3-dot menu with delete action */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t('admin.userActionsLabel', { username: u.username })}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTargetId(u.id)}
                        >
                          {t('admin.deleteUser')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Single AlertDialog outside the map loop — controlled by deleteTargetId */}
        <AlertDialog
          open={deleteTargetId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTargetId(null)
              setUsernameInput('')
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.deleteUserConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.deleteUserConfirmDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <label
                htmlFor="delete-username-input"
                className="text-sm font-medium leading-none block mb-2"
              >
                {t('admin.deleteUserTypePlaceholder')}
              </label>
              <Input
                id="delete-username-input"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                aria-label={t('admin.deleteUserTypePlaceholder')}
                placeholder={deleteTarget?.username ?? ''}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('admin.deleteUserCancel')}</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={usernameInput !== (deleteTarget?.username ?? '')}
                onClick={() => {
                  if (deleteTargetId) void handleDeleteUser(deleteTargetId)
                }}
              >
                {t('admin.deleteUserConfirmBtn')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

// ---- Badge helpers ----

function InviteStatusBadge({ status }: { status: InviteCodeStatus }) {
  const { t } = useTranslation()
  if (status === 'active') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {t('admin.statusActive')}
      </span>
    )
  }
  if (status === 'used') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
        {t('admin.statusUsed')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
      {t('admin.statusExpired')}
    </span>
  )
}

function RoleBadge({ role }: { role: 'ADMIN' | 'USER' }) {
  const { t } = useTranslation()
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground">
        {t('admin.roleAdmin')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
      {t('admin.roleUser')}
    </span>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation()
  if (isActive) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {t('admin.accountActive')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
      {t('admin.accountInactive')}
    </span>
  )
}

// ---- AdminPage ----

export function AdminPage() {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    document.title = t('admin.title')
  }, [t, i18n.language])

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">{t('admin.pageHeading')}</h2>
      <InviteCodesSection />
      <UsersSection />
    </div>
  )
}
