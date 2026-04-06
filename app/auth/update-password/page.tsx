import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a password for your account, then continue to your workspace.
          </p>
        </div>
        <UpdatePasswordForm />
      </div>
    </div>
  )
}
