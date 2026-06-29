import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PasswordResetInput, PasswordResetSchema } from '@kartex/shared'

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

export function ResetPasswordPage() {
  const { t, i18n } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const confirmId = useId()

  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [confirmPassword, setConfirmPassword] = useState('')
  const confirmPasswordRef = useRef('')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const form = useForm<PasswordResetInput>({
    resolver: zodResolver(PasswordResetSchema),
    defaultValues: { newPassword: '' },
  })
  const { isSubmitting } = form.formState

  // Document title
  useEffect(() => {
    document.title = t('auth.resetPageTitle') + ' — Kartex'
  }, [t, i18n.language])

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setErrorCode('NOT_FOUND')
      setStatus('error')
      return
    }

    api
      .get('/api/auth/reset-password/' + token)
      .then(async (res) => {
        if (res.ok) {
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

  const onSubmit = async (values: PasswordResetInput) => {
    // Client-side confirmPassword check via ref (never sent to API)
    if (values.newPassword !== confirmPasswordRef.current) {
      setConfirmError(t('auth.passwordMismatch'))
      return
    }
    setConfirmError(null)

    try {
      const res = await api.post('/api/auth/reset-password/' + token, {
        newPassword: values.newPassword,
      })

      if (res.ok) {
        navigate('/login', { state: { passwordReset: true } })
      } else {
        const body = await res.json().catch(() => ({}))
        const err = (body as { error?: string }).error
        if (err === 'ALREADY_USED') {
          toast.error(t('auth.resetLinkUsed'))
        } else if (err === 'EXPIRED') {
          toast.error(t('auth.resetLinkExpired'))
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
        ? t('auth.resetLinkUsed')
        : errorCode === 'EXPIRED'
          ? t('auth.resetLinkExpired')
          : t('auth.resetLinkInvalid')

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[400px] max-w-[calc(100vw-32px)]">
          <CardHeader>
            <CardTitle>{t('auth.resetErrorTitle')}</CardTitle>
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
          <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
          <CardDescription>{t('auth.resetPasswordDesc')}</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* New password */}
              <FormField
                control={form.control}
                name="newPassword"
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

              {/* Confirm password — client-only, NOT in PasswordResetSchema, NOT in POST body */}
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
                {isSubmitting ? t('auth.resettingPassword') : t('auth.resetPassword')}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          <Link to="/login" className="underline hover:text-foreground">
            {t('auth.backToSignIn')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
