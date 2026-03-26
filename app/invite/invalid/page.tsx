export default function InvalidInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 px-4 text-center">
        <h1 className="text-lg font-semibold text-foreground">Invite link is no longer valid</h1>
        <p className="text-sm text-muted-foreground">
          This invite link has expired or has already been used. Contact your workspace admin to send a new one.
        </p>
      </div>
    </div>
  )
}
