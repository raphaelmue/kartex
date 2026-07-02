import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import type { Resolver } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { StudyMode, UpdateEmailInput } from '@kartex/shared'
import { UpdateEmailSchema } from '@kartex/shared'

import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

const STUDY_MODE_OPTIONS = [
  {
    value: 'normal',
    labelKey: 'settings.modeNames.normal',
    descKey: 'settings.modeNormalDesc',
  },
  {
    value: 'intensive',
    labelKey: 'settings.modeNames.intensive',
    descKey: 'settings.modeIntensiveDesc',
  },
  {
    value: 'exam_prep',
    labelKey: 'settings.modeNames.exam_prep',
    descKey: 'settings.modeExamPrepDesc',
  },
] as const

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { user, setUser } = useAuth()

  useEffect(() => {
    document.title = t('settings.title')
  }, [t])

  // Wraps zodResolver so the inline format-error message renders the localized
  // settings.emailInvalid copy instead of Zod's raw schema-level English default.
  const emailResolver: Resolver<UpdateEmailInput> = async (values, context, options) => {
    const result = await zodResolver(UpdateEmailSchema)(values, context, options)
    if (result.errors.email) {
      result.errors.email = {
        ...result.errors.email,
        message: t('settings.emailInvalid'),
      }
    }
    return result
  }

  const emailForm = useForm<UpdateEmailInput>({
    resolver: emailResolver,
    defaultValues: { email: user?.email ?? '' },
  })

  const onEmailSubmit = async (values: UpdateEmailInput) => {
    try {
      const res = await api.patch('/api/auth/me', values)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const errorCode = (body as { error?: string }).error
        if (errorCode === 'EMAIL_TAKEN') {
          emailForm.setError('email', { message: t('settings.emailTaken') })
        } else {
          toast.error(t('settings.saveFailed'))
        }
        return
      }
      const updated = await res.json()
      if (!user) return
      setUser({ ...user, email: updated.email })
      toast.success(t('settings.emailSaved'))
    } catch {
      toast.error(t('settings.saveFailed'))
    }
  }

  const handleModeChange = async (value: string) => {
    // Capture current user at invocation time — avoids stale closure on rapid changes
    const currentUser = user
    if (!currentUser) return

    const mode = value as StudyMode
    const previous = currentUser.studyMode
    // Optimistic update
    setUser({ ...currentUser, studyMode: mode })
    try {
      const res = await api.patch('/api/auth/me', { studyMode: mode })
      if (!res.ok) throw new Error()
      toast.success(t('settings.saved'))
    } catch {
      // Revert on failure — restore previous mode from captured snapshot
      setUser({ ...currentUser, studyMode: previous })
      toast.error(t('settings.saveFailed'))
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('settings.pageHeading')}</h1>

      {user?.email == null && (
        <Alert
          role="alert"
          className="border-amber-200 bg-amber-50 text-amber-800 mb-6"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <AlertTitle className="text-amber-800 font-semibold text-sm">
            {t('settings.noEmailWarningTitle')}
          </AlertTitle>
          <AlertDescription className="text-amber-800 text-sm mt-1">
            {t('settings.noEmailWarningDesc')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.emailSection')}</CardTitle>
          <CardDescription>{t('settings.emailDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit(onEmailSubmit)}
              className="space-y-4"
            >
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.emailLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={emailForm.formState.isSubmitting}
                aria-busy={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {emailForm.formState.isSubmitting
                  ? t('settings.emailSaving')
                  : t('settings.saveEmail')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('settings.studyModeSection')}</CardTitle>
          <CardDescription>{t('settings.studyModeDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={user?.studyMode ?? 'normal'}
            onValueChange={handleModeChange}
            className="space-y-4"
          >
            {STUDY_MODE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-start gap-3">
                <RadioGroupItem
                  value={opt.value}
                  id={`mode-${opt.value}`}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`mode-${opt.value}`}
                    className="font-medium cursor-pointer"
                  >
                    {t(opt.labelKey)}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t(opt.descKey)}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('settings.languageSection')}</CardTitle>
          <CardDescription>{t('settings.languageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={i18n.language === 'de' ? 'de' : 'en'}
            onValueChange={(lang) => { void i18n.changeLanguage(lang) }}
            className="space-y-4"
          >
            {(['en', 'de'] as const).map((lang) => (
              <div key={lang} className="flex items-center gap-3">
                <RadioGroupItem value={lang} id={`lang-${lang}`} />
                <Label htmlFor={`lang-${lang}`} className="font-medium cursor-pointer">
                  {t(`lang.${lang}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )
}
