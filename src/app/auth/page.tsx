'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
})

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
})

const resetSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

const newPasswordSchema = z.object({
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
})

type LoginData = z.infer<typeof loginSchema>
type SignupData = z.infer<typeof signupSchema>
type ResetData = z.infer<typeof resetSchema>
type NewPasswordData = z.infer<typeof newPasswordSchema>

export default function AuthPage() {
  const { login, signup, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetSubmitting, setIsResetSubmitting] = useState(false)
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false)
  const [isNewPasswordSubmitting, setIsNewPasswordSubmitting] = useState(false)

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema), defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' } })
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema), defaultValues: { email: '' } })
  const newPasswordForm = useForm<NewPasswordData>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirmPassword: '' } })

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    if (hashParams.get('type') === 'recovery' && hashParams.get('access_token')) {
      setShowNewPasswordForm(true)
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowNewPasswordForm(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isAuthenticated && !authLoading && !showNewPasswordForm) router.push('/dashboard')
  }, [isAuthenticated, authLoading, router, showNewPasswordForm])

  const onLogin = async (data: LoginData) => {
    setIsSubmitting(true)
    const { error } = await login(data.email, data.password)
    setIsSubmitting(false)
    if (error) { toast.error(error) } else { toast.success('Erfolgreich angemeldet'); router.push('/dashboard') }
  }

  const onSignup = async (data: SignupData) => {
    setIsSubmitting(true)
    const { error } = await signup(data.email, data.password, data.fullName)
    setIsSubmitting(false)
    if (error) { toast.error(error) } else { toast.success('Konto erstellt!'); setActiveTab('login'); signupForm.reset() }
  }

  const onResetPassword = async (data: ResetData) => {
    setIsResetSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth`,
    })
    setIsResetSubmitting(false)
    if (error) { toast.error('Fehler: ' + error.message) } else { toast.success('E-Mail gesendet'); setShowResetDialog(false); resetForm.reset() }
  }

  const onSetNewPassword = async (data: NewPasswordData) => {
    setIsNewPasswordSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    setIsNewPasswordSubmitting(false)
    if (error) { toast.error('Fehler: ' + error.message) } else { toast.success('Passwort geändert'); setShowNewPasswordForm(false); router.push('/dashboard') }
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (showNewPasswordForm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <span className="text-xl font-bold text-primary-foreground">S</span>
            </div>
            <CardTitle className="text-2xl">Neues Passwort setzen</CardTitle>
            <CardDescription>Geben Sie Ihr neues Passwort ein</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...newPasswordForm}>
              <form onSubmit={newPasswordForm.handleSubmit(onSetNewPassword)} className="space-y-4">
                <FormField control={newPasswordForm.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Neues Passwort</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={newPasswordForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem><FormLabel>Passwort bestätigen</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isNewPasswordSubmitting}>
                  {isNewPasswordSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Passwort speichern
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl font-bold text-primary-foreground">S</span>
          </div>
          <CardTitle className="text-2xl">Spitex bei Dir</CardTitle>
          <CardDescription>Einsatzplanung</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField control={loginForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-Mail</FormLabel><FormControl><Input type="email" placeholder="name@beispiel.ch" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Passwort</FormLabel>
                        <Button type="button" variant="link" className="h-auto p-0 text-sm text-muted-foreground" onClick={() => setShowResetDialog(true)}>Passwort vergessen?</Button>
                      </div>
                      <FormControl><Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Anmelden
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <FormField control={signupForm.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>Vollständiger Name</FormLabel><FormControl><Input placeholder="Max Muster" autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={signupForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-Mail</FormLabel><FormControl><Input type="email" placeholder="name@beispiel.ch" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Passwort</FormLabel><FormControl><Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>Passwort bestätigen</FormLabel><FormControl><Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrieren
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Passwort zurücksetzen</DialogTitle>
            <DialogDescription>Wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.</DialogDescription>
          </DialogHeader>
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
              <FormField control={resetForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>E-Mail</FormLabel><FormControl><Input type="email" placeholder="name@beispiel.ch" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowResetDialog(false)}>Abbrechen</Button>
                <Button type="submit" className="flex-1" disabled={isResetSubmitting}>
                  {isResetSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  E-Mail senden
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
