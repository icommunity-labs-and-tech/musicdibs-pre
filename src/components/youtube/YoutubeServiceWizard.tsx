import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ServiceType, WizardStep } from '@/types/youtube-services';
import { SERVICE_CONFIG } from '@/types/youtube-services';

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / (total - 1)) * 100);
  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500 rounded-full" style={{ width: pct + '%' }} />
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-white/70">
      <span className="mt-0.5 text-purple-400 flex-shrink-0">&#10003;</span>
      <span>{text}</span>
    </li>
  );
}

function InfoStep({ step, onNext }: { step: WizardStep; onNext: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      {step.subtitle && <p className="text-white/70 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: step.subtitle }} />}
      {step.checklist && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-3">Requisitos</p>
          <ul className="space-y-2">{step.checklist.map((item, i) => <ChecklistItem key={i} text={item} />)}</ul>
        </div>
      )}
      <button onClick={onNext} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors">Empezar →</button>
    </div>
  );
}

function TextStep({ step, value, onChange, onNext, inputRef }: { step: WizardStep; value: string; onChange: (v: string) => void; onNext: () => void; inputRef: React.RefObject<HTMLInputElement>; }) {
  return (
    <div className="flex flex-col gap-4">
      {step.subtitle && <p className="text-white/60 text-sm" dangerouslySetInnerHTML={{ __html: step.subtitle }} />}
      <input ref={inputRef} type={step.type === 'email' ? 'email' : step.type === 'url' ? 'url' : 'text'} value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onNext(); }} placeholder={step.placeholder}
        className="w-full bg-transparent border-b-2 border-white/20 focus:border-purple-400 outline-none text-white text-xl py-2 placeholder:text-white/20 transition-colors" autoFocus />
      {step.hint && <p className="text-xs text-white/40 italic">{step.hint}</p>}
      <button onClick={onNext} disabled={!!(step.required && !value.trim())} className="self-start flex items-center gap-2 py-2 px-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold rounded-xl transition-colors text-sm">OK <span className="text-white/60">&#8629;</span></button>
    </div>
  );
}

function TextareaStep({ step, value, onChange, onNext }: { step: WizardStep; value: string; onChange: (v: string) => void; onNext: () => void; }) {
  return (
    <div className="flex flex-col gap-4">
      {step.subtitle && <p className="text-white/60 text-sm" dangerouslySetInnerHTML={{ __html: step.subtitle }} />}
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={step.placeholder} rows={5}
        className="w-full bg-white/5 border border-white/10 focus:border-purple-400 outline-none text-white text-sm rounded-xl p-3 placeholder:text-white/20 resize-none" autoFocus />
      {step.hint && <p className="text-xs text-white/40 italic">{step.hint}</p>}
      <button onClick={onNext} disabled={!!(step.required && !value.trim())} className="self-start py-2 px-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold rounded-xl text-sm">OK</button>
    </div>
  );
}

function CheckboxStep({ step, value, onChange, onNext }: { step: WizardStep; value: boolean; onChange: (v: boolean) => void; onNext: () => void; }) {
  return (
    <div className="flex flex-col gap-5">
      {step.subtitle && <p className="text-white/60 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: step.subtitle }} />}
      {step.checklist && <div className="bg-white/5 border border-white/10 rounded-xl p-4"><ul className="space-y-2">{step.checklist.map((item, i) => <ChecklistItem key={i} text={item} />)}</ul></div>}
      <label className="flex items-start gap-3 cursor-pointer">
        <div onClick={() => onChange(!value)} className={"mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors " + (value ? 'bg-purple-600 border-purple-600' : 'border-white/30')}>
          {value && <span className="text-white text-xs">&#10003;</span>}
        </div>
        <span className="text-sm text-white/80 leading-relaxed">{step.hint}</span>
      </label>
      <button onClick={onNext} disabled={!!(step.required && !value)} className="self-start py-2 px-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold rounded-xl text-sm">Confirmar y continuar</button>
    </div>
  );
}

function RadioStep({ step, value, onChange, onNext }: { step: WizardStep; value: string; onChange: (v: string) => void; onNext: () => void; }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {step.options?.map((opt, i) => (
          <label key={opt.value} className={"flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors " + (value === opt.value ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 hover:border-white/30 text-white/70')} onClick={() => onChange(opt.value)}>
            <div className={"w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center " + (value === opt.value ? 'border-purple-400' : 'border-white/30')}>
              {value === opt.value && <div className="w-2 h-2 rounded-full bg-purple-400" />}
            </div>
            <span className="text-sm font-mono text-purple-400/60 mr-1">{String.fromCharCode(65 + i)}</span>
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
      <button onClick={onNext} disabled={!!(step.required && !value)} className="self-start py-2 px-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold rounded-xl text-sm">OK</button>
    </div>
  );
}

function GroupStep({ step, values, onChange, onNext }: { step: WizardStep; values: Record<string, string>; onChange: (k: string, v: string) => void; onNext: () => void; }) {
  const allFilled = step.fields?.every(f => !f.required || (values[f.key] || '').trim()) ?? true;
  return (
    <div className="flex flex-col gap-4">
      {step.subtitle && <p className="text-white/60 text-sm" dangerouslySetInnerHTML={{ __html: step.subtitle }} />}
      {step.fields?.map(field => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wide">{field.label}{field.required && <span className="text-purple-400 ml-1">*</span>}</label>
          <input type={field.type} value={values[field.key] || ''} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder}
            className="w-full bg-transparent border-b border-white/20 focus:border-purple-400 outline-none text-white text-base py-1.5 placeholder:text-white/20 transition-colors" />
        </div>
      ))}
      <button onClick={onNext} disabled={!allFilled} className="self-start py-2 px-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold rounded-xl text-sm">OK</button>
    </div>
  );
}

function FileStep({ step, value, onChange, onNext, uploading }: { step: WizardStep; value: string; onChange: (url: string) => void; onNext: () => void; uploading: boolean; }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split('.').pop();
    const path = 'youtube-requests/' + user.id + '/' + Date.now() + '.' + ext;
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
      onChange(publicUrl);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      {step.subtitle && <p className="text-white/60 text-sm" dangerouslySetInnerHTML={{ __html: step.subtitle }} />}
      <div onClick={() => !uploading && fileRef.current?.click()} className="border-2 border-dashed border-white/20 hover:border-purple-400 rounded-xl p-6 text-center cursor-pointer transition-colors">
        {value ? <p className="text-purple-400 text-sm font-medium">Archivo subido &#10003;</p> : <p className="text-white/60 text-sm">Haz clic para subir el documento ({step.accept})</p>}
      </div>
      <input ref={fileRef} type="file" accept={step.accept} className="hidden" onChange={handleFile} />
      {step.hint && <p className="text-xs text-white/40 italic">{step.hint}</p>}
      <button onClick={onNext} disabled={!!(step.required && !value) || uploading} className="self-start py-2 px-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold rounded-xl text-sm">OK</button>
    </div>
  );
}

function PaymentStep({ serviceType, onPay, paying }: { serviceType: ServiceType; onPay: () => void; paying: boolean; }) {
  const config = SERVICE_CONFIG[serviceType];
  return (
    <div className="flex flex-col gap-5">
      <p className="text-white/60 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: 'Precio: <strong class="text-white">50 EUR</strong>. Plazo: <strong class="text-white">' + config.timeline + '</strong>.' }} />
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <div className="flex justify-between"><span className="text-sm text-white/60">Servicio</span><span className="text-sm text-white font-medium">{config.name}</span></div>
        <div className="flex justify-between border-t border-white/10 pt-2 mt-2"><span className="text-sm font-semibold text-white">Total</span><span className="text-lg font-bold text-purple-400">50 EUR</span></div>
      </div>
      <button onClick={onPay} disabled={paying} className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2">
        {paying ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Procesando...</> : <>💳 Pagar 50 € y enviar solicitud</>}
      </button>
      <p className="text-xs text-white/30 text-center">Pago seguro via Stripe. Recibiras un recibo por email.</p>
    </div>
  );
}

interface WizardProps {
  serviceType: ServiceType;
  userProfile?: Record<string, string>;
  onClose: () => void;
}

export function YoutubeServiceWizard({ serviceType, userProfile, onClose }: WizardProps) {
  const config = SERVICE_CONFIG[serviceType];
  const steps = config.steps;
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const step = steps[currentStep];

  useEffect(() => {
    if (!userProfile) return;
    const prefills: Record<string, unknown> = {};
    if (serviceType === 'oac') {
      const parts = (userProfile.display_name || '').split(' ');
      prefills['firstName'] = parts[0] || '';
      prefills['lastName'] = parts.slice(1).join(' ') || '';
      prefills['email'] = userProfile.email || '';
    } else {
      prefills['adminEmail'] = userProfile.email || '';
    }
    setFormData(prev => ({ ...prefills, ...prev }));
  }, [userProfile, serviceType]);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, [currentStep]);

  const shouldSkip = useCallback((s: WizardStep) => s.id === 'cid_promotion_details' && formData['contentPromotion'] !== 'yes_pr', [formData]);

  const goNext = useCallback(() => {
    let next = currentStep + 1;
    while (next < steps.length - 1 && shouldSkip(steps[next])) next++;
    if (next < steps.length) { setCurrentStep(next); setError(null); }
  }, [currentStep, steps, shouldSkip]);

  const goBack = useCallback(() => {
    let prev = currentStep - 1;
    while (prev > 0 && shouldSkip(steps[prev])) prev--;
    if (prev >= 0) { setCurrentStep(prev); setError(null); }
  }, [currentStep, steps, shouldSkip]);

  const getVal = (key?: string) => key ? (formData[key] as string) || '' : '';
  const setVal = (key: string, val: unknown) => setFormData(prev => ({ ...prev, [key]: val }));

  const handlePay = async () => {
    setPaying(true); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-youtube-service-checkout', {
        body: { serviceType, formData },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.url) window.location.href = data.url;
      else throw new Error('No se recibio URL de pago');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setPaying(false);
    }
  };

  const renderStep = () => {
    switch (step.type) {
      case 'info': return <InfoStep step={step} onNext={goNext} />;
      case 'text': case 'email': case 'url':
        return <TextStep step={step} value={getVal(step.key)} onChange={v => step.key && setVal(step.key, v)} onNext={goNext} inputRef={inputRef as React.RefObject<HTMLInputElement>} />;
      case 'textarea': return <TextareaStep step={step} value={getVal(step.key)} onChange={v => step.key && setVal(step.key, v)} onNext={goNext} />;
      case 'checkbox': return <CheckboxStep step={step} value={!!formData[step.key || '']} onChange={v => step.key && setVal(step.key, v)} onNext={goNext} />;
      case 'radio': return <RadioStep step={step} value={getVal(step.key)} onChange={v => step.key && setVal(step.key, v)} onNext={goNext} />;
      case 'group': return <GroupStep step={step} values={formData as Record<string, string>} onChange={(k, v) => setVal(k, v)} onNext={goNext} />;
      case 'file': return <FileStep step={step} value={getVal(step.key)} onChange={url => step.key && setVal(step.key, url)} onNext={goNext} uploading={false} />;
      case 'payment': return <PaymentStep serviceType={serviceType} onPay={handlePay} paying={paying} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-lg bg-[#0d0618] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white/60">{config.shortName}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 font-mono">{currentStep + 1} / {steps.length}</span>
              <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">&#10005;</button>
            </div>
          </div>
          <ProgressBar current={currentStep} total={steps.length} />
        </div>
        <div className="px-6 py-6 min-h-[300px]">
          <h2 className="text-xl font-bold text-white mb-4 leading-tight">{step.title}{step.optional && <span className="ml-2 text-xs font-normal text-white/30">(opcional)</span>}</h2>
          <div key={step.id}>{renderStep()}</div>
          {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
        </div>
        {currentStep > 0 && step.type !== 'payment' && (
          <div className="px-6 pb-4 border-t border-white/5 pt-3">
            <button onClick={goBack} className="text-xs text-white/30 hover:text-white/60 transition-colors">&#8592; Atras</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default YoutubeServiceWizard;
