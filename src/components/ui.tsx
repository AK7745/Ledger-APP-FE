import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

const inputCls =
  'mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none disabled:bg-hover';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: ComponentProps<'input'>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Textarea(props: ComponentProps<'textarea'>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Select(props: ComponentProps<'select'>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'border border-line text-fg hover:bg-hover',
    danger: 'border border-red-300 text-red-700 hover:bg-red-50',
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white hover:bg-accent-hover'
      : 'border border-line text-fg hover:bg-hover';
  return (
    <Link
      href={href}
      className={`inline-block rounded-md px-4 py-2 text-sm font-medium ${styles}`}
    >
      {children}
    </Link>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-line">
      {children}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red-600">{children}</p>;
}

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-fg">{title}</h1>
      {action}
    </div>
  );
}
