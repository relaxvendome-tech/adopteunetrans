'use client';
import { useState } from 'react';

export default function MessageBox({ name }: { name: string }) {
  const [text, setText] = useState('');
  const starters = [
    `Bonjour ${name} ! Ton profil m'a donné envie de faire connaissance 😊`,
    `Salut ${name}, qu'est-ce qui te fait vibrer en ce moment ?`,
    `Bonjour ${name} ! On est du même coin, tu aurais une bonne adresse à conseiller ?`,
  ];
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="muted" style={{ fontSize: 13 }}>Besoin d&apos;inspiration ? Cliquez puis personnalisez :</span>
        {starters.map((s) => (
          <button key={s} type="button" className="btn ghost small" style={{ textAlign: 'left' }} onClick={() => setText(s)}>{s}</button>
        ))}
      </div>
      <label>Votre message
        <textarea name="body" required maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Présentez-vous, parlez de vos points communs…" />
      </label>
    </>
  );
}
