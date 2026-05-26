import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';
import useRoles from '../../hooks/useRoles';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai',    label: 'OpenAI (ChatGPT)' },
  { value: 'deepseek',  label: 'DeepSeek' },
];

export default function AppSettingsAdmin() {
  const { isAdmin } = useRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    aiEvalEnabled: false,
    llmDefaultProvider: 'anthropic',
    llmDefaultModel: '',
  });

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const s = await adminService.getAppSettings();
        setForm({
          aiEvalEnabled: !!s.aiEvalEnabled,
          llmDefaultProvider: s.llmDefaultProvider || 'anthropic',
          llmDefaultModel: s.llmDefaultModel || '',
        });
      } catch (e) {
        toast.error(`Failed to load settings: ${e?.response?.data?.message || e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  const save = async () => {
    setSaving(true);
    try {
      await adminService.updateAppSettings(form);
      toast.success('App settings saved');
    } catch (e) {
      toast.error(`Save failed: ${e?.response?.data?.message || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <div style={{ padding: 24 }}>Admin role required.</div>;
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <Link to="/admin">&larr; Admin</Link>
      <h1>App Settings</h1>

      <section style={{ marginTop: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18 }}>
          <input
            type="checkbox"
            checked={form.aiEvalEnabled}
            onChange={(e) => setForm({ ...form, aiEvalEnabled: e.target.checked })}
          />
          AI evaluation
        </label>
        {!form.aiEvalEnabled && (
          <p style={{ color: '#888', marginTop: 6 }}>
            AI evaluation is disabled — no Evaluate buttons will appear in workspaces.
          </p>
        )}
      </section>

      <section style={{ marginTop: 24, opacity: form.aiEvalEnabled ? 1 : 0.5 }}>
        <label htmlFor="provider-select" style={{ display: 'block', marginBottom: 6 }}>Default provider</label>
        <select
          id="provider-select"
          value={form.llmDefaultProvider}
          onChange={(e) => setForm({ ...form, llmDefaultProvider: e.target.value })}
          disabled={!form.aiEvalEnabled}
        >
          {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        <label htmlFor="model-input" style={{ display: 'block', marginTop: 12, marginBottom: 6 }}>Model</label>
        <input
          id="model-input"
          type="text"
          value={form.llmDefaultModel}
          onChange={(e) => setForm({ ...form, llmDefaultModel: e.target.value })}
          disabled={!form.aiEvalEnabled}
          placeholder="(uses provider default if blank)"
          style={{ width: '100%', padding: 8 }}
        />

        {form.llmDefaultProvider === 'deepseek' && (
          <p style={{ color: '#b16b3a', marginTop: 12, fontSize: 13 }}>
            DeepSeek is disabled in production by default. Set <code>APP_ALLOW_DEEPSEEK_IN_PROD=true</code> to enable.
          </p>
        )}
      </section>

      <div style={{ marginTop: 32 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
