// Remote Control panel: platform-awareness.
//
// The panel is driven entirely by GET /api/admin/system-health, so the honest
// test is to mount the real component against real payloads and read the DOM.
// The linux fixture is a verbatim capture from the live watson-1 endpoint
// (Tailscale Funnel -> production-api :3470); the darwin fixture is the shape
// Camberley sends, and its assertions are the "don't change Camberley" guard.
//
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RemoteControl from './RemoteControl.vue'

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ isAdmin: { value: true }, getAccessToken: async () => 'token' })
}))

const LINUX_HEALTH = {
  hostname: 'watson-1',
  platform: 'linux',
  uptime_seconds: 1471,
  mem: { total_bytes: 16361123840, used_bytes: 1515966464, free_bytes: 14845157376, used_percent: 9.3 },
  disk: { total_bytes: 309082030080, used_bytes: 13751255040, free_bytes: 295330775040, used_percent: 4.4, mount: '/' },
  load_avg: [0.73, 0.64, 0.46],
  cpu_count: 8,
  pm2: [],
  pm2_error: 'Command failed: bash -c pm2 jlist\nbash: line 1: pm2: command not found\n',
  reboot_readiness: {
    platform: 'linux',
    systemd_unit: { name: 'popty-production-api', enabled: true, state: 'enabled' },
    linger: { enabled: true, user: 'tomcassidy' },
    ready: true,
    fix_command: null,
    checks: [
      { key: 'systemd_unit', label: 'Service popty-production-api', ok: true, detail: 'enabled' },
      { key: 'linger', label: 'User lingering', ok: true, detail: 'on' }
    ],
    reboot: {
      capable: false,
      reason: 'No passwordless sudo for tomcassidy on this host — reboot it from the VM console/host instead.'
    }
  }
}

const MAC_HEALTH = {
  hostname: 'Camberley',
  platform: 'darwin',
  uptime_seconds: 90000,
  mem: { total_bytes: 68719476736, used_bytes: 34359738368, free_bytes: 34359738368, used_percent: 50 },
  disk: { total_bytes: 994662584320, used_bytes: 497331292160, free_bytes: 497331292160, used_percent: 50, mount: '/' },
  load_avg: [2.1, 1.9, 1.8],
  cpu_count: 12,
  pm2: [{ name: 'production-api', pm_id: 0, pid: 123, status: 'online', mem_bytes: 200e6, cpu_percent: 1 }],
  reboot_readiness: {
    platform: 'darwin',
    pm2_launch_agent: { exists: true, path: '/Users/tom/Library/LaunchAgents/pm2.tom.plist' },
    pm2_dump: { exists: true, path: '/Users/tom/.pm2/dump.pm2', age_seconds: 3600 },
    ready: true,
    fix_command: null,
    checks: [
      { key: 'pm2_launch_agent', label: 'PM2 launch agent', ok: true, detail: 'installed' },
      { key: 'pm2_dump', label: 'PM2 saved state', ok: true, detail: null, age_seconds: 3600 }
    ],
    reboot: { capable: true, reason: null }
  }
}

async function openPanel(health) {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => health }))
  const wrapper = mount(RemoteControl)
  await flushPromises()
  await wrapper.find('.rc-toggle').trigger('click')
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
})

describe('RemoteControl on a Linux VM (watson-1)', () => {
  it('hides the Mac-only kill-apps button', async () => {
    const w = await openPanel(LINUX_HEALTH)
    expect(w.text()).not.toContain('Free RAM')
  })

  it('replaces the PM2 restart-all button with an honest note', async () => {
    const w = await openPanel(LINUX_HEALTH)
    expect(w.text()).not.toContain('Restart all PM2 services')
    expect(w.text()).toContain('managed by systemd')
  })

  it('shows systemd boot readiness as green, not a missing launchd agent', async () => {
    const w = await openPanel(LINUX_HEALTH)
    const text = w.text()
    expect(text).toContain('Service popty-production-api')
    expect(text).toContain('User lingering')
    expect(text).not.toContain('PM2 launch agent')
    // Both checks pass -> no launchd one-time-fix snippet.
    expect(w.find('.rc-fix').exists()).toBe(false)
    expect(w.findAll('.rc-readiness-dot')).toHaveLength(2)
    expect(w.findAll('.rc-readiness-dot.ok')).toHaveLength(2)
  })

  it('blocks reboot for the real reason (no passwordless sudo), not auto-resurrect', async () => {
    const w = await openPanel(LINUX_HEALTH)
    const btn = w.find('.rc-btn-danger')
    expect(btn.text()).toBe('Reboot blocked')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('No passwordless sudo')
    expect(w.text()).not.toContain('auto-resurrect')
  })
})

describe('RemoteControl on macOS (Camberley) — unchanged', () => {
  it('keeps the kill-apps and restart-all buttons', async () => {
    const w = await openPanel(MAC_HEALTH)
    expect(w.text()).toContain('Free RAM (kill Chrome + iTerm)')
    expect(w.text()).toContain('Restart all PM2 services')
  })

  it('keeps the PM2 readiness rows with the same labels and age formatting', async () => {
    const w = await openPanel(MAC_HEALTH)
    const text = w.text()
    expect(text).toContain('PM2 launch agent')
    expect(text).toContain('installed')
    expect(text).toContain('PM2 saved state')
    expect(text).toContain('1h ago')
  })

  it('enables reboot when PM2 will resurrect', async () => {
    const w = await openPanel(MAC_HEALTH)
    const btn = w.find('.rc-btn-danger')
    expect(btn.text()).toBe('Reboot machine')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('falls back to legacy rows when a host predates checks[]', async () => {
    const legacy = JSON.parse(JSON.stringify(MAC_HEALTH))
    delete legacy.reboot_readiness.checks
    delete legacy.reboot_readiness.reboot
    const w = await openPanel(legacy)
    expect(w.text()).toContain('PM2 launch agent')
    expect(w.text()).toContain('PM2 saved state')
    expect(w.find('.rc-btn-danger').text()).toBe('Reboot machine')
  })
})
