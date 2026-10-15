// Which systemctl scope a Popty unit lives in (job #391).
//
// Popty's services moved from tomcassidy user units to system units running as `popty`
// (tools/deploy/install-popty-user.sh). Callers that restart them (auto-deploy, the audio
// stop's lift) ask here instead of hard-coding --user, so the same code works before and
// after the cutover, and on a host that never had it. A system unit wins when installed;
// tomcassidy may manage it without sudo through the polkit rule the installer lays down.
const fs = require('fs')
const path = require('path')

const SYSTEM_DIR = process.env.UNIT_SCOPE_SYSTEM_DIR || '/etc/systemd/system'

/** systemctl args prefix for `unit` ('popty-production-api' or 'popty-production-api.service'). */
function scopeArgs (unit) {
  const file = /\.(service|timer)$/.test(unit) ? unit : `${unit}.service`
  return fs.existsSync(path.join(SYSTEM_DIR, file)) ? [] : ['--user']
}

module.exports = { scopeArgs }
