interface SiteFooterProps {
  drNameNote: string
}

export function SiteFooter({ drNameNote }: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-border bg-card/70">
      <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-4 lg:px-6">
        <div className="space-y-1 text-[0.8rem] leading-5 text-muted-foreground">
          <p>
            Bible text: the Original Douay-Rheims, 1582 New Testament and 1609 Old Testament, public
            domain (CC0). Text and annotations from{' '}
            <a
              className="text-accent underline decoration-dotted underline-offset-2 hover:text-primary"
              href="https://github.com/janvier-s/original-douay-rheims"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/janvier-s/original-douay-rheims
            </a>
            .
          </p>
          <p>{drNameNote}</p>
        </div>
      </div>
    </footer>
  )
}
