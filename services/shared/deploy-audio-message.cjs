// services/shared/deploy-audio-message.cjs
//
// The one-line human summary a deploy-audio run ends with ("Copied 812 files.
// 3 missing from production."), shared by the four deploy-audio routes in
// production-api.cjs so they cannot drift into four wordings. Pure.

function buildDeployMessage(deployResult, verificationResult, verificationPassed) {
  const parts = []
  parts.push(`Copied ${deployResult.deployed} files`)
  if (deployResult.failed > 0) parts.push(`${deployResult.failed} copy failures`)
  if (verificationResult.missing > 0) parts.push(`${verificationResult.missing} missing from production`)
  if (verificationResult.durationMismatched > 0) parts.push(`${verificationResult.durationMismatched} duration mismatches`)
  if (verificationResult.durationErrors > 0) parts.push(`${verificationResult.durationErrors} verification errors`)
  if (verificationPassed) parts.push('All production audio verified')
  return parts.join('. ') + '.'
}

module.exports = { buildDeployMessage }
