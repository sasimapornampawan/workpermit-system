import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { tone } from '../theme';

const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1px solid oklch(0.9 0.01 265)', borderRadius: 7,
  padding: '9px 11px', fontSize: 12.5, background: '#fff', color: 'oklch(0.3 0.02 265)',
};

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label style={{ display: 'block', gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'oklch(0.42 0.02 265)', marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}

export function TextInput({ style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, background: props.disabled ? 'oklch(0.97 0.005 265)' : '#fff', ...style }} />;
}

export function TextArea({ style, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} style={{ ...inputStyle, resize: 'vertical', ...style }} />;
}

export function Select({ style, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, ...style }} />;
}

export function Button({ variant = 'primary', style, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }) {
  const primary = variant === 'primary';
  return (
    <button
      type="button"
      {...props}
      className={props.disabled ? undefined : primary ? 'h-primary' : 'h-outline'}
      style={{
        padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap',
        cursor: props.disabled ? 'default' : 'pointer', opacity: props.disabled ? 0.55 : 1,
        border: primary ? '1px solid transparent' : '1px solid oklch(0.9 0.01 265)',
        background: primary ? 'oklch(0.52 0.16 265)' : '#fff', color: primary ? '#fff' : 'inherit',
        ...style,
      }}
    />
  );
}

export function FormMessage({ error, children, style }: { error: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <div role={error ? 'alert' : 'status'} style={{ fontSize: 12.5, color: tone(error ? 'bad' : 'ok').fg, ...style }}>
      {children}
    </div>
  );
}
