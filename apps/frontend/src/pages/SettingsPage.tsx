import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  const { t } = useTranslation()
  const { user, setUser } = useAuth()

  useEffect(() => {
    document.title = t('settings.title')
  }, [t])

  const handleModeChange = async (value: string) => {
    const previous = user?.studyMode ?? 'normal'
    // Optimistic update
    if (user) setUser({ ...user, studyMode: value })
    try {
      const res = await api.patch('/api/auth/me', { studyMode: value })
      if (!res.ok) throw new Error()
      toast.success(t('settings.saved'))
    } catch {
      // Revert on failure
      if (user) setUser({ ...user, studyMode: previous })
      toast.error(t('settings.saveFailed'))
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t('settings.pageHeading')}</h1>

      <Card>
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
    </div>
  )
}
