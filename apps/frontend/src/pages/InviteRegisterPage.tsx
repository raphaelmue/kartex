import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { RegisterInput, RegisterSchema } from '@kartex/shared'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

export function InviteRegisterPage() {
  const { t, i18n } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const confirmId = useId()

  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const confirmPasswordRef = useRef('')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { token: token ?? '', username: '', password: '' },
  })
  const { isSubmitting } = form.formState

  // Document title
  useEffect(() => {
    document.title = t('auth.invitePageTitle')
  }, [t, i18n.language])

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setErrorCode('NOT_FOUND')
      setStatus('error')
      return
    }

    api
      .get(`/api/invites/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { email: string }
          setEmail(data.email)
          setStatus('ok')
        } else {
          const body = await res.json().catch(() => ({}))
          setErrorCode((body as { error?: string }).error ?? 'NOT_FOUND')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorCode('NOT_FOUND')
        setStatus('error')
      })
  }, [token])

  const onSubmit = async (values: RegisterInput) => {
    // Client-side confirmPassword check via ref to avoid stale closure (Pitfall 5 — never sent to API)
    if (values.password !== confirmPasswordRef.current) {
      setConfirmError(t('auth.passwordMismatch'))
      return
    }
    setConfirmError(null)

    try {
      const res = await api.post('/api/auth/register', values)

      if (res.ok) {
        navigate('/login', { state: { registered: true } })
      } else if (res.status === 409) {
        form.setError('username', { message: t('auth.usernameTaken') })
      } else {
        const body = await res.json().catch(() => ({}))
        const err = (body as { error?: string }).error
        if (err === 'ALREADY_USED') {
          toast.error(t('auth.inviteAlreadyUsed'))
        } else if (err === 'EXPIRED') {
          toast.error(t('auth.inviteExpired'))
        } else {
          toast.error(t('common.somethingWrong'))
        }
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }

  // ── State A: Loading ─────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[400px] max-w-[calc(100vw-32px)]">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2
              className="h-6 w-6 animate-spin text-muted-foreground"
              aria-label={t('common.loading')}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── State B: Error ───────────────────────────────────────────────────────────
  if (status === 'error') {
    const message =
      errorCode === 'ALREADY_USED'
        ? t('auth.inviteAlreadyUsed')
        : errorCode === 'EXPIRED'
          ? t('auth.inviteExpired')
          : t('auth.inviteInvalid')

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[400px] max-w-[calc(100vw-32px)]">
          <CardHeader>
            <CardTitle>{t('auth.inviteErrorTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{message}</p>
          </CardContent>
          <CardFooter>
            <Link to="/login" className="text-sm underline hover:text-foreground">
              {t('auth.backToSignIn')}
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // ── State C: Form (valid token) ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[400px] max-w-[calc(100vw-32px)]">
        <CardHeader>
          <CardTitle>{t('auth.createYourAccount')}</CardTitle>
          <CardDescription>{t('auth.inviteWelcome')}</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Hidden token field — included in form values, never visible */}
              <input type="hidden" {...form.register('token')} />

              {/* Email — display-only, not in RegisterSchema, not editable (D-05, T-24-16) */}
              <FormItem>
                <FormLabel>{t('auth.email')}</FormLabel>
                <FormControl>
                  <Input type="email" disabled value={email} readOnly />
                </FormControl>
              </FormItem>

              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.username')}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoComplete="username"
                        placeholder={t('auth.username')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={t('auth.password')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm password — client-only, NOT in RegisterSchema, NOT in POST body (T-24-15) */}
              <FormItem>
                <FormLabel htmlFor={confirmId}>{t('auth.confirmPassword')}</FormLabel>
                <FormControl>
                  <Input
                    id={confirmId}
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('auth.confirmPassword')}
                    value={confirmPassword}
                    onChange={(e) => {
                      const val = e.target.value
                      confirmPasswordRef.current = val
                      setConfirmPassword(val)
                      setConfirmError(null)
                    }}
                  />
                </FormControl>
                {confirmError && (
                  <p className="text-sm font-medium text-destructive">{confirmError}</p>
                )}
              </FormItem>

              <Button
                type="submit"
                className="mt-8 w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="ml-1 underline hover:text-foreground">
            {t('auth.signIn')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
