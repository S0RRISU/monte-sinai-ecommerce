type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, action, className = '' }: PageHeaderProps) {
  return (
    <header className={`admin-page-header mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className}`}>
      <div>
        {eyebrow ? <span className="text-xs font-black uppercase tracking-[0.24em] text-gold">{eyebrow}</span> : null}
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[color:var(--admin-text)] md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--admin-muted)]">{description}</p>
      </div>
      {action ? <div className="grid shrink-0 gap-2 sm:flex sm:items-center">{action}</div> : null}
    </header>
  );
}
