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
import type { StudyMode } from '@kartex/shared'

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
